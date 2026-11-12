# Feature-first protected Preview — final HousingMatch navigation

**Current source and provider actions:** [CONTEMPORARY_BETA.md](CONTEMPORARY_BETA.md) supersedes the historical-photo and safe reload persistence implementation described in earlier checkpoints.

Latest source: founder PR #19 comments #6810548854 and **#6810981544**, plus the direct implementation request. Final four tabs are **Explore / Match / Ask AI / My** (房源 / 匹配 / AI助手 / 我的). Earlier five-tab and Homey-inspired mappings are superseded. Codex is sole code writer; Muse performs independent UX/QA. No production deployment/merge/migration/live charge or applicant email authorized.

## Preview mode and isolation

`previewDemoEnabled()` enables synthetic journeys automatically **only in Vercel Preview**, or via explicit `BETA_PREVIEW_DEMO=true` for local testing. Both Vercel Production environment indicators override the flag OFF. No project environment settings or Deployment Protection were changed. Existing protection must stay ON.

Preview demos are visibly labeled DEMO MODE. A strict Preview-only local snapshot preserves allowlisted synthetic account/profile-preset/saved IDs/plan/day/quota/preferences/request-status/tracker-stage data for up to seven days. Sign out clears it. Malformed/expired/overlarge snapshots fail closed; blocked browser storage gets an explicit warning. Contact information, chat/free text, actual household inputs, analytics events/consent/visit IDs and real credentials are excluded. The snapshot is never real Auth or billing authority. Demo signup uses fixed Demo Visitor identity; native demo form discards topic/contact/time fields. No real request, email or service-role write is hidden in a fallback.

The protected real implementations remain in place and are preferred when approved configuration exists. A runtime provider failure does not silently switch a real request into demo mode. Real routes still require verified Auth, RLS, consent, operator authority or provider gates as appropriate. Demo preferences, quotas, payments and emails are simulations, not provider acceptance.

## Functional feature map

| Module | Preview experience | Actual backend status |
|---|---|---|
| Explore / listing details / search | File catalog, filters, official links, 32 contemporary commercially reusable NYC color photographs with per-image CC/public-domain records, original-art fallback and accessible next/previous/enlargement gallery | Local file handlers tested; current source/photo rights still require independent verification. No unlicensed property photos imported. Photos are conspicuously representative, not actual property imagery; per-file source/rights/author-unknown/date/hash manifest is checked in. |
| Match / AMI Quiz | Existing free quiz, complete preliminary results and explanations; demo saves available | Real matching handler with synthetic fixture tests. No guaranteed eligibility or odds claims. |
| Signup / login / My | Isolated synthetic account; `/login` and `/register` resolve to signup; no dead-end redirect to Quiz | Real Supabase Auth remains gated/configured separately, not falsely registered by demo. |
| Personalized recommendations | My uses the existing matcher and selected synthetic household profile; real accounts use their saved profile | At most three primary opportunities, excluding closed/unlikely and preserving income/unknown-rule warnings. Free Quiz/full results remain available. |
| Saved listings | Browser-persisted synthetic save/unsave from directory, detail and quiz; My Saved list | Existing owner-scoped database saves retained and surfaced for verified real users. Synthetic favorites survive refresh; real owner database saves remain separate. |
| Ask AI | Local bilingual topic-aware FAQ replies (AMI, preparation, consultation, subscriptions), 1/5/15 daily quota states, upgrade prompts, simulated error | **DEMO-MODE** if Gemini isn't configured. No question leaves the browser. Real Apps Script permissions/logging/cost/network review still BLOCKED. |
| Free / Basic / Smart | Consent, simulated Checkout/confirmation, demo entitlement/cancel flow | **DEMO-MODE** when Stripe isn't configured; no card/charge/real renewal. Real TEST checkout/webhook code remains protected. |
| Native consultation | Both EN/中文 $59/$99 cards; native form, demo Request ID, Awaiting Payment, demo inbox and explicitly simulated manual verification → scheduling message | Real durable request/acknowledgment/manual TEST verification/private outbox preserved. Hosted database/Auth/email setup still BLOCKED; no real request hidden in a fallback. |
| Application tracker | My module; add/edit/remove synthetic manual records, stage counts and dates | New authenticated owner-scoped CRUD and RLS migration; no official account connection, auto-apply or verified statuses. |
| Email listing alerts | Explicit demo preference, frequency, Basic/Smart gate, matcher-computed personalized digest preview, three synthetic household presets and unsubscribe | Real authenticated preferences and server-stamped consent metadata implemented. **Actual email delivery BLOCKED**, no sender/job approved; no real emails sent. |
| GTM Dashboard | Explicit synthetic sample data or opt-in session events, plan/channel/language/New York date/sample-vs-session filters, unique-visit funnel, channel table, same-visit checkout conversion and aggregate CSV export | **DEMO-MODE**. No real cross-user metrics, third-party GTM container, Production conversions or paid-dashboard service connected. Existing privacy-safe opt-in dataLayer foundation retained. |

Do not label all features LIVE just because they render. `/help` links the full feature map and distinguishes live file-backed tools, demo simulations and external-provider blockers. Real registration/activation analytics remain verified service-side milestones; demo events are a separate local dataset and never impersonate those milestones. Samples do not turn on collection. No chat, identity, household inputs, listing IDs or URLs enter the demo dashboard/export.

## Navigation/accessibility

