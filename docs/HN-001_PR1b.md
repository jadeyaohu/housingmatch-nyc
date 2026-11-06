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

## Delivery

`navigator.sendBeacon` (`application/json` Blob) with a `fetch(..., {keepalive: true})` fallback. Fire-and-forget: every failure is swallowed, nothing awaits, and matching never depends on analytics.

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
- a sendBeacon throw leaving results and the `/api/match` request unchanged
- **integration:** every browser payload is accepted (202) by the real `handleEvents()`

Browser verification (ad hoc, not committed): Playwright against a local `next start` build, desktop 1280×800 and mobile 375×812 (touch), EN and 中文.

- **Flag on:** the event sequence was exactly `page_view → matcher_started → matcher_completed → listing_details_opened → application_link_clicked → page_view → application_link_clicked`, with one session, the correct language tag, and no PII strings.
- **Flag off:** no `/api/events` requests at all.
- **Both modes:** 150 results and one `/api/match` call, the same as before.
