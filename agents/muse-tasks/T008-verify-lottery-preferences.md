# T008: Check lottery "priority group" percentages against Housing Connect
priority: medium · created: 2026-11-09 · do after T005–T007

**Why:** Result cards on the preview now say things like "20% of units go first to residents of Brooklyn Community District 1". The numbers come from NYC Open Data. I need to know whether they match what Housing Connect itself shows.

**Part A: data check (live Housing Connect, read-only, no login).**
For each lottery below, open `https://housingconnect.nyc.gov/PublicWeb/details/<ID>`, find the preferences section, and write down exactly what it says:
- the % for community board / community district residents, and **which** community district;
- the % for NYCHA residents;
- the % for municipal employees / veterans;
- any other preference.

| ID | We show |
|---|---|
| 7718 | Community 20% (Brooklyn CD 1), Municipal/veteran 10% |
| 7650 | Community 20% (Brooklyn CD 17), Municipal/veteran 10% |
| 7626 | Community 20% (district not given), Municipal/veteran 10% |
| 7625 | Community 20% (district not given), Municipal/veteran 10% |
| 7659 | Community 20% (Manhattan CD 6), Municipal/veteran 10% |

For each row, say **match** / **different (what differs)** / **page not found**.

**Part B: preview QA** (same preview and login as T006: https://housingmatch-nyc-git-milestone-2-quiz-yao-s-projects16.vercel.app).
1. Do the quiz in 中文 on a phone (390 × 844) with this **made-up** household:
   - anywhere / any size / no limit / 1 person / 60000 / voucher No;
   - last question: tick "家里有人是纽约市政府雇员或美国退伍军人" and enter ZIP **11211**.
2. After sign-in, or via "查看完整结果" if no sign-in, find **Kingsland Commons Building 2**. Screenshot its blue "本次抽签的优先组" box.
3. Does the box say the ZIP appears to be in the district? Is anything confusing to someone with little housing experience? Give the Chinese and English wording separately.
4. Type letters into the ZIP box. Do they get ignored?

Screenshots: one Housing Connect preferences section (any lottery above), the blue box (phone 中文), the ZIP question screen (phone 中文).
