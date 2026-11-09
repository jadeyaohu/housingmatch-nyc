# Data publication rules

Collected data is **not** automatically public.

| Data | Production | Preview / local |
|---|---|---|
| NYC Open Data (official) | Published | Shown |
| Muse collection from an **approved** source | Published | Shown |
| Muse collection from a **pending** source | **Hidden** | Shown (for audit) |

- Approvals live in `data/sources/approved-sources.json`, one entry per `source_name`, with date, approver and the basis of the approval.
- A source is approved once, after its first batch has been audited: income figures spot-checked against the source, links open the right page, availability matches the source, no unsupported housing types (e.g. homeownership in a rental feed), duplicates handled. After that, new batches from that source publish automatically, still passing the per-record validation in `src/lib/import/muse.ts` (AMI cross-check, quarantine, second read for changed income tables, removal after 2 misses, circuit breaker, staleness).
- A source can be moved back to `pending` at any time; its listings disappear from Production on the next deploy.
- Re-rentals and waiting lists are always shown in their own section, never in the main lease-up match count (see `src/lib/availability.ts`).
