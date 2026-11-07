// Configurable rules engine for preliminary eligibility matching.
//
// Each rule returns pass / fail / unknown with a bilingual explanation.
// Combination: any fail -> UNLIKELY_MATCH; else any unknown -> NEEDS_REVIEW;
// else LIKELY_MATCH. Results are preliminary and never an official determination.

import { amiMaxIncome } from "../ami";
import { assessQuality, STATUS_ORDER, TIER_ORDER } from "./quality";
import type {
  Household,
  IncomeBand,
  Listing,
  MatchResult,
  MatchStatus,
  RuleOutcome,
} from "../types";

export interface MatchConfig {
  /** Today's date (ISO) — injectable for tests and scheduled jobs. */
  today: string;
  /** Rule names to skip. */
  disabledRules?: string[];
  /**
   * Many NYC lotteries waive the minimum income for applicants with a rental
   * subsidy, but not all. When true, a voucher holder below the minimum gets
   * NEEDS_REVIEW instead of UNLIKELY_MATCH.
   */
  voucherMayWaiveMinimumIncome: boolean;
}

export const DEFAULT_CONFIG: Omit<MatchConfig, "today"> = {
  voucherMayWaiveMinimumIncome: true,
};

interface RuleContext {
  household: Household;
  listing: Listing;
  config: MatchConfig;
  /** Scratch space so the income rule can report which bands fit. */
  qualifyingBands: IncomeBand[];
}

type Rule = { name: string; evaluate: (ctx: RuleContext) => RuleOutcome };

const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;

/** Linear AMI estimate for percentages not printed in the HPD table (e.g. 50 → 49%). */
function approxAmi(percent: number, size: number): number | null {
  const base = amiMaxIncome(100, size);
  return base == null ? null : Math.round((base * percent) / 100);
}

// ---------- Rules ----------

const deadlineRule: Rule = {
  name: "deadline",
  evaluate: ({ listing, config }) => {
    if (listing.status === "closed") {
      return { rule: "deadline", result: "fail", reason: { en: "This lottery is closed.", zh: "该项目已截止申请。" } };
    }
    if (!listing.applicationDeadline && (listing.listingType === "rerental" || listing.listingType === "waitlist")) {
      return {
        rule: "deadline",
        result: "pass",
        reason: {
          en: listing.listingType === "waitlist" ? "Open waiting list — no fixed deadline." : "Rolling vacancy — apply while it's still available.",
          zh: listing.listingType === "waitlist" ? "等候名单开放中，无固定截止日期。" : "滚动空房，在房源仍可用时申请。",
        },
      };
    }
    if (!listing.applicationDeadline) {
      return {
        rule: "deadline",
        result: "unknown",
        reason: { en: "No application deadline is on file — check the official listing.", zh: "暂无截止日期信息，请查看官方页面。" },
      };
    }
    if (listing.applicationDeadline < config.today) {
      return {
        rule: "deadline",
        result: "fail",
        reason: {
          en: `The application deadline (${listing.applicationDeadline}) has passed.`,
          zh: `申请截止日期（${listing.applicationDeadline}）已过。`,
        },
      };
    }
    return {
      rule: "deadline",
      result: "pass",
      reason: { en: `Accepting applications until ${listing.applicationDeadline}.`, zh: `申请截止日期：${listing.applicationDeadline}。` },
    };
  },
};

function bandMaxIncome(band: IncomeBand, size: number): { value: number | null; estimated: boolean } {
  const explicit = band.maxIncomeByHouseholdSize?.[String(size)];
  if (explicit != null) return { value: explicit, estimated: false };
  if (band.amiPercent != null) return { value: amiMaxIncome(band.amiPercent, size), estimated: true };
  return { value: null, estimated: false };
}

function sizeFits(band: IncomeBand, size: number): boolean | null {
  if (band.householdSizeMin == null && band.householdSizeMax == null) return null;
  if (band.householdSizeMin != null && size < band.householdSizeMin) return false;
  if (band.householdSizeMax != null && size > band.householdSizeMax) return false;
  return true;
}

