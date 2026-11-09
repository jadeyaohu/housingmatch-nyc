# T003 result

status: done

finished_at: 2026-11-09 12:05 PM, New York

## Summary

1. robots.txt: there is no file. Both a direct fetch (HTTP 404) and the live browser ("404 - File or directory not found") agree, so there is no text to copy.
2. Terms of Use: Housing Connect has no terms page of its own; its footer "Terms of Use" link goes to the citywide nyc.gov Terms of Use. That page contains no sentence about robots, scraping, crawling, data mining, automated access, or commercial use. The closest language is the intellectual-property clause quoted below.
3. Official API/feed: no official API or data feed for Housing Connect lotteries was found besides the two NYC Open Data datasets (vy5i-a666, nibs-na6y), which are served through the Socrata API. No Housing Connect API is listed on the City's API developer portal.
4. Detail pages 7662, 7667, 7730: all three show the same core sections (deadline, income/household ranges, Details, Amenities, Available Units & Requirements table, Map, Photos, Who Should Apply, How to Apply). Only 7730 shows a Preferences section, set-aside percentages, total/available unit counts, and an exact deadline time; 7662 and 7667 were read from text extracts, so those fields may be under-reported there (see "Not done / blocked").

## Findings

### 1. robots.txt — no file exists (not captured)

- URL checked: https://housingconnect.nyc.gov/robots.txt
- Direct fetch returned HTTP 404. Live browser showed page title "404 - File or directory not found", heading "Server Error", text "404 - File or directory not found." / "The resource you are looking for might have been removed, had its name changed, or is temporarily unavailable."
- There is no robots.txt text to copy. No User-agent / Disallow rules exist for this host.

### 2. Terms of Use — citywide nyc.gov terms; no automated-access language

- Housing Connect footer (homepage and detail pages) has a "Terms of Use" link. On the homepage it points to https://www1.nyc.gov/home/terms-of-use.page, which redirects to https://www.nyc.gov/main/terms-of-use ("Terms of Use - nyc.gov"). No Housing Connect-specific terms page was found; the site uses the citywide nyc.gov Terms of Use.
- The full live Terms text was searched for "robot", "scraping", "crawl", "data mining", "automated", "commercial", and "bot". No sentence about robots, scraping, crawling, data mining, automated access, or commercial use was found.
- The closest relevant sentence, quoted word for word (Section IV, Intellectual Property): "You may not use, reproduce, display, publish, sell, modify, transmit, distribute, or otherwise use or exploit the Site or the Content, or any portion thereof, without the City's prior written permission."
- Other nearby restrictions (paraphrased, not quoted): Section I.A bars using NYC.gov in a way that could disable, overburden, damage, or impair it or interfere with others' use, bars attempting unauthorized access (including through hacking or password mining), and bars collecting or storing personal data about other users. Section I.A also bars using NYC.gov only for lawful purposes.
- Note: a cached text copy of the same Terms page showed slightly different section order/numbering than the live page (live page sections include VII. Indemnification, VIII. Miscellaneous, IX. DMCA Notice, X. Modifications, XI. Contact Us). Findings above are from the live page at https://www.nyc.gov/main/terms-of-use.
- No screenshots captured (not captured).

### 3. Official API / data feed — only the two known Open Data datasets

- Socrata catalog API query for "housing connect" on data.cityofnewyork.us returned only these two Housing Connect datasets (both last updated 2026-11-02): vy5i-a666 "Advertised Lotteries on Housing Connect by Lottery" and nibs-na6y "Advertised Lotteries on Housing Connect By Building".
- HPD's Open Data page (https://www.nyc.gov/site/hpd/about/open-data.page) lists only those two datasets under its "Housing Connect" heading, describing them as lotteries advertised since July 1, 2020, joinable on Lottery ID.
- The City's API developer portal (https://api-portal.nyc.gov/) features the NYC 311 and Geoclient APIs; no Housing Connect API is listed there, and web search found no documented public Housing Connect API.
- Note (unsure): detail pages load photos from a806-housingconnectapi.nyc.gov, an internal host used by the site. It is not documented as a public API and no endpoint on it was tested.
- The two datasets are available through the standard NYC Open Data (Socrata) API at data.cityofnewyork.us/d/vy5i-a666 and data.cityofnewyork.us/d/nibs-na6y.

### 4. Detail pages — sections and fields shown

Read 2026-11-09 (New York). 7662 and 7667 were read from text extracts; 7730 was read in the live browser. All three pages were public; no login, no "Apply" click.

#### 4a. 7662 — 1 Gouverneur Lane, Manhattan (text extract)

