# HousingMatch — ChatGPT / Codex / Muse task handoff

**Queue branch: `ops/agent-handoff-queue`** (not `main`). This branch is exclusively for agent instructions and result reports. Product code is developed on independent feature branches and Draft PRs. Never merge the queue branch into `main` merely to deliver tasks: `main` triggers Production.

## Responsibilities
- ChatGPT: product/engineering coordination, reviews, prioritization, writes task instructions to `agents/to-codex/` and `agents/to-muse/`.
- Codex: inspect repository, implement/test changes on dedicated feature branches, open Draft PRs, submit concise result reports to `agents/to-chatgpt/`.
- Muse: browser-only tasks, official dashboard setup and real Preview QA, submit results to `agents/to-chatgpt/`. Do not alter application source.
- Founder: production, billing, production secrets/migrations, domain purchases, legal and sensitive permissions.

## Polling protocol
1. Each agent fetches **this branch**, not default `main`. At each poll, find its oldest unprocessed task file: `agents/to-codex/*.md` or `agents/to-muse/*.md`.
2. Task IDs are unique (e.g. `HM-20261110-1930-C01`). Before work, check `agents/to-chatgpt/` for an existing report for that ID. If present, do NOT repeat.
3. Use the task's stated scope, branch, acceptance criteria, and safety requirements. If blocked, submit `blocked`, not `completed`.
4. Write a **new**, unique markdown report to `agents/to-chatgpt/<TASK_ID>-result.md` on this same queue branch. Include status (`complete`/`partial`/`blocked`), timestamp, concrete PR/commit/check URLs, test evidence and next action; no secrets or real applicants' data.
5. If multiple tasks are pending, process no more than one per poll unless explicitly requested. Never overwrite a report from another agent.
6. ChatGPT reads all new reports, verifies claims against PRs/code as needed, and publishes subsequent tasks. Multiple pending tasks are not reason to duplicate work.
7. If a write fails due to a concurrent branch update, refetch the branch and retry without force-push. Do not modify unrelated files.

## Safety and verification
- No writes to `main`, merges, production deployment/config/db changes, purchases, or actual applicant submissions without explicit founder approval.
- Do not report a test as passed unless you ran it. Distinguish source claims from verification.
- No keys in commits, issues, comments, screenshots or logs.
- No unauthorized collection or bypassing site access controls.
- Prefer small independent changes; flag prerequisite conflicts and data-quality uncertainty.

## Scheduling
Schedules belong to the agents' actual execution tools, NOT to these files. Task files do not automatically wake any agent. The founder's desired first cycle is tasks by 7:30 PM America/New_York and agents checking at 7:40 PM, then every 30 minutes. ChatGPT's native automations cannot run faster than hourly; to achieve half-hour unattended orchestration, an external approved scheduler/orchestrator must call the agent and GitHub APIs, with suitable cost/security controls. Until that is configured, task files can be prepared manually, and ChatGPT may use an hourly scheduled cycle if the founder agrees.
