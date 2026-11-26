# Native bilingual consultation — founder workflow correction

Latest founder instruction supersedes the external Google Form decision in PR #19 comment #6809967303 and commit d328062. Preserve existing page/card design and native request form. No Google Form replacement. Codex is the sole code writer; Muse performs independent UX/QA. Draft only; no merge, Production action, live charges or real applicant emails.

## Current experience

Both English and Simplified Chinese `/consultation` pages retain $59/30-minute Standard and $99/60-minute Expert cards, existing included services and native `/consultation/book` request form. Exact founder headings/subtitles/CTAs are used. Navigation/homepage/chat/pricing expose consultation in **both** languages. Free Quiz, search/AMI and chatbot/subscription work remain intact.

1. Customer selects package and submits native form with unchecked terms/privacy consent. Inputs are bounded/Zod-validated; no uploads, SSNs or payment-proof collection.
2. Server validates canonical Origin, approved test recipient, future unambiguous time/timezone and consent versions. A single database transaction creates a **server-generated unique Request ID**, fixed authoritative package/price, **Awaiting Payment** state and acknowledgment outbox entry. The browser submission UUID is only an idempotency key, never the Request ID. A changed body cannot reuse that key; retries return the same receipt and do not enqueue duplicate mail. No insecure file/local fallback exists.
3. The server automatically processes the acknowledgment, in the **customer-selected language**, containing Request ID, package, price, duration and included services. Approved/configured payment instructions may appear; otherwise an explicit **TEST placeholder / do not pay** appears. No scheduling link in the acknowledgment. Email disabled/error: receipt remains valid and mail stays queued, never falsely marked delivered.
4. Request stays **Awaiting Payment** until an authenticated authorized operator manually verifies payment. In this PR verification is **TEST only**. The server verifies identity against the dedicated development project's Auth; SQL independently checks `admins` membership. Exact amount/currency, an explicit verification action, hashed synthetic reference, verifier ID and timestamp are required. A customer request, browser flag or Stripe redirect cannot mark it paid. Do not grant Production/admin access or accept real money here.
5. Verification and scheduling-outbox insertion are atomic. The scheduling message can be claimed only when payment is verified **and** acknowledgment delivery is recorded. Verification automatically invokes email processing; approved scheduling configuration supplies the link, never customer input. Repeated verification/worker execution cannot enqueue extra messages. `scheduling_invited` still leaves the appointment `requested`, not calendar-confirmed.

No Stripe consultation charge is re-enabled. Legacy `/api/consultation/payments/*` remains410 and `/consultation/pay*` redirects to the native pricing page. Subscription Stripe TEST flows are separate and unchanged.

## Private outbox and limitations

New migration `20261112210000_native_consultation_workflow.sql` extends existing bookings and adds a private submission mapping and email outbox. Public/authenticated direct table/RPC access is denied. Service-only commands have fixed search paths, constrained transitions, staff authorization and a global20/minute plus per-email10/day intake cap. Request IDs are references, not read/payment authority. Records and mail bodies never enter analytics/Gemini or logs.

Workers claim one expiring lease (`SKIP LOCKED`) and persist an immutable message before sending. Stable provider idempotency key is derived from the outbox ID. Failed/ambiguous sends retry the exact message/key, with a one-minute delay; after23 hours from preparation, stop for operator review rather than exceed the proposed Resend24-hour idempotency window. A crash after external send but before DB completion relies on provider deduplication; do not claim absolute exactly-once delivery. A lost/expired lease cannot acknowledge another worker's send.

Payment/scheduling flags do not approve the real payment method. No real payment instructions are configured. Test verification records are explicitly `verification_environment=test`. Do not represent synthetic verification as real bank-transfer reconciliation. Actual cancellations/refunds/contact, full retention/deletion and legal review remain release gates.

## Setup required — approved nonproduction only

All defaults OFF in `.env.example`:

- `CONSULTATION_BOOKING_ENABLED=true`, `CONSULTATION_POLICIES_APPROVED=true`, `CONSULTATION_NONPRODUCTION_APPROVED=true`; exact canonical `CONSULTATION_APP_ORIGIN`; approved development `CONSULTATION_SUPABASE_URL` / server-only service-role key. Production Vercel runtime is rejected. Map prior migrations; apply only to a separately approved nonproduction database. No hosted/Production migration was run.
- `CONSULTATION_TEST_RECIPIENTS`: explicit comma-separated approved test addresses. Other recipients are rejected before saving. Never put a real applicant address in this list. Only synthetic data in this iteration.
- `CONSULTATION_EMAIL_TEST_ENABLED=true`, approved `CONSULTATION_EMAIL_FROM` and server-only `CONSULTATION_RESEND_API_KEY`. The fixed Resend endpoint is an adapter, not verified live delivery. No credentials/provider domains are configured in this environment; do not enable billing or create keys here. Missing configuration leaves mail queued.
- `CONSULTATION_PAYMENT_INSTRUCTIONS_APPROVED` defaults false. Only after separate method approval, configure versioned English/Chinese instructions. Unset/unapproved/empty instructions produce a do-not-pay placeholder. Scheduling URL must not be inserted in payment instructions.
- `CONSULTATION_MANUAL_TEST_VERIFICATION_ENABLED=true` for synthetic test receipts only. Approved test operator already in the development project's `admins`; this PR does not provision or escalate staff.
- `CONSULTATION_SCHEDULING_APPROVED=true` plus `CONSULTATION_TEST_SCHEDULING_URL` (approved HTTPS test calendar/link, no credentials). Missing configuration leaves scheduling mail queued; it never falls back to an unapproved link.

Authorized operator APIs (send the **test** access token privately, never in committed files or chat):

- `POST /api/consultation/requests/verify-payment`, canonical Origin + Bearer token, JSON `{requestId,amountCents:5900|9900,currency:"usd",reference:"SYNTHETIC_...",verified:true}`. Server supplies the verified actor and test environment; client actor/environment fields rejected. Synthetic reference is hashed, never returned/logged. A new payment method must not be activated through this endpoint without new reviewed work/approval.
- `POST /api/consultation/requests/process-email`, canonical Origin + verified admin Bearer token. Retries eligible queued messages; cannot verify payment or bypass SQL gates. Automatic processing occurs on request/verification; no persistent background scheduler was activated. An approved nonproduction worker/cron is required to retry process-crash/delayed queues unattended. Do not place access tokens in cron URLs.

## Executed evidence versus external acceptance

PR #19 records exact final SHA, CI and counts. Native Chromium suite now runs the **actual Next handlers + real disposable PostgreSQL + a synthetic local Supabase-shaped gateway and in-memory email sink**, not intercepted booking-success responses. It tests EN/中文1440/390, form/card content, package choice, unchecked consent, generated ID, private acknowledgment contents, no prepayment scheduling link, denied unauthorized/wrong-amount verification, automatic scheduling after authorized TEST verification and duplicate prevention. Real local SQL tests also race8 independent workers for one outbox lease.

`scripts/consultation-browser-fixture.mjs` is test harness only: owned portless/no-network Docker container, loopback3250 fake gateway/sink, no remote fallback; all records/messages synthetic and disposed. `CONSULTATION_EMAIL_TEST_ENDPOINT` is permitted only on loopback with explicit synthetic/harness flags. It is not a production email transport or persistent fallback. Fake Auth verifies a known synthetic token only; this does **not** validate hosted Supabase JWT/Auth, staff provisioning or Resend deliverability. Browser screenshots show synthetic banners; they are not Muse acceptance.

No real payment, email, calendar booking, applicant data or external Google Form was used. Gemini remains gated pending separately supplied sanitized functions; that does not block this independent native work. Next task: approved nonproduction hosted Auth/RLS and email provider acceptance, staff operations and scheduling-link/retention/privacy/legal review, then real payment-method approval as a separate action. Monetized Beta remains **NO-GO** until required gates pass.
