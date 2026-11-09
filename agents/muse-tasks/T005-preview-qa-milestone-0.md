# T005 — Preview QA: Milestone 0 (PR #8)
priority: high · created: 2026-11-09 · do after T001–T004

**Preview:** https://housingmatch-nyc-git-milestone-0-stabilize-yao-s-projects16.vercel.app
If you see a Vercel login page, choose **Continue with GitHub** (the Founder's account, already signed in). This is allowed for this task.

Do every check at **phone 390 × 844**, **small phone 320 × 640** and **desktop 1280 × 800**, in **English and 中文** (tap the switch — don't use the keyboard).

1. **Header:** the 中文/EN switch is fully on screen and works with one tap at all three sizes. Nothing overlaps.
2. **Matcher** with made-up household 3 people / 85000 / nothing else checked:
   - Main results show only lotteries — **no** "Re-rental" cards in the main sections.
   - Below the main results there is a separate box "Couldn't find your match? Try Re-rentals." (中文: "没有找到合适的？看看 Re-rental 空房。") with 3 notes. It is **collapsed** at first.
   - Tap its button: re-rental cards appear inside the box. Each shows an availability label (e.g. "Available when checked 2026-11-09") and a source.
   - Note the counts shown at the top of the main results. Do they change when you open the re-rental box? (They should not.)
3. **Browse housing:** default shows only lotteries plus a line linking to re-rentals. Change the type filter to Re-rental and to Waiting list: the notes box appears and every card has an availability label.
4. Compare with production (https://housingmatch-nyc.vercel.app) for the same household: list anything that got worse.
5. Click "Official listing ↗" on 3 lottery cards and 3 re-rental cards on the Preview: does each open the right page?

Screenshots: header at 320 (EN + 中文), results with re-rental box closed and open (phone, EN + 中文), browse page with type = Re-rental (phone + desktop).