- Header: lottery photo; "Lottery ends in 8 days - Nov 17, 2026"; "1 Gouverneur Lane"; "1 GOUVERNEUR LANE, NEW YORK, NY 10005"; "Eligible Income: $40,526 - $152,700"; "Household Size: 1 - 5".
- In-page navigation tabs: Details, Units, Map, Photos, Who Should Apply, How to Apply.
- Inclusivity statement about residing in neighborhoods of choice.
- Details: building description (Downtown Manhattan, interiors); pet policy (max 2 pets, 50 lbs combined, breed restrictions); "Tenant responsible for electricity including stove. Rent includes water, gas and heat."; "Affordable Housing Program" — anticipated Tax Exemption through the 467-m Program; "No deposits/application fees."
- Amenities: Pet-friendly, Dog park, Dog washing station, Multiple pets allowed, Bike storage lockers, Pedestrian-friendly - Walk Score, Close proximity to Ferry & Water Taxi, Shared laundry room, Washers and dryers in units, Laundry service, Dishwasher in unit, High-end kitchen appliances, High-end countertops and finishes, Energy-efficient appliances, Air-conditioning, Charging outlets with USB ports, Smart controls for heating/cooling, Online options for leasing/paying rent/maintenance requests, Gymnasium, Spa, Yoga/dance studio, Media room, Party room, Community events and classes, Jogging/walking/bike path, Close to schools, Business Center, Children's playroom, Outdoor terrace, Rooftop terrace, Storage, Security cameras, Doorman, On-site resident manager, Concierge, Green space, Package lockers, Elevator, Accessible entrance, Smoke-free.
- Available Units & Requirements table. Columns: Unit Size, (AMI %), Monthly Rent, Units Available, Asset Limit, Household Size, Annual Household Income Minimum – Maximum. Rows: 1 Bedroom 40% AMI $1,056.00, 33 units, asset limit $67,840.00, household 1–3, income $40,526–$47,520 / $54,280 / $61,080; 1 Bedroom 80% AMI $2,234.00, 20 units, asset limit $135,680.00, household 1–3, income $80,915–$95,040 / $108,560 / $122,160; 2 Bedroom $2,664.00, 20 units, asset limit blank in extract, household 2–5, income $97,063–$108,560 / $122,160 / $135,680 / $146,560; Studio 100% AMI $2,643.00, 83 units, asset limit $169,600.00, household 1–2, income $94,423–$118,800 / $135,700; 1 Bedroom $2,823.00, 6 units, asset limit blank in extract, household 1–3, income $101,109–$118,800 / $135,700 / $152,700. (AMI % and asset limit blank on the 2 Bedroom and last 1 Bedroom rows in the extract — rowspan cells, values not repeated.)
- Footnotes: (1) rent may not include all utilities; (2) household size includes everyone who will live there, subject to Occupancy Criteria; (3) income guidelines subject to change; minimum income may not apply to Section 8 / subsidy holders; asset limits apply.
- Map / nearby (as text): schools P.S. 150, PS 397 Spruce Street School, Battery Park City School; subway stations Fulton St, Chambers St, Brooklyn Bridge - City Hall, Canal St, Spring St, Houston St, W 4th St - Washington Sq (Lower/Upper), Christopher St - Sheridan Sq; police, parks (City Hall Park, Battery Park City Parks, Zuccotti Park), hospitals (NewYork-Presbyterian Lower Manhattan Hospital); transit lines 4 5 6 1 2 A C E B D F M. Photos: 6 images.
- Who Should Apply: households meeting the income/household-size requirements may apply; additional selection criteria apply; NYC residents receive a general preference; "Do not submit duplicate applications." / "Only send one application per lottery." / "Do not apply online and also send in a paper application." / "Applicants who submit more than one application may be disqualified."
- How to Apply: "Apply Online" and "Apply by Mail" (not clicked); mail address "1 Gouverneur Lane C/O MGNY Consulting Corp. 109 E 9th St, Storefront, Manhattan, NY 10003".
- Footer: "Governor Kathy Hochul | Mayor Zohran Mamdani | HPD Commissioner Dina Levy" / "Department of Housing Preservation and Development".
- Not shown in the extract (unsure whether absent from the page or just not captured): Preferences section, set-aside percentages, total/available unit counts, exact deadline time.

#### 4b. 7667 — 1333 Broadway Apartments, Brooklyn (text extract)

