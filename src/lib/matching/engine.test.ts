import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, matchAll, matchListing } from "./engine";
import type { Household, IncomeBand, Listing } from "../types";

const config = { ...DEFAULT_CONFIG, today: "2026-11-05" };

const band = (o: Partial<IncomeBand> = {}): IncomeBand => ({
  amiPercent: null,
  unitTypes: [],
  householdSizeMin: 1,
  householdSizeMax: 3,
  minIncome: 40000,
  maxIncomeByHouseholdSize: { "1": 71280, "2": 81420, "3": 91620 },
  monthlyRent: 1500,
  unitCount: 10,
  ...o,
});

const listing = (o: Partial<Listing> = {}): Listing => ({
  id: "L1",
  externalId: null,
  projectName: "Test Project",
  borough: "Brooklyn",
  address: null,
  housingProgram: null,
  unitTypes: ["1br"],
  incomeBands: [band()],
  restrictions: [],
  isRerental: false,
  applicationOpenDate: "2026-10-01",
  applicationDeadline: "2026-12-01",
  applicationUrl: null,
  sourceUrl: null,
  status: "open",
  lastVerifiedAt: null,
  eligibilityNotes: null,
  ...o,
});

const hh = (o: Partial<Household> = {}): Household => ({
  size: 2,
  annualIncome: 60000,
  boroughs: [],
  bedrooms: [],
  hasVoucher: false,
  hasMember62Plus: false,
  hasMember55Plus: false,
  hasDisability: false,
  ...o,
});

