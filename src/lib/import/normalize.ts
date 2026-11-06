// Normalize raw CSV/JSON lottery rows into Listing objects.
//
// The column names in the existing 1,754-record dataset aren't known yet, so
// column lookup goes through COLUMN_ALIASES — add the real header names there.
// Rule: if a value is missing or unparseable it becomes null and is reported as a
// data-quality issue. Nothing is guessed or filled in.

import { BOROUGHS, type Borough, type HouseholdRestriction, type IncomeBand, type Listing, type ListingStatus, type UnitType } from "../types";

export type RawRow = Record<string, unknown>;

export const COLUMN_ALIASES: Record<string, string[]> = {
  externalId: ["lottery_id", "lotteryid", "lottery id", "id"],
  projectName: ["project_name", "lottery_name", "name", "project", "building_name"],
  borough: ["borough", "boro"],
  address: ["address", "street_address", "building_address"],
  housingProgram: ["program", "housing_program", "development_type", "lottery_type"],
  unitTypes: ["unit_types", "bedrooms", "unit_sizes"],
  restrictions: ["restrictions", "population", "special_population"],
  isRerental: ["is_rerental", "rerental", "re_rental"],
  applicationOpenDate: ["application_start_date", "start_date", "open_date", "lottery_start_date"],
  applicationDeadline: ["application_end_date", "deadline", "end_date", "application_deadline", "lottery_end_date"],
  applicationUrl: ["application_url", "apply_url", "url"],
  sourceUrl: ["source_url", "source"],
  status: ["status", "lottery_status"],
  lastVerifiedAt: ["last_verified", "last_verified_at", "verified_at"],
  eligibilityNotes: ["notes", "eligibility_notes"],
  incomeBands: ["income_bands"], // JSON array, see IncomeBand
};

export interface ImportIssue {
  row: number;
  field: string;
  message: string;
}

const key = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, "_");

