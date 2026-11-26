import { describe, expect, it } from "vitest";
import { lifestyleFit } from "./lifestyle";
import type { IncomeBand, Listing } from "./types";

const band = (rent: number | null): IncomeBand => ({
  amiPercent: null, unitTypes: [], householdSizeMin: null, householdSizeMax: null, minIncome: null,
  maxIncomeByHouseholdSize: null, monthlyRent: rent, unitCount: null,
});
const l = (o: Partial<Listing>): Listing => ({
  id: "x", externalId: null, projectName: "X", borough: "Bronx", address: null, housingProgram: null,
  unitTypes: ["1br", "2br"], incomeBands: [band(1800), band(2400)], restrictions: [], isRerental: false,
  applicationOpenDate: null, applicationDeadline: null, applicationUrl: null, sourceUrl: null, status: "open",
  lastVerifiedAt: null, eligibilityNotes: null, ...o,
});
const none = { boroughs: [], bedrooms: [], rentMax: null };

describe("lifestyleFit", () => {
  it("no preference → null (not judged)", () => {
    expect(lifestyleFit(l({}), none)).toEqual({ borough: null, size: null, budget: null, rentFrom: 1800 });
  });
  it("borough / size yes and no", () => {
    expect(lifestyleFit(l({}), { ...none, boroughs: ["Bronx"] }).borough).toBe("yes");
    expect(lifestyleFit(l({}), { ...none, boroughs: ["Queens"] }).borough).toBe("no");
    expect(lifestyleFit(l({}), { ...none, bedrooms: ["2br"] }).size).toBe("yes");
    expect(lifestyleFit(l({}), { ...none, bedrooms: ["studio"] }).size).toBe("no");
  });
  it("budget uses the lowest published rent", () => {
    expect(lifestyleFit(l({}), { ...none, rentMax: 2000 }).budget).toBe("yes");
    expect(lifestyleFit(l({}), { ...none, rentMax: 1500 }).budget).toBe("no");
  });
  it("missing data is unknown, never no", () => {
    expect(lifestyleFit(l({ incomeBands: [band(null)] }), { ...none, rentMax: 500 }).budget).toBe("unknown");
    expect(lifestyleFit(l({ borough: null }), { ...none, boroughs: ["Bronx"] }).borough).toBe("unknown");
    expect(lifestyleFit(l({ unitTypes: [] }), { ...none, bedrooms: ["1br"] }).size).toBe("unknown");
  });
});
