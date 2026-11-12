# Feature-first protected Preview — final HousingMatch navigation

Latest source: founder PR #19 comments #6810548854 and **#6810981544**, plus the direct implementation request. Final four tabs are **Explore / Match / Ask AI / My** (房源 / 匹配 / AI助手 / 我的). Earlier five-tab and Homey-inspired mappings are superseded. Codex is sole code writer; Muse performs independent UX/QA. No production deployment/merge/migration/live charge or applicant email authorized.

## Preview mode and isolation

`previewDemoEnabled()` enables synthetic journeys automatically **only in Vercel Preview**, or via explicit `BETA_PREVIEW_DEMO=true` for local testing. Both Vercel Production environment indicators override the flag OFF. No project environment settings or Deployment Protection were changed. Existing protection must stay ON.

Preview demos are visibly labeled **DEMO MODE**. They use React session memory only: client navigation preserves the journey; a reload/new tab clears it. No browser persistence, real authentication, real entitlement grant, service-role write, external Gemini request, Stripe request or email delivery is substituted. A demo account cannot authorize the protected real APIs. No real name/email/password is requested by demo signup. The demo consultation form fixes identity to `Demo Visitor / demo@example.test` and discards topic/contact/time fields after local validation; only synthetic reference/package/language/stage remain in memory. No demo operation writes a real booking or email outbox.

The protected real implementations remain in place and are preferred when approved configuration exists. A runtime provider failure does not silently switch a real request into demo mode. Real routes still require verified Auth, RLS, consent, operator authority or provider gates as appropriate. Demo preferences, quotas, payments and emails are simulations, not provider acceptance.

## Functional feature map

| Module | Preview experience | Actual backend status |
|---|---|---|
| Explore / listing details / search | File catalog, filters, official links, original labeled representative illustrations | Local file handlers tested; current source/photo rights still require independent verification. No unlicensed property photos imported. |
| Match / AMI Quiz | Existing free quiz, complete preliminary results and explanations; demo saves available | Real matching handler with synthetic fixture tests. No guaranteed eligibility or odds claims. |
| Signup / login / My | Isolated synthetic account; `/login` and `/register` resolve to signup; no dead-end redirect to Quiz | Real Supabase Auth remains gated/configured separately, not falsely registered by demo. |
| Saved listings | In-memory save/unsave from directory, detail and quiz; My Saved list | Existing owner-scoped database saves retained and surfaced for verified real users. Demo favorites disappear on refresh. |
| Ask AI | Local bilingual example FAQ reply, 1/5/15 daily quota states, upgrade prompts, simulated error | **DEMO-MODE** if Gemini isn't configured. No question leaves the browser. Real Apps Script permissions/logging/cost/network review still BLOCKED. |
| Free / Basic / Smart | Consent, simulated Checkout/confirmation, demo entitlement/cancel flow | **DEMO-MODE** when Stripe isn't configured; no card/charge/real renewal. Real TEST checkout/webhook code remains protected. |
| Native consultation | Both EN/中文 $59/$99 cards; native form, demo Request ID, Awaiting Payment, demo inbox and explicitly simulated manual verification → scheduling message | Real durable request/acknowledgment/manual TEST verification/private outbox preserved. Hosted database/Auth/email setup still BLOCKED; no real request hidden in a fallback. |
| Application tracker | My module; add/edit/remove synthetic manual records, stage counts and dates | New authenticated owner-scoped CRUD and RLS migration; no official account connection, auto-apply or verified statuses. |
| Email listing alerts | Explicit demo preference, frequency, Basic/Smart gate, digest preview and unsubscribe | Real authenticated preferences and server-stamped consent metadata implemented. **Actual email delivery BLOCKED**, no sender/job approved; no real emails sent. |
| GTM Dashboard | Explicit synthetic sample data or opt-in session events, plan filter, aggregate funnel and CSV export | **DEMO-MODE**. No real cross-user metrics, third-party GTM container, Production conversions or paid-dashboard service connected. Existing privacy-safe opt-in dataLayer foundation retained. |

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

Validation: lint, unit, production build, secret-identifier bundle scan, all migrations and RLS/concurrency tests; existing matching/native-consultation/Beta/Pricing suites plus Preview navigation and complete demo journey at320/375/390/768/1440, EN/中文. The Preview journey checks signup/save/track/quota/simulated subscription/alerts/native request/inbox/dashboard, no provider writes, lack of real API authority and refresh-clearing. Hosted provider tests and physical mobile keyboard QA are not represented as performed.

**Next:** Muse exact-Preview feature QA; approved nonproduction Auth/RLS/email/Stripe/provider acceptance. Separately review sanitized Apps Script functions when supplied. Monetized Production release remains NO-GO until required legal/source/security/operations/provider gates pass. This feature-visibility approval does not authorize those actions.