function pick(row: RawRow, field: string): unknown {
  const norm: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) norm[key(k)] = v;
  for (const alias of COLUMN_ALIASES[field] ?? [field]) {
    const v = norm[key(alias)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

const str = (v: unknown) => (v == null ? null : String(v).trim() || null);

export function parseBorough(v: unknown): Borough | null {
  const s = str(v)?.toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  const map: Record<string, Borough> = { mn: "Manhattan", bk: "Brooklyn", qn: "Queens", bx: "Bronx", si: "Staten Island", "the bronx": "Bronx", "new york": "Manhattan" };
  return map[s] ?? BOROUGHS.find((b) => b.toLowerCase() === s) ?? null;
}

export function parseDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  // Already ISO-like
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // US m/d/yyyy
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

export function parseUnitTypes(v: unknown): UnitType[] {
  const items = Array.isArray(v) ? v.map(String) : (str(v) ?? "").split(/[,;|/]/);
  const out = new Set<UnitType>();
  for (const raw of items) {
    const s = raw.trim().toLowerCase();
    if (!s) continue;
    if (/studio|^0\s*(br|bed)/.test(s)) out.add("studio");
    else if (/^1\s*(br|bed|-bed)|one/.test(s)) out.add("1br");
    else if (/^2\s*(br|bed|-bed)|two/.test(s)) out.add("2br");
    else if (/^3\s*(br|bed|-bed)|three/.test(s)) out.add("3br");
    else if (/^[4-9]\s*\+?\s*(br|bed|-bed)|four/.test(s)) out.add("4br+");
  }
  return [...out];
}

function parseRestrictions(v: unknown): HouseholdRestriction[] {
  const s = (str(v) ?? "").toLowerCase();
  const out: HouseholdRestriction[] = [];
  if (/62/.test(s) || /senior/.test(s)) out.push("senior_62plus");
  else if (/55/.test(s)) out.push("senior_55plus");
  if (/disab/.test(s)) out.push("disability");
  if (/veteran/.test(s)) out.push("veteran");
  return out;
}

function parseStatus(v: unknown, deadline: string | null, today: string): ListingStatus {
  const s = (str(v) ?? "").toLowerCase();
  if (/open|accepting/.test(s)) return deadline && deadline < today ? "closed" : "open";
  if (/upcoming|coming/.test(s)) return "upcoming";
  if (/closed|filled|selection|ended/.test(s)) return "closed";
  if (deadline) return deadline < today ? "closed" : "unknown";
  return "unknown";
}

const bool = (v: unknown) => /^(true|yes|y|1)$/i.test(String(v ?? "").trim());

function parseBands(v: unknown, rowNum: number, issues: ImportIssue[]): IncomeBand[] {
  if (v == null) return [];
  let arr: unknown = v;
  if (typeof v === "string") {
    try {
      arr = JSON.parse(v);
    } catch {
      issues.push({ row: rowNum, field: "incomeBands", message: "income_bands is not valid JSON" });
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  const num = (x: unknown) => (x == null || x === "" || isNaN(Number(x)) ? null : Number(x));
  return arr.map((b: Record<string, unknown>) => ({
    amiPercent: num(b.amiPercent ?? b.ami_percent),
    unitTypes: parseUnitTypes(b.unitTypes ?? b.unit_types ?? []),
    householdSizeMin: num(b.householdSizeMin ?? b.household_size_min),
    householdSizeMax: num(b.householdSizeMax ?? b.household_size_max),
    minIncome: num(b.minIncome ?? b.min_income),
    maxIncomeByHouseholdSize: (b.maxIncomeByHouseholdSize ?? b.max_income_by_household_size ?? null) as Record<string, number> | null,
    monthlyRent: num(b.monthlyRent ?? b.monthly_rent),
    unitCount: num(b.unitCount ?? b.unit_count),
  }));
}

export function normalizeRows(rows: RawRow[], today: string): { listings: Listing[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const listings: Listing[] = [];
  const seen = new Set<string>();

  rows.forEach((row, i) => {
    const n = i + 1;
    const projectName = str(pick(row, "projectName"));
    if (!projectName) {
      issues.push({ row: n, field: "projectName", message: "missing project name — row skipped" });
      return;
    }
    const externalId = str(pick(row, "externalId"));
    const id = externalId ? `hc-${externalId}` : `row-${n}`;
    if (seen.has(id)) {
      issues.push({ row: n, field: "externalId", message: `duplicate id ${id} — row skipped` });
      return;
    }
    seen.add(id);

    const rawBorough = pick(row, "borough");
    const borough = parseBorough(rawBorough);
    if (rawBorough && !borough) issues.push({ row: n, field: "borough", message: `unrecognized borough "${rawBorough}"` });
    const deadline = parseDate(pick(row, "applicationDeadline"));
    const rawDeadline = pick(row, "applicationDeadline");
    if (rawDeadline && !deadline) issues.push({ row: n, field: "applicationDeadline", message: `unparseable date "${rawDeadline}"` });
    const incomeBands = parseBands(pick(row, "incomeBands"), n, issues);
    if (incomeBands.length === 0) issues.push({ row: n, field: "incomeBands", message: "no income table — matcher will return NEEDS_REVIEW" });
    if (!deadline) issues.push({ row: n, field: "applicationDeadline", message: "no deadline" });

    listings.push({
      id,
      externalId,
      projectName,
      borough,
      address: str(pick(row, "address")),
      housingProgram: str(pick(row, "housingProgram")),
      unitTypes: parseUnitTypes(pick(row, "unitTypes")),
      incomeBands,
      restrictions: parseRestrictions(pick(row, "restrictions")),
      isRerental: bool(pick(row, "isRerental")),
      applicationOpenDate: parseDate(pick(row, "applicationOpenDate")),
      applicationDeadline: deadline,
      applicationUrl: str(pick(row, "applicationUrl")),
      sourceUrl: str(pick(row, "sourceUrl")),
      status: parseStatus(pick(row, "status"), deadline, today),
      lastVerifiedAt: parseDate(pick(row, "lastVerifiedAt")),
      eligibilityNotes: str(pick(row, "eligibilityNotes")),
    });
  });

  return { listings, issues };
}

/** Lifecycle bucket used by the discovery page and the alert job. */
export function lifecycle(l: Listing, today: string): "new" | "open" | "closing_soon" | "closed" | "upcoming" | "unknown" {
  if (l.status === "closed") return "closed";
  if (l.status === "upcoming") return "upcoming";
  if (l.status !== "open") return "unknown";
  const day = 86_400_000;
  const t = Date.parse(today);
  if (l.applicationDeadline && Date.parse(l.applicationDeadline) - t <= 7 * day) return "closing_soon";
  if (l.applicationOpenDate && t - Date.parse(l.applicationOpenDate) <= 7 * day) return "new";
  return "open";
}
