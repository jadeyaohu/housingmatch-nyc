# T011: Listing detail page QA + income check (no sign-in needed)
priority: high · created: 2026-11-09 · you can do this now; it doesn't need Google

**Preview:** https://housingmatch-nyc-git-milestone-2-quiz-yao-s-projects16.vercel.app

**Rules**
- Quote only text you copied from the screen in this run. Write `paraphrase:` for anything else.
- Say which browser each finding came from: live browser, scripted browser (local build), or text fetch.

1. Open `/listings`. Tap the **name** of the first card. Does a detail page open with the same name as its main heading?
2. Open these three detail pages, in EN and in 中文. Phone size 390 × 844 if your scripted browser can do it.
   - `/listings/hc-7625`
   - `/listings/hc-7718`
   - `/listings/hc-7662`

   For each page:
   - copy the heading, the "Where" / "位置" line and the deadline line;
   - copy each income-group box exactly;
   - copy the "Priority groups" / "优先组" box;
   - check whether anything is cut off or confusing.
3. **Income check against Housing Connect** (live browser, read-only, no login). Open `https://housingconnect.nyc.gov/PublicWeb/details/<ID>` for **7625, 7718, 7662**. For each income group Housing Connect shows, write down:
   - the AMI %;
   - the max income for 1, 2, 3 and 4 people;
   - the rent.

   Then compare with our page. Our figures marked "estimate" / "估算" come from the general HPD table, so we need to know how far off they are. Give each row a verdict: **same**, **different (ours X, theirs Y)**, or **not on HC**.
4. Tap the green official-link button on each page. Does it open the right Housing Connect page?
5. Tap "Check if I might qualify" / "看看我可能符合吗". Does it open the quiz?

Screenshots: one detail page on phone in 中文 and one in EN; the Housing Connect income table for 7625.
