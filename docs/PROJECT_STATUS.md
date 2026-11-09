# HousingMatch NYC — Project Status

_Last verified: 2026-11-09 (Claude). Facts below were read from GitHub and the live site; items marked **unverified** could not be checked._

## Operating model
- **Founder / Product Owner:** direction, approvals (production releases, prod data/env changes, spending, new data-access permissions, legal).
- **Claude:** engineering lead — code, tests, CI, data pipeline, PRs, status reporting.
- **Muse:** browser QA, data collection and source research. No direct Claude↔Muse channel exists; coordination goes through task files in `docs/muse-tasks/` (Muse has GitHub access) and the Founder relays the trigger.
- Codex: retired from the workflow.
- Release rule from 2026-11-09: work on branches → Draft PR → CI + Muse Preview QA → Founder approval → merge to `main` (= Production).

## Production (housingmatch-nyc.vercel.app = `main`)
| Area | State |
|---|---|
| Matcher + listings pages, EN/中文 | Live. Anonymous, no accounts. |
| Data source | `data/listings.json` (Open Data + Muse). Supabase **unverified** (no evidence it is provisioned or connected). |
| Data refresh | GitHub Action `Update listings`: Mon/Thu Open Data import; every Muse CSV pushed to `data/inbox/` is validated and **auto-published to Production**. |
| Listings | ~32 open Housing Connect lotteries (5 with Muse income tables); **59 Muse re-rentals (Run B) live since 2026-11-09**. |
| Vercel project/env/previews | **Unverified** — Vercel connector needs team authorization. |

## Open PRs (all Draft, all branched before 2026-11-06)
| PR | Branch | Status vs current `main` |
|---|---|---|
| #2 docs: AI collaboration workflow | `docs/ai-collaboration-setup` | Merges cleanly. Describes the old ChatGPT/Codex model → superseded by this file. |
| #3 HN-001 PR1a: anonymous event ingestion | `feature/hn-001-pr1a-event-ingestion` | Merges cleanly. Needs Supabase + Upstash + new migration `0002` → blocked on provisioning decision. |
| #4 HN-001 PR1b: frontend tracking | stacked on #3 | Depends on #3. |
| #6 Issue #5 Phase A: sectioned results + data-quality warnings | `feature/hn-005-phase-a-results-clarity` | Merges cleanly; merged with current `main` → 101/101 tests pass, typecheck OK. Candidate for Milestone 0. |

## Open issues
- #1 HN-001 Supabase audit / privacy-first tracking
- #5 P1: Open Data lacks unit × household income brackets → misleading preliminary matches
- #7 Mobile: EN/中文 toggle overflows at 375px

## Run B audit (commit 486c678, runs 42646575361 / 42647763843)
- 61 re-rentals collected → 59 published, 2 quarantined correctly (455 W 37th St digit error; 1515 Park Place column shift).
- **Already in Production**, mixed into the main matcher results and counts.
- All 59 labeled **open**; 58 of them only because no deadline exists → conflicts with "don't label open solely because no deadline".
- 32 / 59 have no income table (all 27 HDC — tables are in ad PDFs).
- 38 / 59 link to a shared source page, not a unit page (HDC 27, Pronto 7, TF Cornerstone 4).
- Possible duplicates: `5241 Center Blvd`, `5203 Center Blvd`.
- Known bad links reported by Muse: MHANY 461 Dean Street (404).
- The pipeline publishes collected data automatically → conflicts with "collection ≠ approval for publication".

## Architecture risks
1. Muse data goes straight to Production with no approval layer (raw vs approved not separated).
2. Re-rentals share the lottery match flow and status model; no "availability unverified" state.
3. Open Data–only lotteries can never be LIKELY; most results are NEEDS_REVIEW (#5).
4. Supabase in `0001_init.sql` is unapplied; PR #3 adds `0002` on top — migration path must be decided once.
5. Data bot commits to `main` twice a week → every refresh is a Production release.

## Milestones
| # | Scope | Status |
|---|---|---|
| M0 | Stabilize: integrate PR #6, fix #7, separate re-rentals + availability states, publication gate for Muse data, this status file, Muse task channel | **In progress** — PR #8 (Draft). Done: PR #6 merged in, #7 fixed, re-rentals separated, availability states, per-source publication gate, `agents/` channel + T001–T005. Waiting: Muse T001–T005 results |
| M1 | Data accuracy: Housing Connect detail coverage (income tables, preferences, accessibility, amenities), enrichment/publication boundaries | Next |
| M2 | New UX: landing, quiz, match-count preview, free registration, personalized results | Needs Supabase + auth provider decision |
| M3 | Preferences: lifestyle matching (YES/NO/UNKNOWN), deal breakers, amenities | |
| M4 | Retention: saved homes/searches, deadline reminders, education | |
| M5 | Applicant readiness incl. Log Number analysis (`docs/LOG_NUMBER_MODEL.md`) | |
| M6 | B2B exploration | |

## Data publication
See `docs/DATA_PUBLICATION.md`. Approved Muse sources (Production): Housing Connect. Pending (Preview only): HDC, Pronto Housing, TF Cornerstone, MNS, Housing Partnership, MHANY, iAfford — awaiting T002 audit.

## Founder decisions (log)
- 2026-11-09: Housing Connect content — keep showing Muse-collected income tables despite the nyc.gov Terms of Use IP clause ("You may not use, reproduce, display, publish… without the City's prior written permission"). Founder's call; revisit if the City objects.
- 2026-11-09: Supabase — paused "House of bounce"; created `housingmatch-prod` (us-east-1) with migration 0003 + RLS (advisor clean). Dev = `housing-navigator-dev`.
- 2026-11-09: Email — use Resend free tier for auth emails.

## Founder decisions pending
See the latest status report in chat / PR description.

## 2026-11-09 (afternoon)
- Sign-up: "Continue with Google" button built; hidden until the founder enables the Google provider (flag `GOOGLE_ENABLED` in `src/lib/supabase/config.ts`).
- T004 verified: HPD LL217 report (2022–2024). Findings in `docs/LL217_FINDINGS.md`. Key result: community-district preference holders got 53% of leases in those lotteries from 5.5% of applications.
- M3/M5: **priority groups**. The import now keeps each lottery's community-district / NYCHA / city-employee-veteran preference percentages. The quiz asks for an optional ZIP (not stored) plus NYCHA / city employee-veteran. Result cards show "Priority groups in this lottery" (tri-state, never odds). 430 listings carry preference data.
- Not yet saved to the account profile (ZIP, NYCHA, municipal/vet). That needs a new nullable column migration, to be done with the next profile change.
- Profile now saves NYCHA and city-employee/veteran answers (migration `0004_profile_priority_groups.sql`, applied to **dev** only). The ZIP code is never stored; the quiz, consent text and privacy notice say so. **Production needs 0004 applied before PR #9 ships**, otherwise saving a profile fails there.
- Founder 2026-11-09 13:22 ET: anything needing doing goes straight to Muse (T009 Google sign-in setup assigned). Money and Production releases still need founder approval.
- M4 started: **saved homes**. The ♡ Save button appears on result cards for signed-in users. "My account" lists saved homes, soonest deadline first, with a closing-in-N-days warning. Table `saved_listings` (migration 0005, RLS own-rows only) is on **dev**. Production needs migrations 0004 and 0005 before PR #9 ships. Email deadline reminders wait for the domain and Resend.
- T009 (Google setup) and T007 part 2 are blocked until the founder signs Muse's browser into pangfangdan@gmail.com once.

