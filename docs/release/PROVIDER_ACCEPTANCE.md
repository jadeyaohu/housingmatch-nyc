# QA follow-up and nonproduction provider acceptance

Approved founder instructions: PR19 comments6830605522,6830623816,6831910562; Muse findings Issue18 comment6828587427. No Production, live payment or automatic merge authorization. Exact final SHA/CI/Preview evidence is on PR19.

## Muse findings addressed

1. Mobile composer: extra main/composer clearance and scroll padding/margins keep the scrolled Send control above fixed tabs. Browser tests assert its entire bounding box at320/390/500 and other widths. Real software keyboard/SSO toolbar testing remains Muse's device acceptance.
2. Chinese tabs: explicit text span with horizontal/vertical padding and20px line height; no compressed11px glyph box. EN/ZH screenshot and geometry checks.
3. Footer consent: dashboard link on its own flex row with spacing (including analytics globally OFF).
4. Demo resets: **prominent global bilingual RESET NOTICE on every Preview page**, explicitly enumerating identity/saves/plan/quota loss on reload/direct entry/new document. No new persistence of personal inputs, authentication claims, visit IDs or quota credentials. This is a demo limitation, not server-side quota behavior. Production excludes demo modes.
5–6. Signed-out demo plan navigates to explicit demo signup with validated return to pricing. Signup honors next; login/register preserve safe return too. `mode=demo` is permitted only when the server Preview/local gate is ON, so partial real Auth configuration cannot trap a demo payment journey. It grants no real authorization.
7. Local demo chat has local-only consent/subtitle/retention copy and no signed-out prompt once signed in. Real provider disclosures remain on real mode. No question stored/persisted externally by demos.
8. Income-only labels for over-budget results now apply to card, section, count summary and Quiz preview. Matching eligibility/status/count rules remain unchanged; budget and income are distinct.
9. Recommendation sorting has explicit English name + unique-ID tie-breaking, stable across shuffled responses. Old-profile rows hide immediately on a preset switch and late aborted responses cannot replace current results. Same source data/date/profile is deterministic; source changes and New York midnight deadline changes may legitimately change recommendations.
10. Demo post-verification explicitly says Simulated Payment Verified / Scheduling Invited; appointment is **not confirmed**.
11. Help descriptions translated to Chinese; four-tab drawer labels use existing locale mechanism.
12. Saved cards reuse public listing cards: photo, address, rent, AMI reference/official-chart caution, units, availability and deadline, separated save control. A removed/expired catalog record gets an explicit unavailable explanation and unsave action.

Muse's33→32 primary catalog count is expected: `hc-7676`, 6-05 129th Street Apartments, deadline2026-11-11, drops after midnight New York2026-11-12. Secondary counts remain separate. No listing file/import/approval change was made.

## Photographs actually supplied

Three real **historic1911 NYC Fifth Avenue** photographs from NYPL's public-domain release, downloaded from NYPL's own GitHub repository. They are not current property photos. `src/lib/photos/manifest.json` records per-file title, photographer-unknown disclosure, source/download, pinned source commit, public-domain/CC0 evidence, verification date, changes and local asset SHA256. Rights evidence is retained in `photo-evidence/NYPL-README.md` and `NYPL-CC0.txt`. Only the identified1911 photos were copied, **not the repository's modern Google Street View screenshot**.

All are `photo_status: representative`, no property association. `verified_property` requires an exact listing ID; `pending_permission` is excluded. Stable cover selection provides varied cards. `next/image`, optimized local WebP, lazy loading, explicit loading/error fallback, previous/next and enlarged contain gallery. All image captions say “Representative photo — not this building · historic1911” / “示意照片，非该楼盘实拍 · 历史照片1911”. Official listing links remain the route to the real building's current images/requirements. Modern color/actual-property photos remain pending per-file permission/research, not falsely declared licensed. Muse-Research may supply new per-file evidence via GitHub; code owner remains Codex.

## Apps Script / Gemini — actual blocker, not a demo success

A fresh2026-11-12 synthetic JSON POST `{question}` to the founder endpoint failed at Envoy **before Google**: `curl (56) CONNECT tunnel failed, response403`, `HTTP/1.1 403 Forbidden`. Current restricted environment permits GitHub/package sources but not script.google.com/script.googleusercontent.com or Vercel. No secure provider credentials exist here. No bypass or policy/config change was attempted. Upstream redirects/content type/FAQ/Gemini/auth/logging remain **unverified against the actual deployment**, despite adapter contract tests passing.

