# Issue #5 · Phase A: matcher result accuracy & clarity

Approved by the PO (issue #5 comment 6701964087). Presentation-only: **eligibility rules, statuses, input data, importer, AMI tables, schema, the `/api/match` request and the analytics contract are unchanged.**

## What changed

| Area | Change |
|---|---|
| `src/lib/matching/quality.ts` (new) | `assessQuality()` describes how complete our record is for *this* household's relevant bands. It returns a tier, warning codes, listed units, NYC calendar days to the deadline, a closing-soon flag, and facts for published-limit fits. It is descriptive only and never changes status |
| `engine.ts` | Adds `result.quality`. Sort order: **preference match (unchanged) → status → data tier → qualifying bands → deadline**. Two category-only income reasons are reworded more cautiously; their result is still `unknown` |
| `MatchResults.tsx` (new, extracted) | Shows separate sections for **Preliminary match** (`LIKELY_MATCH`) and **Possible match: data incomplete** (`NEEDS_REVIEW`), with UNLIKELY behind the existing toggle. Separate counts, bilingual warnings, a closing-soon chip, provenance, and **"View official listing & income chart ↗"** linking to the Housing Connect details page |
| `i18n.ts` | Draft EN/中文 copy for sections, warnings and links. **Needs PO/product copy review before merge.** The `LIKELY_MATCH` badge is now `初步符合`, so it no longer collides with the 可能符合 section. The section titles use the PO-polished `初步符合（基于现有收入资料）` and `可能符合（资格资料不完整，需核实）`. The provenance line now reads "未经人工核实 ·", without the stray full stop |

## Tiers and warnings

- **Relevant bands:** the qualifying bands if there are any; otherwise the bands not excluded by the household-size rule. An unrelated populated band (for example, one for 1–2 people when the household has 3) doesn't upgrade the tier (fixture F6).
- **`published_limits`:** at least one relevant band has an explicit max for this household size, or an explicit minimum income. It does **not** mean the chart is complete, verified, or that the household is eligible.
- **`category_only`:** only an AMI % or HPD category. Open Data rows are always this tier.
- **Warnings:**
  - `income_limit_unpublished`
  - `min_income_unpublished`
  - `estimated_from_category`
  - `household_size_unpublished`
  - `unit_pairing_unpublished`: the listing has more than one unit size and its bands aren't tied to unit sizes.
  - `not_manually_verified`: shown in the provenance line.
- **Rules that always hold:** no dollar figure appears unless it's in the record. No unit size is named as fitting unless it comes from a published-limit qualifying band.

## Confirmation on every NEEDS_REVIEW card (Codex P2 fix)

Every `NEEDS_REVIEW` card renders the confirmation box, **independent of `quality.warnings`**, and also when `result.quality` is absent (older payloads). The box contains:

- The quality warnings, if there are any.
- The engine's own bilingual `reason` for every *other* `unknown` rule, such as restrictions or deadline. When `quality` is missing, these are the reasons for *all* `unknown` rules. Nothing is invented, and no user input is echoed.
- **"Confirm on Housing Connect before applying." / 「申请前请在 Housing Connect 上核实。」**

The "Why" section and rule statuses are unchanged. Fixture **F7** covers the case: F3's published bands, verified, `restrictions: ["veteran"]` → `NEEDS_REVIEW` with `quality.warnings: []`.

## Restriction copy (PO-approved neutral wording)

Codes we can't evaluate from the household form get their own neutral sentence instead of a raw code. They still evaluate to `unknown`, exactly as before.

| Code | EN | 中文 |
|---|---|---|
| `veteran` | This lottery may have veteran-related preferences or eligibility rules; check the official listing. | 该项目涉及退伍军人相关优先权或资格规定，请查看官方要求。 |
| `student` | This lottery may have student-related eligibility rules; check the official listing. | 该项目涉及学生身份相关规定，请查看官方要求。 |
| any other unrecognised code | This lottery may have other special eligibility rules; check the official listing. | 该项目可能存在其他特殊申请规定，请查看官方要求。 |

**Unchanged:** the labelled codes (`senior_62plus`, `senior_55plus`, `disability`) keep their existing template and pass/fail/unknown logic.

**Combining sentences:**
- **Mixed lists:** the labelled sentence comes first, then the neutral sentences, de-duplicated.
- **Labelled requirement already met:** only the neutral sentences for the still-unknown codes are shown.

**Verification:**
- Against the previous commit, all **48,411** snapshot pairs are identical, including reason text, because live data only uses `senior_62plus`.
- **1,701** synthetic restriction combinations have 0 status or outcome differences.

## Closing soon

The deadline is within **0–3 NYC calendar days** of `todayNY()`. ISO dates are compared as calendar dates, not UTC instants. The chip never shows for a closed listing, an expired deadline, or a listing without a deadline.

The listings page's existing `lifecycle()` chip still uses the importer's 7-day rule. That's unchanged, out of scope, and listed as a follow-up.

## Tests

- **`src/lib/matching/hn5.test.ts`**:
  - F1–F6 synthetic fixtures in `fixtures/hn5.ts`: the shapes of 345 E 17th and 6-05 129th, a hypothetical published chart, an AMI gap, a household-size limit, and a mixed-data case.
  - Unknown is never pass.
  - Ordering.
  - Closing-soon boundaries: 0, 1, 3 and 4 days, past deadline, closed, none, and across DST.
  - Bilingual copy, plus checks that no text implies official approval.
  - Status equals the rule combination across the current snapshot, read-only.
- **`src/components/MatchResults.test.tsx`** (jsdom):
  - Sections and counts, EN and 中文.
  - Card warnings, chip, units, provenance and official link.
  - "?" is never rendered as "✓".
  - F2 shows no dollar figures.
  - F3 shows only fit facts.
  - The PR #4 hook seam.
  - Matcher integration with the request body unchanged.
  - An older payload without `quality` still renders.
- **`e2e/results/results.spec.ts`** (Chromium, desktop and 375 px mobile):
  - `/api/match` is **intercepted with `page.route()`**, so there's no test-only app code.
  - Checks sections, order, counts, warnings, the chip, links, "?" rendering, no dollar figures, no horizontal overflow, the show-unlikely toggle, and the language toggle.
  - Screenshots are uploaded as a CI artifact.
- **One-off verification, not committed:** I compared the `main` engine with this engine over **125,510** household × listing pairs from the current snapshot. Status, rule outcomes, qualifying bands and preference match differed in **0** pairs. Only the reworded reason text changed.

## PR #4 integration checklist (when reconciling after #3/#4)

1. **Keep `MatchResults.tsx` as the only results renderer.** Port #4's hooks into it rather than restoring #4's inline results block in `Matcher.tsx`.
2. **`listing_details_opened`:** pass `onDetailsOpen={(id) => trackOnce…("listing_details_opened", { listing_id: id }, lang)}`. Keep #4's once-per-listing-per-result-set dedupe, which means resetting it on each new submit.
3. **`application_link_clicked`:** pass `onOfficialLinkClick={(id) => track("application_link_clicked", { listing_id: id, from: "results" }, lang)}`, or swap the `<a>` for #4's `TrackedLink`. Either way, keep left and middle click only.
4. **`matcher_completed`:** this lives in `Matcher.submit()` and is untouched here. Keep #4's response validation (`Array.isArray(results)`). Counts are still by `status` over all returned rows; the new sections don't change the metric.
5. **`matcher_started` and `PageViewTracker`:** unaffected. They live in `Matcher.tsx` and in the pages.
6. **Tooling:** `vitest.config.ts` is byte-identical to #4's. `package.json` dev dependencies match #4's versions, so the lockfile needs a regenerate. `playwright.results.config.ts` and `results-ci.yml` are separate from #4's `playwright.config.ts` and #3's `ci.yml`. #4's config uses `testDir: "e2e"`, so after merging it will also pick up `e2e/results/`; that's harmless, and the e2e jobs can be consolidated then.
7. **Re-run everything after integrating:** #4's analytics unit and e2e suites, plus this suite.
