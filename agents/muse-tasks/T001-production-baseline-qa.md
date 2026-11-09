# T001 — Production baseline QA (mobile + desktop, English + Chinese)
priority: high · created: 2026-11-09

**Goal:** record how the live site behaves today, before Milestone 0 changes, so Claude can fix bugs and check for regressions.

**Site:** https://housingmatch-nyc.vercel.app

Do every step at two window sizes: **phone (390 × 844)** and **desktop (1280 × 800)**. Then repeat the whole set with the language switched to **中文** using the button at the top right. Use a tap/click on the button, not the keyboard.

1. Home page: does everything fit the screen? Is any text cut off, overlapping, or off-screen? Is the 中文 / EN switch fully visible and does it work with one tap?
2. Fill the matcher with this made-up household: 3 people, income 85000, no boroughs, no sizes, no checkboxes → "Find My Matches". Note how many results show and how many of each label (Likely match / Needs review / Unlikely match). Open "Why" on the first 3 results.
3. Same with: 2 people, income 60000, borough Brooklyn, "I have a housing voucher" checked.
4. Go to "Browse housing". Try each filter once (borough, size, status, type). Note anything that looks wrong or confusing.
5. Click "Official listing ↗" on 5 different cards (at least 2 lotteries and 2 re-rentals). Does each open the right page? Note any 404, wrong page, or generic home page.
6. Anything a first-time user with little tech experience would find confusing: write it down in plain words.

Screenshots: home + results + listings, for each size × language (about 12).
