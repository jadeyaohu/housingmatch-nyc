# Consultation MVP — review and local setup

## Scope and integration

Branch `feat/consultation-mvp` is based on main `d8bcbee`, independently of Draft PRs #3/#4 analytics, #8 stabilization, #9 quiz/accounts, #11 income validation, #13/#14 data gates/charts and #15 Windows automation. No changes to their implementations, listing data, matcher, official links or account model. The current main has no customer-facing auth implementation; the existing migration defines future household/admin tables. The new request flow deliberately supports guests, with public writes only through a validated server endpoint and no public/customer database reads. The homepage keeps the free matcher before the optional consultation section. The new timestamped migration avoids PR #3’s reserved `0002_analytics_leads.sql` version. If #9 lands first, reconcile homepage/navigation placement and combine its existing `/privacy` copy with the consultation sections; preserve its free Quiz, account privacy descriptions and cookie-based localization. Shared package/env additions also need ordinary merge review.

Routes: `/consultation`, `/consultation/book?package=standard|expert`, `/consultation/terms`, `/consultation/cancellation`, `/privacy`, and POST-only `/api/consultation/bookings`. All use the existing `lang` cookie/`getLang` and `LangToggle`; no translation framework added. Text lives in `src/lib/consultation/content.ts`. Policy versions live in `model.ts` and the SQL function; bump both and archive approved wording when policies change. All initial wording is a draft. Prices are one-time USD $59/30 minutes and $99/60 minutes, not subscriptions.

## Safe setup (local/development only)

No migrations were run against Supabase or Production. There is no file, localStorage or insecure in-memory booking fallback. Without explicit configuration, the form is disabled and the endpoint returns 503. Pricing/free features still work.

1. Review migration `supabase/migrations/20261111150000_consultation_bookings.sql`. Use a **disposable local Supabase project** (`supabase init`, `supabase start` in a separate test directory with Docker) or an explicitly authorized nonproduction project. Apply migration 0001 then the consultation migration there. Do not execute `supabase db push` against a linked Production project. Retrieve local project URL/service-role settings from your local CLI, without sharing them in issues or screenshots.
2. In untracked `.env.local`, set the following using that disposable project only:

   ```dotenv
   CONSULTATION_BOOKING_ENABLED=true
   CONSULTATION_POLICIES_APPROVED=true
   CONSULTATION_SUPABASE_URL=<local Supabase URL>
   CONSULTATION_SUPABASE_SERVICE_ROLE_KEY=<local server-only service role>
   ```

   For **synthetic-only development tests**, setting the policy flag is a test override, not legal approval. Before any real requests, the founder must approve legal copy, a working contact channel, privacy retention/deletion procedures, designated operators and a notification/response process. Do not reuse Production settings or enable real payments. The service-role key is never sent to a client component; only a boolean readiness flag is passed.
3. Run `npm ci`, `npm run dev`; use synthetic name `Example Person` and `synthetic@example.test`. Request a future local date/time with its IANA timezone. The server resolves timezone offsets and rejects skipped/repeated DST times, invalid dates, past times and times more than a year away. The date/time is a preference, not an availability claim.
4. Inspect the synthetic row through the local administrative database only: state must be `requested` / `not_started`, price/duration must match its package, and consent timestamps/versions must be populated. No email notification is sent yet; a designated operator must check requests and manually coordinate a remote appointment. Do not interpret the submitted form as a confirmed appointment.
5. Repeat the exact request UUID and fields: one row only. Reusing that UUID with different normalized fields must fail with 409. Reloading the form creates a new request; idempotency protects retries in the same document, not an independent new booking. Inspect the database before manually retrying an uncertain request in a new tab.
6. Verify the anon and authenticated roles cannot SELECT/INSERT/UPDATE and cannot execute `request_consultation`. No GET/list/admin booking API exists in this phase. Server role is privileged; protect it and use only designated server-side operations. An approved staff UI/authorization and alerting workflow are follow-up work, not an implied public access path.

## Data model and security

The migration stores UUID, package/price/duration/currency, name/email/language, preferred wall time/IANA timezone/resolved UTC time, optional short topic, booking/payment states, policy versions/acceptance times, created/updated times and retry fingerprint. Nullable unique Stripe references prepare for Phase 2; no cards or documents are collected. There are no analytics or AI-provider calls for booking data.

RLS is enabled and forced. All table permissions and RPC permissions are revoked from anon/authenticated; only service_role may invoke the fixed-search-path SECURITY DEFINER create function. The migration's administrative owner must have RLS bypass (normal local Supabase migration owner); verify on any nonstandard installation. The function sets authoritative price/initial states, records consent times server-side, serializes retry/rate decisions under a row lock and enforces transitions through a trigger. No state update API is exposed. Initial values are not client-controlled; only approved backend/admin operations should ever confirm or change payment state.

The POST handler requires same-origin JSON (browser Host checked rather than Next’s normalized internal hostname; optionally pin `CONSULTATION_APP_ORIGIN` to the exact browser origin behind a custom proxy), validates a strict Zod field allowlist, caps the **actual streamed body** at 8 KiB, returns generic errors and no contact data, and sets no-store/no-referrer. Same-origin credentials remain compatible with protected Preview deployments. Names/topics are rendered as text, not HTML. Two mandatory consent boxes start unchecked. Obvious SSN-shaped numbers are rejected in topics, but automated text validation cannot identify every sensitive value; the UI warns against submitting SSNs/documents/statements/paystubs and has no upload field. No request bodies, emails, IPs or provider errors are deliberately logged. Audit hosting/provider log retention separately before launch.