describe("matchListing", () => {
  it("does not treat a missing published minimum as a zero-dollar minimum", () => {
    const result = matchListing(hh(), listing({ incomeBands: [band({ minIncome: null })] }), config);
    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.outcomes.find((o) => o.rule === "income")?.result).toBe("unknown");
  });

  it("requires income and household-size requirements to be known on the same fitting band", () => {
    const result = matchListing(hh(), listing({ incomeBands: [
      band({ maxIncomeByHouseholdSize: { "2": 50000 } }),
      band({ householdSizeMin: null, householdSizeMax: null, maxIncomeByHouseholdSize: { "2": 100000 } }),
    ] }), config);
    expect(result.outcomes.find((o) => o.rule === "household_size")?.result).toBe("pass");
    expect(result.outcomes.find((o) => o.rule === "income")?.result).toBe("unknown");
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("a complete published fit is not downgraded merely because another band is estimated", () => {
    const result = matchListing(hh(), listing({ unitTypes: ["1br", "2br"], incomeBands: [band({ unitTypes: ["1br"] }), band({ unitTypes: ["2br"], amiPercent: 80, maxIncomeByHouseholdSize: null })] }), config);
    expect(result.status).toBe("LIKELY_MATCH");
    expect(result.quality?.fits).toEqual([{ unitTypes: ["1br"], amiPercent: null }]);
  });

  it("does not call a requested bedroom size a preference match based on a different exact qualifying unit", () => {
    const result = matchListing(hh({ bedrooms: ["2br"] }), listing({ unitTypes: ["1br", "2br"], incomeBands: [
      band({ unitTypes: ["1br"] }), band({ unitTypes: ["2br"], minIncome: 70000 }),
    ] }), config);
    expect(result.status).toBe("LIKELY_MATCH"); // Still eligible for the 1BR row, not the requested 2BR.
    expect(result.matchesPreferences).toBe(false);
  });

  it("keeps an unpaired whole-building income row uncertain when several unit sizes are listed", () => {
    const result = matchListing(hh(), listing({ unitTypes: ["1br", "2br"], incomeBands: [band({ unitTypes: [] })] }), config);
    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.quality?.fits).toEqual([]);
  });

  it("LIKELY_MATCH when income within an explicit published band", () => {
    const r = matchListing(hh(), listing(), config);
    expect(r.status).toBe("LIKELY_MATCH");
    expect(r.qualifyingBands).toHaveLength(1);
  });

  it("UNLIKELY_MATCH when income above maximum", () => {
    const r = matchListing(hh({ annualIncome: 90000 }), listing(), config);
    expect(r.status).toBe("UNLIKELY_MATCH");
    expect(r.outcomes.find((o) => o.rule === "income")?.reason.en).toContain("$81,420");
  });

  it("UNLIKELY_MATCH when below minimum and no voucher", () => {
    expect(matchListing(hh({ annualIncome: 30000 }), listing(), config).status).toBe("UNLIKELY_MATCH");
  });

  it("NEEDS_REVIEW when below minimum but household has a voucher", () => {
    expect(matchListing(hh({ annualIncome: 30000, hasVoucher: true }), listing(), config).status).toBe("NEEDS_REVIEW");
  });

  it("voucher waiver can be turned off by config", () => {
    const r = matchListing(hh({ annualIncome: 30000, hasVoucher: true }), listing(), { ...config, voucherMayWaiveMinimumIncome: false });
    expect(r.status).toBe("UNLIKELY_MATCH");
  });

  it("UNLIKELY_MATCH when household too large", () => {
    expect(matchListing(hh({ size: 5 }), listing(), config).status).toBe("UNLIKELY_MATCH");
  });

  it("UNLIKELY_MATCH when deadline has passed", () => {
    expect(matchListing(hh(), listing({ applicationDeadline: "2026-11-01" }), config).status).toBe("UNLIKELY_MATCH");
  });

  it("NEEDS_REVIEW when the deadline is missing", () => {
    expect(matchListing(hh(), listing({ applicationDeadline: null }), config).status).toBe("NEEDS_REVIEW");
  });

  it("NEEDS_REVIEW when income is only estimated from AMI %", () => {
    const l = listing({ incomeBands: [band({ amiPercent: 60, maxIncomeByHouseholdSize: null })] });
    const r = matchListing(hh(), l, config); // 60% AMI, 2 people = $81,420
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.qualifyingBands).toHaveLength(1);
  });

  it("NEEDS_REVIEW (not a guess) when no income table exists", () => {
    expect(matchListing(hh(), listing({ incomeBands: [] }), config).status).toBe("NEEDS_REVIEW");
  });

  it("fits when any of several bands matches", () => {
    const l = listing({
      incomeBands: [band({ minIncome: 70000, maxIncomeByHouseholdSize: { "2": 120000 } }), band()],
    });
    expect(matchListing(hh(), l, config).status).toBe("LIKELY_MATCH");
  });

  it("senior housing: fail without a 62+ member, review when unknown", () => {
    const l = listing({ restrictions: ["senior_62plus"] });
    expect(matchListing(hh(), l, config).status).toBe("UNLIKELY_MATCH");
    expect(matchListing(hh({ hasMember62Plus: null }), l, config).status).toBe("NEEDS_REVIEW");
    expect(matchListing(hh({ hasMember62Plus: true }), l, config).status).toBe("LIKELY_MATCH");
  });

  it("every outcome carries English and Chinese explanations", () => {
    for (const o of matchListing(hh(), listing(), config).outcomes) {
      expect(o.reason.en.length).toBeGreaterThan(0);
      expect(o.reason.zh.length).toBeGreaterThan(0);
    }
  });
});

describe("matchAll", () => {
  it("sorts preferred borough and likely matches first", () => {
    const listings = [
      listing({ id: "queens", borough: "Queens" }),
      listing({ id: "bk-unlikely", incomeBands: [band({ maxIncomeByHouseholdSize: { "2": 50000 } })] }),
      listing({ id: "bk-likely" }),
    ];
    const ids = matchAll(hh({ boroughs: ["Brooklyn"] }), listings, config).map((x) => x.listing.id);
    expect(ids).toEqual(["bk-likely", "bk-unlikely", "queens"]);
  });
});
