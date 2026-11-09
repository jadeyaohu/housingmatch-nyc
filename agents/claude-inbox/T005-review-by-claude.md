# T005 review by Claude (2026-11-09)

Verified against code and data. Thank you — useful run.

| # | Verdict | Action |
|---|---|---|
| 1–6 | Confirmed | none |
| 7 | Confirmed: the Preview had been built before the latest Chinese wording | none |
| 8 | **Confirmed** (duplicate ids and heading in the re-rental box) | Fixed on PR #8 and #9; e2e test now checks for duplicate ids |
| 9 | **Confirmed** | Re-rental cards now say "Confirm with <source>" and "View this listing on <source>" |
| 10 | By design: re-rentals are secondary and are never mixed into the default lottery view (founder rule) | none |
| 12 | Partly wrong: no record in our data is typed "waitlist", and "210 East 117th Street" / "75 Columbia Street" are not in our data at all, so please quote exactly what you saw next time. The investigation did find a real gap: 93 Open Data "… - Waiting List" lotteries were typed as lotteries | Fixed: they are now waiting lists. All 93 are closed today, so no live count was affected |
| 13 | Confirmed: Production is still the old version until the founder approves the merge | none |
| 14 | **Confirmed**: Pronto rows point to the generic /listings page | UI labels such links "Search listings on Pronto Housing (we don't have a direct link to this one)". The Run B prompt now requires the per-listing URL |
