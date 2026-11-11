# Stripe consultation Phase 2 — TEST ONLY

Stacked on Phase 1 PR #16 at `f41d42841d05fca8575e4921229dce9452103c3b`; base branch `feat/consultation-mvp`. No listing changes, live products/charges, subscriptions or Production operations. This is working server/UI/database code with mocked Stripe fixtures; actual provider acceptance requires a founder-configured Stripe sandbox, not a claim of a completed external test payment.

## Architecture

```mermaid
sequenceDiagram
  actor Customer
  actor Operator
  participant App
  participant DB as Supabase (development)
  participant Stripe as Stripe TEST Checkout
  Customer->>App: Phase 1 booking request + consent
  App->>DB: requested / not_started
  Operator->>App: Verified Supabase JWT + availabilityAgreed
  App->>DB: Check admins membership; create hashed, 24h invitation
  App-->>Operator: Fragment invitation URL (send through approved channel)
  Customer->>App: Invitation bearer exchanged for HttpOnly cookie
  App->>DB: Lock booking; reserve one attempt
  App->>Stripe: Server-priced one-time Checkout; stable idempotency key
  Stripe-->>Customer: Hosted TEST payment
  Stripe->>App: Raw-body signed webhook
  App->>Stripe: Retrieve current session/intent/refund, validate association
  App->>DB: Atomic event dedupe + financial state only
  Customer->>App: Return page reads verified DB status (not redirect claims)
  Operator->>App: Separate explicit appointment confirmation
```

## Configuration: no credentials in source

Keep `CONSULTATION_STRIPE_ENABLED=false` until local/nonproduction setup is reviewed. Only dedicated variables are read:

- Phase 1: `CONSULTATION_SUPABASE_URL`, `CONSULTATION_SUPABASE_SERVICE_ROLE_KEY`, `CONSULTATION_BOOKING_ENABLED`, `CONSULTATION_POLICIES_APPROVED`.
- `CONSULTATION_STRIPE_ENABLED=true` for synthetic development only.
- `CONSULTATION_APP_ORIGIN`: exact canonical origin, e.g. `http://localhost:3000` (no trailing slash); HTTPS required except localhost/127.0.0.1. Use this same origin in your browser, Origin headers and Stripe returns.
- `CONSULTATION_STRIPE_SECRET_KEY`: **sk_test_** secret from an approved Stripe sandbox. Live/restricted/unknown prefixes are rejected. The existing unrelated `STRIPE_SECRET_KEY` is never a fallback.
- `CONSULTATION_STRIPE_WEBHOOK_SECRET`: signing secret for the exact local listener/development endpoint. Never use the API secret as a signing secret.

No publishable key/Stripe.js or pre-created Stripe price/product is required: server-controlled `price_data` creates one-time test-mode Checkout line items. Amount/currency/package pairing is checked against the Phase 1 constants and stored booking price, never browser input. Stripe receives only opaque booking/attempt IDs in metadata, not the Phase 1 topic/name/email. Stripe-hosted Checkout may collect its own synthetic payment/email details. Never enter real card/applicant data.

Legal terms, retention/deletion/contact and operator response processes remain founder-approval gates from Phase 1. Test overrides are not legal approval. A separate approved development Supabase project is required; never copy Production credentials here. No migration was applied to a hosted/Production database during implementation.

## Local setup and operator authorization

