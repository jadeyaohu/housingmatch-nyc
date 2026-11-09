# T002 result

status: done

finished_at: 2026-11-09 11:52 AM, New York

## Summary

Checked all 59 re-rental cards on https://housingmatch-nyc.vercel.app/listings?type=rerental (card list taken from data/listings.json, which is the site's data source; all 59 have isRerental=true, source muse, status open). Every card's "Official listing" link was opened and the source page read on Mon 2026-11-09, 11:42 AM–11:52 AM EST.
Outcome: 56 yes, 1 no, 2 can't tell (see table). No link returned a 404. 38 of the 59 links open a generic source list page rather than a unit page (all 27 HDC, 7 Pronto, all 4 TF Cornerstone, 1 MHANY); the other 21 open a unit page. Two duplicate pairs found: 5203 Center Blvd and 5241 Center Blvd each appear twice (once HDC, once TF Cornerstone).

## Findings

| # | name on our card | source | our link opens (unit page / source home / 404 / other) | still available? (yes / no / can't tell) | exact unit page URL if you found one | notes |
|---|---|---|---|---|---|---|
| 1 | St. Albans Home | Pronto Housing | unit page | yes | https://prontohousingrentals.com/listings/property/padsplit-42211 | "1 unit available", Room 1, 1 bed, $1,937.00/mo, Apply button (not clicked). "Listing from PadSplit. Last updated: 2026-11-09." No deadline shown. |
| 2 | Livonia Commons | Pronto Housing | source listings page | yes | — | Present on https://prontohousingrentals.com/listings, page 2 of 2 ("Showing 25–32 of 32"). 481 Williams Avenue, Brooklyn, NY 11207. "5 offerings · 5 units available", Apply button. Offerings shown: Studio 60% AMI $884.25/mo, 1 bed 60% AMI $1,365.78/mo, 2 bed 40% AMI $701.92/mo, 2 bed 60% AMI $568.18/mo (each "1 unit available"), plus a 5th offering behind "+1 more offerings". No deadline shown. |
| 3 | 595 Dean St | TF Cornerstone | source page (generic) | yes | — | Listed under "Available Re-Rentals". "Request Application." "For current availability, visit our on-site leasing office at 595 Dean St in Brooklyn." No rent, unit count, or deadline shown. |
| 4 | 1730 Harrison AVE, Unit 4N | MNS | unit page | yes | https://www.mns.com/details/240428/rental/morris+heights/bronx | "Beautiful One Bedroom One Bathroom Now Available!" $2,653, 1 bed/1 bath, Morris Heights. Minimum income $35,000. |
| 5 | 88 Leonard ST, Unit 510 | MNS | unit page | yes | https://www.mns.com/details/240766/rental/tribeca/manhattan | "Affordable Studio in Tribeca Available 11/7!" $3,123, no fee, Studio/1 bath. Income-restricted program. |
| 6 | 54 Crown ST, Unit 1221 | MNS | unit page | yes | https://www.mns.com/details/240257/rental/crown+heights/brooklyn | "Brand New Luxury Two Bedroom Two Bathroom Now Available In Crown Heights!" $5,292, no fee, 2 bed/2 bath. Open house Mon 11/09–Fri 11/13. "2 months free on a 14 month lease." |
| 7 | 540 Waverly | Housing Partnership | unit page | yes | https://www.housingpartnership.com/services/current-vacancies/540-waverly | "We're currently accepting applications for a one-bedroom 130% AMI unit." 540 Waverly Ave, Brooklyn. 1BR $2,800, 130% AMI. |
| 8 | Stella Heights HDFC | MHANY | unit page | yes | https://www.mutualhousingny.org/stella-heights-hdfc | Page lists available SRO units (11 + 8), "Download Application", income $0.00–$59,400, household size 1 person. |
| 9 | PE2-700 Manida Street | MHANY | unit page | yes | https://www.mutualhousingny.org/pe2--700-manida-street | "AVAILABLE UNITS AND INCOME REQUIREMENT", "Units Available" table (e.g. Studio 30% AMI $625, 1 unit). "DOWNLOAD APPLICATION." |
| 10 | 1921 Cortelyou Road | MHANY | unit page | yes | https://www.mutualhousingny.org/1921-cortelyou-road | "AVAILABLE UNITS AND INCOME REQUIREMENTS": 1BR 30% AMI $680, 1 unit available (62+ set-aside); 2BR 60% AMI $1,740, 1 unit available. "DOWNLOAD APPLICATION." |
| 11 | 461 Dean Street | MHANY | source list page (generic) | yes | none found | Card "461 Dean Street — View Details" is listed on the MHANY "Affordable Re-Rental Units" page (header "Our Available UNITS"). No direct unit-page URL found for it (the card link had no href in the fetched page). |
| 12 | 183 Covert St - 1026 Unit 2F | iAfford | unit page | yes | https://iaffordny.com/re-rentals/2170103 | Heading "183 COVERT STREET UNIT 2F 1026", Bushwick. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 1BR $2,174.85, Units Available 1. "Download Application." "Applications will be logged on a first-come, first-served basis, similar to a waitlist." No deadline. |
| 13 | 1420 Stebbins - 0126 Unit 3A | iAfford | unit page | yes | https://iaffordny.com/re-rentals/2278330 | Heading "1420 STEBBINS AVENUE APARTMENTS - 0126 MULTIPLE UNITS", Claremont Village, 2 units. Unit "3A" is NOT named on the page itself (only in the How to Apply mailing address). "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 3BR $4,061, Units Available 1 (two rows). "Download Application." No deadline. |
| 14 | The Garrison - 0326 Unit 1A | iAfford | unit page | yes | https://iaffordny.com/re-rentals/2350924 | Heading "THE GARRISON - OM UNITS", Fort Greene, 4 units. Unit "1A" is NOT named anywhere on the page. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 1BR $3,500, Units Available 4. "Early occupancy incentive of one month free rent." How to Apply address "N/A". "Download Application." No deadline. |
| 15 | 2250 Clarendon Road - 0626 Unit 6D | iAfford | unit page | yes | https://iaffordny.com/re-rentals/4076564 | Heading "2250 CLARENDON ROAD - 0626 UNIT 6D", Flatbush. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 2BR $2,500.87, Units Available 1. "Download Application." No deadline. |
| 16 | 1032 Dekalb Ave Unit 1A 1026 | iAfford | unit page | yes | https://iaffordny.com/re-rentals/4133866 | Heading "1032 DEKALB AVENUE UNIT 1A 1026", Bedford-Stuyvesant. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 1BR $2,452.84, Units Available 1. "Download Application." No deadline. |
| 17 | 2510 Bedford Ave Apartments - 0926 Multiple | iAfford | unit page | yes | https://iaffordny.com/re-rentals/4394771 | Heading "2510 BEDFORD AVENUE APARTMENTS - 0926 MULTIPLE UNITS", 3 units. Borough/Neighborhood fields read "N/A" though Details text describes a 47-unit building in the Bronx. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 1BR $2,500 (2 available) and 2BR $3,000 (1 available). How to Apply names Unit 3E. "Download Application." No deadline. |
| 18 | 923 Broadway Unit 4B 1026 | iAfford | unit page | yes | https://iaffordny.com/re-rentals/4599509 | Heading "923 BROADWAY UNIT 4B 1026", Williamsburg. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 2BR $3,600, Units Available 1. "Download Application." No deadline. |
| 19 | 649 Hart St Unit 2B 0626 | iAfford | unit page | yes | https://iaffordny.com/re-rentals/4939481 | Heading "649 HART STREET UNIT 2B 0626", Bushwick. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, Studio $2,950, Units Available 1. "Download Application." No deadline. |
| 20 | 2783 Webb Ave - 1125 Unit 5A | iAfford | unit page | yes | https://iaffordny.com/re-rentals/5491531 | Heading "2783 WEBB AVENUE - 1125 UNIT 5A", Kingsbridge Heights. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 3BR $4,061, Units Available 1. "Download Application." No deadline. |
| 21 | 17-11 Hancock St Apartments - Multiple | iAfford | unit page | yes | https://iaffordny.com/re-rentals/6416173 | Heading "17-11 HANCOCK STREET APARTMENTS - MULTIPLE UNITS", Ridgewood, Queens, 2 units. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 1BR $2,750 (1 available) and 1BR $2,800 (1 available). "Download Application." No deadline. |
| 22 | 83-67 116th St Unit 505 0826 | iAfford | unit page | yes | https://iaffordny.com/re-rentals/6869353 | Heading "83-67 116TH STREET UNIT 505 0826", Richmond Hill. "AVAILABLE UNITS AND INCOME REQUIREMENTS", 130% AMI, 2BR $2,402, Units Available 1. "Download Application." Page inconsistency: How to Apply mailing address reads "83-67 116th Unit 505 0726" while the heading suffix is "0826". No deadline. |
| 23 | SELFHELP KVII | HDC | source list page (generic) | yes | — | Listed among the 27 current re-rentals on https://www.nychdc.com/find-re-rentals. Card shows only "View Advertisement"; no explicit "available now" wording or deadline on the list page. |
| 24 | TLK MANOR | HDC | source list page (generic) | yes | — | Same as #23. |
| 25 | Nehemiah Spring Creek Phase 4B1 | HDC | source list page (generic) | yes | — | Shown on HDC as "Nehemiah Spring Creek 4B1". Same as #23. |
| 26 | Atlantic Chestnut Phase I | HDC | source list page (generic) | yes | — | Same as #23. |
| 27 | BEACH 21ST STREET | HDC | source list page (generic) | no | none found | NOT among the 27 current re-rentals on the HDC page. The only beach-area card is "Beach Green Dunes III" (3-31 Beach 35th St, Far Rockaway), a different name/address from our card (19-02 Beach 21st St). Unit appears gone from the source. |
| 28 | Willets Point Phase 1A | HDC | source list page (generic) | can't tell | — | Name NOT on the HDC list. A similarly named card IS present: "Willets Point Commons", 126-43 39th Ave, Flushing. Our card's address is 124-39 38th Ave, Flushing — different address, so this may be a different building/phase, not a rename. Not confirmed the same unit. |
| 29 | Nehemiah Spring Creek Phase 4C | HDC | source list page (generic) | yes | — | Shown on HDC as "Nehemiah Spring Creek 4C". Same as #23. |
| 30 | River Crest | HDC | source list page (generic) | yes | — | Shown on HDC as "River Crest Apartments". Same as #23. |
| 31 | 90 SANDS | HDC | source list page (generic) | yes | — | Shown on HDC as "90 Sands Apartments". Same as #23. |
| 32 | Nehemiah Spring Creek Phase 4B-2 | HDC | source list page (generic) | yes | — | Same as #23. |
| 33 | OCEANHILL II | HDC | source list page (generic) | yes | — | Same as #23. |
| 34 | OCEANHILL I | HDC | source list page (generic) | yes | — | Same as #23. Same address as OCEANHILL II (1716 St Marks Ave) but a separate phase listing — see duplicates note. |
| 35 | GRAHAM | HDC | source list page (generic) | yes | — | Shown on HDC as "The Graham". Same as #23. |
| 36 | Creston Avenue Residence | HDC | source list page (generic) | can't tell | — | Name NOT on the HDC list. A similarly named card IS present: "Creston Burnside", 2028 Creston Avenue, Bronx. Our card's address is 2590 Creston Ave — different street number, so this may be a different building, not a rename. Not confirmed the same unit. |
| 37 | Bronx Commons | HDC | source list page (generic) | yes | — | Same as #23. |
| 38 | 1755 Watson Avenue | HDC | source list page (generic) | yes | — | Same as #23. |
| 39 | ONE FLUSHING | HDC | source list page (generic) | yes | — | Same as #23. |
| 40 | ALVISTA | HDC | source list page (generic) | yes | — | Shown on HDC as "Alvista Towers". Same as #23. |
| 41 | APEX PLACE | HDC | source list page (generic) | yes | — | Shown on HDC as "Apex Place Apartments", 62-11 108th Street, Forest Hills. Same as #23. |
| 42 | ONE FLUSHING SENIOR | HDC | source list page (generic) | yes | — | 133-45 41st Avenue, Flushing; Studio, 62+. Same as #23. |
| 43 | 5241 Center Blvd | HDC | source list page (generic) | yes | — | Shown on HDC as "5241 Center Blvd. Apartments", Long Island City; 1-Bedroom, Studio. Same as #23. Duplicate of #57. |
| 44 | 35 Commercial St | HDC | source list page (generic) | yes | — | Shown on HDC as "35 Commercial Street". Same as #23. |
| 45 | Riverwalk Park | HDC | source list page (generic) | yes | — | Same as #23. |
| 46 | Coney Island Phase I | HDC | source list page (generic) | yes | — | Same as #23. |
| 47 | The Carolina | HDC | source list page (generic) | yes | — | Same as #23. |
| 48 | Bronx Point Phase I | HDC | source list page (generic) | yes | — | Same as #23. |
| 49 | 5203 Center Blvd | HDC | source list page (generic) | yes | — | Shown on HDC as "5203 Center Blvd. Apartments". Same as #23. Duplicate of #56. |
| 50 | EOS | Pronto Housing | source listings page (generic) | yes | — | Present on https://prontohousingrentals.com/listings (32 listings total). "1 unit available", Apply button. 100 West 31st Street, 1 bed, 40% AMI, $724.50/mo. |
| 51 | Bergen Saratoga | Pronto Housing | source listings page (generic) | yes | — | Same page as #50. "1 unit available", Apply. 331 Saratoga Ave, Brooklyn, 1 bed, 50% AMI, $764.37/mo. |
| 52 | The Greenpoint | Pronto Housing | source listings page (generic) | yes | — | Same page as #50. "1 unit available", Apply. 23 India St, Brooklyn, Studio, 60% AMI, $1,021.00/mo. |
| 53 | Walkers Paradise - Corona | Pronto Housing | source listings page (generic) | yes | — | Shown as "Walkers Paradise Corona Queens", Queens, NY 11368. Same page as #50. "1 unit available", Apply. 1 bed, $4,500.00/mo. |
| 54 | Waterside Plaza | Pronto Housing | source listings page (generic) | yes | — | Same page as #50. "5 offerings · 12 units available", "Apply by: 8/9/2027", Apply. 10 Waterside Plz, from Studio 130% AMI $2,428.00/mo. |
| 55 | Eastchester Heights | Pronto Housing | source listings page (generic) | yes | — | Same page as #50. "12 offerings · 50 units available", Apply. 3459 Corsa Avenue, Bronx, from Studio 55% AMI $983.10–$1,039.32/mo. |
| 56 | 5203 Center Blvd | TF Cornerstone | source page (generic) | yes | — | Listed under "Available Re-Rentals". "Request Application." "For current availability, visit our on-site leasing office at 5203 Center Blvd." No rent, unit count, or deadline shown. Duplicate of #49. |
| 57 | 5241 Center Blvd | TF Cornerstone | source page (generic) | yes | — | Listed under "Available Re-Rentals". "Request Application." Note: the 5241 card says to visit the leasing office at 5203 Center Blvd in Long Island City (the 5203 address, not 5241). No rent, unit count, or deadline shown. Duplicate of #43. |
| 58 | 505 W 37th St | TF Cornerstone | source page (generic) | yes | — | Listed under "Available Re-Rentals". "Request Application." "For current availability, visit our on-site leasing office at 505 W 37th St." No rent, unit count, or deadline shown. |
| 59 | 810 Fulton LLC | MHANY | unit page | yes | https://www.mutualhousingny.org/810-fulton-475-clermont-avenue | "AVAILABLE UNITS AND INCOME REQUIREMENTS", "Applications will be processed in order they are received". 60% and 130% AMI units; Studio $2,370–$2,520, 4 units available. "DOWNLOAD APPLICATION." |

