# Muse recurring collection (fully automatic)

Muse reads public listing pages, writes one CSV per run, and uploads it to the repo's `data/inbox/` folder. A GitHub Action then validates every record and publishes the ones that pass. No human review is needed.

```
Muse ──CSV──► GitHub data/inbox/ ──push──► Action: npm run ingest:muse ──► data/listings.json ──► Vercel redeploy
                                              │
                                              └─► data/reports/muse-*.json  (added / updated / held / removed / quarantined + why)
```

## Schedule

| Run | When | Sources |
|---|---|---|
| A — Housing Connect lotteries | Wednesdays | every open lottery on Housing Connect's public open-lotteries page |
| B — Re-rentals | Mon / Wed / Fri | the re-rental sites listed below |
| C — Waiting lists | Wednesdays | Mitchell-Lama (city + state) open waiting lists |

If Muse can't run on a schedule by itself, Claude can run it on a schedule through your desktop app's built-in browser. Your computer needs to be on at the scheduled time.

## What happens automatically

| Situation | What the system does |
|---|---|
| Record passes every check | Published right away, labeled "Auto-collected from <source> · checked <date>" |
| Any income figure is off (e.g. a misread digit, limits falling as household size grows, numbers that don't match the stated AMI %) | That whole listing is held back; the reason goes in the report |
| An already-published income table changes | The old table stays up until a second run reads the same new values |
| A listing disappears from its source | Removed after 2 runs in a row without it |
| A run looks broken (nothing read, or most rows fail) | That source's run is ignored and the last good data stays up |
| A source hasn't had a good run in 15 days | Its listings come off the site |
| The pipeline itself crashes | GitHub emails you (the only time you hear about it) |

## The prompts

The current, ready-to-paste prompts are in `docs/muse-prompts/` (RUN-A, RUN-B, RUN-C). The combined version below is kept for reference.

## Combined prompt (reference; set `[RUN]` to A, B or C)

> You are collecting public NYC affordable housing listings for HousingMatch NYC. Today's run: **[RUN]**.
>
> **Rules**
> - Only open public pages. Never log in to a housing site, never submit a form or application, never solve a CAPTCHA. If a site asks you to log in or blocks you, skip it.
> - Browse at a normal human pace: one page at a time, a few seconds between pages.
> - Copy only what the page shows. If a value isn't on the page, leave the cell blank. Never estimate, calculate, or fill in from other listings.
> - Copy numbers exactly. Drop "$" and commas if you like, but never change digits.
>
> **Output**: one CSV with exactly the header from `docs/muse-template.csv` (comma-separated, UTF-8):
> `record_type,source_name,source_url,collected_at,lottery_id,name,borough,address,application_start_date,application_end_date,apply_url,restrictions,unit_type,ami_percent,household_size_min,household_size_max,min_income,max_income_1,max_income_2,max_income_3,max_income_4,max_income_5,max_income_6,max_income_7,max_income_8,monthly_rent,units_available,notes`
>
> - **One row per line of the listing's income table** (one per unit size × AMI level). Repeat the listing's details on each row.
> - `record_type`: `lottery`, `rerental`, or `waitlist`.
> - `source_name`: use exactly the names in the list below. `source_url`: the full link of the page you read. `collected_at`: the date and time you read it, e.g. `2026-11-05T14:30:00-05:00`.
> - `lottery_id`: the Housing Connect lottery number (run A only).
> - `borough`: Manhattan, Brooklyn, Queens, Bronx, or Staten Island.
> - Dates: `YYYY-MM-DD`. A lottery must have `application_end_date`. Leave both dates blank for rolling re-rentals and open waiting lists.
> - `restrictions`: e.g. `senior 62+`, `disability`, `veteran`, or blank.
> - `unit_type`: Studio, 1BR, 2BR, 3BR, or 4BR+.
> - `ami_percent`: the AMI % for that row, e.g. 60. `household_size_min/max`: the household-size range for that row.
> - `max_income_1` … `max_income_8`: the maximum income for 1-person … 8-person households, exactly as printed. Leave blank any size the listing doesn't show.
> - `min_income`, `monthly_rent`, `units_available`: as printed.
> - `notes`: short notes only, e.g. `$75 application fee`, `voucher holders exempt from minimum income`.
> - A waiting list with no income table gets one row with the income columns left blank.
>
> **Sources**
> - Run A — `Housing Connect`: https://housingconnect.nyc.gov/PublicWeb/ → open lotteries → open each lottery's public detail page.
> - Run B — re-rentals (each name is the `source_name`):
>   `HDC` https://www.nychdc.com/find-re-rentals ·
>   `Pronto Housing` https://www.prontohousingrentals.com/ ·
>   `TF Cornerstone` https://tfc.com/about/affordable-re-rentals ·
>   `MNS` https://www.mns.com/affordable_units ·
>   `Housing Partnership` https://housingpartnership.com/what-we-do/current-vacancies/ ·
>   `MHANY` https://www.mutualhousingny.org/affordable-re-rental-units ·
>   `Settlement Housing Fund` https://www.settlementhousingfund.org/find-housing/ ·
>   `iAfford` https://iaffordny.com/re-rentals
> - Run C — waiting lists:
>   `HPD Mitchell-Lama` https://www.nyc.gov/site/hpd/services-and-information/mitchell-lama-program.page (open waiting lists) ·
>   `HCR` https://hcr.ny.gov/find-affordable-housing
>
> **Upload**: name the file `muse-YYYY-MM-DD-HHMM-[RUN].csv`. Then go to https://github.com/[OWNER]/housingmatch-nyc/upload/main/data/inbox, upload the file, and commit it straight to `main` with the message `muse run [RUN]`. Don't change any other file.
>
> **Report back** in one line: how many listings you read per source, and any source you skipped and why.

## Adding a source
Add it to the Run B list above with a fixed `source_name`. The pipeline needs no code change. More re-rental sources are listed at https://www.nyc.gov/re-rentals.
