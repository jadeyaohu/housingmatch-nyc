---
## FOUNDER APPROVED — P0 photo swap: replace 1911 set with contemporary Pexels/Unsplash photos (2026-11-12)

**Decision (founder, 2026-11-12 ~5:08 PM ET): APPROVED.** Replace the 3-photo 1911 NYPL set with the contemporary generic Pexels/Unsplash illustrations below. Free licences only; no purchase, no shoot. Codex to implement from this brief on the Draft PR #19 branch (Preview only; no production deploy). QA will re-verify each image at card/detail/390px after the next deployment.

Context: QA on head 95ce601 (Issue #18 comment https://github.com/jadeyaohu/housingmatch-nyc/issues/18#issuecomment-6834467154) confirmed only 3 distinct sepia 1911 NYPL Manhattan photos across all 32 listings, shown for Brooklyn/Bronx/Queens too, and no homepage hero. Dated imagery is the named P0.

### Hard rights rules (do not break these)
Source: photo-rights audit ily81v, verified 2026-11-11.
- NO real listing photo has verifiable reuse permission. Do NOT use Housing Connect, MyHousingSearch/HCR, or NYCHDC listing photos (all rights reserved).
- Only generic, per-file verified images may be used, clearly labelled as illustrations — never as a real listing's main photo, never implying "this is this building".
- Pexels licence verified direct 2026-11-11 (https://www.pexels.com/license/): free use, attribution not required (appreciated), modification allowed. Restrictions: no identifiable person in a bad/offensive light; no selling unaltered copies; no implying endorsement; no redistributing/selling on other stock-photo/wallpaper platforms; no trademark use.
- Unsplash licence verified direct 2026-11-11 (https://unsplash.com/license): free commercial/non-commercial, no permission/attribution required (appreciated). Prohibited: selling unmodified; compiling to replicate a competing service.
- Wikimedia Commons: per-file CC BY/CC0 only, attribution kept where required.
- Rejected: Pinterest, Vecteezy, CityRealty, real-estate listing sites, renderings — unclear/commercial/all-rights-reserved provenance. Do not use them.
- Every image used must be logged per file: source page URL, photographer/author, licence, date verified. Prefer a downloaded, hosted copy with the licence log over hotlinking.

### What to build (minimum viable fix before Nov 14)
1. Replace the 3-photo set with the 9 distinct contemporary photos below (each repeats ~3–4 times across 32 listings, vs. 3 photos across all 32 now). A second sourcing pass toward 12 would be better, but 9 is the verified set available today.
2. Borough-appropriate mapping (illustration only, still labelled representative): Manhattan — modern mid/high-rise apartment exterior, glass/brick, street-level entrance. Brooklyn — brownstone row houses / tree-lined residential street. Bronx — brick mid-rise apartment building exterior. Queens — low/mid-rise brick apartment building, residential street. Generic fallback — modern apartment facade, no identifiable people, no visible brand/trademark.
3. Homepage hero: add one wide contemporary NYC residential exterior (no people in focus, no trademark) — currently no hero imagery.
4. Keep the honest labelling QA praised: "Representative photo — not this building" + source/provenance (e.g. "Photo: [Photographer] / Pexels — illustration only"), in EN + ZH. Do not drop the NYPL provenance style; extend it to the new sources.
5. Gallery: detail-page gallery should draw from the same per-borough pool (3 photos per listing, drawn from different images, not the same 3 for every listing). Fix lightbox letterboxing (P2 from QA).
6. Technical: responsive crop (card 4:3, detail 16:9, mobile 390px), no layout shift (width/height set), lazy-load below the fold, alt text "Illustrative exterior photo of a New York City apartment building — not the listed building".

### Candidate photos — 9 verified, Pexels/Unsplash only
All verified live on their individual photo pages 2026-11-12, 3:09–3:13 PM ET; all listed as free on their pages. None is presented on its page as a specific Housing Connect / affordable-housing lottery building. Give attribution in the demo even though the licences do not require it. Label every use "Representative photo — not this building".
1. **Dany Goldraij — Pexels** — https://www.pexels.com/photo/contemporary-architectural-building-facade-31666687/ — Modern residential building, wavy facade, glass balconies; New York City, Apr 17, 2025. Suggested: Manhattan (modern). CAUTION — deprioritise: related images identify this facade as 520 West 28th by Zaha Hadid, a luxury condo. Use only as a generic modern-exterior illustration, never as if it were an affordable-housing building; if in doubt, drop it and use #2/#9 for Manhattan.
2. **Clem Geiss — Unsplash** — https://unsplash.com/photos/a-tall-building-with-many-windows-34OpCZc5QlA — Low-angle tall grey high-rise apartment building, many windows and balconies; listed location New York, NY, USA, published May 8, 2022. Suggested: generic / Manhattan high-rise. Good hero candidate.
3. **Paulo Veloso — Pexels** — https://www.pexels.com/photo/charming-brownstone-row-in-new-york-city-29419908/ — Row of classic brownstones on a tree-lined NYC street; Nov 15, 2024. Suggested: Brooklyn.
4. **Getsy Aguayo — Pexels** — https://www.pexels.com/photo/building-with-windows-20184842/ — Colourful row of historic brownstone facades with stoops, clear day; New York City, Feb 8, 2024, tagged Brooklyn. Suggested: Brooklyn.
5. **Centosfotos — Pexels** — https://www.pexels.com/photo/city-street-and-apartments-facade-in-brooklyn-new-york-usa-6408235/ — Lively Brooklyn street, historic buildings, trees, brownstones on Clark St, crosswalk foreground; Jan 5, 2021. Suggested: Brooklyn (Brooklyn Heights, Clark St).
6. **Sasha Zilov — Pexels** — https://www.pexels.com/photo/quaint-new-york-street-lined-with-brownstones-40959004/ — NYC street with classic brownstones and parked cars in autumn; New York, NY, page date Nov 11, 2026. Suggested: generic NYC / Brooklyn.
7. **Brett A — Pexels** — https://www.pexels.com/photo/historic-brick-building-entrance-in-new-york-37785064/ — Elegant entrance of a historic brick building, warm lighting, New York; May 26, 2026. Suggested: generic NYC (historic brick entrance).
8. **Richard Harris — Pexels** — https://www.pexels.com/photo/elegant-entrance-with-black-door-and-potted-plants-31225350/ — Classy entrance, black door (No. 159), potted plants; New York, Mar 18, 2025. Suggested: generic NYC (townhouse/apartment entrance).
9. **Clay LeConey — Unsplash** — https://unsplash.com/photos/brown-concrete-building-under-blue-sky-during-daytime-hzPQ8QVqNDU — Upper floors of a brown brick Manhattan apartment building with a rooftop water tower, blue sky; listed location Manhattan, New York, NY, USA, published Jan 10, 2021. Suggested: Manhattan. Good card/detail candidate.

### Gaps to be honest about
- No verified Bronx or Queens photo: searches returned generic NYC results with no borough confirmation on the photo pages checked, so none was assigned to the Bronx or Queens. Use the generic Manhattan/Brooklyn pool for those listings (still labelled representative) until a borough-confirmed photo is found — do not mislabel a Brooklyn photo as Bronx/Queens.
- No true modern glass lobby entrance verifiably in NYC was found — #7/#8 are classic/historic entrances. Treat them as classic entrances, not modern lobbies; do not caption them as a modern lobby.
- 9 photos, not 10–12: with 32 listings, each photo will still repeat ~3–4 times. A second sourcing pass is needed for a truly non-repetitive set.
- A few images rendered as placeholders in browser screenshots during verification, though title/photographer/date/location were verified in page text — Codex must visually check each at card/detail/390px before merge.

### Verification checklist (per image, before merge)
- Photo page is on pexels.com, unsplash.com, or commons.wikimedia.org — URL recorded
- Photographer/author recorded; CC BY attribution kept if required
- Photo is contemporary colour photography (not sepia/historic, not a rendering)
- No identifiable person in a bad/offensive light; no trademark/brand as the subject
- Labelled "Representative photo — not this building" in EN + ZH
- Loads at card + detail + 390px mobile, no broken image, no layout shift

### Out of scope for this swap
No Stripe / Gemini / auth work — those are separate launch gates (QA: none configured, chat is local simulated FAQ only, no real backend). Do not activate live payments. No change to listing data or deadlines.

Nothing was merged, deployed to production, or paid for. This comment records the founder's approval and hands Codex the implementation brief.
---
