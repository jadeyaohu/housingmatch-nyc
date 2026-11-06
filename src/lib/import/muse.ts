// Ingest CSVs collected by Muse (a browser agent) and publish them automatically.
//
// Nobody reviews these files by hand, so every safeguard is automatic:
//   1. Row checks: formats, ranges, income limits rising with household size.
//   2. AMI cross-check: if a band states an AMI %, every published max income must
//      be within AMI_TOLERANCE of the HPD table. A misread digit fails this.
//   3. Quarantine: a listing with ANY bad band is held back whole (a partial income
//      table could tell someone they don't qualify when they do).
//   4. Change confirmation: a changed income table for an already-published listing
//      goes live only after a second run reads the same values.
//   5. Removal: a listing missing from its source is removed after 2 runs in a row.
//   6. Circuit breaker: if a source's run looks broken (0 rows where there were
//      many, or most rows quarantined), the whole run for that source is ignored
//      and the last good data stays up.
//   7. Staleness: a source with no successful run for STALE_DAYS is taken off the site.

import { amiMaxIncome } from "../ami";
import type { HouseholdRestriction, IncomeBand, Listing, ListingType, UnitType } from "../types";
import { parseBorough, parseDate, parseUnitTypes, type RawRow } from "./normalize";

/** Allowed spread between household sizes' ratio to the AMI table (rounding only). */
export const AMI_CONSISTENCY = 0.01;
/** Listing table ÷ HPD 2026 table must fall in this range (older years ≈ 0.91–0.96). */
export const AMI_RATIO_MIN = 0.85;
export const AMI_RATIO_MAX = 1.02;
export const STALE_DAYS = 15;
export const REMOVE_AFTER_MISSES = 2;
const MAX_SIZES = 8;

/** Column order of the CSV Muse writes. Keep docs/MUSE_RECURRING.md in sync. */
export const MUSE_COLUMNS = [
  "record_type", "source_name", "source_url", "collected_at", "lottery_id", "name", "borough", "address",
  "application_start_date", "application_end_date", "apply_url", "restrictions", "unit_type", "ami_percent",
  "household_size_min", "household_size_max", "min_income",
  ...Array.from({ length: MAX_SIZES }, (_, i) => `max_income_${i + 1}`),
  "monthly_rent", "units_available", "notes",
] as const;

export interface Rejection {
  listingId: string;
  name: string;
  source: string;
  sourceUrl: string;
  problems: string[];
}

export interface MuseState {
  /** Published Muse listings by id. */
  published: Record<string, { listing: Listing; misses: number; bandsHash: string }>;
  /** Changed income tables waiting for a second identical read. */
  pending: Record<string, { bandsHash: string; listing: Listing; firstSeen: string }>;
  sources: Record<string, { lastSuccess: string | null; lastRowCount: number; lastRunSkipped: string | null }>;
}

export const emptyState = (): MuseState => ({ published: {}, pending: {}, sources: {} });

export interface RunReport {
  ranAt: string;
  sources: Array<{
    source: string;
    status: "published" | "skipped_circuit_breaker";
    reason?: string;
    rows: number;
    listings: number;
    accepted: number;
    quarantined: number;
    added: string[];
    updated: string[];
    changeAwaitingConfirmation: string[];
    removed: string[];
  }>;
  rejections: Rejection[];
}

// ---------- parsing helpers ----------

const s = (v: unknown) => (v == null ? "" : String(v).trim());
const num = (v: unknown): number | null => {
  const t = s(v).replace(/[$,\s]/g, "");
  if (!t) return null;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
};
const slug = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

function parseType(v: string): ListingType | null {
  const t = v.toLowerCase().replace(/[\s_-]/g, "");
  if (t === "lottery") return "lottery";
  if (t === "rerental" || t === "rerentals") return "rerental";
  if (t === "waitlist" || t === "waitinglist") return "waitlist";
  return null;
}

