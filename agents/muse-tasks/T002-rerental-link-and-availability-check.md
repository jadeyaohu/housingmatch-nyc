# T002 — Re-rental link and availability check
priority: high · created: 2026-11-09

**Goal:** for every re-rental currently on the site, confirm whether the unit is still available and whether our link reaches it.

1. Open https://housingmatch-nyc.vercel.app/listings?type=rerental and list every card (about 59).
2. For each card: click "Official listing ↗" and check the source page.
3. Record one line per card in a table:

| # | name on our card | source | our link opens (unit page / source home / 404 / other) | still available? (yes / no / can't tell) | exact unit page URL if you found one | notes |

- "still available": **yes** only if the source page says available/accepting now; **no** if it says rented, filled, closed, or the unit is gone; otherwise **can't tell**.
- If our link opens a general page, try to find that unit's own page on the source site and put its URL in the table.
4. Also note any two cards that are the same unit (duplicates).

Put the table in the result file (markdown). No screenshots needed except for anything confusing.
