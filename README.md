# HousingMatch NYC

An independent tool for finding NYC affordable housing lotteries and learning how they work. Users enter household size and income and get preliminary matches (**Likely match / Needs review / Unlikely match**), each with an explanation in English and 简体中文. **Not affiliated with Housing Connect, HPD, HDC, or any government agency.**

## Status: Phase 1–2 (matcher MVP)

| Done | Next |
|---|---|
| Next.js 15 + TypeScript + Tailwind | Hand-verified income tables for open lotteries |
| Supabase schema with RLS (`supabase/migrations/0001_init.sql`) | Deploy to Vercel, connect Supabase |
| CSV/JSON importer with data-quality report | Enable the daily sync on GitHub |
| Configurable matching engine + 44 unit tests | Auth, profile, saved listings, tracker |
| No-login matcher (`/`) and listings browser (`/listings`), EN/中文 | Email alerts, Stripe, education center |

## Data

`data/opendata/` holds the NYC Open Data snapshot (1,754 lotteries and 2,150 buildings, from Housing Connect lotteries advertised since July 2020). `npm run import -- --opendata` converts it into `data/listings.json`.

- `.github/workflows/sync-opendata.yml` re-downloads both datasets every day and commits any changes (`npm run import -- --fetch`).
- Open Data gives **unit counts by HPD income category** (Extremely Low through Above Middle), not dollar income tables, and it doesn't say which unit sizes are at which income level. Matches against this data are therefore always *Needs review*, never *Likely*. A listing only becomes *Likely* after someone hand-enters its published income table (see Muse task M3).
- Open/closed status comes from the dates, not the status field, because many "Active" rows are already past their deadline.
- Mini-lotteries (re-rentals) and Mitchell-Lama lotteries are not in this data.

### Muse (re-rentals, waiting lists, Housing Connect income tables)

Muse uploads a CSV to `data/inbox/` (format: `docs/muse-template.csv`, prompt: `docs/MUSE_RECURRING.md`). The **Update listings** GitHub Action validates and publishes it automatically: AMI cross-checks, whole-listing quarantine, a second read before any income change goes live, removal after 2 misses, a per-source circuit breaker, and a 10-day staleness cutoff. Reports are written to `data/reports/`. Logic: `src/lib/import/muse.ts` (tests in `muse.test.ts`).

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000, uses data/listings.json
npm test             # unit tests
npm run import -- --opendata               # Open Data snapshot → data/listings.json
npm run ingest:muse                        # process data/inbox/*.csv
```

Copy `.env.example` to `.env.local` and fill it in to use Supabase instead of the JSON file.

## How matching works (`src/lib/matching/engine.ts`)

Each rule returns `pass`, `fail`, or `unknown`, plus a bilingual reason:

| Rule | Logic |
|---|---|
| deadline | closed or past the deadline → fail · no deadline on file → unknown |
| household_size | must fit at least one income band's size range |
| income | must fit a band's published min/max. If a listing gives only an AMI %, the max is **estimated** from the HPD 2026 AMI table (`src/lib/ami.ts`), which gives `unknown`, not `pass`. Voucher holders below the minimum get `unknown`, since minimums are often waived for them (configurable) |
| restrictions | senior (62+/55+) and disability set-asides |

Combined result: any fail → **Unlikely**; otherwise any unknown → **Needs review**; otherwise **Likely**. Borough and bedroom choices are *preferences*: they sort results and hide non-matches, but they don't change eligibility.

Missing data is never filled in. A listing with no income table always comes back as *Needs review*.

## Project layout

```
src/lib/types.ts            domain types
src/lib/ami.ts              HPD AMI table (update every spring)
src/lib/matching/           rules engine + tests
src/lib/import/             CSV/JSON normalizer + tests
src/lib/data/               Supabase / JSON data access
src/app/                    pages + /api/match
supabase/migrations/        SQL schema + RLS
scripts/import-listings.ts  importer CLI
docs/MUSE_TASKS.md          Claude × Muse division of work + Muse prompts
```
