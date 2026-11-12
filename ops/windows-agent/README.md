# Windows current-user Codex automation — proposed, NOT activated

This is an opt-in local runner, not a cloud schedule. Nothing in this PR installs a task, starts Codex, creates credentials, or changes Windows policy. Native Windows sandbox support and organizational restrictions must be validated on the target computer. If anything requires elevation or policy changes, stop. No administrator account, stored Windows password, WSL installation, API key, or execution-policy bypass is part of this setup.

## Requirements and installation

Use Windows 10/11, your normal account, Windows PowerShell 5.1+ (ScheduledTasks module), Python 3.11+, Git for Windows, GitHub CLI, Node.js LTS and the current Codex CLI. Obtain Git/GitHub CLI/Python/Node from official installers offering current-user installation or official portable distributions. If your organization blocks them, ask IT for an approved user-level installation; do not bypass controls. Administrator-only installers are unnecessary.

Official references: [Codex Windows](https://developers.openai.com/codex/windows), [authentication](https://developers.openai.com/codex/auth), [CLI](https://developers.openai.com/codex/cli), [Task Scheduler principal](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtaskprincipal). These are references, not evidence that this Windows account has been tested. This cloud session could not retrieve the developers.openai.com pages because outbound policy denied access.

In a normal, non-elevated PowerShell terminal:

```powershell
Get-Command node,npm,python,git,gh -ErrorAction Stop
node --version
npm.cmd --version
python --version
git --version
gh --version
# Per-user npm prefix; no administrator installation or machine PATH edit.
$prefix = Join-Path $env:LOCALAPPDATA 'HousingMatchTools'
npm.cmd install --global --prefix $prefix @openai/codex
$env:Path = "$prefix;$env:Path"
# Add that directory to your USER Path through Windows Environment Variables,
# then reopen PowerShell so Task Scheduler inherits the correct user PATH.
Get-Command codex -ErrorAction Stop
codex --version
codex exec --help
codex login
codex login status
```

Choose **Sign in with ChatGPT** interactively. Do not enter an API key. Confirm `--ignore-user-config` is supported by your installed `codex exec`; update through the same per-user installation if absent. PowerShell may block npm's `codex.ps1` under existing policy; call `codex.cmd` for the interactive verification instead. The Python runner resolves the installed command without changing policy. If the setup scripts themselves are blocked, stop and obtain an approved script execution/signing route from IT. Do not use `Set-ExecutionPolicy`, `-ExecutionPolicy Bypass`, elevation or security exclusions.

GitHub authentication and permission test:

```powershell
gh auth login --hostname github.com --git-protocol https --web
gh auth setup-git
gh auth status
gh api repos/jadeyaohu/housingmatch-nyc --jq '.permissions'
gh api 'repos/jadeyaohu/housingmatch-nyc/git/ref/heads/ops/agent-handoff-queue' --jq '.object.sha'
git ls-remote https://github.com/jadeyaohu/housingmatch-nyc.git refs/heads/ops/agent-handoff-queue
```

Browser login/device authorization is a local user action. Never paste tokens into chat, task files, scripts or logs. Existing GitHub authorization must allow reading tasks, creating claim tags, pushing development branches, creating Draft PRs and writing reports. A read-only token is insufficient for execution. Your account's permissions and branch protection remain authoritative.

## Get this proposal and dry-run safely

Keep the scripts in a stable, user-owned directory. Do not run them from a checkout the agent will modify. Review this Draft PR before using it; a merge is unnecessary.

```powershell
git clone --branch infra/windows-user-automation --single-branch https://github.com/jadeyaohu/housingmatch-nyc.git "$env:USERPROFILE\HousingMatchAutomation"
Set-Location "$env:USERPROFILE\HousingMatchAutomation\ops\windows-agent"
python -m unittest discover -s . -v
.\Setup.ps1 -Mode DryRun
```

Dry-run reads the queue commit, protocol, task/report tree, open PRs and reservation tags. It prints the candidate task but **does not invoke Codex, claim work, push, write reports or register a task**. It creates only a local state directory/temporary lock. It reads tasks only from `ops/agent-handoff-queue`, never `main`. Review the output. The full protocol/task contents are read by Codex only after explicit execution is enabled.

To test the local Codex sandbox separately, use an empty temporary Git repository and a harmless prompt such as “Read README.md and reply OK; make no changes”, with `--ask-for-approval never exec --ignore-user-config --sandbox workspace-write`. Confirm Windows sandbox support without weakening it. This consumes subscription allowance but requires no API purchase. The cloud validation did not run a local Windows Codex agent.

## Install disabled; enable only after review

The script uses current-user **Interactive / Limited** registration, with `IgnoreNew` overlap policy. No password is stored. You must remain signed in; locking the screen is fine, signing out is not. The computer must remain awake with network access. It does not wake a sleeping computer or replay missed runs.

Windows must already use timezone ID `Eastern Standard Time` (New York, including DST). Setup refuses another timezone instead of changing it. The schedule is daily starting 00:10, repeated every 30 minutes: **:10 / :40 local New York time**. DST/missed ticks are subject to Windows behavior; durable reservations prevent a repeated tick from rerunning claimed work.

```powershell
Get-TimeZone
.\Setup.ps1 -Mode Install    # registers DISABLED; does not start any task
.\Setup.ps1 -Mode Status     # inspect definition and NextRunTime
# Optional: inspect Task Scheduler UI > your task > triggers/principal/actions.
.\Setup.ps1 -Mode Enable     # explicit local activation; first reruns read-only checks
.\Setup.ps1 -Mode Status
```

Task name: `HousingMatch NYC - Autonomous Developer`. Provider: local Windows Task Scheduler. `Get-ScheduledTask` and `Get-ScheduledTaskInfo` provide actual registration and next-run evidence. This PR cannot supply your machine's task ID or next run. A successful registration is not proof of a successful Codex execution; inspect the first scheduled logs/report. If registration is denied by organizational policy, no elevated retry is attempted.

If Task Scheduler is prohibited but approved local scripts are allowed, use the foreground fallback after a successful dry-run:

```powershell
New-Item -ItemType File -Force "$env:LOCALAPPDATA\HousingMatchCodex\ENABLED"
.\Setup.ps1 -Mode Loop
```

This requires the terminal to stay open. It waits for the next :10/:40 boundary; it does not install a persistent service. Never run an independent second automation that ignores these reservations.

## Stop immediately / disable

From another normal PowerShell terminal in this script directory:

```powershell
.\Setup.ps1 -Mode Stop
# Equivalent emergency control, even if PowerShell script execution is blocked:
Remove-Item "$env:LOCALAPPDATA\HousingMatchCodex\ENABLED" -ErrorAction SilentlyContinue
```

The active runner checks the marker every second and calls `taskkill /PID <its-child> /T /F` for its owned Codex process tree. It does not terminate unrelated Codex sessions. A GitHub/network operation already in flight cannot be recalled; inspect the remote state afterward. Stop also attempts to disable the scheduled task. `Disable` is an alias with the same behavior. Keep the computer on long enough for the watchdog to finish. Closing the scheduler/terminal alone is not a reliable stop control for child processes.

Unregister later if desired (current-user task only):

```powershell
.\Setup.ps1 -Mode Stop
Unregister-ScheduledTask -TaskName 'HousingMatch NYC - Autonomous Developer' -Confirm:$false
```

## Isolation, reservations and recovery

- An atomic local directory lock prevents simultaneous runs, including manual/foreground runs using the same state directory.
- Before starting, the runner excludes existing reports, local reservations, remote `codex-claims/<TASK_ID>` lightweight tags and task IDs mentioned in open PR title/body/head branch. It fails closed if the PR list needs pagination or the queue tree is truncated.
- Creating `refs/tags/codex-claims/<TASK_ID>` through GitHub is atomic: only one compatible runner can win. Tags point to the queue snapshot; they contain no credential. Review repository integrations before execution: tag creation and feature pushes can trigger existing third-party integrations. This runner never explicitly deploys, but cannot suppress externally configured automatic Preview deployments.
- Reservations are permanent, including failures, timeout or interrupted runs. It never automatically retries a claimed task. This favors preventing duplicate implementation over automatic crash recovery. Other agents must honor the same tags; arbitrary agents ignoring them cannot be guaranteed duplicate-free. Existing PRs lacking task IDs and work not recorded on GitHub may require a manual check before first activation.
- Each task gets a new clone under `%LOCALAPPDATA%\HousingMatchCodex\work\<TASK_ID>` and a dedicated starting branch. Codex must follow the task's stated source branch and create a development branch/Draft PR. It may not merge, deploy or modify Production.
- Agent runtime is capped at roughly 26 minutes. Interrupted work and logs remain local; a missing report requires manual recovery. A blocked/partial report produced normally is uploaded like any other report. The runner does not fabricate a completion report on a killed process.
- Only the expected result file is uploaded through the Contents API, create-only, on the queue branch. Existing reports are never overwritten. A conflict/network failure leaves the reservation intact for manual inspection. No force push.
- After a crash, verify no runner/Codex child is alive and inspect GitHub reports, PRs and logs before removing `running.lock`. Do not delete task claim files/tags just to retry. Resume preserved work deliberately after engineering review. Other pending unclaimed tasks may proceed on later runs once the crash lock is safely cleared.

## Costs, security and limits

This uses the local CLI's ChatGPT login, subject to your plan's Codex availability and usage limits, authentication expiry and rate limits. It purchases no credits and configures no API key. The runner refuses common API-key environment variables, confirms ChatGPT login and ignores user model-provider configuration during execution. Avoid automatic credit top-ups in your product settings; those settings cannot be inspected here. Subscription limits can stop unattended work; this is not unlimited free compute.

`--ask-for-approval never` means approval-required actions must fail rather than pause; it is not a sandbox bypass. Native Windows sandbox/tool permissions can block GitHub access, test installs or builds: report blocked, do not disable protections. GitHub credentials remain powerful; agent instructions alone do not enforce “no merge/Production” against every possible command. Use repository branch protections/rulesets and an appropriately restricted identity, and do not place Production credentials or real applicant data on the automation account. This proposal does not alter those security settings or claim a hard authorization boundary.

Local logs: `%LOCALAPPDATA%\HousingMatchCodex\logs`. Codex output can contain repository/task content. Keep logs local, inspect before sharing and remove old logs manually. Never include secrets in task instructions; automatic redaction of arbitrary model output is not guaranteed. Credentials are managed through normal local sign-in, not copied from this cloud environment. Runner logs omit failed helper command output to reduce accidental disclosure.

## Validation performed for this proposal

Five cloud Python unit tests passed, exercising report skipping/oldest selection, dry-run nonmutation, disabled execution, local locking and remote-claim/existing-PR exclusion. Both PowerShell files parsed successfully with PowerShell 7.5.4 on Linux; this is syntax validation, not Windows runtime validation. A real read-only GitHub dry-run was performed. Windows registration, logon/session behavior, PowerShell runtime behavior, native Codex sandbox, task execution, stop-tree behavior and subscription entitlement still require local verification. No scheduler has been activated and no development task was executed by the dry-run.
