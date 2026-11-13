# Data publication rules

Collected data is **not** automatically public.

| Data | Production | Preview / local |
|---|---|---|
| NYC Open Data (official) | Published | Shown |
| Explicitly marked manually curated records | Published | Shown |
| Muse collection from an **approved** source | Published | Shown |
| Muse collection from a **pending** source | **Hidden** | Shown (for audit) |
| Missing/unknown provenance | **Hidden** | Shown (for audit) |

Production is selected by `VERCEL_ENV=production`; `preview` selects Preview and other/unset
values select local development. This is a Vercel publication gate, not a generic `NODE_ENV`
deployment detector. Do not rely on it for an unconfigured self-hosted production deployment.

Legacy Supabase rows do not retain `dataSource`, `sourceName`, `listingType`, or `collectedAt`.
They cannot establish an approved source and are therefore withheld in Production. This can
produce an empty Production catalog when using that legacy backend; use the reviewed JSON
catalog or separately migrate/backfill provenance before enabling Supabase listings. No
provenance is inferred from an ID or URL. The retained `is_rerental` flag still keeps legacy
re-rentals out of primary lottery results and the default lotteries browser.

A recent observation verifies a secondary listing only when its stored status is explicitly
`open` and its application opening date is not in the future. Observations must be within the
last seven NYC calendar days, not in the future; timestamps are converted to NYC dates before
comparison. A date-only `lastVerifiedAt` is interpreted as a calendar date. Missing deadlines
alone never verify availability, and unknown provenance is not assumed to be official Open Data.

- Approvals live in `data/sources/approved-sources.json`, one entry per `source_name`, with date, approver and the basis of the approval.
- A source is approved once, after its first batch has been audited: income figures spot-checked against the source, links open the right page, availability matches the source, no unsupported housing types (e.g. homeownership in a rental feed), duplicates handled. After that, new batches from that source publish automatically, still passing the per-record validation in `src/lib/import/muse.ts` (AMI cross-check, quarantine, second read for changed income tables, removal after 2 misses, circuit breaker, staleness).
- A source can be moved back to `pending` at any time; its listings disappear from Production on the next deploy.
- Re-rentals and waiting lists are always shown in their own section, never in the main lease-up match count (see `src/lib/availability.ts`).
