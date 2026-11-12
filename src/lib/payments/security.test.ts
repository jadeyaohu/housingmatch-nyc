import { afterEach, describe, it, expect, vi } from "vitest";
import { POST as checkout } from "@/app/api/consultation/payments/checkout/route";
import { POST as webhook } from "@/app/api/consultation/payments/webhook/route";
import { GET as status } from "@/app/api/consultation/payments/status/route";
afterEach(()=>vi.unstubAllEnvs());
describe("Pricing v3 retires consultation payments",()=>{
  it("old enablement flags cannot open Checkout, status or webhook",()=>{
    vi.stubEnv("CONSULTATION_STRIPE_ENABLED","true");
    for(const handler of [checkout,webhook,status]) expect(handler().status).toBe(410);
  });
});
