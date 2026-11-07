// SYNTHETIC fixtures for Issue #5 Phase A. These model the *shape* of two reported cases;
// they are not copies of real listing records and must never be imported into data/.
// IDs and Housing Connect URLs use fake numbers (9xxxx).
import type { Household, IncomeBand, Listing } from "../../types";

export const TODAY = "2026-11-06"; // NYC calendar date used by all fixture tests
export const HH_3_85K: Household = {
  size: 3,
  annualIncome: 85_000,
  boroughs: [],
  bedrooms: [],
  hasVoucher: false,
  hasMember62Plus: null,
  hasMember55Plus: null,
  hasDisability: null,
};

const band = (b: Partial<IncomeBand>): IncomeBand => ({
  amiPercent: null,
  unitTypes: [],
  householdSizeMin: null,
  householdSizeMax: null,
  minIncome: null,
  maxIncomeByHouseholdSize: null,
  monthlyRent: null,
  unitCount: null,
  ...b,
});

const base = (l: Partial<Listing> & Pick<Listing, "id" | "projectName">): Listing => ({
  listingType: "lottery",
  dataSource: "opendata",
  sourceName: "NYC Open Data",
  collectedAt: null,
  externalId: l.id.replace(/\D/g, ""),
  borough: "Manhattan",
  address: null,
  housingProgram: null,
  unitTypes: [],
  incomeBands: [],
  restrictions: [],
  isRerental: false,
  applicationOpenDate: "2026-10-01",
  applicationDeadline: "2026-11-20",
  applicationUrl: `https://housingconnect.nyc.gov/PublicWeb/details/${l.id.replace(/\D/g, "")}`,
  sourceUrl: "https://data.cityofnewyork.us/d/vy5i-a666",
  status: "open",
  lastVerifiedAt: null,
  eligibilityNotes: null,
  ...l,
});

/** F1 — "345 E 17th-like": studio-only, two HPD category bands, every constraint null, closes in 3 days. */
export const F1 = base({
  id: "hc-90001",
  projectName: "F1 Synthetic Studio Lottery",
  unitTypes: ["studio"],
  applicationDeadline: "2026-11-09",
  incomeBands: [
    band({ amiPercent: 80, amiMinPercent: 51, amiCategory: "Low Income", unitCount: 10 }),
    band({ amiPercent: 120, amiMinPercent: 81, amiCategory: "Moderate Income", unitCount: 3 }),
  ],
});

/** F2 — "6-05 129th-like" as Open Data has it: 1BR+2BR, one Middle Income category band, nulls. */
export const F2 = base({
  id: "hc-90002",
  projectName: "F2 Synthetic Middle-Income Lottery",
  borough: "Queens",
  unitTypes: ["1br", "2br"],
  applicationDeadline: "2026-11-11",
  incomeBands: [band({ amiPercent: 165, amiMinPercent: 121, amiCategory: "Middle Income", unitCount: 4 })],
});

/**
 * F3 — HYPOTHETICAL listing with a published, unit-specific income chart in the shape of the
 * reported 6-05 case (1BR 130% AMI with a minimum just under $85k; 2BR minimum above it).
 * Numbers are fixture inputs for testing the engine, not canonical data.
 */
export const F3 = base({
  id: "hc-90003",
  projectName: "F3 Synthetic Published-Chart Lottery",
  borough: "Queens",
  dataSource: "muse",
  sourceName: "Housing Connect",
  collectedAt: "2026-11-06T02:00:00.000Z",
  unitTypes: ["1br", "2br"],
  applicationDeadline: "2026-11-25",
  incomeBands: [
    band({ amiPercent: 130, unitTypes: ["1br"], householdSizeMin: 1, householdSizeMax: 3, minIncome: 84_103, maxIncomeByHouseholdSize: { "3": 198_510 } }),
    band({ amiPercent: 130, unitTypes: ["2br"], householdSizeMin: 2, householdSizeMax: 5, minIncome: 96_652, maxIncomeByHouseholdSize: { "3": 198_510 } }),
  ],
});

/** F4 — AMI gap: published bands end at $80k and start at $90k. */
export const F4 = base({
  id: "hc-90004",
  projectName: "F4 Synthetic AMI-Gap Lottery",
  dataSource: "muse",
  sourceName: "Housing Connect",
  unitTypes: ["1br"],
  incomeBands: [
    band({ amiPercent: 50, unitTypes: ["1br"], householdSizeMin: 1, householdSizeMax: 3, maxIncomeByHouseholdSize: { "3": 80_000 } }),
    band({ amiPercent: 100, unitTypes: ["1br"], householdSizeMin: 1, householdSizeMax: 3, minIncome: 90_000, maxIncomeByHouseholdSize: { "3": 150_000 } }),
  ],
});

/** F5 — published household-size restriction: studios for at most 2 people. */
export const F5 = base({
  id: "hc-90005",
  projectName: "F5 Synthetic Small-Household Lottery",
  dataSource: "muse",
  sourceName: "Housing Connect",
  unitTypes: ["studio"],
  incomeBands: [band({ amiPercent: 80, unitTypes: ["studio"], householdSizeMin: 1, householdSizeMax: 2, maxIncomeByHouseholdSize: { "1": 95_000, "2": 108_000 } })],
});

/**
 * F6 — an unrelated band is populated (explicit chart for 1–2 people only) plus a category-only band.
 * For a 3-person household the explicit band is excluded, so the tier must stay category_only.
 */
export const F6 = base({
  id: "hc-90006",
  projectName: "F6 Synthetic Mixed-Data Lottery",
  borough: "Brooklyn",
  unitTypes: ["studio", "2br"],
  applicationDeadline: "2026-11-15",
  incomeBands: [
    band({ amiPercent: 60, unitTypes: ["studio"], householdSizeMin: 1, householdSizeMax: 2, maxIncomeByHouseholdSize: { "1": 71_000, "2": 81_000 } }),
    band({ amiPercent: 80, amiMinPercent: 51, amiCategory: "Low Income" }),
  ],
});

export const ALL_FIXTURES: Listing[] = [F1, F2, F3, F4, F5, F6];
