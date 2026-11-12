# Issue #18: conditional Beta candidate

> **Current increments:** see [PRICING_V3.md](PRICING_V3.md) for chat/subscriptions/analytics and [NATIVE_CONSULTATION.md](NATIVE_CONSULTATION.md) for the latest restored native EN/中文 consultation workflow. Legacy Stripe consultation charges remain retired; native request intake is restored. Earlier SHA/test counts are historical.

**Target: November 14, 2026, 8:00 PM America/New_York — conditional. Current monetized decision: NO-GO.**

This is one development integration branch, not a Production release or authorization to publish policies. Existing PRs remain open/unmerged. No Crosswalk dependency. Official Housing Connect applications are free; optional educational consultation never improves selection odds or guarantees eligibility/placement. Qualified NY review of the specific paid offer and founder approval remain mandatory before any real-money use.

## Sources integrated without data imports

Base main: `20cc90ad6bbefe80988c5a16975b74001a2fba58`.

| PR | Source head | Integration |
|---|---|---|
| #8 | d699af1eda3e8a5145ad1ed3b3c7453ae45036d2 | Stabilization/results foundation carried by #9; conflicts reconciled on this branch |
| #9 | 9c5fc0371057a4c22ba96ccef7f0dcdbdfd7b488 | Quiz/account/saved-list source and migrations; no collector data/CSV restored |
| #11 | f48ec303aecd5b66858cf00a5ed150f7d7d7ae10 | Income validation; UI maximum aligned to API/profile $5m bound; alert selector scoped and test storage isolated |
| #13 | 675d0e39f86651ab6240fadeb78cb9d81a871b64 | Legacy type/provenance fail-closed gate and fresh availability rules |
| #14 | 6d782c76a6bb49b9458c7de1d2b3d419ea22d656 | Same-row explicit income/household/unit matching and complete chart display |
| #16 | f41d42841d05fca8575e4921229dce9452103c3b | Request-only consultation, server validation, versioned draft policies, strict RLS |
| #17 | 0e73a7a2bcde903013f7c3fdc054ccee8640c15c | Test-only capability-authorized Checkout, signed webhooks/refunds and separate confirmation |

Main's `data/listings.json`, collector CSVs/state and ingestion schedule remain unchanged. Historical source approvals are **not** new Issue #18 approvals: the proposed gate keeps all Muse sources pending current review. No real property photos are used; the original neutral building graphic is explicitly labeled in EN/中文, not represented as a real property photograph. Review-only HCR/HDC/Muse reports must not be auto-imported.

## New integration work

- Media-first directory cards with bilingual name/address/borough search, unit/borough/type filters, source dates, honest availability, safe HTTPS links and separate secondary inventory. Repeated query parameters are normalized, not passed as arrays into string parsers.
- Free Quiz remains the main homepage CTA; consultation section is optional. All consultation/free-return links point to the free Quiz. Privacy keeps the account material and adds consultation disclosures; all policies remain drafts.
- Auth is explicit/default-OFF, with no embedded development/Production project fallback. Supply an approved per-environment project/provider before enabling. Signup requires an unchecked privacy-consent acknowledgement. No real email was sent in tests.
- Same-origin auth destinations reject protocol-relative/backslash redirects. Sign-out clears the local 24h quiz cache so a different user does not inherit household answers. Saved-data deletion is owner scoped and atomic; sign-in account/email deletion still needs an approved complete account/support process.
- Reconciles 0001 vs 0005 saved-list schema: drops only the catalog FK and legacy subscription save-limit trigger, preserves existing rows/columns, restricts grants to owner SELECT/INSERT/DELETE and adds `delete_my_housing_data()` under RLS. JSON-catalog IDs no longer require an unrelated DB listing import. Free favorites do not require a subscription.
- The dependency audit identified vulnerable test/build dependencies. Vitest is updated to patched 4.1.12 with an explicit Oxc JSX transform; PostCSS is constrained to patched 8.5.32+, and TypeScript-ESLint stays on the ESLint-9-compatible 8.x line. Next remains on 15.5.29. The resolved dependency audit reports zero advisories, and CI enforces the audit rather than accepting critical development-tool findings.
- Candidate CI checks the **PR head SHA**, not a different merge snapshot, and uploads SHA-tagged fixture screenshots. Booking, auth and Stripe remain default-OFF unless explicitly configured; live Stripe keys are rejected.

## Evidence: fixture PASS is not real-provider PASS

The PR/Issue #18 delivery comment records the exact final SHA and CI URLs. CI also uploads `release-evidence/candidate-sha.txt`. Do not infer acceptance from Vercel's green ignored/skipped-deployment status.

