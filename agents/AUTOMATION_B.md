# Free Plan A — HousingMatch AI handoff (current)

## Actual status (2026-11-10)
- ✅ A ChatGPT native **hourly** automation was created for **19:30, 20:30, ... America/New_York** (ID `6af3b6040fa48191b26972d57c2764b0`). It will read this queue and distribute bounded tasks **when it can access GitHub**, with no separate paid OpenAI API key.
- ✅ First tasks for Codex and Muse live on branch `ops/agent-handoff-queue`.
- ✅ PR #12 is now a **free read-only GitHub Actions queue monitor**, with no OpenAI API requirement. **It is Draft/unmerged; cron is NOT running.**
- ⏳ Codex and Muse must be configured **inside their own products** to poll the branch every 30 minutes. Their scheduled agents have NOT been confirmed.
- ⏳ No claim of a fully unattended 30-minute ChatGPT planner: native ChatGPT scheduler's maximum frequency is hourly.
- ⏳ Founder will make GitHub repository private later. Do not change visibility now.

## Recommended schedule
| Who | Time (New York) | Job |
|---|---|---|
| ChatGPT | :30 every hour (first 19:30) | Review reports, add small tasks, notify founder of blockers |
| Codex | :40 and :10 | Poll `agents/to-codex/`; write unique `agents/to-chatgpt/<ID>-result.md` |
| Muse | :40 and :10 | Poll `agents/to-muse/`; write unique report to same destination |
| GitHub Actions | :00 and :30, after activation | Read-only queue monitoring only, not an agent execution environment |

## Setup prompt — Codex scheduled agent
```text
Every 30 minutes, inspect repository jadeyaohu/housingmatch-nyc, BRANCH ops/agent-handoff-queue, folder agents/to-codex/. Check task IDs against agents/to-chatgpt/<ID>-result.md to avoid repeats. Choose the oldest pending task and perform it, subject to its stated scope. For code fixes, create an isolated feature branch and Draft PR; never merge to main or deploy, never use real applicant data, production secrets, paid services, or destructive operations. Run tests where possible and report exact results. Write a NEW UTF-8 Markdown report to agents/to-chatgpt/<ID>-result.md on the SAME queue branch with complete/partial/blocked, test evidence and links. If blocked, report it and stop; never fabricate completion. Follow agents/README-handoff.md.
```

## Setup prompt — Muse scheduled agent
```text
Every 30 minutes, inspect GitHub repository jadeyaohu/housingmatch-nyc, BRANCH ops/agent-handoff-queue, folder agents/to-muse/. Compare IDs against agents/to-chatgpt/<ID>-result.md and do not repeat completed tasks. Pick the oldest pending task, perform only safe authorized browser/Preview/Dev environment work; no Production changes, billing, secrets exposure, domain purchases, unauthorized access, or real applicant submissions. Login/MFA requires the founder. Write a NEW report at agents/to-chatgpt/<ID>-result.md on the SAME queue branch, status complete/partial/blocked with verification evidence, specific blockers and screenshots only if safe. Follow agents/README-handoff.md.
```

## Why no free API key is needed
The ChatGPT native scheduled run uses existing product access. It is distinct from an OpenAI API invocation. Codex and Muse must execute with their product-provided schedulers; a file polling GitHub Actions workflow does **not** trigger either model.

## GitHub privacy and cost
The existing GitHub repo is public. Keep task content non-sensitive; public repo secrets remain masked and should be strictly segregated from PR code. Once private, GitHub Actions standard runner free/billed minute rules may differ by account plan. Review budgets and org/repo settings first. Make sure all product data and audit reports exclude sensitive applicant information.

## Activation condition for PR #12
Scheduled GitHub workflows run on default branch. PR #12 must be reviewed/merged before cron can run and merging to `main` may trigger Vercel Production deployment. This is **not needed** to start Codex/Muse polling or the hourly ChatGPT reviewer; do not merge simply to enable a redundant queue monitor.

## Success checklist
- ChatGPT hourly run actually reads queue and posts one safe follow-up.
- Codex separate timer enabled and result appears in queue.
- Muse separate timer enabled and result appears.
- No duplicate task IDs or Production changes.
- Confirm costs remain within existing subscription/quotas.
