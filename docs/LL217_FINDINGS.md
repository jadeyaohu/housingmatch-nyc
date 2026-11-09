# LL217 lottery outcomes: what the official data says

Source: HPD, *Housing Lottery Outcomes – Local Law 217* (published 2025-01-21). It covers Housing Connect lotteries with units leased or sold between **1/1/2022 and 10/31/2024**: 20,200 signed leases in total, from HPD and HDC lotteries, re-rentals included. Mitchell-Lama and waitlist-only lotteries are excluded.
Muse downloaded the files in T004, and Claude verified them on 2026-11-09 (25-page report plus 4-page documentation). Copies: `agents/claude-inbox/T004/` on main.

This is the newest edition; no 2025 edition has been published yet. Re-check about once a year.

## Read this first: what these numbers are NOT

- Every count is an **application**, not a household. One household applying to 100 lotteries counts 100 times.
- So "1 in 500 applications led to a lease" is **not** a person's odds, and we must never present it as one.
- Counts of 0–9 are suppressed as `###`.
- Incomes are self-reported at application time.
- Preference tables cover only lotteries where that preference applied.

## Funnel, NYC-resident applications

The stages are: Application → "Invited to confirm eligibility" (documents requested) → Selected → Signed lease.

| Group | Applications | Invited for documents | Signed leases | Lease / application | |
|---|---|---|---|---|---|
| Household size 1 | 5,226,950 | 6.6% | 10,418 | 0.20% | 1 in 502 |
| Household size 2 | 2,696,984 | 8.3% | 5,326 | 0.20% | 1 in 506 |
| Household size 3 | 1,379,342 | 8.0% | 2,616 | 0.19% | 1 in 527 |
| Household size 4 | 642,900 | 7.2% | 1,202 | 0.19% | 1 in 535 |
| Household size 5 | 237,939 | 6.9% | 403 | 0.17% | 1 in 590 |
| Extremely low income | 2,871,953 | 6.8% | 5,935 | 0.21% | 1 in 484 |
| Very low income | 3,431,014 | 4.2% | 5,760 | 0.17% | 1 in 596 |
| Low income | 2,817,153 | 7.6% | 4,702 | 0.17% | 1 in 599 |
| Moderate income | 1,012,130 | 17.2% | 3,386 | 0.33% | 1 in 299 |
| Middle income | 99,169 | 14.0% | 274 | 0.28% | 1 in 362 |

| Group | Applications | Signed leases | Lease / application | |
|---|---|---|---|---|
| All NYC residents (by borough totals) | 10,250,872 | 20,069 | 0.20% | 1 in 511 |
| Outside NYC / unknown address | 685,303 | 131 | 0.02% | 1 in 5,231 |
| Community-district preference received | 368,521 | 6,897 | 1.87% | 1 in 53 |
| No community-district preference | 6,377,068 | 6,062 | 0.10% | 1 in 1,052 |
| NYCHA resident (where preference applied) | 43,711 | 245 | 0.56% | 1 in 178 |
| Not NYCHA resident (same lotteries) | 338,214 | 375 | 0.11% | 1 in 902 |
| Municipal employee | 2,008,039 | 3,716 | 0.19% | 1 in 540 |
| Not municipal employee | 4,738,666 | 9,221 | 0.19% | 1 in 514 |

## What this means for the product

1. **Preferences matter most.** In lotteries with a community-district preference, applicants who received it accounted for 53% of the leases (6,897 of 12,959) while sending only 5.5% of the applications.
   - We can state the factual version for each listing: "This lottery reserves a share of units for residents of Community District X; your address is / isn't in it."
   - That needs two things: the user's community district (from the ZIP or address they give, with consent) and each lottery's preference data. Next step: check whether Open Data `vy5i-a666` or the Housing Connect detail page carries the community-district and NYCHA preference fields.
2. **Applicants outside NYC are 10× less likely per application to sign a lease.** Worth one plain-language line in the results for users without an NYC address.
3. **Moderate and middle income have a higher document-request rate (14–17%)** than extremely-low to low income (4–8%), because those bands have fewer applicants per unit. This is per-application aggregate context only. It must never become "your chances are X%".
4. **Log Number model (`LOG_NUMBER_MODEL.md`).**
   - LL217 is aggregate data. It cannot tell anyone how far down the log a given lottery will reach.
   - It is useful as a citywide baseline: about 6–8% of applications get a document request; about 0.2% end in a lease.
   - Per-lottery reach still depends on the founder's insider inputs: the 4 open questions in LOG_NUMBER_MODEL.md.

## Messaging guardrails (unchanged)

- Never say or imply that applying through HousingMatch improves odds.
- Any number shown must cite "HPD Local Law 217 report, 2022–2024" and say it counts applications, not people.