- Header: lottery photo; "Lottery ends in 18 days - Nov 27, 2026"; "1333 Broadway Apartments"; "1333 BROADWAY, BROOKLYN, NY 11221"; "Eligible Income: $104,949 - $273,520"; "Household Size: 1 - 7".
- Same in-page tabs as 7662 (Details, Units, Map, Photos, Who Should Apply, How to Apply) and same inclusivity statement.
- Details: newly constructed building, 32 affordable apartments; "Tenant is responsible for electricity, including the stove and heat. Hot water is included in the rent."; "Affordable Housing Program" — anticipated Tax Exemption through the 421a-16 Tax Incentive Program; "No deposits/application fees."
- Amenities: Pet-friendly, Garages, Bike storage lockers, Electric car charging stations, Pedestrian-friendly - Walk Score, Bus stop/Public transportation access, Shared laundry room, Dishwasher in unit, High-end kitchen appliances, High-end countertops and finishes, Energy-efficient appliances, Air-conditioning, Smart controls for heating/cooling, High-speed internet, Cable or satellite TV, Gymnasium, Outdoor areas, Close to schools, Outdoor terrace, Rooftop terrace, Security cameras, Valet trash, On-site resident manager, Package lockers, Digital doorman, Intercommunication device, Elevator, Accessible entrance, Smoke-free.
- Available Units & Requirements table, same columns as 7662. Rows (all 130% AMI): Studio $2,950.00, 7 units, asset limit $220,480.00, household 1–2, income $104,949–$154,440 / $176,410; 1 Bedroom $3,250.00, 9 units, household 1–3, income $115,749–$154,440 / $176,410 / $198,510; 2 Bedroom $3,800.00, 10 units, household 2–5, income $136,012–$176,410 / $198,510 / $220,480 / $238,160; 3 Bedroom $4,200.00, 6 units, household 3–7, income $151,166–$198,510 / $220,480 / $238,160 / $255,840 / $273,520. (Asset limit shown only on the Studio row in the extract — rowspan.)
- Same three footnotes as 7662.
- Map / nearby (as text): schools P.S. 116 Elizabeth L Farrell, Success Academy Charter School - Bushwick Elementary, PS 376 Felisa Rincon De Gautier School of Technology; subway stations Kosciuszko St, Myrtle - Wyckoff Aves, Gates Ave, Central Ave, Knickerbocker Ave, Halsey St, Chauncey St, Myrtle Ave, Ralph Ave; police (81st and 83rd Precincts); parks (Saratoga Park, Bushwick Playground, Hope Ballfield); Betances Health Center; transit lines J L Z M A C. Photos: 1 image.
- Who Should Apply and How to Apply: same wording as 7662. Mail address "Tax Solute Consulting c/o 1333 Broadway Apts, 670 Flushing Ave #316, Brooklyn, NY 11206".
- Footer: same officials/HPD line as 7662.
- Not shown in the extract (unsure): Preferences section, set-aside percentages, total/available unit counts, exact deadline time.

#### 4c. 7730 — 1303 Hoe Avenue, Bronx (live browser)

