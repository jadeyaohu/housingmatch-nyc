# Actual listing photo import — blocked before download

Authority: founder task, Issue18 #6888657531, #6888732414 and Muse mapping #6888793154. Existing branch feat/beta-integration; no Production merge/deploy/database change.

## Prepared

- Added `a806-housingconnectapi.nyc.gov` to `sourceHosts`, retaining Housing Connect and both Settle hosts. The importer already calls `downloadApprovedPhoto(row.imageUrl, fetch, sourceHosts)`, so its redirect/download validator receives the new CDN grant. The archived Pexels/Unsplash downloader defaults remain unchanged.
- Regression tests validate CDN mapping schema and downloader host propagation with synthetic responses, including rejection of an unapproved host. Nine targeted tests and ESLint pass. Tests are not real photo download/identity/visual verification.
- Saved restricted Cloud network draft preserves EVERY prior host, including Pexels/Unsplash, and contains housingconnect.nyc.gov, a806-housingconnectapi.nyc.gov, settlenyc.com and www.settlenyc.com. Required hosts read back successfully; removed prior hosts:0.
- Added `objects.githubusercontent.com` to that draft because authenticated retrieval of Muse's GitHub attachment redirects there and is currently denied. Existing hosts retained again. No presigned attachment URL or credential is recorded here.

## Exact blocker

The draft save returns `status:saved`, `requires_publish:true`. Current observed/enforced runtime remains revision1, without the requested photo domains. A fresh CDN probe for the founder-provided hc-7726 image fails before origin: curl56, CONNECT tunnel failed,response403 / Envoy403. **Stopped photo requests as instructed; importer not run against a known denied destination.** No bypass attempted.

Direct and authenticated retrieval of Muse's mapping attachment are unavailable; the authenticated request redirects to objects.githubusercontent.com and is denied. Its JSON was not obtained or independently verified. Do not rebuild or invent its29 rows; resume with the supplied attachment after network publication takes effect.

## Coverage and honest counts

Checked-in data contains184 rows with status=open:38 HC IDs and146 other IDs. Current property-assets.json remains `[]`.

- Actual photos imported: **0**.
- Actual source pages independently identity-checked this run: **0**.
- Photos visually inspected this run: **0**.
- Listings conclusively determined to lack photos: **not determined** due blocked access.

Muse reports29 mapped HC lotteries; unresolved HC IDs: hc-7728,hc-7673,hc-7676,hc-7718,hc-7670,hc-7693,hc-7667,hc-7630,hc-7338. These are unresolved, NOT confirmed photo-less. The146 non-HC entries lack numeric HC lottery IDs; the current importer cannot represent them without an appropriate real-provider identity extension. Do not invent numeric IDs or use unrelated photos. Muse also flags stale open statuses separately; no listing status/data refresh was performed in this task.

## Permission reference and resume

Every future actual photo record must retain this EXACT reference, without upgrading it to written/independently verified permission:

> Founder-asserted verbal authorization: HPD phone call + Settle NYC developer conversation, 2026-11-14; no written document on file.

Founder should review/publish the saved Cloud network draft. This is Cloud environment publication, not a Production website deployment. Verify fresh runtime status/access afterward; if this runtime cannot inherit it, resume one new task from the pushed PR19 head after this run ends, preserving existing work. Fetch and verify Muse's attached mapping against source pages and current public listings, resolve remaining identities without fabricated IDs, import only confirmed photos and visually inspect EVERY image before committing optimized assets/catalog. No new photograph approval or duplicate engineering job needed.