1. Install dependencies with `npm ci`. Apply `0001_init.sql`, Phase 1 `20261111150000_consultation_bookings.sql`, then `20261111170000_consultation_payments.sql` to a disposable local/development Supabase instance only. Existing booking rows are not deleted or rewritten.
2. Create a synthetic Supabase Auth user through the local development auth system and explicitly add its UUID to `public.admins` through a trusted local administrative connection. Use its current Supabase access token in `Authorization: Bearer ...`. Server `auth.getUser()` validates the token; every privileged RPC checks the verified UUID against admins. Merely having a booking UUID, a normal user JWT or a payment cookie does not authorize an operator action. This PR does not build a staff login/admin UI or grant admins public reads of booking records.
3. Configure the dedicated variables in untracked `.env.local`; `npm run dev`. Submit a synthetic Phase 1 request and get its UUID from the local operator/database workflow. Agree on a preferred appointment time manually (no calendar integration).
4. An authorized operator POSTs JSON to `/api/consultation/payments/invite` with `{ "bookingId": "<uuid>", "availabilityAgreed": true }`, same-origin `Origin`, `Content-Type: application/json`, and the operator Bearer JWT. The response is a 24-hour invitation URL with `#token=...` and expiry. Send it only through an approved private channel; no email sending or public booking search is implemented.
5. The customer opens `/consultation/pay#token=...`. JS removes the fragment with history.replaceState, keeps the token in memory and exchanges it for a scoped capability cookie. HTTPS uses `__Host-consultation_payment`, Secure, HttpOnly, SameSite=Lax, Path=/, expiring with the invitation; local HTTP uses `consultation_payment` for development compatibility. Nothing is stored in localStorage/sessionStorage or query strings. Cookie authorizes only that attempt's checkout/status and returns no contact details.
6. POST `/api/consultation/payments/checkout` requires the invitation capability and exact same origin, not a booking UUID. It reserves the attempt transactionally, creates/reuses one test Checkout Session (30 minutes) with a stable Stripe idempotency key, and returns only a validated checkout.stripe.com URL. Invitation must have at least 31 minutes left when first reserved. Repeated calls reuse the same attempt and session; a failure after an ambiguous Stripe call keeps the reservation rather than risking another charge.
7. On return, `/consultation/pay/result` checks the DB using the HttpOnly cookie. It ignores success/cancel query claims. Pending status polls for at most roughly one minute; use the refresh button later. No contact information is exposed. Status access also expires with the invitation; operators must handle later communication through the approved channel. Browser/site storage policy must allow the first-party cookie to retain status across Stripe navigation.
8. Separate authorized POST `/api/consultation/payments/confirm` accepts `{ "bookingId": "<uuid>", "appointmentConfirmed": true }` and requires a paid, requested booking. **Payment/refund webhooks never confirm or cancel the appointment.** Coordinate availability explicitly before confirming.

All operator requests also require Origin matching `CONSULTATION_APP_ORIGIN`; do not log operator tokens or invitation URLs in shell history, screenshots, analytics or server logs. Existing request-only pricing/free matching remain accessible without payment. The small Phase 1 origin fallback fix permits a blank optional origin when test payments are disabled.

## Stripe sandbox and webhook setup (manual; not activated by this PR)

Use Stripe's sandbox/test environment and its test key. With Stripe CLI locally authenticated to that sandbox, forward only the supported events to your local endpoint:

```sh
stripe listen --forward-to localhost:3000/api/consultation/payments/webhook \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,refund.created,refund.updated,refund.failed
```

Set the listener's signing secret locally, restart the development server, create an invitation, then pay in hosted **test** Checkout using Stripe's documented synthetic card (e.g. 4242 4242 4242 4242 with a future date/test CVC). Do not use real card data. Generic `stripe trigger` events without our attempt metadata are intentionally rejected; use the actual invitation-generated session, or fixtures carrying the exact local attempt/booking IDs.

Webhooks use the untouched raw body, SDK signature/timestamp validation and a 64 KiB cap. Events and retrieved objects must be test-mode and belong to this booking/attempt; amount must be $59/$99 USD, mode payment, and a paid intent must have succeeded for the full amount. Unsupported event types are acknowledged without effects. Live/Connect events, mismatches and invalid signatures are rejected. Provider retrieval/database failures are retryable 503; operators must monitor failed deliveries and replay genuine events after correcting configuration.

