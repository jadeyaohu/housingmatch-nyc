# Property image release candidate

Founder decision: show the 30 technically and visually approved images only after their usage-rights release gate is satisfied. Current source: Issue #18 comment 6902708531. No actual property assets are included in this candidate; `property-assets.json` remains empty and review pixels remain outside the repository.

`src/lib/photos/property-release.json` records the 30 reviewed listing IDs. `usageRightsRelease` is intentionally null. Both visual inclusion and a nonempty release evidence reference with a nonfuture ISO review timestamp are required before the application exposes catalog photos, including explicitly supplied media. Recording release evidence is a reviewed source change, not a user-facing toggle. After the gate is actually satisfied, import only the reviewed, identity-matched assets and retain every original source URL, credit, permission reference, review date and checksum. Do not change the founder assertion into a claim of written permission.

hc-7625 remains excluded: the mapped exterior image is 282×272, below the existing 400×300 minimum. Larger official images are architectural drawings/floor plans. hc-7338 remains excluded pending specific-building identity resolution within the multi-address lottery. Neither exclusion can be overridden by filling the batch rights release alone.

Cards, details, homepage and image-load failures share the same original neutral architectural graphic. English: “Illustrative image — not an actual property photo”. Chinese: “建筑示意图 — 非实际房源照片”. Actual listings do not use the archived stock pool. Property-photo provenance remains available on `/photo-credits` only for released catalog images. Released actual images are described as NYC property media, not generic NYC examples.

Validation: 396 unit tests in 56 files, including 15 photo unit tests (including pending/approved/invalid/future release evidence and excluded IDs), targeted lint, TypeScript and production build pass; browser assertions cover English/Chinese, 390px/1440px, listing cards and hc-7599/hc-7625/hc-7338 detail pages (4 browser cases pass with real checked-in data via `playwright.property-media.config.ts`). Record final outcomes in Issue #18 and request Muse QA against the exact candidate SHA. Automated assertions do not substitute for Muse's hosted review or grant image usage rights.

No merge, production deployment/configuration, database write or live payment activation is part of this candidate.
