## Codex Issue #18 pre-implementation assessment

Snapshot: 2026-11-11 17:03 EST

**Connection status:** the initial GitHub CLI calls returned HTTP 401 Bad credentials. Public reads and anonymous fetch succeeded; authenticated comment posting subsequently recovered. Node/npm and checkout work. The required assessment is now posted; implementation will proceed on one isolated branch. Crosswalk is not required or used.

### Repository and exact PR dependencies

`main`: `20cc90ad6bbefe80988c5a16975b74001a2fba58`. Local checkout works at `/workspace/housingmatch-nyc` (not C:\Windows); Node v24.22.1, npm 11.9.0. An existing untracked `error.log` is left untouched. No resets, code changes, deployments or database changes were performed.

| PR | Head branch and exact SHA | Declared base branch / API-recorded SHA | Current base branch head | Conflict state |
|---|---|---|---|---|
| #8 | `milestone-0/stabilize` / `d699af1eda3e8a5145ad1ed3b3c7453ae45036d2` | `main` / `864f411f30b24e3ec75ba9cea52be8b79e326055` | `20cc90ad6bbefe80988c5a16975b74001a2fba58` | conflicting |
| #9 | `milestone-2/quiz` / `9c5fc0371057a4c22ba96ccef7f0dcdbdfd7b488` | `milestone-0/stabilize` / `9ce2ad9ea7d87cdc749e0a847c0ae19df968a925` | `d699af1eda3e8a5145ad1ed3b3c7453ae45036d2` | conflicting |
| #11 | `fix/quiz-income-validation` / `f48ec303aecd5b66858cf00a5ed150f7d7d7ae10` | `milestone-2/quiz` / `9c5fc0371057a4c22ba96ccef7f0dcdbdfd7b488` | `9c5fc0371057a4c22ba96ccef7f0dcdbdfd7b488` | mergeable |
| #13 | `fix/publication-availability-gates` / `675d0e39f86651ab6240fadeb78cb9d81a871b64` | `milestone-0/stabilize` / `d699af1eda3e8a5145ad1ed3b3c7453ae45036d2` | `d699af1eda3e8a5145ad1ed3b3c7453ae45036d2` | mergeable |
| #14 | `fix/exact-income-chart-evidence` / `6d782c76a6bb49b9458c7de1d2b3d419ea22d656` | `milestone-2/quiz` / `9c5fc0371057a4c22ba96ccef7f0dcdbdfd7b488` | `9c5fc0371057a4c22ba96ccef7f0dcdbdfd7b488` | mergeable |
| #16 | `feat/consultation-mvp` / `f41d42841d05fca8575e4921229dce9452103c3b` | `main` / `20cc90ad6bbefe80988c5a16975b74001a2fba58` | `20cc90ad6bbefe80988c5a16975b74001a2fba58` | mergeable |
| #17 | `feat/consultation-stripe` / `0e73a7a2bcde903013f7c3fdc054ccee8640c15c` | `feat/consultation-mvp` / `f41d42841d05fca8575e4921229dce9452103c3b` | `f41d42841d05fca8575e4921229dce9452103c3b` | mergeable |

The API-recorded base SHA and current base-ref head are listed separately because some PRs report an older recorded base. Do not confuse mergeability with acceptance or latest-base inclusion.

- #8 carries stabilization/results clarity; #9 is based on an older #8 snapshot and does not include its latest head. Both have conflicts.
- #13 is a source/availability safeguard on #8. #11 and #14 are separate patches on #9; #14 does not include #11 or #13. They must be combined deliberately.
- #16 is the independent booking stack from main; #17 depends on #16. Neither incorporates quiz/account integration.

### Existing checks and evidence gaps