| Gate | Implemented/local evidence | Real release acceptance |
|---|---|---|
| Directory EN/中文, 390/1440px | Real Chromium captures of running candidate with **synthetic catalog**; neutral original graphic, search/filter assertions | Real source/link/availability review and Muse Operations hands-on QA pending |
| Income/AMI/quiz | Unit + Chromium same-row income/unknown-rule/secondary-count assertions; source records untouched | Independent current official-chart checks pending; no guaranteed eligibility |
| Accounts/saves/deletion | Signup consent UI; intercepted synthetic OTP only; real local Postgres two-owner RLS/delete tests, logout privacy regression | Hosted Auth, sessions, login/save/delete browser flow and full account deletion/support not accepted yet |
| Consultation | Request-only UI/API/local SQL assertions, unchecked consent, no charge/no calendar reservation | Approved dev Supabase HTTP/operator workflow and policy/response readiness pending |
| Stripe TEST | Real SDK signature fixtures + mocked provider/UI + real local transactional SQL; no auto-confirmation, replay/refund/expiry tests | **NOT RUN:** genuine sandbox Checkout/webhook/refund/retry acceptance needs approved keys/network/resources |
| CI/security | Lint/unit/build/client-bundle scan, all migrations/DB assertions and three browser suites in GitHub Actions | Exact-head green run required; URL/results recorded on the PR/issue |
| Sources/photos/legal/support | No unlicensed photos, unsafe links suppressed, no new data imports, explicit draft disclaimers/default-OFF | Source/license evidence, NY legal/conflict review, support/cancellation/scheduling/rollback sign-off and founder decision remain blockers |

Committed `docs/release/screenshots` are actual browser captures at 390/1440 with synthetic fixtures. They are **not** screenshots of real provider acceptance or real housing offers. Inherited screenshots under `docs/consultation` belong to the earlier component PRs; they are not this candidate's release evidence. CI artifacts contain the candidate's complete fixture suite output. Muse Operations evidence is not fabricated or represented as performed.

## Safe local validation

Use Node 24, Docker's local socket, no Production keys or remote Docker context. Install with `npm ci`. Use only synthetic fixtures:

```sh
npm audit --audit-level=moderate
npm run lint
npm test
npm run test:db:beta
BETA_FIXTURES=synthetic npm run build
python3 scripts/check-client-bundle.py
# Install Playwright Chromium or select an existing local executable.
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e:results -- --workers=2
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e:consultation -- --workers=2
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e:beta -- --workers=2
```

The three configs explicitly select synthetic catalog/settings; no real applicant/provider messages or external Stripe requests occur. The results/consultation specs retain mocked match/payment responses where annotated; Beta API assertions use the actual handler with synthetic server-side listings. Test-mode placeholders never constitute valid provider credentials.

`test:db:beta` creates an isolated, portless local PostgreSQL container, scaffolds only synthetic Auth identities/claims, applies migrations in filename order, runs booking/payment and owner RLS assertions, then stops only that test container. This verifies SQL behavior, not Supabase Auth token verification or its hosted gateway. Browser OTP interception proves consent/UI handling, not email deliverability or authentication.

## Required nonproduction setup and remaining blockers

Auth: `NEXT_PUBLIC_AUTH_ENABLED=true`, approved `NEXT_PUBLIC_AUTH_SUPABASE_URL` and publishable key, explicitly selected email/Google provider flags, approved redirect allowlist and a synthetic test account. Never point local/Preview at a Production project. Without configuration, sign-in is absent and anonymous free results remain available.

Consultation/Stripe: dedicated server settings and strict test-mode keys/origin described in `docs/consultation/stripe/README.md`. No key, signing secret, development project or canonical origin is provisioned by this branch. Current managed networking lacks Stripe/hosted-Supabase access; approve the exact service destinations before external acceptance. Legal-copy approval and test overrides are different things. Public/real user intake must stay OFF until approved retention/deletion, contact, private invitation, operator response and scheduling processes exist.

Do not switch `LISTINGS_SOURCE` to Supabase until provenance/type round-trip and publication behavior are accepted on the approved development schema; legacy metadata loss must never become a trust signal. Map already-applied migration versions before using an existing project; never blindly run `supabase db push` against a linked Production instance. Deferred analytics PR #3 has historical version 0002, which must be reconciled deliberately if included later. No analytics is enabled by this candidate.

## Operations and rollback proposal — not executed

1. Record exact head, CI and fixture vs real evidence. Request Muse Operations manual EN/中文, 390/1440, keyboard/error-path/official-link QA on that head through Issue #18; no applicant communication is authorized.
2. In approved development only, run real Auth/RLS and Stripe sandbox scenarios: success, failed/expired Checkout, invalid signature, repeated/out-of-order webhooks, full refund failure/retry and separate appointment confirmation. Verify support intake and cancellation/scheduling policies and a working approved privacy/contact channel.
3. Obtain source/license review and qualified NY legal/conflict review of the paid education offer. No application processing/expediting fees or claims of affiliation/priority/guarantees.
4. Founder makes a separate exact-action GO/NO-GO decision. No merge, final policy publication, Production settings/database/deployment, applicant outreach or real charge follows automatically from CI or this PR.
5. If later explicitly approved, keep kill switches ready: disable booking, auth or Stripe independently; payments must never fall back to live or insecure storage. Revert code through a reviewed PR rather than destructive SQL. Preserve booking/payment/refund event ledgers for reconciliation; migration rollback must not delete customer/payment history. Monitor failed webhooks and investigate ambiguous provider operations rather than clearing idempotency reservations.

If required gates are incomplete at the deadline, recommend **NO-GO for monetized Beta**. A free-only directory/quiz scope is an alternative, not an automatic publication: it still requires its own source/security/QA gates and founder deployment approval.

Distributed/edge rate-limit acceptance is still required before public traffic: the booking SQL cap and capability/operator boundaries are tested, but they are not a complete bot/volume-control strategy for anonymous matching and status routes. No paid protection service or project policy was enabled here.