A service-only transactional event ledger deduplicates event IDs. The handler retrieves **current Stripe state**, so a stale expired/failure event cannot blindly overwrite a now-paid session. DB guards also prevent paid/refunded regression and refund success/failed-to-pending regression under interleaved snapshots. Existing booking transition trigger remains authoritative. No fulfillment email/job is dispatched here; paid timestamps and ledger are written once, with human service delivery/appointment confirmation separate.

Session expiry/async failure releases the booking's pending financial state only after verified current provider state. A never-reserved invitation can expire locally. A creating/pending ambiguous attempt cannot be replaced until a genuine provider event resolves it. Operations older than 23 hours are refused before reissuing a Stripe call to stay within the provider's idempotency-retention window. Recover old ambiguous attempts by inspecting Stripe and the local DB and replaying verified events; do not delete reservations or invent event data. There is no automatic reconciliation worker yet.

## Full test refunds

An operator POSTs `/api/consultation/payments/refund` with `{ "bookingId": "<uuid>", "fullRefund": true }` plus its JWT and same-origin headers. SQL requires admins membership and a paid attempt, reserves one open refund request and retains a stable request ID. Stripe refund creation uses `consultation-refund:<request UUID>` idempotency and the stored full amount/intent. Network/unknown results retain the reservation for safe retry; an existing Stripe refund ID is retrieved rather than creating another.

Even if Stripe's immediate response says succeeded, the API returns pending. Only the verified refund webhook may mark payment refunded. Failed/canceled refunds leave payment paid; a verified failure permits a new refund request with a new idempotency key. Duplicate or stale pending/failure events cannot regress successful refunds. No payment or refund modifies booking confirmation. Refunds created manually outside this workflow, partial refunds, account Connect events, disputes/chargebacks and automatic cancellation/refund policy decisions are not supported in this MVP; coordinate and reconcile them manually in the sandbox. Partial refunds require a future amount-ledger model and approved policy.

## Security boundaries and remaining setup

All new tables force RLS and revoke direct access from anon/authenticated/service_role. Only one fixed-search-path service-role RPC is executable; it accepts a strict server-selected action set and independently checks operator membership for invitation/refund/confirmation. Service-role credentials are powerful and must stay server-only. Capability hashes, not plaintext tokens, are stored. Bearer and cookie auth endpoints return only financial/package/appointment state, never name/email/topic. Auth/configuration failures fail closed; no file/in-memory persistence fallback.

Invitation is a bearer capability, not proof of customer identity: anyone with the private URL/cookie can view its limited status or pay that same fixed-price booking, but cannot refund/confirm or access PII. Keep it private, use HTTPS, audit host/proxy logs, and ensure any future analytics never captures full location/hash/cookies. Current implementation sends no consultation data to analytics or AI providers. Same-origin credentials preserve Preview Authentication compatibility; actual protected Preview requires separate authorized QA. The provider settings, repository protections, staff access and production isolation remain operational controls, not guarantees conferred by application code.

No real Stripe credentials were configured or used in implementation. Remaining external verification: approved nonproduction Supabase auth/gateway, sandbox key/listener, one real hosted synthetic Checkout and refund, expired/asynchronous methods, notification/recovery operations, policy approval and protected Preview QA. These do not block implementing/reviewing the code; they block claiming provider acceptance or launch readiness.

## Validation and safe integration

Run `npm run lint`, `npm test`, `npm run build`, then `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e:consultation -- --workers=2` (or install Playwright Chromium). Tests mock provider calls and UI status/Checkout where stated; SQL integration exercises the real disposable Postgres procedures. Never use a customer/Production database for fixtures.

After Phase 1 and this stacked PR are independently reviewed, reconcile the small pricing-policy/origin additions, preserve free Quiz/listings and existing analytics privacy constraints, apply migrations in order **only to development first**, and complete the sandbox acceptance matrix. Founder approval is required for any later integration/activation affecting main or Production. Do not merge this PR into main directly, activate live keys, or infer that passing mocks proves an external charge/refund occurred.
