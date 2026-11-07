import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dict } from "../i18n";
import type { Household, Listing, MatchStatus, RuleOutcome } from "../types";
import { DEFAULT_CONFIG, matchAll, matchListing } from "./engine";
import { ALL_FIXTURES, F1, F2, F3, F4, F5, F6, F7, HH_3_85K, TODAY } from "./fixtures/hn5";
import { assessQuality, calendarDaysBetween, CLOSING_SOON_DAYS, type QualityWarning } from "./quality";

const cfg = { ...DEFAULT_CONFIG, today: TODAY };
const m = (l: Listing, h: Household = HH_3_85K) => matchListing(h, l, cfg);
const rule = (outs: RuleOutcome[], name: string) => outs.find((o) => o.rule === name)!;

// Positive eligibility claims that must never appear for incomplete data.
const OVERCLAIM = /\b(you are eligible|(?<!whether )you qualify|you appear to qualify|appears to fit|eligible for)\b|确认符合|符合资格|您符合该项目/i;

describe("F1 — studio-only, category-only bands (345 E 17th-like)", () => {
  const r = m(F1);
  it("is NEEDS_REVIEW, never LIKELY", () => expect(r.status).toBe<MatchStatus>("NEEDS_REVIEW"));
  it("keeps unknown as unknown (household size and income)", () => {
    expect(rule(r.outcomes, "household_size").result).toBe("unknown");
    expect(rule(r.outcomes, "income").result).toBe("unknown");
  });
  it("is category_only with the expected warnings, units listed and closing soon", () => {
    expect(r.quality!.tier).toBe("category_only");
    expect(r.quality!.warnings).toEqual(
      expect.arrayContaining<QualityWarning>(["income_limit_unpublished", "min_income_unpublished", "estimated_from_category", "household_size_unpublished", "not_manually_verified"]),
    );
    expect(r.quality!.warnings).not.toContain("unit_pairing_unpublished"); // only one unit size listed
    expect(r.quality!.unitsListed).toEqual(["studio"]);
    expect(r.quality!.daysToDeadline).toBe(3);
    expect(r.quality!.closingSoon).toBe(true);
    expect(r.quality!.fits).toEqual([]);
  });
  it("makes no eligibility claim in EN or 中文", () => {
    for (const o of r.outcomes) for (const t of [o.reason.en, o.reason.zh]) expect(t).not.toMatch(OVERCLAIM);
    expect(rule(r.outcomes, "income").reason.en).toMatch(/unknown/i);
    expect(rule(r.outcomes, "income").reason.zh).toMatch(/尚不确定/);
  });
});

describe("F2 — 1BR+2BR, Middle Income category only (6-05 129th-like, Open Data shape)", () => {
  const r = m(F2);
  it("is NEEDS_REVIEW — not rejected on a broad category estimate, not LIKELY", () => expect(r.status).toBe("NEEDS_REVIEW"));
  it("flags missing unit × income pairing and other gaps; names no unit as fitting", () => {
    expect(r.quality!.tier).toBe("category_only");
    expect(r.quality!.warnings).toEqual(
      expect.arrayContaining<QualityWarning>(["unit_pairing_unpublished", "household_size_unpublished", "income_limit_unpublished", "min_income_unpublished", "estimated_from_category"]),
    );
    expect(r.quality!.fits).toEqual([]);
    expect(r.quality!.closingSoon).toBe(false); // 5 days
  });
  it("never states dollar figures that are not in the record", () => {
    const text = r.outcomes.map((o) => o.reason.en + o.reason.zh).join(" ");
    expect(text).not.toMatch(/\$\d/);
  });
});

