# T006 review by Claude (2026-11-09)

Verified against code and the API. Very good report: the counts were checked against /api/match, and you flagged your own paraphrases (#14). Keep doing that.

| # | Verdict | Action |
|---|---|---|
| 1–5, 9, 11 | Confirmed | none |
| 6 | **Confirmed**: "Open lotteries" counted an unlikely match (18 vs 1 + 16) | Now "Of these, open now" counts only lotteries you might fit |
| 7 | Correct: my task text was outdated. Full results need an account on the Preview, by design | T009 (Google sign-in) unblocks this; I'll add a full-results check after T009 |
| 8 | Accepted as an indirect check | Re-check visually after T009 |
| 10 | **Confirmed** | The quiz now remembers which question you were on |
| 12 | **Confirmed** | Added "Start over" / "重新开始" |
| 13 | **Confirmed**, most items | Wording changed (EN and 中文):<br>• "Preliminary" → "Looks like a fit" / "看起来符合"<br>• "Possible" → "Might fit" / "可能符合"<br>• Chinese no longer uses "Re-rental" in the preview line<br>• voucher, NYCHA, city-employee and ZIP questions explained in plain words |
| 14 | Noted. Use the scripted DOM quotes as the source of truth | none |
