# HN-001 · PR 1b: frontend anonymous event tracking

Builds on PR 1a (`/api/events`). Stacked PR: base branch is `feature/hn-001-pr1a-event-ingestion`.

## Flags (independent)

| Flag | Where | Effect |
|---|---|---|
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Browser, **inlined at build** | Exactly `"true"` → `track()` sends. Anything else → nothing is sent **and sessionStorage is never touched**. Changing it needs a rebuild |
| `ANALYTICS_INGEST_ENABLED` (PR 1a) | Server, per request (applies on redeploy) | Off → `/api/events` returns 204 and drops everything, even if the browser sends |

Both are off by default. Turning only the client flag on in a preview is safe: the server keeps dropping until its own flag is on.

## Events

| Event | Trigger (exact) | Never on | Props |
|---|---|---|---|
| `page_view` | `<PageViewTracker>` mount on `/` and `/listings` | Re-renders, EN/中文 switch (`router.refresh` re-renders without remounting), StrictMode double effect (ref guard) | none |
| `matcher_started` | First `change` or `click` inside the matcher form (capture phase), once per **tab session** (`sessionStorage` flag) | Initial render, remounts in the same tab | none |
| `matcher_completed` | After `res.ok` **and** a parsed JSON body with a `results` array | 4xx/5xx, network error, unparseable body | `likely_count`, `review_count` (buckets `0`/`1-5`/`6-20`/`20+`), `has_borough_pref` |
| `listing_details_opened` | `<details>` `toggle` with `open === true`; once per listing per result set | Results rendering, collapsing, re-opening | `listing_id` |
| `application_link_clicked` | `click`, or middle-button `auxclick`, on the application link (`<TrackedLink>`) | Render, hover, right-click | `listing_id`, `from` (`results`/`listings`) |

## What is sent, and what never is

Each event has: random `event_id`, random `session_id` (UUID in `sessionStorage`, key `hn_sid`, not a cookie, falls back to memory if storage is blocked), `event_name`, `path` (**pathname only**, no query string), `lang` (`en`/`zh`), `source` (allow-listed channel from `utm_source` or the referrer host, remembered per tab), and typed `props`.

**Never sent:** income, household size, voucher, disability or age flags, email, free text, IP, user agent, query strings.

The `track()` API only accepts the typed props above, so callers can't pass anything else. The server re-validates with a strict schema anyway. Listing IDs are pattern-checked client-side, and an event with a bad ID is dropped rather than sent.

## Delivery (Referer-safe, cookie-compatible)

Events are sent with `fetch("/api/events", { method: "POST", keepalive: true, referrerPolicy: "no-referrer", credentials: "same-origin", cache: "no-store" })`. Delivery is fire-and-forget: every failure is swallowed, and matching never depends on analytics.

- **No Referer.** A beacon, or a default `fetch`, would send the page's full URL including the query string. Codex reproduced this (PR #4, P2; closed). The e2e test includes a control request that *does* carry the query, which proves the assertion is meaningful.
- **Same-origin cookies.** Cookie-protected deployments (Vercel Authentication on Previews) reject requests without the session cookie. `same-origin` sends cookies to our own origin only.
  - Auth cookies may therefore reach `/api/events` and edge logs. The route never reads cookies.
  - No tokens appear in payloads or client source. Vercel Authentication and the Origin check are unchanged.
  - A local e2e test runs behind a cookie-gated proxy (`e2e/auth-proxy.mjs`). With the cookie, the request passes (204). Without it, the request is rejected (401). Neither carries a Referer or any query text.
  - **This local test doesn't prove anything about Vercel itself.** A protected Preview smoke test with an authorized signed-in session is still required after code approval.

## Per-tab session

`sessionStorage` is copied into tabs opened from a tab (`window.open`/`target=_blank`) and into "Duplicate tab". Messages go over `BroadcastChannel("hn_session")`, and each carries the sender's random nonce:

| Message | Meaning |
|---|---|
| `probe {sid, nonce}` | Fast path on first use: "does a live tab own this sid?" Waits 150 ms. |
| `claimed {sid, to}` | "I own this sid; you (`to`) are the copy." |
| `hello {sid, nonce, origin}` | Sent once after a document resolves its ID. `origin` is `performance.timeOrigin`. |

**Arbitration.** When two live documents hold the same ID, the **older** document keeps it (smaller `timeOrigin`, then smaller nonce) and the **newer** one rotates to a fresh UUID.

