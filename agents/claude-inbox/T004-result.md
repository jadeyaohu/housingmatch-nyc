# T004 result
status: done
finished_at: Mon 2026-11-09 12:15 PM EST

## Summary
Downloaded both files listed on the NYC Government Publications Portal page "Housing Lottery Outcomes - Local Law 217" (HPD, published 2025-01-21, fiscal years 2022–2024) and uploaded them to agents/claude-inbox/T004/. No Excel or CSV files are listed on the page, and no newer edition than 2024 was found. Direct curl download was blocked by the portal (HTTP 403), so the files were downloaded through the live browser instead; both were verified as real PDFs after download.

## Findings
1. Source page: https://a860-gpp.nyc.gov/concern/nyc_government_publications/9g54xn547?locale=en — page shows Agency "Housing Preservation and Development, Department of (HPD)", Report type "Reports - Annual", "Date published 2025-01-21", "Fiscal year 2022, 2023, 2024", Mandated Report Name "Report on Affordable Housing Lotteries During the Prior Three Fiscal Years". (not captured)
2. File 1: `LL217_2024_Report_FINAL1.pdf` — 136,295 bytes, 25 pages, PDF 1.6. Source URL: https://a860-gpp.nyc.gov/downloads/cv43p163v?locale=en. Date Uploaded shown on page: 2025-01-21. Saved as agents/claude-inbox/T004/LL217_2024_Report_FINAL1.pdf. (not captured)
3. File 2: `2024_12_03_HPD_Local_Law_217_of_2019_Lottery_Outcomes_Report_-_Documentation.pdf` — 216,227 bytes, 4 pages, PDF 1.6. Source URL: https://a860-gpp.nyc.gov/downloads/1544bs75w?locale=en. Date Uploaded shown on page: 2025-01-21. Saved as agents/claude-inbox/T004/2024_12_03_HPD_Local_Law_217_of_2019_Lottery_Outcomes_Report_-_Documentation.pdf. (not captured)
4. No newer edition: the page lists no edition newer than 2024 (latest fiscal year shown is 2024) and links to no 2025 or later edition. A site search of a860-gpp.nyc.gov for "Local Law 217" returned only this same 2024 publication plus unrelated Department of Homeless Services HOME-STAT reports under Local Law 217 of 2017. (not captured)
5. No Excel/CSV: the page's Items table lists only the two PDFs above; no spreadsheet or CSV file appears. (not captured)

## Not done / blocked
- Nothing skipped. Direct download with curl was refused by the portal server (HTTP 403 "Access Denied"), so the files were downloaded via the live browser's Download links on the publication page; the downloaded files were verified as valid PDFs (136,295 and 216,227 bytes, 25 and 4 pages) before upload.
- No screenshots: this task is a file download, not a visual QA task, so no screenshots were taken.
