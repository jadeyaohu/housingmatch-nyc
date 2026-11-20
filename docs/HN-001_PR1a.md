# HN-001 · PR 1a — anonymous event ingestion

Scope approved in Issue #1 (rev 2, comment 6694278326): schema + server-side ingestion + privacy/access tests.
**No UI hooks** (that is PR 1b), **no lead/opt-in routes** (PR 2), **no email** (PR 3).

## What this PR adds

| Piece | File |
|---|---|
| Additive migration: `analytics_events`, `leads`, `consents`, `purge_expired_privacy_data()` | `supabase/migrations/0002_analytics_leads.sql` |
| Rollback (drops only 0002 objects; deletes their data) | `supabase/rollback/0002_down.sql` |
| `POST /api/events` | `src/app/api/events/route.ts` → `src/lib/analytics/handler.ts` |
| Strict event allow-list (zod) | `src/lib/analytics/schema.ts` |
| Ingestion gate | `src/lib/analytics/config.ts` |
| Upstash limiter, HMAC-keyed | `src/lib/analytics/ratelimit.ts` |
| Server-only writer | `src/lib/analytics/store.ts` |

Untouched: `0001_init.sql`, `/api/match`, matching engine, `data/`, importers, `update-listings.yml`.

## Request handling order

1. **Gate**: `ANALYTICS_INGEST_ENABLED` must be exactly `true`. On Vercel production, `ANALYTICS_PRODUCTION_APPROVED=true` is also required. Otherwise the route returns **204** and constructs no DB client or limiter.
2. **Fail closed**: if the gate is open but the Upstash URL/token, the HMAC secret or the Supabase service config is missing, the route returns **503**. A limiter error also returns 503.
3. **Noise filters** (these are not security controls): a cross-origin `Origin` gets 403; a bot user agent gets 204.
4. **Rate limit**: Upstash sliding window of 60 requests/60 s per client, keyed by `HMAC-SHA256(identity, RATE_LIMIT_HMAC_SECRET)`. Over the limit returns **429** with `Retry-After`. Raw IPs are never stored. See *Client identity* below.
5. **Size and shape**: `application/json` only (415). Content-Length over 8 KB is rejected (413). The body is then read as a **stream with a hard 8 KB cumulative cap**; on overflow the stream is cancelled and the request gets 413, so a missing or falsified Content-Length can't make the server buffer more. At most 20 events per request. Strict schema (400).
6. **Insert**: upsert with `on conflict (event_id) do nothing`, so retries are idempotent. Returns **202** `{accepted: N}`, where N is the number of validated events **received**. Duplicates are silently ignored by the database, so N is not the number of new rows.

## Upstash SDK timeout (fails open by default) and how we close it

By default, `@upstash/ratelimit` **allows** a request when Redis doesn't answer in time. It resolves `{ success: true, reason: "timeout" }` after its `timeout` (default 5000 ms). Codex flagged this as P1 on PR #3, because the adapter originally forwarded only `success`.

The fix lives in `interpretUpstashResult()` (`src/lib/analytics/ratelimit.ts`):

| SDK response | Our result | HTTP |
|---|---|---|
| `success: true`, no `reason` (Redis counted) | allow | 202 |
| `success: true`, `reason: "timeout"` | **limiter unavailable** (throws) | **503**, no write |
| `success: true` with any other `reason` (unrecognised soft path) | limiter unavailable | 503, no write |
| `success: false` (any reason, incl. `cacheBlock`, `denyList`) | deny | 429 |
| Malformed response | limiter unavailable | 503 |

The SDK `timeout` is set explicitly to **2000 ms**, which bounds latency. Regression tests in `ratelimit.upstash.test.ts` mock the SDK modules and run the **real adapter**, both directly and through `handleEvents()`.

## Client identity for rate limiting

- **On Vercel only** (`VERCEL=1`, set by the platform at runtime): the edge overwrites `X-Forwarded-For` with the connecting client's IP and does not forward caller-supplied values (Trusted Proxy is an Enterprise feature we don't use). `x-vercel-forwarded-for` is the identical copy. We read `x-vercel-forwarded-for`, then `x-forwarded-for`, and accept the value **only if it is exactly one valid IP**. A comma list, garbage or a missing value all fall back to the **shared bucket**.
- **Anywhere else** (local, self-hosted, CI), no header is trusted and every caller shares one bucket.
- `x-real-ip` is never used.
- **Verify on the protected preview before enabling ingestion:** send a request with a fake `x-forwarded-for` and `x-vercel-forwarded-for`, then confirm in the Vercel function log (temporarily log `limiterKey` prefix only, never the IP) that the key doesn't change when only the fake headers change. If Vercel ever passes a caller value through, switch to the shared bucket (one-line change) or keep ingestion off.

