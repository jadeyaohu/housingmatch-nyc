# Free Beta candidate — founder scope change, 2026-11-12

Authority: Issue18 #6838460261 and PR19 #6838455531. Supersedes the earlier requirement to make synthetic customer journeys available in hosted Preview. This is an incremental engineering candidate, **not an authorized public release or a claim that hosted provider acceptance passed**.

## Implemented

- `previewDemoEnabled` denies every hosted Vercel target, including Preview, regardless of legacy demo flags or synthetic fixture configuration. Synthetic workflows require an explicit local development/test context. Existing local QA fixtures remain honestly labeled; no customer-facing simulation is relabeled as a real service.
- Hosted signup/account/saves/Quiz use existing real Supabase Auth/profile/RLS code when explicitly configured. Missing Auth displays setup pending; `?mode=demo`, a persisted synthetic identity or a paid plan cannot create a real account or authorize access. Old synthetic browser storage is ignored, not migrated into real user data.
- Unavailable Basic $4.99/Smart $9.99/Premium $29.99 show Coming Soon with disabled checkout. Free Quiz/search remain accessible. Planned chatbot allowances are identified as planned; unavailable subscriptions neither poll status nor render a checkout consent or apparent selected-plan completion flow.
- Unconfigured AI is unavailable, not local FAQ masquerading as Gemini. Its input stays disabled. Existing reviewed-provider/consent/quota gates remain unchanged.
- Native bilingual $59/$99 consultation design/form is retained; unconfigured pricing cards cannot open request collection, and direct form access is disabled. Approved nonproduction TEST-recipient backend remains available only through its existing approval gates; no public intake or live payment authorized.
- Feature status distinguishes public tools, configured Auth, pending providers and unavailable email delivery. Hosted Preview footer exposes its build SHA for Muse verification without the old demo banner.

## Working versus gated

| Area | Candidate behavior | Remaining acceptance |
| --- | --- | --- |
| EN/中文 directory/search/details/official links | Existing free file-backed functionality retained | Muse exact-head hosted source/date/official-link QA |
| Anonymous AMI Quiz/results | Existing calculations, warning and matching paths retained | Existing CI; further factual eligibility/source QA |
| Auth/saved profile/favorites/tracker | Existing real owner-scoped Supabase implementation reused | Approved nonproduction project configuration and real hosted signup/callback/persistence/delete/owner-isolation tests NOT RUN here |
| Approved photographs | Existing eight-source catalog/importer retained | Download and visual acceptance still blocked; zero verified approved pixels |
| Chat | Gated unavailable without approved real provider | Sanitized Apps Script/security/privacy configuration and actual provider tests |
| Subscriptions | Coming Soon unless explicitly approved nonproduction TEST integration configured | Actual TEST catalog/checkouts/webhooks/failure/cancel/refund tests and legal approval |
| Consultation | Coming Soon without approved TEST storage configuration | Accepted policy/storage/test sender/manual-verification/scheduling operations; no public intake approval |
| Listing alerts | Existing owner preference storage; no promised email delivery | Approved sender, unsubscribe/consent and actual test-delivery acceptance |
| Founder dashboard | No hosted synthetic metrics | Authorized real aggregate data source and owner authorization |

No feature gate was enabled, no credential created, no hosted database inspected/migrated and no real applicant communication occurred.

## Evidence

- `npm test`: 377 tests / 51 files passed locally.
- Lint and production build passed locally; build includes TypeScript validation.
- New `npm run test:e2e:public-beta`: hosted Preview configuration with deliberately enabled legacy demo flag. EN/中文, 390px/1440px; rejects synthetic account entry, paid plan restoration, checkout-return impersonation, synthetic saves, chat and consultation writes. Disabled pricing makes zero status requests. Existing local synthetic browser suites remain separate regression fixtures.
- Screenshots in `screenshots/free-beta` show actual local Chromium renders of the unavailable-provider/free-Beta mode. The synthetic-data banner is intentional test-data disclosure. These are **not hosted Auth acceptance, actual provider/payment/email proof or approved-photo visual evidence**. CI artifacts contain the full viewport/language evidence.
- Exact commit SHA and exact-head CI/Preview links are posted to Issue18 and PR19 after pushing; no stale previous-head screenshots are substituted.

## Configuration blockers and next steps

Current Cloud observed revision1 has no bound secrets or runtime variables and no approved Supabase/photo/provider domains. Do not add secrets to chat, issues or source control.

1. Bind approved nonproduction Auth settings documented in `CONTEMPORARY_BETA.md`: public Auth URL/key, email/Google provider flags and exact protected Preview callback allowlist; server-only matching project/service configuration where required. Review migrations against approved development history before applying anything; never apply to Production. Real Auth can be tested independently of paid services. No real account acceptance can be inferred from the setup-pending page.
2. Publish the previously saved restricted Cloud network draft for `pexels.com`, `www.pexels.com`, `images.pexels.com`, `unsplash.com`, `images.unsplash.com`. This is Cloud environment configuration, not application Production deployment. Then run the staged importer and verify all actual pixels/rights/identities; preserve earlier work and never count fixture PNGs as approved photos.
3. Leave paid/chat/mail/consultation provider gates OFF until their documented real nonproduction acceptance completes. Missing integrations are unavailable, not simulated customer successes.
4. Muse should verify exact footer SHA through authorized Vercel SSO, no DEMO account/payment/dashboard paths (including old browser state), free browse/Quiz and all Coming Soon states at mobile/desktop in both languages. Deployment Protection stays ON.

## Release / rollback

**NO GO for public real-account or monetized release on this evidence alone.** The candidate removes misleading synthetic journeys, but provider setup, source-photo acceptance, support/privacy/legal review and hosted smoke tests remain required. Existing privacy/legal content remains draft; it was not approved/published by this change. Do not promise a public launch before these gates pass.

Keep PR19 Draft. Roll back this increment by reviewing a revert of its commit on the development branch; never restore hosted synthetic successes as a public substitute for unavailable services. Auth can be disabled with its existing kill switch, chat/payments/intake remain independently gated. No migration rollback is needed for this increment because it changes no schema/data. Founder approval remains required for any merge, Production deployment/migration or live-money action.