function parseRestrictions(v: string): HouseholdRestriction[] {
  const t = v.toLowerCase();
  const out: HouseholdRestriction[] = [];
  if (/62|senior/.test(t)) out.push("senior_62plus");
  else if (/55/.test(t)) out.push("senior_55plus");
  if (/disab/.test(t)) out.push("disability");
  if (/veteran/.test(t)) out.push("veteran");
  return out;
}

export function bandsHash(bands: IncomeBand[]): string {
  const norm = bands
    .map((b) => JSON.stringify([b.unitTypes, b.amiPercent, b.householdSizeMin, b.householdSizeMax, b.minIncome, b.maxIncomeByHouseholdSize, b.monthlyRent]))
    .sort();
  return norm.join("|");
}

// ---------- row → band validation ----------

function rowToBand(r: Record<string, string>, problems: string[], label: string): IncomeBand | null {
  const unit = s(r.unit_type);
  const unitTypes: UnitType[] = unit ? parseUnitTypes(unit) : [];
  if (unit && unitTypes.length === 0) problems.push(`${label}: unknown unit_type "${unit}"`);

  const ami = num(r.ami_percent);
  const hMin = num(r.household_size_min);
  const hMax = num(r.household_size_max);
  const minInc = num(r.min_income);
  const rent = num(r.monthly_rent);
  const units = num(r.units_available);
  for (const [k, v] of Object.entries({ ami_percent: ami, household_size_min: hMin, household_size_max: hMax, min_income: minInc, monthly_rent: rent, units_available: units })) {
    if (Number.isNaN(v)) problems.push(`${label}: ${k} is not a number ("${r[k]}")`);
  }
  if (ami != null && !Number.isNaN(ami) && (ami < 10 || ami > 200)) problems.push(`${label}: ami_percent ${ami} out of range`);
  if (hMin != null && (hMin < 1 || hMin > 12)) problems.push(`${label}: household_size_min ${hMin} out of range`);
  if (hMax != null && (hMax < 1 || hMax > 12)) problems.push(`${label}: household_size_max ${hMax} out of range`);
  if (hMin != null && hMax != null && hMin > hMax) problems.push(`${label}: household_size_min > household_size_max`);

  const maxBy: Record<string, number> = {};
  let prev = 0;
  for (let k = 1; k <= MAX_SIZES; k++) {
    const v = num(r[`max_income_${k}`]);
    if (v == null) continue;
    if (Number.isNaN(v)) {
      problems.push(`${label}: max_income_${k} is not a number ("${r[`max_income_${k}`]}")`);
      continue;
    }
    if (v < 5000 || v > 1_000_000) problems.push(`${label}: max_income_${k} ${v} out of range`);
    if (v < prev) problems.push(`${label}: max_income_${k} (${v}) is lower than a smaller household's limit`);
    prev = v;
    if (hMin != null && hMax != null && (k < hMin || k > hMax)) problems.push(`${label}: max_income_${k} given but household size ${k} is outside ${hMin}–${hMax}`);
    maxBy[String(k)] = v;
  }
  // AMI cross-check. HPD limits for every household size are the same multiple of
  // the AMI table (older listings use an older year's table, so the multiple can be
  // a bit below 1). One misread digit breaks that shared multiple.
  if (ami != null && !Number.isNaN(ami)) {
    const ratios = Object.entries(maxBy)
      .map(([k, v]) => ({ k, v, t: amiMaxIncome(ami, Number(k)) }))
      .filter((x): x is { k: string; v: number; t: number } => x.t != null)
      .map((x) => ({ ...x, r: x.v / x.t }));
    if (ratios.length) {
      const rs = ratios.map((x) => x.r).sort((a, b) => a - b);
      const median = rs[Math.floor(rs.length / 2)];
      if (median < AMI_RATIO_MIN || median > AMI_RATIO_MAX) {
        problems.push(`${label}: income limits don't match ${ami}% AMI (HPD 2026 table ≈ ${ratios.map((x) => `${x.k}p ${x.t}`).join(", ")})`);
      }
      for (const x of ratios) {
        if (Math.abs(x.r - median) / median > AMI_CONSISTENCY) {
          problems.push(`${label}: max_income_${x.k} ${x.v} doesn't match ${ami}% AMI pattern of the other sizes (expected ≈ ${Math.round(x.t * median)})`);
        }
      }
    }
  }
  const maxes = Object.values(maxBy);
  if (minInc != null && maxes.length && minInc > Math.max(...maxes)) problems.push(`${label}: min_income above every max_income`);
  if (rent != null && !Number.isNaN(rent) && (rent < 100 || rent > 15000)) problems.push(`${label}: monthly_rent ${rent} out of range`);
  if (rent != null && minInc != null && rent * 12 > minInc * 1.5) problems.push(`${label}: rent ${rent}/mo is implausible for min_income ${minInc}`);

  const anyData = ami != null || maxes.length > 0 || minInc != null || rent != null || unitTypes.length > 0;
  if (!anyData) return null; // listing-only row (e.g. waitlist without an income table)

  return {
    amiPercent: ami,
    unitTypes,
    householdSizeMin: hMin,
    householdSizeMax: hMax,
    minIncome: minInc,
    maxIncomeByHouseholdSize: maxes.length ? maxBy : null,
    monthlyRent: rent,
    unitCount: units,
  };
}

