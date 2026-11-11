import type { Listing } from "../types";
/** Original synthetic fixtures: no real property, address, eligibility or photo is asserted. */
export function syntheticListings(today: string): Listing[] {
  const deadline = new Date(Date.parse(today) + 20 * 86400000).toISOString().slice(0, 10);
  const base: Listing = {
    id: "demo-exact", externalId: null, projectName: "DEMO Cedar Court", borough: "Bronx", address: "Synthetic address — not a real offer", housingProgram: "Synthetic test lottery", listingType: "lottery", dataSource: "manual", sourceName: "Synthetic fixture", collectedAt: `${today}T12:00:00Z`, unitTypes: ["1br", "3br"],
    incomeBands: [{ amiPercent: 50, unitTypes: ["3br"], householdSizeMin: 3, householdSizeMax: 7, minIncome: 29418, maxIncomeByHouseholdSize: { "3": 70000, "4": 80000, "5": 90000, "6": 98000, "7": 105200 }, monthlyRent: 732, unitCount: 1 }], restrictions: [], isRerental: false, applicationOpenDate: today, applicationDeadline: deadline, applicationUrl: "https://housingconnect.nyc.gov/PublicWeb/", sourceUrl: null, status: "open", lastVerifiedAt: today, eligibilityNotes: "Synthetic development record only.", isSample: true,
    preferences: { communityDistrict: null, communityDistricts: ["202", "205", "207"], communityPct: 20, mobilityPct: 5, visionHearingPct: 2, nychaPct: 0, municipalVetPct: 0 },
  };
  return [base, { ...base, id: "demo-range", projectName: "DEMO Maple Place", borough: "Queens", unitTypes: ["1br"], incomeBands: [{ amiPercent: 120, amiMinPercent: 81, amiCategory: "Middle Income", unitTypes: [], householdSizeMin: null, householdSizeMax: null, minIncome: null, maxIncomeByHouseholdSize: null, monthlyRent: null, unitCount: null }], preferences: null }, { ...base, id: "demo-waitlist", projectName: "DEMO Rolling Waitlist", listingType: "waitlist", applicationDeadline: null, status: "unknown", collectedAt: null, lastVerifiedAt: null }, { ...base, id: "demo-rerental", projectName: "DEMO Secondary Home", listingType: "rerental", isRerental: true, applicationDeadline: null, status: "unknown", collectedAt: null, lastVerifiedAt: null }];
}
