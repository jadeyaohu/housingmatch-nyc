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

## Delivery (Referer-safe)

Events are sent with `fetch("/api/events", { method: "POST", keepalive: true, referrerPolicy: "no-referrer", credentials: "omit", cache: "no-store" })`. Delivery is fire-and-forget: every failure is swallowed, and matching never depends on analytics.

- **Why not `sendBeacon`?** A beacon (or a default `fetch`) carries a same-origin `Referer` with the page's **full URL, including the query string**. On `/?...` or `/listings?...` that could leak whatever is in the URL. Codex reproduced this in Chromium (PR #4, P2).
- The fix is scoped to the analytics request only. The site-wide referrer policy is unchanged.
- The e2e test includes a control request from the same page and asserts that the control **does** carry the query in its Referer. That proves the analytics assertion is meaningful.

## Per-tab session

`sessionStorage` is copied into tabs opened from a tab, and into "Duplicate tab". Codex reproduced copied `hn_sid` values (PR #4, P2). The handling:

1. On first use, a document reads `hn_sid` and **probes** other live same-origin tabs over a `BroadcastChannel("hn_session")`. It waits up to 150 ms; events fired meanwhile are delayed, never dropped.
2. A tab that already owns that ID answers `claimed`. The new document then knows it is a copy and **rotates** to a fresh UUID.
3. A same-tab reload or navigation has no live owner, because the old document is gone or frozen, so it **keeps** its ID.
4. Once-markers are keyed by session ID (`hn_once:<sid>:matcher_started`). Rotation therefore resets them automatically. Stale `hn_once:*` keys are pruned **by prefix only**, and there is no `sessionStorage.clear()`, so other app keys are untouched.

**Verified in Chromium** (`e2e/tracking.spec.ts`, desktop and 375 px mobile):

| Scenario | Result |
|---|---|
| `window.open(url)` | Inherits the storage copy (asserted) and rotates |
| `window.open(url, "_blank", "noopener")` | Doesn't inherit in current Chromium, and gets its own ID |
| Tab started with a copy of a live tab's storage (Duplicate tab semantics) | Rotates |
| Reload | Keeps the ID and doesn't re-send `matcher_started` |
| Same-tab navigation | Keeps the ID |

**Documented limits:**
- Playwright can't trigger the browser's native "Duplicate tab" command, so it is simulated by seeding an identical storage copy while the original tab is alive.
- If the original tab was closed before the copy loads, or the browser lacks `BroadcastChannel`, the copy keeps the inherited ID. That is an over-merge of two sessions, never a leak of data.

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
