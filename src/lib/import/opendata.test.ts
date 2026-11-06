import { readFileSync, existsSync } from "node:fs";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { fromOpenData } from "./opendata";
import { DEFAULT_CONFIG, matchListing } from "../matching/engine";
import type { Household } from "../types";

const row = {
  "Lottery ID": "3249",
  "Lottery Name": "Melrose North Apartments",
  "Lottery Status ": "Active",
  "Development Type": "Rental",
  "Lottery Start Date ": "10/20/2026",
  "Lottery End Date": "12/01/2026",
  "Unit Count": "67",
  "Unit Distribution - 1 Bedroom": "36",
  "Unit Distribution - 2 Bedrooms": "25",
  "Unit Distribution - 3 Bedrooms ": "6",
  "Applied Income AMI Category - Very Low Income": "26",
  "Applied Income AMI Category - Low Income": "41",
  "Lottery Community Board Percentage ": "50",
  "Lottery Senior Percentage": "",
  Borough: "BX",
};
const building = { "Lottery ID": "3249", "House Number": "700", "Street Name": "MELROSE AVE" };
const today = "2026-11-05";
const config = { ...DEFAULT_CONFIG, today };
const hh = (o: Partial<Household> = {}): Household => ({
  size: 3, annualIncome: 85000, boroughs: [], bedrooms: [], hasVoucher: false,
  hasMember62Plus: false, hasMember55Plus: false, hasDisability: false, ...o,
});

describe("fromOpenData", () => {
  const [l] = fromOpenData([row], [building], today);

  it("maps fields and trims messy headers", () => {
    expect(l).toMatchObject({ id: "hc-3249", borough: "Bronx", address: "700 MELROSE AVE", status: "open", unitTypes: ["1br", "2br", "3br"] });
    expect(l.incomeBands.map((b) => [b.amiCategory, b.amiMinPercent, b.amiPercent, b.unitCount])).toEqual([
      ["Very Low Income", 31, 50, 26],
      ["Low Income", 51, 80, 41],
    ]);
    expect(l.eligibilityNotes).toContain("Community board residents 50%");
  });

  it("uses dates, not the lagging status field", () => {
    const [past] = fromOpenData([{ ...row, "Lottery End Date": "10/01/2026" }], [], today);
    expect(past.status).toBe("closed");
  });

  it("household at ~56% AMI fits the Low Income category → NEEDS_REVIEW (estimated), not LIKELY", () => {
    const r = matchListing(hh(), l, config); // 85,000 / 152,700 ≈ 55.7% AMI
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.qualifyingBands.map((b) => b.amiCategory)).toEqual(["Low Income"]);
  });

  it("household above every category → UNLIKELY", () => {
    expect(matchListing(hh({ annualIncome: 200000 }), l, config).status).toBe("UNLIKELY_MATCH");
  });

  it("household below every category → NEEDS_REVIEW with a minimum-income warning, not a hard fail", () => {
    const r = matchListing(hh({ annualIncome: 20000 }), l, config);
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.qualifyingBands).toHaveLength(0);
    expect(r.outcomes.find((o) => o.rule === "income")?.reason.en).toMatch(/minimum income/);
  });

  it("100% senior set-aside becomes a 62+ restriction", () => {
    const [s] = fromOpenData([{ ...row, "Lottery Senior Percentage": "100" }], [], today);
    expect(s.restrictions).toEqual(["senior_62plus"]);
  });
});

const lot = "data/opendata/lotteries.csv";
describe.runIf(existsSync(lot))("real Open Data snapshot", () => {
  it("imports all 1,754 lotteries", () => {
    const parse = (p: string) => Papa.parse<Record<string, string>>(readFileSync(p, "utf8"), { header: true, skipEmptyLines: true }).data;
    const listings = fromOpenData(parse(lot), parse("data/opendata/buildings.csv"), today);
    expect(listings).toHaveLength(1754);
    expect(listings.every((l) => l.borough !== undefined)).toBe(true);
  });
});
