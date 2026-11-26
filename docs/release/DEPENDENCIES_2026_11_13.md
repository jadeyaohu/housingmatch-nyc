# Draft PR dependency audit — 2026-11-13

Main: `ee76c4a9aec559b16aebcf65061e443aae4b9b2d`. Development starting head: `8d712fca3f8f279792690e235ef047cab3a9057b`. All open Draft PR metadata, descriptions, changed-file lists and check statuses were inspected through GitHub. File lists above100 were limited on the first API page; targeted related PR source remains in the existing integrated implementation. No stacked PR was merged.

| PR | Head SHA | Base branch | Observed checks | GitHub mergeable |
|---|---|---|---|---|
| #19 | `8d712fca3f8f279792690e235ef047cab3a9057b` | `main` | Vercel Preview Comments: success, candidate: success | True |
| #17 | `0e73a7a2bcde903013f7c3fdc054ccee8640c15c` | `feat/consultation-mvp` | Vercel Preview Comments: success | True |
| #16 | `f41d42841d05fca8575e4921229dce9452103c3b` | `main` | Vercel Preview Comments: success | True |
| #15 | `d8642b54e7fceef86e3cc238a7e1e34dbed1b6d9` | `main` | Vercel Preview Comments: success | True |
| #14 | `6d782c76a6bb49b9458c7de1d2b3d419ea22d656` | `milestone-2/quiz` | Vercel Preview Comments: success, checks: success, results-e2e: success | True |
| #13 | `675d0e39f86651ab6240fadeb78cb9d81a871b64` | `milestone-0/stabilize` | Vercel Preview Comments: success, checks: success, results-e2e: success | True |
| #12 | `22e8202103e88543915b15a0a40f7d44cd3630bd` | `main` | Vercel Preview Comments: success | True |
| #11 | `f48ec303aecd5b66858cf00a5ed150f7d7d7ae10` | `milestone-2/quiz` | Vercel Preview Comments: success, results-e2e: failure, checks: success | True |
| #9 | `9c5fc0371057a4c22ba96ccef7f0dcdbdfd7b488` | `milestone-0/stabilize` | Vercel Preview Comments: success | False |
| #8 | `d699af1eda3e8a5145ad1ed3b3c7453ae45036d2` | `main` | Vercel Preview Comments: success, results-e2e: success, checks: success | False |
| #6 | `92f5b9273fa57b53d0593500ba3acbb06fb19f52` | `main` | Vercel Preview Comments: success, checks: success, results-e2e: success | True |
| #4 | `5f42c85e8fb8f0908200f3888f292c9e79ebb5a1` | `feature/hn-001-pr1a-event-ingestion` | Vercel Preview Comments: success, e2e: success, check: success | True |
| #3 | `3705488b693cf9ad94f1bc6ad7ed1075a230a372` | `main` | Vercel Preview Comments: success, check: success | True |
| #2 | `2e3a825cf85640974c8059e481d6b41067c97079` | `main` | Vercel Preview Comments: success | True |

#9 depends on #8; #11/#14 depend on #9; #13 depends on #8; #17 depends on #16; #4 depends on #3. #8 and #9 report conflicts; #11 has a failed results browser check. PR19 contains the existing beta integration; use it as the single incremental working branch. Main has a newer listing-source snapshot; no unreviewed data refresh was copied into this increment. Mergeability is the observed GitHub value, not a recommendation to merge.