- Header: "NYC Housing Connect", Save, "Apply Online" button (not clicked), "Apply By Mail", "Log In", "Create Account"; "Lottery ends in 18 days"; "Deadline: 11/27/2026, 11:59 PM"; "1303 Hoe Avenue"; "1303 Hoe Ave, Bronx, NY 10459, United States"; "18 Total Units"; "9 Available Units"; "Affordable Housing Program"; "Household Income $53,760 - $138,180"; "Household Size 1 - 5"; inclusivity statement plus reasonable-accommodation phone 212-863-7990, TTY/TDD 212-504-4115.
- Preferences section: Community Board Residents, Municipal Employees, People with Disabilities, Veterans (no percentages shown here).
- Photos: 1 photo, captioned "Exterior rendering of 1303 Hoe Avenue".
- Details: building description (18 affordable apartments, six-story, Crotona Park East; community laundry and bicycle room, community space, landscaped courtyard, rooftop recreation space, gym, rooftop terrace, community room, 7 parking spaces); "Affordable Housing Program" — constructed through the Mixed-Income Program of HPD; note that the income limits in the table are per AMI level and per household size.
- Amenities: Community Room, Rooftop Terrace, Laundry Room, Courtyard, Bike Storage, Community Space, Elevator, Shared Laundry Room, Outdoor Space, Shared Roof Deck, Parking, Smoke Free.
- Available Units & Requirements table. Columns: Unit Size, AMI %, Monthly Rent, Units Available, Asset Limit, Household Sizes, Annual Income Minimum - Maximum. Rows: Studio 70% $1,548, 1 unit, asset limit $118,720, household 1–3, income $53,760–$77,210 / $88,270 / $99,260; 1 Bedroom 70% $1,548, 3 units, household 1–4, income $53,760–$77,210 / $88,270 / $99,260 / $110,390; 2 Bedroom 70% $1,819, 3 units, household 2–5, income $61,440–$88,270 / $99,260 / $110,390 / $119,700; Studio 100% $2,222, 2 units, asset limit $170,200, household 1–3, income $76,800–$110,300 / $126,100 / $141,800. (70% AMI and $118,720 asset limit are rowspan cells shared by the first three rows.) Units total 9, matching "9 Available Units".
- Footnotes: (1) rent may not include all utilities; (2) subject to occupancy criteria, household size includes everyone who will live there; (3) income guidelines subject to change; asset limit $118,720 for households up to 70% AMI and $170,200 for up to 100% AMI.
- Locations / Map: map of 1303 Hoe Ave with marker; layer checkboxes Neighborhood, School, Transit; subway lines shown 2, 5, 6, B, D, 4, 6 (6 twice, two stations); no named nearby places or schools listed as text — nearby info shown only as map markers; "Map data © OpenStreetMap contributors".
- Who Should Apply: households meeting the table's income/household-size requirements may apply; additional selection criteria apply; NYC residents receive a general preference. Set-asides: "A percentage of units is set aside for applicants with disabilities: Mobility: 5%, Vision/Hearing: 2%"; "A percentage of units is set aside for applicants in the following groups: Community Board Residents: 50%, Municipal Employees: 5%"; "A percentage of units is set aside for applicants who are: Veterans: 5%". "Section 8 and other housing subsidies and programs accepted. A Housing Choice Voucher holder is not obligated to disclose their status to apply."
- How to Apply: "Application Deadline: 11/27/2026, 11:59 PM"; "The deadline to apply is 11/27/2026, 11:59 PM. After the deadline, applications are selected for review through a lottery process."; "Apply Online" / "Apply by Mail" (not clicked); mail to "Housing Connect, 1303 Hoe Avenue, P.O. Box 2015, New York, NY 10114"; mailed applications must be postmarked by the deadline; one application per development, duplicates may disqualify; help line 212-863-7990 (TTY/TDD 212-504-4115); interviews usually held 6 to 12 months after the deadline; all applicants notified by mail or email.
- Footer: same officials/HPD line; footer links "Home Page", "Terms of Use", "Privacy Policy", "Cookie Policy", "Accessibility", "Language Access", "Language Access Plan"; columns "Open Lotteries" (Rental, Sales, Bronx, Brooklyn, Manhattan, Queens, Staten Island), "About" (About NYC, FAQ, Terms of Use, Learn), "My Account" (My Dashboard, My Applications, My Household).
- Homepage footer (live browser, https://housingconnect.nyc.gov/ redirecting to /PublicWeb/): "Open Lotteries" links are in-page filters (javascript:void()); "About" links: About NYC (/PublicWeb/about), FAQ (/PublicWeb/faq), Terms of Use (https://www1.nyc.gov/home/terms-of-use.page), Learn (/PublicWeb/learn); "My Account": My Dashboard (/PublicWeb/login), My Applications (/PublicWeb/my-applications), My Household (/PublicWeb/my-household). No Privacy Policy or Accessibility link in the homepage dark footer (those appear in the detail-page footer). "Need help?" section: HPD Support, 212-863-7990, Call 311.

#### 4d. Fields on all 3 pages

Name, address, deadline countdown, eligible income range, household size range, in-page tabs (Details, Units, Map, Photos, Who Should Apply, How to Apply), inclusivity statement, Details text, Affordable Housing Program text, Amenities list, Available Units & Requirements table (unit size, AMI %, monthly rent, units available, asset limit, household sizes, income min–max) with the same three footnotes, Map/Locations with transit lines, Photos, Who Should Apply, How to Apply (online + by mail), footer with officials and HPD.

Fields only confirmed on 7730: Preferences section, set-aside percentages (disability 5%/2%, Community Board 50%, Municipal 5%, Veterans 5%), total units (18) and available units (9), exact deadline time (11:59 PM), voucher-acceptance note, interview-timeline text. For 7662/7667 these are "not captured" in the text extracts — unsure whether absent.

## Not done / blocked

- No screenshots were captured for any page in this task (not captured). The live-browser read of 7730, robots.txt, and the homepage footer was done without screenshots; 7662 and 7667 were read from text extracts, not the live-rendered pages.
- 7662/7667 field lists may be incomplete: text extracts do not show Preferences, set-aside percentages, unit totals, or deadline times that the live-rendered 7730 page shows. A live-browser re-read of 7662 and 7667 would settle whether those fields exist there.
- Terms of Use: only the citywide nyc.gov terms were found — there is no Housing Connect-specific terms page, and the terms contain no automated-access language at all. Nothing else was blocked.
