# HN-001 · PR 1b: frontend anonymous event tracking

Builds on PR 1a (`/api/events`). This is a stacked PR whose base branch is `feature/hn-001-pr1a-event-ingestion`.

## Unit of analysis: the document visit (PO decision, Option A, 2026-11-06)

Each **document load** gets one random UUID that lives in memory only. Every event sent from that document carries it.

| Situation | ID |
|---|---|
| Events within one document, at any pace, through the whole matcher funnel | **Same** |
| Client-side route change (Next.js header `<Link>`), which stays in the same document | **Same** |
| Reload, or full navigation (typed URL, the listings filter form, back/forward without bfcache) | **New** |
| A new tab, a `window.open` child (with or without `noopener`), or "Duplicate tab" | **New, independent** |

**No browser storage is used.** There's no `sessionStorage`, `localStorage` or cookies, and no `BroadcastChannel` or other cross-tab coordination. Copied storage therefore can't make two tabs share an ID. The earlier tab-session design, with its arbitration, late rotation and replay, has been removed. Legacy `hn_*` keys left by earlier builds are ignored.

### `session_id` now means "document-visit ID"

The backend field keeps the name `session_id` for compatibility (schema and migration unchanged). It is **not** a user, a browser tab, or a multi-page session. Dashboards should say **"visits"**, not sessions or users, and:

- **Funnel steps** count `distinct session_id` (that is, visits) per event within a period.
- A person who reloads, or opens results in a new tab, appears as **several visits**. Expect more visits than people.
- A funnel that crosses documents (for example, matcher on `/` → full reload → apply on `/listings`) can't be joined. In-document funnels, including client-side navigation, are exact.
- **Source attribution is per visit:** `utm_source` takes precedence over the referrer host. A same-host referrer, or none, counts as `direct`; unknown hosts map to `other`. A full navigation inside the site is a new visit whose referrer is our own host, so it reports `direct`. Acquisition should be read from the entry visits.

## Flags (independent)

| Flag | Where | Effect |
|---|---|---|
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Browser, **inlined at build** | Exactly `"true"` → events are sent. Anything else → nothing is sent and nothing is generated. No storage or `BroadcastChannel` is touched in either case. Changing it needs a rebuild |
| `ANALYTICS_INGEST_ENABLED` (PR 1a) | Server, per request (applies on redeploy) | Off → `/api/events` returns 204 and drops everything |

Both are off by default.

## Events

| Event | Trigger (exact) | Never on | Props |
|---|---|---|---|
| `page_view` | `<PageViewTracker>` mount on `/` and `/listings`, including after a client-side route change | Re-renders, EN/中文 switch (`router.refresh` doesn't remount), StrictMode double effect (ref guard) | none |
| `matcher_started` | First `change` or `click` inside the matcher form (capture phase). Once **per document visit**, so remounts in the same document don't repeat it | Initial render | none |
| `matcher_completed` | After `res.ok` **and** a parsed body with a `results` array | 4xx/5xx, network error, a 200 with a malformed body | `likely_count`, `review_count` (buckets), `has_borough_pref` |
| `listing_details_opened` | `<details>` `toggle` with `open === true`; once per listing per result set | Results rendering, collapsing, re-opening | `listing_id` |
| `application_link_clicked` | `click`, or middle-button `auxclick`, on the application link | Render, hover, right-click | `listing_id`, `from` (`results`/`listings`) |

**Payload:** random `event_id`, `session_id` (the visit ID), `event_name`, `path` (**pathname only**), `lang`, `source` (allow-listed) and typed `props`.

**Never sent:** income, household size, voucher/disability/age flags, email, free text, IP, user agent, or query strings. The server re-validates every event with a strict schema.

## Metric definitions

`matcher_completed` counts cover **all rows returned by `/api/match`**, regardless of preferences or what the UI shows. Rows with `matchesPreferences === false` are included.

- `likely_count`: number of rows with `LIKELY_MATCH`
- `review_count`: number of rows with `NEEDS_REVIEW`

Both are bucketed (`0` / `1-5` / `6-20` / `20+`).

## Delivery (Referer-safe, cookie-compatible)

```js
fetch("/api/events", {
  method: "POST",
  keepalive: true,
  referrerPolicy: "no-referrer",
  credentials: "same-origin",
  cache: "no-store",
});
```

Delivery is fire-and-forget: failures are swallowed and matching never depends on analytics.

- **No Referer.** This prevents the page URL and query string from leaking (Codex P2, closed). The e2e test uses a control request that *does* carry the query, which shows the check is meaningful. `sendBeacon` isn't used because it can't control the Referer.
- **Same-origin cookies.** These are needed for cookie-protected deployments such as Vercel Authentication on Previews.
  - Auth cookies may reach `/api/events` and edge logs. The route never reads them, and no tokens appear in payloads or client source.
  - Vercel Authentication and the Origin check are unchanged.
  - A local cookie-gated proxy test (`e2e/auth-proxy.mjs`) covers this: with a cookie the request gets **204**, without one it gets **401**, and neither sends a Referer.
  - **A protected Preview smoke test with an authorized signed-in session is still required** and needs separate authorization.

## Tests

**Unit** (`src/components/analytics/tracking.test.tsx`, jsdom):
- Flag-off matrix: no requests, no UUIDs generated, no storage, no cookies, no `BroadcastChannel`.
- Page view semantics.
- `matcher_started` sent once per visit, and again after a new load with a new ID.
- `matcher_completed` gating, including malformed 200s and recovery.
- Bucket metric definition with hidden rows.
- Details and link semantics.
- Fetch init.
- UTM precedence.
- One ID across the full funnel, with pauses and no storage.
- Storage APIs throwing has no effect.
- Legacy `hn_*` keys are ignored.
- **Integration:** every browser payload gets a 202 from the real `handleEvents()`.

**Chromium** (`e2e/`, desktop and 375 px mobile, real network):
- No Referer or query leakage, checked against a control request.
- Cookie-protected endpoint returns 204 with a cookie and 401 without.
- Full funnel with human-like pauses uses one ID, and storage stays empty.
- Reload gets a new ID and `matcher_started` fires again.
- `matcher_started` fires once per visit.
- Client-side navigation keeps the ID; a full navigation gets a new one.
- `window.open` and `noopener` children are independent.
- A tab seeded with a copy of another tab's storage (Duplicate-tab semantics) is independent.
- Two concurrent tabs never share an ID.
- `@flag-off` runs against a default build: zero `/api/events` requests, zero storage writes, no `BroadcastChannel`, no cookies, and matching still works.
- CI runs both builds.
