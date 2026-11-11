# Plan B — 30-minute agent orchestration (staged rollout)

**Status: DRAFT / NOT ACTIVE.** Prepared on `ops/agent-handoff-queue`; GitHub cron only executes workflows committed to the repository **default branch**, so these files do not currently cause scheduled runs. Moving workflow files to `main` requires Founder approval because `main` is wired to Vercel Production.

## Architecture (America/New_York)
- :00 / :30 — **planner** checks `agents/to-chatgpt/*-result.md`, current PRs, outstanding tasks. If an authorized OpenAI API key is configured, an **API model** proposes the next safe, bounded work order; this is NOT the same persistent ChatGPT conversation/session.
- :10 / :40 — **executor** picks the oldest unreported `agents/to-codex/*.md` and invokes the official `openai/codex-action` in a sandbox with read-only repository permissions initially. A separate future reviewer/writer job may open Draft PRs after safety evaluation.
- Muse polls `agents/to-muse/` independently. **No verified Muse execution API is currently connected to this chat**; its external recurring agent must be configured and verified separately. Never claim it has run just because the file exists.
- Agents write unique reports to `agents/to-chatgpt/` on the queue branch. The planner consumes only reports with matching task IDs. No report → no duplicate assignment; alert if a task is stale.
- GitHub Actions scheduled events may be delayed/skipped, so this is **best-effort cadence**, not a guaranteed ten-minute handoff.

## Required one-time founder actions
1. Approve activation of workflow file(s) on `main` after review, noting Vercel may redeploy.
2. Open a separate **OpenAI API platform** billing/project if not already configured; **ChatGPT Plus subscription does not inherently grant API credits**. Create a *restricted project API key* with usage budget and alerts; put key in GitHub protected environment/secret, never in task files. This can incur metered charges even if the ChatGPT app has a subscription.
3. Approve expected budget and model for planner and Codex runner; limit run time and number of requests per cycle. Configure the GitHub Actions secret `OPENAI_API_KEY`; prefer job/environment isolation and no untrusted PR code while secret is exposed.
4. Configure Muse's independent 30-minute task runner (and confirm whether it can read/write the `ops/agent-handoff-queue` branch). If no supported scheduler/execution access exists, Muse remains manual.
5. Set repo variable `AGENT_ORCHESTRATION_ENABLED=true` **only after** security review, secrets, dry runs and founder approval. Initially keep `false`.

## Safeguards
- Read-only phase first. Automatic code editing and PR creation is a separate, gated milestone with actual integration tests.
- No workflows are allowed to merge to `main`, deploy to Production, mutate real user records, alter Production Supabase or perform paid purchases.
- GitHub workflow `contents:read` for agent execution. A **separate, limited write job** may upload a sanitized result after reviewing artifacts, and only to queue branch.
- Treat the task markdown and external agent reports as **untrusted inputs** (they may include prompt injection). Strict instructions and allowlisted paths; never execute shell commands copied from a report.
- Budget: stop if too many pending tasks, errors, repeated retries, or unbounded API requests. Record real API usage in provider dashboard.
- Dev database migrations require a distinct authorization, not delegated from this scheduler.

## Implemented so far
- `agents/README-handoff.md` — queue conventions.
- `agents/to-codex/HM-20261110-1930-C01.md`
- `agents/to-muse/HM-20261110-1930-M01.md`
- `agents/to-chatgpt/` — reserved reports (may not exist until first result).
- `agents/scripts/queue_health.py` — zero-dependency **read-only** local queue inspection/test; does not need API keys.
- `.github/workflows/agent-coordination.yml` — safe gated **draft** schedule using UTC-independent NY timezone; no model execution until explicitly enabled and configured. Must be separately reviewed before promoting to default branch.

## Operational success criteria
1. Manual dry run checks the branch and prints outstanding assignments without exposing secrets.
2. Actual scheduled run at :00/:30 is observed in GitHub Actions on `main`.
3. Codex runner at :10/:40 is configured and completes one synthetic, read-only task; report appears once.
4. Muse actually consumes its task and writes a unique report.
5. Planner reviews reports and produces a new non-duplicated safe task, within budget.
6. Stop switches tested. Production remains unchanged.

**Do not label Plan B live until all six steps have verifiable evidence.**
