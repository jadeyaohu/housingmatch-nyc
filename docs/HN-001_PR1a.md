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
4. **Rate limit**: Upstash sliding window of 60 requests/60 s per client, keyed by `HMAC-SHA256(ip, RATE_LIMIT_HMAC_SECRET)`. Over the limit returns **429** with `Retry-After`. Raw IPs are never stored.
5. **Size and shape**: `application/json` only (415); 8 KB body cap (413); at most 20 events per request; strict schema (400).
6. **Insert**: upsert with `on conflict (event_id) do nothing`, so retries are idempotent. Returns **202** `{accepted}`.

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

`npm test` runs everything with no network and no credentials:
- `schema.test.ts`: allow-list; forbidden matcher/PII keys rejected; buckets, paths, sources, batch cap.
- `handler.test.ts`: flag-off returns 204 with nothing constructed; production gate; fail-closed 503s; 429 with a controlled limiter; HMAC key never contains the IP; 413/415/400; bot and origin filters.
- `migration.test.ts`: runs 0002 in PGlite with Supabase-like default grants. Covers deny-all for anon/authenticated (tables and purge function), RLS forced with zero policies, constraints, `event_id` dedupe, retention purge with consent cascade, no orphan consents, and a rollback that drops only 0002 objects.
- `boundaries.test.ts`: no client component touches the server secrets or the store; no `NEXT_PUBLIC_` secrets; the store is `server-only`; `/api/match` doesn't import analytics.
