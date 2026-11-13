import {beforeEach,describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
const m=vi.hoisted(()=>({user:vi.fn(),checkout:vi.fn(),cancel:vi.fn(),command:vi.fn()}));
vi.mock("@/lib/subscriptions/http",async()=>({...await vi.importActual<typeof import("@/lib/subscriptions/http")>("@/lib/subscriptions/http"),requireUser:m.user}));
vi.mock("@/lib/subscriptions/stripe",()=>({createSubscriptionCheckout:m.checkout,cancelSubscription:m.cancel}));
vi.mock("@/lib/subscriptions/db",()=>({betaCommand:m.command}));
import {POST as checkout} from "./checkout/route";
import {POST as cancel} from "./cancel/route";
import {POST as alerts} from "./alerts/route";
import {GET as status} from "./status/route";
const req=(value:unknown)=>new Request("http://localhost/api/subscriptions/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
beforeEach(()=>{vi.resetAllMocks();m.user.mockResolvedValue("verified-user");m.checkout.mockResolvedValue("https://checkout.stripe.com/fixture");m.command.mockResolvedValue({plan:"free",used:0,limit:1});});
describe("subscription HTTP integration boundaries",()=>{
  it("uses the verified user's ID and strict accepted plan",async()=>{
    expect((await checkout(req({plan:"basic",consent:true}))).status).toBe(200);expect(m.checkout).toHaveBeenCalledWith("verified-user","basic");
  });
  it.each([{plan:"smart",consent:false},{plan:"free",consent:true},{plan:"basic",consent:true,amount:1},{plan:"basic",consent:true,user:"victim"}])("denies manipulated fields before Stripe %j",async payload=>{expect((await checkout(req(payload))).status).toBe(400);expect(m.checkout).not.toHaveBeenCalled();});
  it("rejects oversized streamed JSON",async()=>{expect((await checkout(req({question:"x".repeat(9000)}))).status).toBe(400);expect(m.checkout).not.toHaveBeenCalled();});
  it("does not grant access from status or cancellation requests",async()=>{
    expect((await status()).status).toBe(200);expect(m.command).toHaveBeenCalledWith("status","verified-user");
    expect((await cancel(req({}))).status).toBe(200);expect(m.cancel).toHaveBeenCalledWith("verified-user");
  });
  it("saves only an explicit alert preference, never a client email",async()=>{
    expect((await alerts(req({enabled:true,email:"synthetic@example.test"}))).status).toBe(400);expect(m.command).not.toHaveBeenCalled();
    expect((await alerts(req({enabled:false}))).status).toBe(200);expect(m.command).toHaveBeenCalledWith("alerts","verified-user",{enabled:false});
  });
  it("denies unverified sessions before checkout",async()=>{m.user.mockRejectedValue(new Error("unauthenticated"));expect((await checkout(req({plan:"smart",consent:true}))).status).toBe(401);expect(m.checkout).not.toHaveBeenCalled();});
});
