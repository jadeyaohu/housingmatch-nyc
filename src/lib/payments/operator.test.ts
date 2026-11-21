import { describe,it,expect } from "vitest";
import { POST as invite } from "@/app/api/consultation/payments/invite/route";
import { POST as refund } from "@/app/api/consultation/payments/refund/route";
import { POST as confirm } from "@/app/api/consultation/payments/confirm/route";
describe("superseded consultation operators",()=>{
  it("cannot invite, charge/refund or confirm through retired routes",()=>{
    for(const handler of [invite,refund,confirm]) expect(handler().status).toBe(410);
  });
});
