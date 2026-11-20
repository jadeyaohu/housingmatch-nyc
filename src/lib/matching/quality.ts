// Data-completeness assessment for a match result (Issue #5, Phase A).
//
// PURELY DESCRIPTIVE: derived only from fields already present in the listing record and the
// engine's own outcome. It never changes `status`, never invents a threshold, and never turns an
// unknown into a pass. Wording rules for the UI live in i18n.ts (quality_*).

import type { Household, IncomeBand, Listing, MatchResult, MatchStatus, UnitType } from "../types";

/**
 * How much explicit income data our record holds for the bands that are relevant to THIS
 * household (the qualifying bands if any, otherwise the bands not excluded by household size).
 *
 * - `published_limits`: at least one relevant band carries an explicit income limit for this
 *   household size (`maxIncomeByHouseholdSize[size]`) and/or an explicit `minIncome`.
 *   This does NOT mean the official chart is complete, that every constraint was checked, or that
 *   anyone verified it manually.
 * - `category_only`: relevant bands only carry an AMI percent / HPD income category.
 * - `none`: no income bands at all.
 */
export type DataTier = "published_limits" | "category_only" | "none";

export type QualityWarning =
  | "income_limit_unpublished" // no explicit max for this household size in the relevant bands
  | "min_income_unpublished" // no explicit minimum income in the relevant bands
  | "estimated_from_category" // the income outcome relies on a general HPD AMI category/percent
  | "household_size_unpublished" // no relevant band publishes household-size limits
  | "unit_pairing_unpublished" // listing has several unit sizes but bands aren't tied to unit sizes
  | "not_manually_verified"; // lastVerifiedAt is null

export interface ResultQuality {
  tier: DataTier;
  warnings: QualityWarning[];
  /** Unit sizes listed by the source (a fact, shown as-is). */
  unitsListed: UnitType[];
  /** Calendar days from today (NYC date) to the deadline; null if no deadline. */
  daysToDeadline: number | null;
  /** 0–3 NYC calendar days left and the lottery isn't closed/expired. */
  closingSoon: boolean;
  /** For published_limits results only: facts from qualifying bands (unit sizes + AMI %), no dollars. */
  fits: Array<{ unitTypes: UnitType[]; amiPercent: number | null }>;
}

export const CLOSING_SOON_DAYS = 3;

/** Whole calendar days between two ISO dates (YYYY-MM-DD), interpreted as calendar dates, not instants. */
export function calendarDaysBetween(fromIso: string, toIso: string): number | null {
  const p = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.slice(0, 10));
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const a = p(fromIso);
  const b = p(toIso);
  if (a == null || b == null) return null;
  return Math.round((b - a) / 86_400_000);
}

function sizeFits(band: IncomeBand, size: number): boolean | null {
  if (band.householdSizeMin == null && band.householdSizeMax == null) return null;
  if (band.householdSizeMin != null && size < band.householdSizeMin) return false;
  if (band.householdSizeMax != null && size > band.householdSizeMax) return false;
  return true;
}

const hasExplicitMax = (b: IncomeBand, size: number) => b.maxIncomeByHouseholdSize?.[String(size)] != null;
const hasExplicitLimits = (b: IncomeBand, size: number) => hasExplicitMax(b, size) || b.minIncome != null;

export function assessQuality(
  listing: Listing,
  household: Household,
  result: Pick<MatchResult, "status" | "qualifyingBands" | "outcomes">,
  today: string,
): ResultQuality {
  const size = household.size;
  const bands = listing.incomeBands;
  const candidates = bands.filter((b) => sizeFits(b, size) !== false);
  // Judge completeness on the bands this result actually rests on.
  const relevant = result.qualifyingBands.length > 0 ? result.qualifyingBands : candidates;

  let tier: DataTier;
  if (bands.length === 0) tier = "none";
  else if (relevant.some((b) => hasExplicitLimits(b, size))) tier = "published_limits";
  else tier = "category_only";

  const warnings: QualityWarning[] = [];
  if (relevant.length === 0 || !relevant.some((b) => hasExplicitMax(b, size))) warnings.push("income_limit_unpublished");
  if (relevant.length === 0 || relevant.every((b) => b.minIncome == null)) warnings.push("min_income_unpublished");
  const income = result.outcomes.find((o) => o.rule === "income");
  if (income?.result === "unknown" && relevant.some((b) => !hasExplicitMax(b, size) && (b.amiPercent != null || b.amiCategory))) {
    warnings.push("estimated_from_category");
  }
  if (relevant.length === 0 || relevant.every((b) => b.householdSizeMin == null && b.householdSizeMax == null)) {
    warnings.push("household_size_unpublished");
  }
  if (listing.unitTypes.length > 1 && relevant.some((b) => b.unitTypes.length === 0)) warnings.push("unit_pairing_unpublished");
  if (!listing.lastVerifiedAt) warnings.push("not_manually_verified");

  const daysToDeadline = listing.applicationDeadline ? calendarDaysBetween(today, listing.applicationDeadline) : null;
  const deadlineFailed = result.outcomes.some((o) => o.rule === "deadline" && o.result === "fail");
  const closingSoon =
    listing.status !== "closed" && !deadlineFailed && daysToDeadline != null && daysToDeadline >= 0 && daysToDeadline <= CLOSING_SOON_DAYS;

  const fits =
    tier === "published_limits" && result.status === "LIKELY_MATCH"
      ? result.qualifyingBands.filter((b) => hasExplicitLimits(b, size)).map((b) => ({ unitTypes: b.unitTypes, amiPercent: b.amiPercent }))
      : [];

  return { tier, warnings, unitsListed: listing.unitTypes, daysToDeadline, closingSoon, fits };
}

export const TIER_ORDER: Record<DataTier, number> = { published_limits: 0, category_only: 1, none: 2 };
export const STATUS_ORDER: Record<MatchStatus, number> = { LIKELY_MATCH: 0, NEEDS_REVIEW: 1, UNLIKELY_MATCH: 2 };
