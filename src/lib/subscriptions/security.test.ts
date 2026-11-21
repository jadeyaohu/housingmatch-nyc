import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import Stripe from "stripe";
vi.mock("server-only",()=>({}));
vi.mock("./stripe",()=>({syncSubscriptionEvent:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({currentUser:vi.fn()}));
import {betaConfig,subscriptionConfig} from "./config";
import {requireUser} from "./http";
import {POST} from "@/app/api/subscriptions/webhook/route";
import {syncSubscriptionEvent} from "./stripe";
const secret="whsec_synthetic_subscription_fixture";
beforeEach(()=>{
  for(const [k,v] of Object.entries({NEXT_PUBLIC_AUTH_ENABLED:"true",NEXT_PUBLIC_AUTH_SUPABASE_URL:"http://127.0.0.1:54321",NEXT_PUBLIC_AUTH_SUPABASE_KEY:"synthetic",NEXT_PUBLIC_EMAIL_AUTH:"1",BETA_SERVICES_ENABLED:"true",BETA_NONPRODUCTION_APPROVED:"true",BETA_APP_ORIGIN:"http://localhost:3000",BETA_SUPABASE_URL:"http://127.0.0.1:54321",BETA_SUPABASE_SERVICE_ROLE_KEY:"synthetic",SUBSCRIPTIONS_ENABLED:"true",SUBSCRIPTIONS_STRIPE_SECRET_KEY:"sk_test_synthetic_fixture",SUBSCRIPTIONS_STRIPE_WEBHOOK_SECRET:secret,VERCEL_ENV:"preview"}))vi.stubEnv(k,v);
  vi.clearAllMocks();
});
afterEach(()=>vi.unstubAllEnvs());
describe("service boundaries and raw signed webhooks",()=>{
  it.each(["sk_live_never","rk_live_never","", "sk_invalid"])("rejects %s",key=>{vi.stubEnv("SUBSCRIPTIONS_STRIPE_SECRET_KEY",key);expect(subscriptionConfig).toThrow();});
  it("rejects Production, disabled services and mismatched Auth/data projects",()=>{
    vi.stubEnv("VERCEL_ENV","production");expect(betaConfig).toThrow();vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("BETA_SUPABASE_URL","https://other.supabase.co");expect(betaConfig).toThrow();
  });
  it("rejects cross-origin requests before identity lookup",async()=>{await expect(requireUser(new Request("http://localhost:3000/x",{headers:{origin:"https://evil.test"}}))).rejects.toThrow("forbidden");});
  it("checks the signature over the exact raw body",async()=>{
    const raw=JSON.stringify({id:"evt_fixture",object:"event",type:"customer.subscription.updated",livemode:false,data:{object:{}}});
    const signature=Stripe.webhooks.generateTestHeaderString({payload:raw,secret});
    const req=(value=raw,sig=signature)=>new Request("http://localhost/api/subscriptions/webhook",{method:"POST",headers:{"stripe-signature":sig},body:value});
    expect((await POST(req())).status).toBe(200);expect(syncSubscriptionEvent).toHaveBeenCalledTimes(1);
    expect((await POST(req(raw+" "))).status).toBe(400);expect((await POST(req(raw,""))).status).toBe(400);
    const old=Stripe.webhooks.generateTestHeaderString({payload:raw,secret,timestamp:1});expect((await POST(req(raw,old))).status).toBe(400);
    expect(syncSubscriptionEvent).toHaveBeenCalledTimes(1);
  });
  it("rejects oversized raw webhook payloads",async()=>{expect((await POST(new Request("http://localhost/api/subscriptions/webhook",{method:"POST",body:"x".repeat(66000)}))).status).toBe(400);expect(syncSubscriptionEvent).not.toHaveBeenCalled();});
});
