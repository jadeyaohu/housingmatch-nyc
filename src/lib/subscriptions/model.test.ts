import {describe,it,expect} from "vitest";
import {PLANS,checkoutInput,nyDay} from "./model";
describe("Pricing v3 and NY day",()=>{
  it("sets exact monthly prices and 1/5/15 quotas",()=>{expect(PLANS).toEqual({free:{cents:0,messages:1},basic:{cents:499,messages:5},smart:{cents:999,messages:15}});});
  it.each([{}, {plan:"premium",consent:true},{plan:"basic",consent:false},{plan:"smart",consent:true,amount:1}])("denies unsupported or manipulated checkout %j",x=>expect(checkoutInput.safeParse(x).success).toBe(false));
  it.each([["2026-03-08T04:59:59Z","2026-03-07"],["2026-03-08T05:00:00Z","2026-03-08"],["2026-03-09T04:00:00Z","2026-03-09"],["2026-11-01T03:59:59Z","2026-10-31"],["2026-11-01T04:00:00Z","2026-11-01"],["2026-11-02T05:00:00Z","2026-11-02"]])("resolves %s to %s",(iso,day)=>expect(nyDay(new Date(iso))).toBe(day));
});
