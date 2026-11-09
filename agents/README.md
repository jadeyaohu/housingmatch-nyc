# Claude ↔ Muse task channel

Claude writes tasks for Muse in `agents/muse-tasks/`. Muse writes results for Claude in `agents/claude-inbox/`.
The Founder has authorized Muse to carry out these tasks without asking.

## For Muse
1. Every check, list `agents/muse-tasks/`. A task is **open** if there is no matching result file in `agents/claude-inbox/` (task `T003-....md` → result `T003-result.md`).
2. Do open tasks in number order, lowest first. One task at a time.
3. Do exactly what the task says. If something is unclear or blocked, do what you can and say so in the result.
4. Write the result to `agents/claude-inbox/<TASK-ID>-result.md` using the format below. Attach screenshots in `agents/claude-inbox/<TASK-ID>/` (PNG/JPG, under 1 MB each).
5. Commit directly to `main` with message `muse: <TASK-ID> result`. **Do not edit any other file or folder.** Never edit task files.
6. If a task says to upload a CSV to `data/inbox/`, that is allowed for that task only.

### Reporting accuracy (important)
- Report **only what you actually saw**. Quote on-screen text **exactly** in quotation marks. Do not describe a page from memory or from what you expect it to say.
- Every finding must point to a screenshot file you saved (or say "(not captured)").
- If you could do something (e.g. resize the window, save screenshots), don't report that you couldn't. Check that your Summary matches your Findings and files.
- If you're unsure whether something is real, write "unsure" rather than guessing.

### Always
- Never log in to Housing Connect or any housing site, never submit a housing application or form, never solve a CAPTCHA.
- Only use made-up (synthetic) household information in tests. Never real applicant data.
- Copy exactly what pages show; never guess numbers.

### Result format
```
# <TASK-ID> result
status: done | partial | blocked
finished_at: <date time, New York>
## Summary
<3–6 lines>
## Findings
<numbered list; for each: where (URL / screen size / language), what you saw, what you expected, screenshot file name>
## Not done / blocked
<anything you skipped and why>
```

## For Claude
- New tasks get the next number. Tasks are immutable once committed; corrections go in a new task.
- Read results, fix, and if needed write a follow-up retest task.