const householdSizeRule: Rule = {
  name: "household_size",
  evaluate: ({ household, listing }) => {
    const checks = listing.incomeBands.map((b) => sizeFits(b, household.size));
    if (checks.length === 0 || checks.every((c) => c === null)) {
      return {
        rule: "household_size",
        result: "unknown",
        reason: { en: "Household size limits are not published for this listing.", zh: "该项目未公布家庭人数要求。" },
      };
    }
    if (checks.some((c) => c === true)) {
      return {
        rule: "household_size",
        result: "pass",
        reason: { en: `Some units accept a ${household.size}-person household.`, zh: `部分单位接受 ${household.size} 人家庭。` },
      };
    }
    if (checks.some((c) => c === null)) {
      return {
        rule: "household_size",
        result: "unknown",
        reason: { en: "Household size limits are only partly published.", zh: "家庭人数要求信息不完整。" },
      };
    }
    return {
      rule: "household_size",
      result: "fail",
      reason: { en: `No units list a ${household.size}-person household as eligible.`, zh: `没有单位接受 ${household.size} 人家庭。` },
    };
  },
};

const incomeRule: Rule = {
  name: "income",
  evaluate: (ctx) => {
    const { household, listing, config } = ctx;
    const inc = household.annualIncome;
    const bands = listing.incomeBands.filter((b) => sizeFits(b, household.size) !== false);
    if (bands.length === 0) {
      return { rule: "income", result: "unknown", reason: { en: "No income table is on file for this listing.", zh: "暂无该项目的收入要求表。" } };
    }

    let fits = false;
    let fitsEstimated = false;
    let unknown = false;
    let belowMinWithVoucher = false;
    let belowCategory = false;
    let closestMax: number | null = null;
    let lowestMin: number | null = null;

    for (const band of bands) {
      const { value: max, estimated } = bandMaxIncome(band, household.size);
      if (band.minIncome != null) lowestMin = lowestMin == null ? band.minIncome : Math.min(lowestMin, band.minIncome);
      if (max == null) {
        unknown = true;
        continue;
      }
      closestMax = closestMax == null ? max : Math.max(closestMax, max);
      if (inc > max) continue;
      if (band.minIncome != null && inc < band.minIncome) {
        if (household.hasVoucher && config.voucherMayWaiveMinimumIncome) belowMinWithVoucher = true;
        continue;
      }
      if (band.minIncome == null && band.amiMinPercent != null) {
        // Category-only data: below the category's AMI range is a warning, not a fail.
        const estMin = amiMaxIncome(band.amiMinPercent - 1, household.size) ?? approxAmi(band.amiMinPercent - 1, household.size);
        if (estMin != null && inc <= estMin) {
          belowCategory = true;
          continue;
        }
      }
      fits = true;
      if (estimated) fitsEstimated = true;
      ctx.qualifyingBands.push(band);
    }

    if (fits && !fitsEstimated) {
      return { rule: "income", result: "pass", reason: { en: "Your income falls within a published income band.", zh: "您的收入在公布的收入范围内。" } };
    }
    if (fits) {
      const cats = [...new Set(ctx.qualifyingBands.map((b) => b.amiCategory).filter(Boolean))];
      const catNote = cats.length ? { en: ` (${cats.join(", ")} units)`, zh: `（${cats.join("、")} 单位）` } : { en: "", zh: "" };
      return {
        rule: "income",
        result: "unknown",
        reason: {
          en: `Estimated only from a general HPD income category${catNote.en}, not this lottery's own income chart. Whether you qualify for a specific unit or household size is unknown — check the official listing.`,
          zh: `仅根据 HPD 的一般收入类别估算${catNote.zh}，并非该项目自己的收入表。您是否符合某个户型或家庭人数的要求尚不确定，请查看官方页面。`,
        },
      };
    }
    if (belowCategory) {
      return {
        rule: "income",
        result: "unknown",
        reason: {
          en: "Our data lists only a broad income category for these units, and your income is below its estimated range. Whether you meet this lottery's minimum income is unknown — check the official income chart.",
          zh: "我们的数据仅有这些单位的大致收入类别，您的收入低于该类别的估算范围。是否达到该项目的最低收入要求尚不确定，请查看官方收入表。",
        },
      };
    }
    if (belowMinWithVoucher) {
      return {
        rule: "income",
        result: "unknown",
        reason: {
          en: "Your income is below the minimum, but voucher holders are often exempt from minimum income — check the listing.",
          zh: "您的收入低于最低要求，但持有住房补助券的申请人通常可豁免最低收入，请查看项目说明。",
        },
      };
    }
    if (unknown) {
      return { rule: "income", result: "unknown", reason: { en: "Some income limits are not published.", zh: "部分收入上限未公布。" } };
    }
    if (lowestMin != null && inc < lowestMin) {
      return {
        rule: "income",
        result: "fail",
        reason: { en: `Your income is below the published minimum (${fmt(lowestMin)}).`, zh: `您的收入低于公布的最低要求（${fmt(lowestMin)}）。` },
      };
    }
    return {
      rule: "income",
      result: "fail",
      reason: {
        en: closestMax != null ? `Your income is above the published maximum (${fmt(closestMax)}).` : "Your income does not fit any published band.",
        zh: closestMax != null ? `您的收入高于公布的上限（${fmt(closestMax)}）。` : "您的收入不在任何公布的范围内。",
      },
    };
  },
};

