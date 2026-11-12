import {beforeEach,describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
const m=vi.hoisted(()=>({command:vi.fn(),user:vi.fn(),answer:vi.fn(),configured:vi.fn()}));
vi.mock("@/lib/subscriptions/db",()=>({betaCommand:m.command}));
vi.mock("@/lib/subscriptions/http",async()=>{const original=await vi.importActual<typeof import("@/lib/subscriptions/http")>("@/lib/subscriptions/http");return {...original,requireUser:m.user};});
vi.mock("@/lib/chat/provider",()=>({chatConfigured:m.configured,appsScriptProvider:()=>({answer:m.answer})}));
import {POST} from "./route";
const input={question:"Where do I find the official housing site?",requestId:"be700000-0000-4000-8000-000000000001",consent:true};
const request=(value:unknown=input)=>new Request("http://localhost/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
beforeEach(()=>{vi.resetAllMocks();m.user.mockResolvedValue("synthetic-user");m.answer.mockResolvedValue({answer:"Official guidance",source:"faq"});m.command.mockResolvedValue({plan:"free",used:1,limit:1});});
describe("chat handler",()=>{
  it("reserves before provider and commits success before returning an answer",async()=>{
    const r=await POST(request());expect(r.status).toBe(200);expect(m.command.mock.calls.map(c=>c[0])).toEqual(["reserve","finish"]);
    expect(m.command.mock.calls[0][2]).toEqual({request_id:input.requestId});expect(JSON.stringify(m.command.mock.calls)).not.toContain(input.question);
    expect(m.command.mock.calls[1][2]).toEqual({request_id:input.requestId,success:true});expect(r.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each(["quota","rate_limited","busy","duplicate"])("denies %s without calling the provider",async code=>{
    m.command.mockRejectedValueOnce(new Error(code));const r=await POST(request());expect(r.status).toBe(["quota","rate_limited"].includes(code)?429:409);expect(m.answer).not.toHaveBeenCalled();
  });
  it("releases a failed provider reservation without disclosing provider errors",async()=>{
    m.answer.mockRejectedValue(new Error("secret upstream detail"));const r=await POST(request());expect(r.status).toBe(503);expect(await r.text()).not.toContain("secret");
    expect(m.command.mock.calls[1][2]).toEqual({request_id:input.requestId,success:false});
  });
  it("never delivers an answer if quota finalization fails",async()=>{
    m.command.mockImplementation((action)=>action==="finish"?Promise.reject(new Error("unavailable")):Promise.resolve({}));
    const r=await POST(request());expect(r.status).toBe(503);expect(await r.text()).not.toContain("Official guidance");
  });
  it.each([{consent:false},{question:""},{question:"x".repeat(1001)},{question:"SSN 123-45-6789"},{question:"email me@example.test"},{plan:"smart"},{user_id:"other"},{requestId:"not-a-uuid"}])("rejects invalid input without reservations %j",async change=>{
    expect((await POST(request({...input,...change}))).status).toBe(400);expect(m.command).not.toHaveBeenCalled();
  });
  it("fails closed on missing auth or disabled provider",async()=>{
    m.user.mockRejectedValue(new Error("unauthenticated"));expect((await POST(request())).status).toBe(401);expect(m.command).not.toHaveBeenCalled();
    m.configured.mockImplementation(()=>{throw new Error("unavailable");});expect((await POST(request())).status).toBe(503);expect(m.answer).not.toHaveBeenCalled();
  });
});