// ---------- CSV rows → candidate listings ----------

export function parseMuseRows(rows: RawRow[], now: string): { listings: Listing[]; rejections: Rejection[]; bySource: Record<string, number> } {
  const today = now.slice(0, 10);
  const groups = new Map<string, Record<string, string>[]>();
  const bySource: Record<string, number> = {};
  for (const raw of rows) {
    const r: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) r[k.trim().toLowerCase()] = s(v);
    if (!r.name && !r.source_url) continue;
    const source = r.source_name || "unknown";
    bySource[source] = (bySource[source] ?? 0) + 1;
    // Housing Connect detail links carry the lottery ID (/PublicWeb/details/7667);
    // use it when the collector left lottery_id blank so the record merges with Open Data.
    if (!r.lottery_id) {
      const m = r.source_url.match(/housingconnect\.nyc\.gov\/PublicWeb\/details\/(\d+)/i);
      if (m) r.lottery_id = m[1];
    }
    const key = r.lottery_id ? `hc-${r.lottery_id}` : `muse-${slug(source)}-${slug(r.name || r.source_url)}${r.address ? "-" + slug(r.address).slice(0, 20) : ""}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const listings: Listing[] = [];
  const rejections: Rejection[] = [];
  for (const [id, rs] of groups) {
    const first = rs[0];
    const problems: string[] = [];
    const type = parseType(first.record_type);
    if (!type) problems.push(`record_type "${first.record_type}" must be lottery, rerental or waitlist`);
    if (!first.name) problems.push("missing name");
    if (!/^https?:\/\//.test(first.source_url)) problems.push("source_url must be a full http(s) link");
    if (first.apply_url && !/^https?:\/\//.test(first.apply_url)) problems.push("apply_url must be a full http(s) link");
    const collected = Date.parse(first.collected_at);
    if (Number.isNaN(collected)) problems.push("collected_at is not a date/time");
    else if (Date.parse(now) - collected > 7 * 86_400_000) problems.push("collected_at is more than 7 days old");
    else if (collected - Date.parse(now) > 86_400_000) problems.push("collected_at is in the future");
    const borough = parseBorough(first.borough);
    if (!borough) problems.push(`borough "${first.borough}" not recognized`);
    const start = parseDate(first.application_start_date);
    const end = parseDate(first.application_end_date);
    if (first.application_start_date && !start) problems.push(`bad application_start_date "${first.application_start_date}"`);
    if (first.application_end_date && !end) problems.push(`bad application_end_date "${first.application_end_date}"`);
    if (start && end && end < start) problems.push("application_end_date before application_start_date");
    if (end && Date.parse(end) - Date.parse(today) > 400 * 86_400_000) problems.push("application_end_date more than a year away");
    if (type === "lottery" && !end) problems.push("lotteries need an application_end_date");
    for (const r of rs.slice(1)) {
      for (const f of ["record_type", "name", "borough", "application_end_date", "source_url"]) {
        if (r[f] !== first[f]) problems.push(`rows for this listing disagree on ${f}`);
      }
    }

    const bands = rs.map((r, i) => rowToBand(r, problems, `row ${i + 1}`)).filter((b): b is IncomeBand => b != null);
    const unitTypes = [...new Set(bands.flatMap((b) => b.unitTypes))];

    if (problems.length) {
      rejections.push({ listingId: id, name: first.name, source: first.source_name, sourceUrl: first.source_url, problems: [...new Set(problems)] });
      continue;
    }
    const status = start && start > today ? "upcoming" : end && end < today ? "closed" : "open";
    listings.push({
      id,
      listingType: type!,
      dataSource: "muse",
      sourceName: first.source_name || null,
      collectedAt: new Date(collected).toISOString(),
      externalId: first.lottery_id || null,
      projectName: first.name,
      borough,
      address: first.address || null,
      housingProgram: type === "waitlist" ? "Waiting list" : type === "rerental" ? "Re-rental" : null,
      unitTypes,
      incomeBands: bands,
      restrictions: parseRestrictions(first.restrictions),
      isRerental: type === "rerental",
      applicationOpenDate: start,
      applicationDeadline: end,
      applicationUrl: first.apply_url || first.source_url,
      sourceUrl: first.source_url,
      status,
      lastVerifiedAt: new Date(collected).toISOString().slice(0, 10),
      eligibilityNotes: rs.map((r) => r.notes).filter(Boolean).join(" · ") || null,
    });
  }
  return { listings, rejections, bySource };
}

// ---------- apply a run to the published state ----------

export function applyRun(state: MuseState, rows: RawRow[], now: string): { state: MuseState; report: RunReport } {
  const next: MuseState = structuredClone(state);
  const { listings, rejections, bySource } = parseMuseRows(rows, now);
  const report: RunReport = { ranAt: now, sources: [], rejections };

  const sources = new Set([...Object.keys(bySource)]);
  for (const source of sources) {
    const cand = listings.filter((l) => (l.sourceName ?? "unknown") === source);
    const rej = rejections.filter((r) => (r.source || "unknown") === source);
    const total = cand.length + rej.length;
    const prevPublished = Object.values(next.published).filter((p) => p.listing.sourceName === source);
    const entry = { source, rows: bySource[source], listings: total, accepted: cand.length, quarantined: rej.length, added: [] as string[], updated: [] as string[], changeAwaitingConfirmation: [] as string[], removed: [] as string[] };
    const src = (next.sources[source] ??= { lastSuccess: null, lastRowCount: 0, lastRunSkipped: null });

    // Circuit breaker
    let skip: string | null = null;
    if (total === 0 && prevPublished.length >= 3) skip = `0 listings read, ${prevPublished.length} were published`;
    else if (total >= 4 && rej.length / total > 0.5) skip = `${rej.length}/${total} listings failed checks`;
    else if (prevPublished.length >= 5 && cand.length < prevPublished.length * 0.3) skip = `only ${cand.length} valid listings vs ${prevPublished.length} published`;
    if (skip) {
      src.lastRunSkipped = now;
      report.sources.push({ ...entry, status: "skipped_circuit_breaker", reason: skip });
      continue;
    }

    const seen = new Set<string>();
    for (const l of cand) {
      seen.add(l.id);
      const h = bandsHash(l.incomeBands);
      // Same page published earlier under a different id (e.g. before its lottery ID
      // was known): replace it instead of showing the listing twice.
      for (const [oldId, p] of Object.entries(next.published)) {
        if (oldId !== l.id && p.listing.sourceUrl === l.sourceUrl) {
          delete next.published[oldId];
          delete next.pending[oldId];
          entry.removed.push(oldId);
        }
      }
      const cur = next.published[l.id];
      if (!cur) {
        next.published[l.id] = { listing: l, misses: 0, bandsHash: h };
        entry.added.push(l.id);
        continue;
      }
      if (cur.bandsHash === h) {
        cur.listing = l;
        cur.misses = 0;
        delete next.pending[l.id];
        entry.updated.push(l.id);
        continue;
      }
      // Income table changed: require a second identical read before publishing it.
      const pend = next.pending[l.id];
      if (pend && pend.bandsHash === h) {
        next.published[l.id] = { listing: l, misses: 0, bandsHash: h };
        delete next.pending[l.id];
        entry.updated.push(l.id);
      } else {
        next.pending[l.id] = { bandsHash: h, listing: l, firstSeen: now };
        // Keep the old income table live, but refresh non-income fields (dates, links).
        cur.listing = { ...l, incomeBands: cur.listing.incomeBands, unitTypes: cur.listing.unitTypes };
        cur.misses = 0;
        entry.changeAwaitingConfirmation.push(l.id);
      }
    }
    const rejectedIds = new Set(rej.map((r) => r.listingId));
    for (const p of prevPublished) {
      const id = p.listing.id;
      if (seen.has(id) || rejectedIds.has(id)) continue; // a quarantined re-read doesn't count as missing
      p.misses += 1;
      if (p.misses >= REMOVE_AFTER_MISSES) {
        delete next.published[id];
        delete next.pending[id];
        entry.removed.push(id);
      }
    }
    src.lastSuccess = now;
    src.lastRowCount = bySource[source];
    report.sources.push({ ...entry, status: "published" });
  }
  return { state: next, report };
}

/** Listings that should be on the site: published, from a source that isn't stale. */
export function liveMuseListings(state: MuseState, now: string): Listing[] {
  const cutoff = Date.parse(now) - STALE_DAYS * 86_400_000;
  return Object.values(state.published)
    .map((p) => p.listing)
    .filter((l) => {
      const last = state.sources[l.sourceName ?? "unknown"]?.lastSuccess;
      return last != null && Date.parse(last) >= cutoff;
    });
}

/**
 * Merge Open Data and Muse. A Muse record with a Housing Connect lottery ID
 * enriches the Open Data listing (real income table, rents, direct link);
 * everything else is added alongside.
 */
export function mergeSources(openData: Listing[], muse: Listing[]): Listing[] {
  const byId = new Map(openData.map((l) => [l.id, { ...l, listingType: l.listingType ?? "lottery", dataSource: l.dataSource ?? "opendata", sourceName: l.sourceName ?? "NYC Open Data" } as Listing]));
  for (const m of muse) {
    const base = byId.get(m.id);
    if (!base) {
      byId.set(m.id, m);
      continue;
    }
    byId.set(m.id, {
      ...base,
      dataSource: "muse",
      sourceName: m.sourceName,
      collectedAt: m.collectedAt,
      borough: m.borough ?? base.borough,
      address: m.address ?? base.address,
      unitTypes: m.unitTypes.length ? m.unitTypes : base.unitTypes,
      incomeBands: m.incomeBands.length ? m.incomeBands : base.incomeBands,
      restrictions: m.restrictions.length ? m.restrictions : base.restrictions,
      applicationOpenDate: m.applicationOpenDate ?? base.applicationOpenDate,
      applicationDeadline: m.applicationDeadline ?? base.applicationDeadline,
      applicationUrl: m.applicationUrl ?? base.applicationUrl,
      status: m.status,
      lastVerifiedAt: m.lastVerifiedAt,
      eligibilityNotes: [base.eligibilityNotes, m.eligibilityNotes].filter(Boolean).join(" · ") || null,
    });
  }
  return [...byId.values()];
}
