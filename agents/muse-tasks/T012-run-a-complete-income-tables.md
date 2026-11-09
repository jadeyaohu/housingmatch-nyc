# T012: Run A now: copy the income table for EVERY open Housing Connect lottery
priority: high · created: 2026-11-09 · no sign-in needed

**Why:**
- T011 showed that our estimates overstate income limits for 40% and 60% AMI units by up to $33,920.
- All rents are missing for every lottery that has no Muse table.
- Only 5 of the ~30 open lotteries currently have your copied table.
- Your T011 tables for 7625 and 7718 were exactly what we need.

**Do:**
1. Follow `docs/muse-prompts/RUN-A-housing-connect.txt` exactly, with the same CSV format and upload steps.
2. Do **every** lottery on the Open Lotteries search page. Page through all result pages. Don't stop at the first few.
   - Per lottery: one row per line of the "Available Units & Requirements" table (unit size × AMI level).
   - Copy min income, max income for every household size shown (max_income_1…8), rent and units.
   - Lotteries 7625 and 7718 must be included. You already read them in T011, so use those numbers if the page still shows the same.
3. Before uploading, check:
   - each lottery's units add up to the total units the page shows;
   - max_income_N is the N-person column (no shifted columns).
4. Upload the file as `muse-YYYY-MM-DD-HHMM-A.csv` to `data/inbox` (this is the normal Run A upload) and wait for the "Update listings" workflow.

**Result file** `agents/claude-inbox/T012-result.md`:
- how many lotteries the search pages showed in total;
- how many you copied;
- any you skipped, and why;
- the CSV file name;
- whether the workflow succeeded (exact error text if not).

Use quotation marks only for text you copied from the screen.