describe("F3 — hypothetical published unit-specific chart", () => {
  const r = m(F3);
  it("LIKELY_MATCH for the 1BR only; the 2BR minimum income is enforced", () => {
    expect(r.status).toBe("LIKELY_MATCH");
    expect(r.qualifyingBands.map((b) => b.unitTypes)).toEqual([["1br"]]);
    expect(r.quality!.tier).toBe("published_limits");
    expect(r.quality!.fits).toEqual([{ unitTypes: ["1br"], amiPercent: 130 }]);
  });
  it("income just below the 1BR minimum is UNLIKELY (published table, so a fail is legitimate)", () => {
    expect(m(F3, { ...HH_3_85K, annualIncome: 84_000 }).status).toBe("UNLIKELY_MATCH");
  });
});

describe("F7 — complete published income data, unknown non-income restriction", () => {
  const r = m(F7);
  it("is NEEDS_REVIEW only because of the restriction; income and household size pass", () => {
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(rule(r.outcomes, "income").result).toBe("pass");
    expect(rule(r.outcomes, "household_size").result).toBe("pass");
    expect(rule(r.outcomes, "restrictions").result).toBe("unknown");
  });
  it("has no quality warnings and no fit claim (so the UI must not rely on warnings to ask for confirmation)", () => {
    expect(r.quality!.tier).toBe("published_limits");
    expect(r.quality!.warnings).toEqual([]);
    expect(r.quality!.fits).toEqual([]); // only LIKELY results list fits
  });
});

describe("F4 / F5 — published gaps and restrictions fail as before", () => {
  it("F4 AMI gap: $85k between $80k max and $90k min → UNLIKELY", () => {
    const r = m(F4);
    expect(r.status).toBe("UNLIKELY_MATCH");
    expect(rule(r.outcomes, "income").result).toBe("fail");
  });
  it("F5 published household max 2 → 3-person household fails household_size", () => {
    const r = m(F5);
    expect(r.status).toBe("UNLIKELY_MATCH");
    expect(rule(r.outcomes, "household_size").result).toBe("fail");
  });
});

describe("F6 — tier is judged on relevant bands, not any populated band", () => {
  it("explicit band for 1–2 people does not upgrade a 3-person result", () => {
    const r = m(F6);
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.quality!.tier).toBe("category_only");
    expect(r.quality!.warnings).toContain("income_limit_unpublished");
  });
  it("…but does for a 2-person household that fits it", () => {
    const r = m(F6, { ...HH_3_85K, size: 2, annualIncome: 60_000 });
    expect(r.quality!.tier).toBe("published_limits");
  });
});

describe("ordering", () => {
  it("LIKELY before NEEDS_REVIEW before UNLIKELY; published_limits before category_only; then (existing) more qualifying bands, then soonest deadline", () => {
    const later = { ...F1, id: "hc-90011", applicationDeadline: "2026-11-30" };
    const rows = matchAll(HH_3_85K, [later, F5, F2, F6, F1, F4, F3], cfg);
    // F3 LIKELY · NEEDS_REVIEW category_only with 1 qualifying band by deadline: F1 (11-09), F6 (11-15), F1-later (11-30)
    // · F2 (0 qualifying bands) · UNLIKELY: F4, F5
    expect(rows.map((r) => r.listing.id)).toEqual(["hc-90003", "hc-90001", "hc-90006", "hc-90011", "hc-90002", "hc-90004", "hc-90005"]);
  });
  it("preference match stays the primary key (existing contract)", () => {
    const rows = matchAll({ ...HH_3_85K, boroughs: ["Manhattan"] }, [F3, F1], cfg);
    expect(rows.map((r) => r.listing.id)).toEqual(["hc-90001", "hc-90003"]);
  });
});

describe("unknown is never pass", () => {
  it("status is pure rule combination for every fixture", () => {
    for (const l of ALL_FIXTURES) {
      const r = m(l);
      const expected: MatchStatus = r.outcomes.some((o) => o.result === "fail")
        ? "UNLIKELY_MATCH"
        : r.outcomes.some((o) => o.result === "unknown")
          ? "NEEDS_REVIEW"
          : "LIKELY_MATCH";
      expect(r.status, l.id).toBe(expected);
    }
  });
});