## Duplicates

- **5203 Center Blvd** — card #49 (HDC) and card #56 (TF Cornerstone) are the same building/address (5203 Center Blvd, Long Island City). Both source pages list it as available.
- **5241 Center Blvd** — card #43 (HDC) and card #57 (TF Cornerstone) are the same building/address (5241 Center Blvd, Long Island City). Both source pages list it as available.
- Not duplicates, but look-alikes: ONE FLUSHING (#39, 133-37 41st Ave) vs ONE FLUSHING SENIOR (#42, 133-45 41st Ave, 62+); OCEANHILL I (#34) vs OCEANHILL II (#33) share the address 1716 St Marks Ave but are separate phase listings on HDC; Nehemiah Spring Creek Phase 4B1 / 4B-2 / 4C (#25/#32/#29) are separate phases.

## Not done / blocked

- Livonia Commons (#2) sits on page 2 of the Pronto listings (32 listings, 2 pages); it was missed in the first Pronto pass, which only reported the six names asked for, and was confirmed on a follow-up check at 11:50 AM EST.
- HDC "yes" calls rest on the unit being listed among the 27 current re-rentals with a "View Advertisement" button; the HDC list page shows no explicit "available now" wording and no deadlines for any card, so per-card availability was not independently confirmed beyond list membership. To confirm a single HDC unit, its "View Advertisement" detail page would need to be opened.
- TF Cornerstone "yes" calls rest on the buildings being listed under the page's "Available Re-Rentals" heading; the page itself says to visit the on-site leasing office "for current availability" and shows no rents, unit counts, or deadlines.
- For iAfford #13 (1420 Stebbins, Unit 3A) and #14 (The Garrison, Unit 1A), the requested unit number is not named on the unit page (both pages list the building as multiple units); the buildings themselves show available units.
- No screenshots were needed: nothing confusing was found beyond the items above, which are described in the table. No login, form submission, application, or CAPTCHA was used at any point.
