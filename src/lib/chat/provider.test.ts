import { afterEach,beforeEach,describe,it,expect,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { appsScriptProvider,chatConfigured } from "./provider";
const json = (data: unknown) => new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json"}});
beforeEach(()=>{
  vi.stubEnv("CHAT_ENABLED","true");vi.stubEnv("CHAT_UPSTREAM_REVIEWED","true");vi.stubEnv("CHAT_DATA_POLICY_APPROVED","true");
  vi.stubEnv("CHAT_APPS_SCRIPT_URL","https://script.google.com/macros/s/synthetic-deployment/exec");vi.stubEnv("VERCEL_ENV","preview");
});
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
describe("Apps Script provider, contract fixtures only",()=>{
  it.each(["faq","gemini"])("accepts a bounded %s response",async source=>{
    const fetcher=vi.fn().mockResolvedValue(json({answer:"General guidance",source}));
    expect(await appsScriptProvider(fetcher).answer("Where is the official site?")).toEqual({answer:"General guidance",source});
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({question:"Where is the official site?"});
    expect(fetcher.mock.calls[0][1]).toMatchObject({method:"POST",credentials:"omit",referrerPolicy:"no-referrer",redirect:"manual"});
  });
  it("follows only the Google ContentService GET redirect without replaying a question",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(new Response(null,{status:302,headers:{location:"https://script.googleusercontent.com/macros/echo?fixture=1"}})).mockResolvedValueOnce(json({answer:"FAQ",source:"faq"}));
    await appsScriptProvider(fetcher).answer("Generic question");
    expect(fetcher.mock.calls[1][1]).toMatchObject({method:"GET",redirect:"error",credentials:"omit"});
    expect(fetcher.mock.calls[1][1]).not.toHaveProperty("body");expect(fetcher.mock.calls[1][1]).not.toHaveProperty("headers");
  });
  it.each(["https://evil.test/","http://script.googleusercontent.com/x","https://script.googleusercontent.com@evil.test/x","https://accounts.google.com/login"])("rejects redirect to %s",async location=>{
    const f=vi.fn().mockResolvedValue(new Response(null,{status:302,headers:{location}}));
    await expect(appsScriptProvider(f).answer("Question")).rejects.toThrow();expect(f).toHaveBeenCalledTimes(1);
  });
  it.each([{answer:"failed",source:"error"},{answer:"",source:"faq"},{answer:"x".repeat(12001),source:"gemini"},{html:"login"}])("rejects error/invalid payload %j",async payload=>{
    await expect(appsScriptProvider(vi.fn().mockResolvedValue(json(payload))).answer("Question")).rejects.toThrow("unavailable");
  });
  it("rejects login HTML, non-2xx, invalid JSON and oversized streamed responses",async()=>{
    for(const response of [new Response("<html>login</html>"),new Response("error",{status:503}),new Response("bad-json",{headers:{"Content-Type":"application/json"}}),json({answer:"x".repeat(66000),source:"faq"})]) {
      await expect(appsScriptProvider(vi.fn().mockResolvedValue(response)).answer("Question")).rejects.toThrow();
    }
  });
  it("sets a total timeout and propagates network/timeout failures",async()=>{
    const f=vi.fn().mockImplementation((_url,init)=>{expect(init.signal).toBeInstanceOf(AbortSignal);return Promise.reject(new DOMException("Timed out","TimeoutError"));});
    await expect(appsScriptProvider(f).answer("Question")).rejects.toThrow();
  });
  it("aborts the upstream operation after the 12-second budget",async()=>{
    vi.useFakeTimers();
    const signal=AbortSignal.timeout; // Node's native timeout is verified separately by the fetch contract.
    const timeout=vi.spyOn(AbortSignal,"timeout").mockImplementation(ms=>{
      const controller=new AbortController();setTimeout(()=>controller.abort(new DOMException("Timed out","TimeoutError")),ms);return controller.signal;
    });
    const fetcher=vi.fn().mockImplementation((_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>reject(init.signal.reason))));
    const pending=expect(appsScriptProvider(fetcher).answer("Generic question")).rejects.toThrow("Timed out");
    await vi.advanceTimersByTimeAsync(12000);await pending;
    expect(timeout).toHaveBeenCalledWith(12000);timeout.mockRestore();expect(AbortSignal.timeout).toBe(signal);
  });
  it.each(["CHAT_ENABLED","CHAT_UPSTREAM_REVIEWED","CHAT_DATA_POLICY_APPROVED"])("gates %s",key=>{vi.stubEnv(key,"false");expect(chatConfigured).toThrow();});
  it("rejects Production and unapproved endpoint hosts",()=>{
    vi.stubEnv("VERCEL_ENV","production");expect(chatConfigured).toThrow();vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("CHAT_APPS_SCRIPT_URL","http://127.0.0.1/secret");expect(chatConfigured).toThrow();
  });
});