describe("closing soon — 3 NYC calendar days", () => {
  const at = (deadline: string | null, over: Partial<Listing> = {}) => {
    const l = { ...F1, applicationDeadline: deadline, ...over };
    return m(l).quality!;
  };
  it("calendarDaysBetween treats ISO strings as calendar dates (no UTC drift)", () => {
    expect(calendarDaysBetween("2026-11-06", "2026-11-06")).toBe(0);
    expect(calendarDaysBetween("2026-11-06", "2026-11-09")).toBe(3);
    expect(calendarDaysBetween("2026-10-31", "2026-11-03")).toBe(3); // across the DST change (Nov 1)
    expect(calendarDaysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(calendarDaysBetween("bad", "2026-11-06")).toBeNull();
    expect(CLOSING_SOON_DAYS).toBe(3);
  });
  it.each([
    ["2026-11-06", 0, true],
    ["2026-11-07", 1, true],
    ["2026-11-09", 3, true],
    ["2026-11-10", 4, false],
  ])("deadline %s → %s days, closingSoon=%s", (d, days, soon) => {
    const q = at(d);
    expect(q.daysToDeadline).toBe(days);
    expect(q.closingSoon).toBe(soon);
  });
  it("never for expired, closed or deadline-less listings", () => {
    expect(at("2026-11-05").closingSoon).toBe(false); // deadline passed (deadline rule fails)
    expect(at("2026-11-08", { status: "closed" }).closingSoon).toBe(false);
    expect(at(null).closingSoon).toBe(false);
  });
  it("uses the injected NYC 'today', not the machine clock", () => {
    const q = assessQuality(F1, HH_3_85K, m(F1), "2026-11-09");
    expect(q.daysToDeadline).toBe(0);
    expect(q.closingSoon).toBe(true);
  });
});

describe("bilingual copy", () => {
  const codes: QualityWarning[] = ["income_limit_unpublished", "min_income_unpublished", "estimated_from_category", "household_size_unpublished", "unit_pairing_unpublished", "not_manually_verified"];
  it.each(["en", "zh"] as const)("%s has non-empty copy for every warning and section", (lang) => {
    const t = dict[lang] as Record<string, string>;
    for (const k of [...codes.map((c) => `q_${c}`), "q_confirm", "sectionLikely", "sectionLikelyNote", "sectionReview", "sectionReviewNote", "counts", "officialLink", "closesToday", "closesTomorrow", "closesInDays"]) {
      expect(t[k], `${lang}.${k}`).toBeTruthy();
    }
  });
  it("no copy implies official approval or confirmed eligibility", () => {
    for (const lang of ["en", "zh"] as const) {
      const all = Object.values(dict[lang]).join(" ");
      expect(all).not.toMatch(/确认符合|官方批准|verified eligible|officially eligible|you are eligible/i);
    }
  });
});

// Status preservation on the current snapshot: quality is descriptive only.
const snapshot = path.join(process.cwd(), "data/listings.json");
describe.runIf(existsSync(snapshot))("current snapshot (read-only)", () => {
  const listings = JSON.parse(readFileSync(snapshot, "utf8")) as Listing[];
  it("every result has quality, and status still equals the rule combination", () => {
    for (const h of [HH_3_85K, { ...HH_3_85K, size: 1, annualIncome: 40_000 }, { ...HH_3_85K, size: 5, annualIncome: 150_000, hasVoucher: true }]) {
      for (const r of matchAll(h, listings, cfg)) {
        expect(r.result.quality).toBeDefined();
        const o = r.result.outcomes;
        const expected = o.some((x) => x.result === "fail") ? "UNLIKELY_MATCH" : o.some((x) => x.result === "unknown") ? "NEEDS_REVIEW" : "LIKELY_MATCH";
        expect(r.result.status).toBe(expected);
        if (r.result.quality!.tier !== "published_limits") expect(r.result.quality!.fits).toEqual([]);
      }
    }
  });
});
