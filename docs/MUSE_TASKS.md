# Claude × Muse — Division of Work

**Claude** owns the code: product specs, architecture, all application code, tests, deploys, and reviewing anything Muse produces before it reaches users.
**Muse** owns work done in a browser: research, checking listings by hand against public pages, and testing the live site like a real user.
**You (founder)** approve each phase, own every account (GitHub, Vercel, Supabase, Stripe, Resend), and make the final call on legal, tax, and content questions.

One rule keeps this clean: **Muse never edits the codebase.** Muse writes files into `docs/research/` (Markdown or CSV), you drop them into the repo or the chat, and Claude turns them into code, data, or fixes.

```
Claude: spec + build ──► deploy preview ──► Muse: test + research ──► docs/research/*.md|csv
     ▲                                                                       │
     └──────────── Claude: review, fix, import ◄──────── you: approve ◄──────┘
```

## Timeline

| Week | Claude (code) | Muse (browser) |
|---|---|---|
| 1 | ✅ Schema, importer, matching engine, matcher page, listings page (done in this repo) · import your 1,754 records | **M1** competitor scan · **M2** data-source audit |
| 2 | Deploy to Vercel · connect Supabase · NYC Open Data sync job | **M3** verify 20 open lotteries by hand (ground-truth set) · **M4** first UX test |
| 3 | Auth, household profile, saved listings, application tracker | **M4** UX test again on the new flows |
| 4 | Daily new-lottery detection, email alerts, deadline reminders, unsubscribe | Test the alert emails (signup → email → unsubscribe) |
| 5 | Stripe Checkout + billing portal, Plus limits, education center CMS | **M5** gather sources for education articles |
| 6 | Playwright E2E, security pass, privacy page, production launch | **M6** pre-launch check · full regression test |

---

## Prompts for Muse (copy and paste)

### M1 — Competitor scan
> Research products that help people find or apply for NYC affordable housing lotteries (Housing Connect). Include nonprofits, apps, newsletters, Facebook/WeChat/Xiaohongshu groups, and paid services. For each one, record: name, URL, who it's for, languages, features (search, eligibility check, alerts, application help), price, and how it makes money. Note anything that seems to charge for filling out the free official application. Output a Markdown table plus a 5-bullet summary of gaps that nobody covers well, especially for Chinese-speaking applicants. Save as `docs/research/M1-competitors.md`.

### M2 — Data-source audit
> Review these NYC Open Data datasets: "Advertised Lotteries on Housing Connect by Lottery" (ID vy5i-a666) and "...By Building" (ID nibs-na6y). For each, record: every column name and what it means, update frequency, terms of use, and what the FAQ tab says is left out (mini-lotteries, Mitchell-Lama, re-rentals). Then check whether the datasets give dollar income limits per household size or only unit counts by income tier. Also check whether nyc.gov or Housing Connect publish any terms that restrict reusing listing information. Do not log in anywhere. Save as `docs/research/M2-data-sources.md`.

### M3 — Hand-verify 20 open lotteries (ground truth)
> Go to the public Housing Connect open-lotteries page (no login). For 20 open lotteries, copy the published details into a CSV with these columns: lottery_id, name, borough, address, unit_types, application_start_date, application_end_date, application_url, restrictions, income_bands. Write income_bands as JSON, one object per row of the listing's income table: {"ami_percent":60,"unit_types":["1br"],"household_size_min":1,"household_size_max":3,"min_income":42000,"max_income_by_household_size":{"1":71280,"2":81420,"3":91620},"monthly_rent":1650,"unit_count":12}. Only copy what is printed. Leave a cell blank if the information isn't shown, and never estimate. Work at normal human browsing speed. Save as `docs/research/M3-verified-lotteries.csv`.

*Claude uses this file for two things: as the import template, and as a test set that checks the matcher against real income tables.*

### M4 — UX test (repeat after each deploy)
> Open [PREVIEW URL]. Test as three people: (1) Maria, a single parent of 2 earning $58,000 who has a Section 8 voucher and wants Bronx or Brooklyn; (2) Mr. Chen, 67, living alone on $31,000, who prefers Chinese and wants Queens; (3) a couple earning $140,000 who want a 2 BR anywhere. For each person, fill in the matcher, switch languages, open "Why" on the results, and browse listings with filters. Test on a phone-sized window and a desktop window. Record every bug, confusing word, unclear Chinese translation, slow step, and any result that looks wrong. Include screenshots and steps to reproduce. Save as `docs/research/M4-ux-test-YYYY-MM-DD.md`.

### M5 — Education sources
> For each topic (AMI, how household income is counted, household composition, lottery preferences, selection process, document preparation, income verification, waitlists, re-rentals, rejection and appeals, housing vouchers), find the official source pages (nyc.gov/hpd, Housing Connect guides, HDC, NYCHA). For each, give the URL, a 3-sentence plain-language summary in your own words, and the date the page was last updated. Mark anything that is general guidance rather than an official rule. Save as `docs/research/M5-education-sources.md`.

### M6 — Pre-launch check
> On [PRODUCTION URL], check: the footer says the site isn't affiliated with any government agency; no page implies official approval or better lottery odds; every listing links to its official page; unsubscribe works from a real email; the privacy page says what is collected and how to delete an account; a Stripe test checkout and cancellation work. Save a pass/fail checklist as `docs/research/M6-prelaunch.md`.

---

## What Claude needs from you next
1. **Your 1,754-record file** (CSV or JSON). Claude maps its columns in `src/lib/import/normalize.ts` → `COLUMN_ALIASES` and runs the importer.
2. **A GitHub repo**: connect GitHub in claude.ai Settings → Connectors, or create an empty repo `housingmatch-nyc` and share its name.
3. **Accounts** (all free tiers to start): Vercel, Supabase. Add Stripe and Resend in weeks 4–5.
