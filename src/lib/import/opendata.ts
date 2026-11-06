// Adapter for NYC Open Data "Advertised Lotteries on Housing Connect"
//   By Lottery  (vy5i-a666) — one row per lottery
//   By Building (nibs-na6y) — one row per building, joined on Lottery ID
//
// What this data does and doesn't give us:
//   ✓ dates, borough, unit counts by size, unit counts by HPD income category,
//     preference set-aside percentages
//   ✗ dollar income limits per household size, rents, household-size ranges, and
//     which unit sizes are at which income level (sizes and categories aren't crossed)
// So each income category becomes a band with an AMI *range* (estimated), and the
// matcher returns NEEDS_REVIEW rather than LIKELY_MATCH for these listings.

import type { Borough, HouseholdRestriction, IncomeBand, Listing, ListingStatus, UnitType } from "../types";
import { parseDate, type RawRow } from "./normalize";

export const OPEN_DATA = {
  lotteriesCsv: "https://data.cityofnewyork.us/api/views/vy5i-a666/rows.csv?accessType=DOWNLOAD",
  buildingsCsv: "https://data.cityofnewyork.us/api/views/nibs-na6y/rows.csv?accessType=DOWNLOAD",
  lotteriesPage: "https://data.cityofnewyork.us/d/vy5i-a666",
  housingConnect: "https://housingconnect.nyc.gov/PublicWeb/",
  /** Public lottery detail page; pattern confirmed on housingconnect.nyc.gov (e.g. /details/7729). */
  lotteryDetails: (id: string) => `https://housingconnect.nyc.gov/PublicWeb/details/${encodeURIComponent(id)}`,
};

// HPD income categories as AMI ranges (upper bound inclusive).
export const AMI_CATEGORIES: Array<{ col: string; label: string; min: number | null; max: number | null }> = [
  { col: "Applied Income AMI Category - Extremely Low Income", label: "Extremely Low Income", min: null, max: 30 },
  { col: "Applied Income AMI Category - Very Low Income", label: "Very Low Income", min: 31, max: 50 },
  { col: "Applied Income AMI Category - Low Income", label: "Low Income", min: 51, max: 80 },
  { col: "Applied Income AMI Category - Moderate Income", label: "Moderate Income", min: 81, max: 120 },
  { col: "Applied Income AMI Category - Middle Income", label: "Middle Income", min: 121, max: 165 },
  { col: "Applied Income AMI Category - Above Middle Income", label: "Above Middle Income", min: 166, max: null },
];

const UNIT_COLS: Array<[string, UnitType]> = [
  ["Unit Distribution - Studio", "studio"],
  ["Unit Distribution - 1 Bedroom", "1br"],
  ["Unit Distribution - 2 Bedrooms", "2br"],
  ["Unit Distribution - 3 Bedrooms", "3br"],
  ["Unit Distribution - 4 Bedroom+", "4br+"],
  ["Unit Distribution - 4 Bedrooms+", "4br+"],
];

const PREF_COLS: Array<[string, string]> = [
  ["Lottery Community Board Percentage", "Community board residents"],
  ["Lottery Mobility Percentage", "Mobility disability"],
  ["Lottery Vision/Hearing Percentage", "Vision/hearing disability"],
  ["Lottery Municipal Employee/Military Veteran Percentage", "City employees / veterans"],
  ["Lottery NYCHA Percentage", "NYCHA residents"],
  ["Lottery Senior Percentage", "Seniors (62+)"],
];

const BORO: Record<string, Borough> = { MN: "Manhattan", BK: "Brooklyn", QN: "Queens", BX: "Bronx", SI: "Staten Island" };

/** Open Data headers have stray trailing spaces ("Lottery Status "); normalize them. */
export function cleanKeys(row: RawRow): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) out[k.trim().replace(/\s+/g, " ")] = v == null ? "" : String(v).trim();
  return out;
}

const int = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : 0);