- #8: [results-e2e: success](https://github.com/jadeyaohu/housingmatch-nyc/actions/runs/42706367375/job/129464101688), [checks: success](https://github.com/jadeyaohu/housingmatch-nyc/actions/runs/42706367375/job/129464101149); Vercel: Deployment has completed.
- #9: no GitHub lint/unit/DB/browser check run returned for this head; Vercel: Deployment has completed.
- #11: [results-e2e: failure](https://github.com/jadeyaohu/housingmatch-nyc/actions/runs/42913370122/job/130169449803), [checks: success](https://github.com/jadeyaohu/housingmatch-nyc/actions/runs/42913370122/job/130169449458); Vercel: Deployment has completed.
- #13: [checks: success](https://github.com/jadeyaohu/housingmatch-nyc/actions/runs/42934617136/job/130241482376), [results-e2e: success](https://github.com/jadeyaohu/housingmatch-nyc/actions/runs/42934617136/job/130241481936); Vercel: Deployment has completed.
- #14: [checks: success](https://github.com/jadeyaohu/housingmatch-nyc/actions/runs/42938545368/job/130254519801), [results-e2e: success](https://github.com/jadeyaohu/housingmatch-nyc/actions/runs/42938545368/job/130254519542); Vercel: Canceled by Ignored Build Step.
- #16: no GitHub lint/unit/DB/browser check run returned for this head; Vercel: Canceled by Ignored Build Step.
- #17: no GitHub lint/unit/DB/browser check run returned for this head; Vercel: Canceled by Ignored Build Step.

- #11 results-e2e is failing. Root cause is not yet established; previous log retrieval was forbidden. Older green runs do not establish a combined Beta candidate.
- #16/#17 Vercel success is an ignored/skipped deployment, not Preview acceptance. Their previous local/mock tests do not satisfy real Stripe/provider evidence.
- No integrated candidate SHA or release-wide CI/evidence exists. Main contains only the listing-update workflow file; CI definitions remain on other feature branches and must be integrated.
- Main has the basic bilingual matcher/text directory, not the full quiz/auth/consultation stack. No documented property-photo field/pipeline was found in main or #9. Default to an explicitly labeled neutral graphic until approved image rights/provenance are documented.
- #9 adds profile/saved-list migrations and account UI, but its Production auth provider defaults are off. Approved nonproduction auth/RLS/login/save/delete and retention/deletion flows need real acceptance.
- Dedicated consultation Stripe key/signing secret, development Supabase settings and app origin were absent at the last configuration check; the managed policy also lacks Stripe/hosted-Supabase destinations. Real provider acceptance needs approved resources/access, not credential creation or Production reuse.
- Operator support/private invitations, scheduling, cancellation/refund policy, rollback runbook and qualified NY legal review of the specific paid offer/conflicts remain gates. Official applications are free, and no payment may imply priority or eligibility guarantees.

### Smallest safe implementation plan (after this comment can be posted)

1. Recheck issue comments/open branches to avoid duplicate ownership; create one `feat/beta-integration` branch from current main and one Draft integration PR referencing #18. Preserve every existing PR; do not merge any PR or main.
2. Integrate the stabilization/quiz/account code with #13, #11 and #14; resolve conflicts explicitly and diagnose the failed quiz E2E. Do not auto-import source CSVs, approved-source changes or listing-data updates from feature branches.
3. Integrate #16 then #17 in dependency order, reconciling homepage/navigation/privacy/auth and environment settings. Keep booking/payment configuration default-off, live Stripe rejected and payment separate from appointment confirmation.
4. Add one shared responsive EN/中文 directory/listing-card presentation for 390px/1440px, searchable/filterable, with a clearly labeled neutral graphic unless source/license evidence permits a real image. Preserve official application links, source timestamps, NEEDS_REVIEW and re-rental/waitlist separation.
5. Add candidate CI: lint, unit, build, disposable DB/RLS/security assertions, and EN/中文 Chromium free matching/auth-save-delete/booking/payment/default-off tests. Separate real source/link/rights verification from synthetic fixtures; do not use real applicants.
6. Publish exact-SHA evidence and request Muse Operations hands-on QA via GitHub. Complete the approved real Stripe TEST/Supabase acceptance matrix and support/rollback/legal gates before declaring release readiness. Any credential/network setup requiring the founder is documented, not silently changed.

### Release decision

**Current monetized Beta gate: NO-GO.** November 14, 2026, 8:00 PM America/New_York remains conditional. No exact integrated candidate, real provider evidence or legal approval has been established. Safe alternate scope is a free directory/quiz Beta with paid features OFF, only after its own data/security/CI/QA gates and separate founder publication/deployment approval.

No merge, Production deployment/migration/secrets, live payment, applicant communication or final policy publication is authorized by this plan.