- A **busy owner** that misses the probe window still processes the queued probe or hello once it frees up, and claims then. That **late claim** makes the copy rotate.
- On rotation, the copy **re-sends its funnel-entry events** (`page_view`, and `matcher_started` even if it was suppressed by the inherited marker) under its new ID.
- **Concurrent copies** with no live owner settle the same way through `hello`.
- Each rotation draws a fresh random UUID, so arbitration terminates.

**What doesn't change:**
- A same-tab reload or navigation has no live owner, so it keeps its ID.
- A document gives up ownership on `pagehide`, so a frozen (bfcache) page can't claim against its successor in the same tab.
- Once-markers are keyed by ID (`hn_once:<sid>:<name>`) and stale ones are pruned by prefix. There is no `sessionStorage.clear()`, so other app keys are untouched.

**Verified in real Chromium** (desktop and 375 px mobile):

| Scenario | Result |
|---|---|
| `window.open` child | Inherits the copy (asserted), then rotates |
| `noopener` child | Doesn't inherit in current Chromium; gets its own ID |
| Seeded duplicate | Rotates |
| **2.5 s busy owner** | The copy first uses the inherited ID, then late-rotates and re-sends `page_view` and `matcher_started`. The owner keeps its ID and its single `matcher_started` |
| **Two concurrent copies, no owner** | Exactly one keeps the inherited ID; the other rotates |
| Reload, same-tab navigation | Keep the ID |

The timing-sensitive tests passed 30 times out of 30 with `--repeat-each 5`.

**Residual semantics (best effort, documented):**
- Events a copy sends *before* a late claim stay under the shared ID. Raw totals can therefore include one extra `page_view` per late-detected copy. Distinct-session funnel counts are still correct, because the shared session already had that step and the copy's new session gets its own.
- Without `BroadcastChannel`, a copy keeps the inherited ID.
- Native "Duplicate tab" can't be automated in Playwright, so it is simulated with an identical storage copy.

## Metric definitions

`matcher_completed` counts are over **all rows returned by `/api/match`**, which is the full eligibility evaluation. They don't depend on borough or bedroom preferences, or on which rows the UI shows. Rows with `matchesPreferences === false` are included.

- `likely_count`: rows with `result.status === "LIKELY_MATCH"`, bucketed.
- `review_count`: rows with `result.status === "NEEDS_REVIEW"`, bucketed.
- `has_borough_pref`: at least one borough selected.

A unit test pins this definition using hidden `matchesPreferences: false` rows.

## Attribution precedence

`utm_source` wins over the referrer host. A same-host referrer counts as `direct`, an unknown host maps to `other`, and no signal at all is `direct`. The value is remembered per tab, and a copied tab keeps the opener's channel. Unit tests cover each case.

## Matcher response validation

A `200` whose body lacks a `results` array is treated as an error, before any state update. The UI shows the error message, no results render, and no `matcher_completed` is sent. The request and normal results are unchanged.

## Tests

`src/components/analytics/tracking.test.tsx` (jsdom + Testing Library; `vitest.config.ts` adds the `@` alias and the automatic JSX runtime). It covers:

- the flag-off matrix
- page_view only on initial render, StrictMode, the language switch, pathname only, and source persistence
- matcher_started dedupe across remounts and new tab sessions
- matcher_completed on 200 only, and not on 500 / network error / bad JSON, with buckets, borough preference, and no input values in payloads
- the 中文 UI flow
- details and link semantics (hover, right-click, middle-click)
- the invalid listing ID drop
- session ID storage and the blocked-storage fallback
- a failed `/api/events` request leaving results and the `/api/match` request unchanged
- malformed `200` bodies
- fetch init (`no-referrer`, `omit`, `keepalive`, no beacon)
- UTM precedence
- the metric definition
- session rotation, reload and probe answering
- **integration:** every browser payload is accepted (202) by the real `handleEvents()`

Earlier ad-hoc browser verification (before the fixes above): Playwright against a local `next start` build, desktop 1280×800 and mobile 375×812 (touch), EN and 中文.

- **Flag on:** the event sequence was exactly `page_view → matcher_started → matcher_completed → listing_details_opened → application_link_clicked → page_view → application_link_clicked`, with one session, the correct language tag, and no PII strings.
- **Flag off:** no `/api/events` requests at all.
- **Both modes:** 150 results and one `/api/match` call, the same as before.