export function isOpenDataLotteries(headers: string[]): boolean {
  const h = headers.map((x) => x.trim());
  return h.includes("Lottery ID") && h.includes("Lottery End Date") && h.some((x) => x.startsWith("Applied Income AMI Category"));
}

function statusFromDates(start: string | null, end: string | null, today: string): ListingStatus {
  // The Open Data status field lags (many "Active" rows are past their deadline), so use dates.
  if (start && start > today) return "upcoming";
  if (end && end >= today) return "open";
  if (end && end < today) return "closed";
  return "unknown";
}

export function fromOpenData(lotteryRows: RawRow[], buildingRows: RawRow[], today: string): Listing[] {
  const buildingsByLottery = new Map<string, Record<string, string>[]>();
  for (const raw of buildingRows) {
    const b = cleanKeys(raw);
    const id = b["Lottery ID"];
    if (!id) continue;
    buildingsByLottery.set(id, [...(buildingsByLottery.get(id) ?? []), b]);
  }

  const seen = new Set<string>();
  const out: Listing[] = [];
  for (const raw of lotteryRows) {
    const r = cleanKeys(raw);
    const lotteryId = r["Lottery ID"];
    if (!lotteryId || !r["Lottery Name"] || seen.has(lotteryId)) continue;
    seen.add(lotteryId);

    const unitTypes = [...new Set(UNIT_COLS.filter(([c]) => int(r[c]) > 0).map(([, u]) => u))];
    const incomeBands: IncomeBand[] = AMI_CATEGORIES.filter((c) => int(r[c.col]) > 0).map((c) => ({
      amiPercent: c.max,
      amiMinPercent: c.min,
      amiCategory: c.label,
      unitTypes: [], // sizes and income categories are not crossed in this data
      householdSizeMin: null,
      householdSizeMax: null,
      minIncome: null,
      maxIncomeByHouseholdSize: null,
      monthlyRent: null,
      unitCount: int(r[c.col]),
    }));

    const prefs = PREF_COLS.filter(([c]) => int(r[c]) > 0).map(([c, label]) => `${label} ${int(r[c])}%`);
    const restrictions: HouseholdRestriction[] = int(r["Lottery Senior Percentage"]) >= 100 ? ["senior_62plus"] : [];

    const buildings = buildingsByLottery.get(lotteryId) ?? [];
    const addresses = buildings
      .map((b) => [b["House Number"], b["Street Name"]].filter(Boolean).join(" "))
      .filter(Boolean);
    const address = addresses.length === 0 ? null : addresses.length === 1 ? addresses[0] : `${addresses[0]} + ${addresses.length - 1} more`;

    // Lottery rows sometimes leave Borough blank or say "Multiple"; fall back to the
    // buildings' borough when they all agree. Otherwise leave it null.
    const bldBoros = [...new Set(buildings.map((b) => BORO[b["Borough"]]).filter(Boolean))];
    const borough = BORO[r["Borough"]] ?? (bldBoros.length === 1 ? bldBoros[0] : null);

    const start = parseDate(r["Lottery Start Date"]);
    const end = parseDate(r["Lottery End Date"]);
    const total = int(r["Unit Count"]);

    out.push({
      id: `hc-${lotteryId}`,
      externalId: lotteryId,
      projectName: r["Lottery Name"].replace(/\s+/g, " "),
      borough,
      address,
      housingProgram: r["Development Type"] === "Owner" ? "Homeownership" : r["Development Type"] || null,
      unitTypes,
      incomeBands,
      restrictions,
      isRerental: false,
      applicationOpenDate: start,
      applicationDeadline: end,
      applicationUrl: OPEN_DATA.lotteryDetails(lotteryId),
      sourceUrl: OPEN_DATA.lotteriesPage,
      status: statusFromDates(start, end, today),
      lastVerifiedAt: null,
      eligibilityNotes:
        [total ? `${total} units` : null, prefs.length ? `Preferences: ${prefs.join(", ")}` : null, r["Lottery Status"] ? `Open Data status: ${r["Lottery Status"]}` : null]
          .filter(Boolean)
          .join(" · ") || null,
    });
  }
  return out;
}