## Configuring secrets (names only, never values)

Set these in **Vercel → Project → Settings → Environment Variables**, scoped to **Preview** only for now. Leave Production unset:

| Name | Notes |
|---|---|
| `ANALYTICS_INGEST_ENABLED` | `true` on the protected preview only |
| `NEXT_PUBLIC_SUPABASE_URL` | Dev project URL (not secret, but use the **dev** project) |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev project service role. Mark **Sensitive** in Vercel |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | From the Upstash console. Mark the token **Sensitive**. Free tier only; report before creating anything paid |
| `RATE_LIMIT_HMAC_SECRET` | Generate locally with `openssl rand -base64 48` and paste it straight into Vercel. Rotating it just resets the rate-limit windows |

Do not set `ANALYTICS_PRODUCTION_APPROVED` anywhere until the Product Owner approves launch. Env changes on Vercel take effect on the next (re)deploy.

## Preview test plan (after the PO confirms the dev Supabase project and protected preview)

1. **Apply the migration to the dev project only.** Use the SQL editor or `supabase db push` pointed at the dev ref. Confirm the project ref before running.
2. **Deny-all check.** In the SQL editor, run `set role anon; select * from analytics_events;`. Expect `permission denied`.
3. **Flag off.** With `ANALYTICS_INGEST_ENABLED` unset, POST to `/api/events` on the preview. Expect 204 and no rows.
4. **Flag on, limiter unset.** Expect 503.
5. **Flag on, fully configured.** POST a valid batch:
   ```bash
   curl -sS -X POST "$PREVIEW/api/events" -H 'content-type: application/json' \
     -d '{"events":[{"event_id":"'$(uuidgen)'","session_id":"'$(uuidgen)'","event_name":"page_view","path":"/","lang":"en","props":{}}]}'
   ```
   Expect 202. Send the same `event_id` again and expect 202 with still one row.
6. **Rate limit.** Send 61+ requests within a minute. Expect 429.
7. **Payload with `annualIncome`.** Expect 400 and no row.
8. **Retention.** Run `select * from purge_expired_privacy_data();` and expect zeros on fresh data. Production release is **blocked** until a `pg_cron` schedule is verified (see the comment at the end of the migration).

Protected previews require Vercel authentication, so `curl` needs a protection-bypass token generated in Vercel. **Don't paste it in GitHub.**

## Rollback

| Situation | Action |
|---|---|
| Stop ingestion | Unset `ANALYTICS_INGEST_ENABLED` and redeploy the preview. The route returns 204 immediately |
| Remove code | Revert the PR. Code-only; collected data is **not** removed |
| Delete data | Explicit PO decision. Either `delete from analytics_events where occurred_at between …`, or run `supabase/rollback/0002_down.sql` (drops the three tables and the purge function) |

## Local tests

CI: `.github/workflows/ci.yml` runs lint, typecheck, tests, build and a client-bundle secret-name scan on every PR to `main`. It is read-only, uses no secrets and doesn't touch `update-listings.yml`.

`npm test` runs everything with no network and no credentials:
- `schema.test.ts`: allow-list; forbidden matcher/PII keys rejected; buckets, paths, sources, batch cap.
- `handler.test.ts`: flag-off returns 204 with nothing constructed; production gate; fail-closed 503s; 429 with a controlled limiter; HMAC key never contains the IP; 413/415/400; bot and origin filters.
  - **Streaming cap:** an undeclared-length ~1 MB chunked body is rejected after reading at most cap + read-ahead; a falsified small Content-Length is rejected too.
- `ratelimit.upstash.test.ts`: covers the SDK timeout fail-open. With mocked `@upstash/ratelimit`, `{ success: true, reason: "timeout" }` makes the adapter throw, `handleEvents` returns 503, and the store is never called. Unknown soft reasons and malformed responses also return 503. A normal success returns 202. Real denials (no reason / `cacheBlock` / `denyList`) return 429.
  - **Spoofing:** off Vercel all headers are ignored; `x-real-ip` is never used; rotating a fake leftmost XFF hop can't create new buckets; one client rotating fake headers still gets a 429.
- `migration.test.ts`: runs 0002 in PGlite with Supabase-like default grants. Covers deny-all for anon/authenticated (tables and purge function), RLS forced with zero policies, constraints, `event_id` dedupe, retention purge with consent cascade, no orphan consents, and a rollback that drops only 0002 objects.
- `boundaries.test.ts`: no client component touches the server secrets or the store; no `NEXT_PUBLIC_` secrets; the store is `server-only`; `/api/match` doesn't import analytics.