- Compact sticky brand/locale/hamburger top bar; no wrapping mobile desktop-link row.
- Four original icon/translated-label tabs below 768px, active states, 44px+ targets, bottom safe-area padding and content clearance.
- Accessible native modal drawer with full feature map, signed-in/out state, Escape, focus containment/return, backdrop dismissal where visible and independent scroll.
- Desktop links retained; My links saved records, application tracking, subscriptions, consultations, notifications and dashboard.
- Native form/Chat inputs retain scroll room. Visual viewport resizing hides the bottom bar while a software keyboard reduces the viewport; real iOS/Android keyboard behavior still needs Muse/device validation.
- Listing filter uses Next.js client form navigation so filtering doesn't accidentally reset the explicitly nonpersistent demo session. Locale changes use the existing cookie mechanism, not a new localization system.

## New data architecture (not applied remotely)

`20261112220000_owned_tracking_preferences.sql`: `application_tracker` and `notification_preferences`, Auth-owner FK/cascade, RLS, explicit grants and manual-status constraints. APIs derive identity from verified `getUser()`, reject client actor/owner injection and check canonical browser Origin. Notification consent version/timestamp are server-controlled; a user cannot forge the timestamp. Notification delivery remains disabled even if a preference is enabled; future sender work must additionally verify paid entitlement, approved sources, unsubscribe/suppression and sender approval.

No new hosted database, credentials, paid service or live product created. Migration validation uses disposable portless/no-network local Postgres only. Existing full account-deletion/support/retention gates remain documented.

## Evidence and review URL

Protected branch alias: https://housingmatch-nyc-git-feat-beta-integration-yao-s-projects16.vercel.app/

Exact final SHA, CI run, deployment status and screenshot links are posted on PR #19 / Issue #18. The Preview footer displays the Vercel commit prefix when provided, so reviewers can detect a stale branch alias or platform toolbar. This cloud's outbound proxy rejects Vercel with HTTP403; GitHub deployment metadata plus local real Chromium is not a claim of direct hosted browser verification. Muse must verify the exact new deployment through authorized SSO; never disable Deployment Protection. No before/after screenshots are fabricated: earlier native captures are the prior layout; current CI/local captures are running code with explicitly synthetic settings.

Validation: lint, unit, production build, secret-identifier bundle scan, all migrations and RLS/concurrency tests; existing matching/native-consultation/Beta/Pricing suites plus Preview navigation and complete demo journey at320/375/390/500/768/1024/1440, EN/中文. The Preview journey checks signup/save/track/quota/simulated subscription/alerts/native request/inbox/dashboard, no provider writes, lack of real API authority and safe reload persistence. Hosted provider tests and physical mobile keyboard QA are not represented as performed.

**Next:** Muse exact-Preview feature QA; approved nonproduction Auth/RLS/email/Stripe/provider acceptance. Separately review sanitized Apps Script functions when supplied. Monetized Production release remains NO-GO until required legal/source/security/operations/provider gates pass. This feature-visibility approval does not authorize those actions.

## Completeness increment

Recommendations and digest previews now use the existing `/api/match` handler, not hard-coded opportunities. Profile changes cancel outdated requests; a stale response cannot replace the current profile's results. No profile data is placed in URLs or analytics. Unknown-rule confirmation warnings remain visible, secondary opportunities are excluded, and an income match above the rent budget is labeled explicitly in both languages. Digest previews are **not new-listing detection or email delivery**.

Analytics schema v2 adds only an allowlisted acquisition bucket: direct, organic_search, social, email, paid_campaign or referral. Classification happens locally after consent; raw campaign/referrer/query values are never exported or transmitted. The first observed document bucket persists only in memory; pre-consent attribution is not reconstructed. The demo dashboard separates generated sample records from opt-in session records. Repeated events are retained for totals but deduplicated by anonymous visit for funnel counts. Checkout conversion uses the intersection of checkout and activation visits, not unrelated activation totals. This is an observed same-document statistic, not verified revenue, unique people, ordered funnel completion or cross-device attribution. CSV contains aggregate event/count/observed_visits only.

New local Chromium captures: [EN recommendations, desktop](screenshots/completeness/recommendations-en-width-1440.png), [中文 recommendations, mobile](screenshots/completeness/recommendations-zh-width-390.png), [EN digest, mobile](screenshots/completeness/personalized-digest-en-width-390.png), [中文 digest, desktop](screenshots/completeness/personalized-digest-zh-width-1440.png), [EN dashboard, desktop](screenshots/completeness/acquisition-dashboard-en-width-1440.png), [中文 dashboard, mobile](screenshots/completeness/acquisition-dashboard-zh-width-390.png). These are synthetic local renders, not hosted-provider acceptance.

## Muse QA follow-up / provider setup

[PROVIDER_ACCEPTANCE.md](PROVIDER_ACCEPTANCE.md) maps all12 Muse findings to code/tests and documents the actual provider blockers, historic public-domain photo evidence, TEST Stripe catalog dry-run/apply commands and server-side Price verification. Premium$29.99/month is Coming Soon only, checkout disabled with no entitlements. Global bilingual demo-reset warning now explicitly covers identity/saves/plan/quota on every Preview page. Real integrations are not claimed connected.

## Latest increment

The1911 photographs are removed from active public assets.32 primary catalog covers are unique;25 are borough-matched and7 explicitly generic NYC. Homepage/gallery/photo-credits use contemporary images; adapted files preserve their source licenses. Daily demo quotas, Basic/Smart intent and synthetic account/saves now survive reload. Real chat remains server-authenticated; local demo chat also requires its synthetic account. Error codes translate on locale change. Quiz actions use ordinary flow/heading scroll clearance. Strong within-budget results rank first; over-budget income matches use an amber not-a-full-fit label. TEST refunds now reconcile current invoice payments before any paid grant. See the authoritative current document for limitations and specific secure configuration actions required from Jade.