A global database cap of 20 new requests/minute bounds guest submission volume without storing IPs. It is not a comprehensive bot defense; an attacker can consume that shared capacity. Monitor legitimate volume and add approved per-client protection/CAPTCHA before scaling. Existing identical retries do not consume another slot. A database failure returns 503 with no fallback; the UI preserves the request UUID and advises retrying the unchanged form because a network failure cannot prove whether a write committed. 429 is reserved for an actual database rate denial. There are no payment/calendar integrations or background fulfillment workers.

## Validation commands and evidence

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e:consultation -- --workers=2
# In managed Linux with a preinstalled browser instead:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e:consultation -- --workers=2
```

After workspace recovery on November 11, 2026, lint, all 79 unit tests, the production build/typecheck and all 14 Chromium tests passed again. Screenshots were refreshed from that run. The PostgreSQL/real-HTTP evidence below was obtained before the interruption; it was not rerun during recovery.

Browser tests intentionally use synthetic server settings and **mock successful POST responses** to cover UI/consent/referrer/retry behavior. They do not claim a real Supabase end-to-end booking. Unmocked writes fail closed. PostgreSQL integration assertions in `supabase/tests/consultation.sql` independently exercise RPC persistence, retries/conflicts, default states/prices, RLS/privileges, invalid transitions and the rate cap. Run with `psql -v ON_ERROR_STOP=1 -f ...` against a freshly migrated disposable database only; rows are synthetic and the test rolls back. Do not run the test against a populated database (it expects an empty table).

Screenshots in `screenshots/` show synthetic local browser pages, not a deployed site or approved legal terms. A separate local production-build HTTP test exercised Next → Supabase JS → a local gateway-path proxy → PostgREST 12.2.3 → PostgreSQL 17.11, including real EN/中文 Chromium submissions. It passed 29 HTTP/browser checks, saved 20 synthetic rows all requested/not_started (two expert browser bookings), rejected conflicting retries/cross-origin/tampered input, denied anonymous reads and returned 429 after the cap. Hosted Supabase gateway behavior, notification delivery/operating procedures and founder approval still need verification before real requests.

## Phase 2 Stripe test-mode design (not implemented or activated)

No Stripe SDK, Checkout endpoint, webhook, products, charges, customer creation, subscriptions or payment links exist in this PR. Existing unrelated subscription placeholders in `.env.example` are not used here.

Required future server variables: `STRIPE_SECRET_KEY` (**test-mode**), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CONSULTATION_STANDARD`, `STRIPE_PRICE_CONSULTATION_EXPERT`, and a validated `APP_ORIGIN`; retain the dedicated consultation database settings. No secret key may have a `NEXT_PUBLIC_` prefix. Use only test price IDs validated against server package amount/currency. The browser may receive a hosted Checkout URL only; never collect/store card details.

Proposed flow:
1. Human agrees on availability; an authorized server action selects the booking. Issue a scoped, expiring payment invitation bound to that booking rather than accepting arbitrary public booking UUIDs. The booking remains requested until an explicit human confirmation; payment success alone must not claim calendar availability.
2. Server verifies package/amount and legal-version approval, then creates one payment-mode Checkout Session using a stable idempotency key derived from booking + payment attempt. Store the unique session reference and set payment `not_started → pending` transactionally. A provider/session failure must be recoverable without duplicate charges.
3. Webhook uses raw request bytes and Stripe's signature verification, rejecting invalid signatures, wrong live/test mode, currency/amount mismatches and unrelated session/intent metadata. Never trust a redirect query string or client “success” claim.
4. Add a unique `stripe_webhook_events(event_id)` ledger and transactional conditional updates. Only verified successful payment events can transition `pending → paid`; delayed duplicates/out-of-order events must not regress `paid/refunded` or fulfil twice. Handle asynchronous success/failure and expired sessions; reconcile provider state before retrying. A processed-event ledger and payment lifecycle are **not** implemented yet.
5. An authorized operator initiates refunds with a stable refund idempotency key. Verified refund state drives `paid → refunded`; partial refunds require a separate amount-based model before support. Cancellation status is separate from payment status: cancellation does not automatically claim a refund succeeded. Approve the cancellation policy, refund deadlines, partial refund behavior, staff permissions and customer communications first.
6. Test-mode plan: Stripe CLI signed fixtures; valid/invalid signatures; replay/concurrent/out-of-order webhooks; session expiry; failed/asynchronous payments; amount tampering; guessed booking IDs; double-click checkout; cancelled appointments; full refund success/failure/retry. Assert zero live-mode transactions, no card storage, one fulfilment and no automatic appointment confirmation. Founder approval is required before any later live launch.

## Remaining launch blockers

Founder/legal approval, retention/deletion/privacy contact, an actual operator response/notification process, approved nonproduction Supabase setup and hosted-gateway verification, approved staff authorization, calendar coordination, and separate Stripe test-mode implementation. This code is an engineering-review MVP, not approval to accept real customer payments or enable Production requests.