const restrictionRule: Rule = {
  name: "restrictions",
  evaluate: ({ household, listing }) => {
    const r = listing.restrictions.filter((x) => x !== "none");
    if (r.length === 0) {
      return { rule: "restrictions", result: "pass", reason: { en: "No special household restrictions.", zh: "无特殊家庭限制。" } };
    }
    const checks: Array<{ ok: boolean | null; en: string; zh: string }> = r.map((x) => {
      switch (x) {
        case "senior_62plus":
          return { ok: household.hasMember62Plus, en: "senior housing (62+)", zh: "老人住房（62 岁以上）" };
        case "senior_55plus":
          return { ok: household.hasMember55Plus ?? household.hasMember62Plus, en: "55+ housing", zh: "55 岁以上住房" };
        case "disability":
          return { ok: household.hasDisability, en: "housing for people with disabilities", zh: "残障人士住房" };
        default:
          return { ok: null, en: x, zh: x };
      }
    });
    const label = { en: checks.map((c) => c.en).join(", "), zh: checks.map((c) => c.zh).join("、") };
    if (checks.some((c) => c.ok === false)) {
      return { rule: "restrictions", result: "fail", reason: { en: `This is ${label.en}.`, zh: `该项目为${label.zh}。` } };
    }
    if (checks.some((c) => c.ok === null)) {
      return { rule: "restrictions", result: "unknown", reason: { en: `This is ${label.en} — confirm you qualify.`, zh: `该项目为${label.zh}，请确认是否符合。` } };
    }
    return { rule: "restrictions", result: "pass", reason: { en: `You meet the ${label.en} requirement.`, zh: `您符合${label.zh}的要求。` } };
  },
};

export const RULES: Rule[] = [deadlineRule, householdSizeRule, incomeRule, restrictionRule];

// ---------- Engine ----------

function combine(outcomes: RuleOutcome[]): MatchStatus {
  if (outcomes.some((o) => o.result === "fail")) return "UNLIKELY_MATCH";
  if (outcomes.some((o) => o.result === "unknown")) return "NEEDS_REVIEW";
  return "LIKELY_MATCH";
}

function matchesPreferences(h: Household, l: Listing): boolean {
  const boroughOk = h.boroughs.length === 0 || (l.borough != null && h.boroughs.includes(l.borough));
  const bedroomOk = h.bedrooms.length === 0 || l.unitTypes.length === 0 || l.unitTypes.some((u) => h.bedrooms.includes(u));
  return boroughOk && bedroomOk;
}

export function matchListing(household: Household, listing: Listing, config: MatchConfig): MatchResult {
  const ctx: RuleContext = { household, listing, config, qualifyingBands: [] };
  const outcomes = RULES.filter((r) => !config.disabledRules?.includes(r.name)).map((r) => r.evaluate(ctx));
  const status = combine(outcomes);
  return {
    listingId: listing.id,
    status,
    matchesPreferences: matchesPreferences(household, listing),
    outcomes,
    qualifyingBands: ctx.qualifyingBands,
    quality: assessQuality(listing, household, { status, outcomes, qualifyingBands: ctx.qualifyingBands }, config.today),
  };
}

/**
 * Match against many listings. Order: preference match first (unchanged), then status
 * (LIKELY → NEEDS_REVIEW → UNLIKELY), then data tier (Issue #5: published limits before
 * category-only), then more qualifying bands, then soonest deadline. Never changes any status.
 */
export function matchAll(household: Household, listings: Listing[], config: MatchConfig): Array<{ listing: Listing; result: MatchResult }> {
  return listings
    .map((listing) => ({ listing, result: matchListing(household, listing, config) }))
    .sort(
      (a, b) =>
        Number(b.result.matchesPreferences) - Number(a.result.matchesPreferences) ||
        STATUS_ORDER[a.result.status] - STATUS_ORDER[b.result.status] ||
        TIER_ORDER[a.result.quality!.tier] - TIER_ORDER[b.result.quality!.tier] ||
        b.result.qualifyingBands.length - a.result.qualifyingBands.length ||
        (a.listing.applicationDeadline ?? "9999").localeCompare(b.listing.applicationDeadline ?? "9999"),
    );
}