Minimum acceptance inputs: sanitized doPost/jsonResponse/searchFAQ/callGemini/logConversation functions (no keys), deployment access/auth behavior, direct-endpoint abuse/cost protection, logging/redaction/retention policy, approved nonproduction Auth/database resources and outbound access. Existing provider keeps a12-second total timeout/64KiB cap, Google302/303 ContentService GET-only response follow, no POST replay/credentials forwarding, strict answer/source output and escaped rendering. Optional faq_id/category are ignored, not analytics or entitlements. Keep provider review gates OFF until actual access/abuse/privacy acceptance. Existing SQL quotas remain1/5/15 successful responses/day, America/New_York midnight, one in-flight reservation/account, provider failures released and concurrency tested.

## Stripe TEST catalog — prepared, no account objects claimed

No Stripe plugin/account/key is connected. **No Product, Price, customer, subscription or charge was created remotely.** Existing TEST Checkout, signature verification, webhook idempotency, serialized current-state reconciliation, renewal/failure/cancellation and expiry logic is reused.

In a privately configured approved nonproduction shell only, set server-only `SUBSCRIPTIONS_STRIPE_SECRET_KEY` to the account's existing `sk_test_…` value using secure settings, plus nonsecret expected account ID `SUBSCRIPTIONS_STRIPE_TEST_ACCOUNT_ID=acct_…`. Do not paste secrets in chat, GitHub, logs or command arguments. Never use live keys. No billing/API-credit purchase is required by this script, and it creates no charges.

```sh
# Read-only default: report reuse/would-create, create nothing.
npx tsx scripts/stripe-test-catalog.ts
# Explicit founder-authorized TEST Product/Price creation only.
npx tsx scripts/stripe-test-catalog.ts --apply-test-catalog
```

The script checks the current account identity and requires Stripe balance API confirmation of `livemode:false` before catalog writes, rejects Production/live keys, paginates products and maps stable catalog/plan metadata + unique lookup keys. Ambiguous/inactive/live/mismatched objects fail closed. An unmanaged existing HousingMatch Basic/Smart product also stops creation for manual review/mapping in the TEST dashboard; the script will not silently duplicate or adopt it. Stable account-scoped idempotency keys prevent duplicate concurrent creation; reruns reuse matching objects. Only Basic499 and Smart999 cents, USD/month/quantity1, no Premium objects. Read-only output prints account/Product/Price IDs, never secrets. Apply output is evidence only if the actual Stripe API confirms it; unit SDK fixtures aren't account evidence.

Privately configure returned IDs as server-only `SUBSCRIPTIONS_STRIPE_BASIC_PRICE_ID` / `SUBSCRIPTIONS_STRIPE_SMART_PRICE_ID`. Checkout retrieves/expands a configured Price, checks fixed amount/currency/monthly interval/active TEST product and catalog/plan metadata **before reserving a checkout**. Unconfigured IDs retain the earlier fixed inline TEST price_data path; they do not imply catalog setup. Never invent IDs. Existing `SUBSCRIPTIONS_ENABLED`, TEST key/webhook secret and approved Beta/Auth flags remain required; no environment setting was activated here.

Configure the existing `/api/subscriptions/webhook` in the approved TEST environment with its secure `whsec_…` secret and documented events. Verify actual sandbox checkout, signed-event rejection, payment/invoice success, webhook replay, renewal failure, cancellation/end-of-period expiry and no second subscription before claiming fully connected. No access from success URLs, no client plan grants; Premium$29.99/month is translated Coming Soon, disabled, no active quota/checkout/entitlements.

## Auth / saves / email

Existing verified Supabase Auth/OTP/Google callback, safe return, owner RLS/saves and manual tracking remain intact. Actual nonproduction project/provider URL/key/redirect configuration is missing here. No hosted schema migration or real-record access. The native EN/中文 consultation form/outbox/manual TEST verification→scheduling retains existing tests using real local SQL and synthetic Auth/mail. Secure recipient allowlists, operator authorization, idempotency and delivery gates stay in place. No real sender/domain/recipient configured or email sent. Listing digests remain local previews; no automatic sender job activated.

Next provider work is actual approved nonproduction acceptance when secure configuration/network/functions are supplied; do not repeatedly ask for settled product decisions. Muse independently validates this exact new protected Preview and all12 findings, including physical keyboard/toolbar behavior and no blank photo cards.
