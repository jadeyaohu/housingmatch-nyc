# Housing Navigator — AI Collaboration Operating Manual (Draft)

## Roles
- **Product Owner (human):** sets priorities; approves architectural changes, data collection, merges and deployments.
- **ChatGPT (PM / architect):** scopes work, writes GitHub issues and acceptance criteria, reviews implementation evidence.
- **Claude Code (implementer):** inspects repo, proposes a plan, implements on feature branches, writes tests, opens PRs.
- **Codex (independent reviewer):** reviews PR diffs, security and tests. It does not independently redefine product scope.
- **GitHub:** source of truth for code, decisions, issues, and PRs.

## Confirmed baseline (repository inspection, 2026-11-06)
- Next.js 15 / TypeScript / React 19 application, with `src/app/api/match/route.ts`.
- Anonymous matching API validates household inputs and does not persist them.
- Lottery data can load from `data/listings.json`, or from Supabase when configured.
- `supabase/migrations/0001_init.sql` already defines listings, auth-linked households, saved listings, subscriptions, notifications, audit log and RLS. **Schema in git does not prove a live database exists.**
- `.github/workflows/update-listings.yml` refreshes listing data on Mondays and Thursdays (not daily).
- Google Apps Script chatbot and Google Forms intake are external to this repository and have not been audited here.

## MVP scope
1. Preserve the anonymous Matcher and current data-update pipeline.
2. Introduce minimal privacy-conscious anonymous event tracking and explicitly opted-in email capture, **without user accounts**.
3. Later: CRM integration, consent-aware notifications and aggregate funnel reporting.
4. Out of scope: automatic Housing Connect login/submission, SSNs, government IDs, paystubs, new RAG, billing, nonprofit portal.

## Engineering rules
- Confirm production hosting/runtime and whether Supabase is provisioned before implementing.
- Add a **new migration**, do not rewrite `0001_init.sql` or apply its auth-dependent schema blindly.
- Keep sensitive match inputs (income, disability, voucher, household details) out of analytics and CRM by default.
- Document notice/consent, deletion/retention, abuse prevention, rate limits, access controls and duplicate event handling.
- Use branch → PR → automated tests → independent review → human approval → merge. Never commit secrets.
- Distinguish confirmed repository facts from assumptions and planned features.

## Task handoff format
**Issue:** link and objective
**Files changed:** paths
**Architecture decisions:** rationale and alternatives
**Tests:** commands and actual results
**Risks / privacy impact:** known limitations
**Next action:** reviewer or human approval required

## First task
See HN-001 GitHub Issue: audit the existing schema/runtime and propose the smallest tracking design before implementation.
