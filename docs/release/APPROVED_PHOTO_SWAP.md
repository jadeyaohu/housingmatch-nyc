# Approved Pexels/Unsplash swap — source delivery acceptance blocked in this cloud

Authoritative founder brief: Issue18 comment6837301662. Scope: photography only. Starting head63f6fab already removed1911 images and used an interim32-image Commons pool; this increment replaces that interim pool with the exact approved sources, not another substitute set. Navigation, matching, account/saves, consultation, pricing, Gemini and Stripe code are unchanged.

## Nine considered; eight selected; one excluded

`src/lib/photos/manifest.json` records photographer, source photo page, license URL, Muse verification date2026-11-12 and approved-brief evidence per source. Permission verification is based on Muse's explicit per-file/free-source review in the founder-approved brief; this cloud has not independently fetched the source pages successfully. Copy of the brief is retained in `photo-evidence/approved-pexels-unsplash/`.

Selected: Clem Geiss/Unsplash, Paulo Veloso/Pexels, Getsy Aguayo/Pexels, Centosfotos/Pexels, Sasha Zilov/Pexels, Brett A/Pexels, Richard Harris/Pexels, Clay LeConey/Unsplash. **Excluded: Dany Goldraij/Pexels31666687**, because the possible luxury-condominium association could imply an affordable-housing connection. This is a suitability exclusion, not a claim its license is invalid. No request to that source is supported by the image endpoint.

Manhattan uses illustrative high-rises; Brooklyn uses brownstone/street examples. Bronx/Queens use generic NYC examples, never relabeled as borough-confirmed. Clem's source page confirms NYC only, so its provenance says generic NYC, not confirmed Manhattan. Clay confirms Manhattan; Getsy/Centos confirm Brooklyn. Other source records retain NYC rather than inferring a borough. The32 current primary covers are balanced at4 uses of each selected image. Detail galleries show3 distinct compatible examples. Clem is the selected hero; classic entrances are not called modern lobbies.

Every photograph retains the exact EN/ZH representative label, photographer and source/license link. Card aspect4:3; detail/hero16:9; enlarged image uses intrinsic sizing/max viewport height rather than a fixed panoramic letterbox. Loading/error fallback is our original illustration and explicitly says the approved photo is unavailable. The old interim Commons assets are removed from the active public directory; historical reports/screenshots remain historical evidence only.

## Concrete delivery paths

- Local self-hosted import: `scripts/import-approved-photos.ts` fetches only the approved catalog URLs, bounds redirects/time/body, decodes the image, checks usable dimensions, resizes/converts WebP and records dimensions/hash/download date. Staging is outside public assets; the local catalog changes only after all eight downloads succeed. Actual visual inspection remains required; a downloader does not automatically certify photo content.
- Preview delivery before local bundling: `/api/representative-photos/[id]` only recognizes the eight fixed IDs, never a user URL. It downloads, decodes/validates dimensions, optimizes to WebP and caches the real source bytes; concurrent loads coalesce and failures back off. Redirect destinations are restricted to the approved image origins; cookies/referrers are never forwarded. Non-images, unknown/luxury IDs, oversized/invalid pixels and upstream failures fail closed. A503 is not reported as a successful photograph. Browser fallback is original art, not another unapproved stock image.
- The existing `next/image` layer provides responsive delivery and fixed layout geometry. Source downloads contain no applicant data or credentials; no paid API, account or key is required. No production setting or deployment is changed by this code.

## Exact blocker and current evidence

This cloud's enforced policy still only permits GitHub/package hosts. A fresh request to the approved Pexels CDN failed **before the source**: `curl(56) CONNECT tunnel failed,response403`, `HTTP/1.1 403 Forbidden`, `server:envoy`. The correctly proxied Node importer also failed without producing a single optimized asset; `local-assets.json` remains empty. **Eight sources are wired; zero approved images have been downloaded/visually verified in this cloud.** Runtime Preview fetching is implemented but is not evidence that the deployed source URLs actually respond.

A restricted network draft was successfully saved, preserving prior hosts and adding only `pexels.com`, `www.pexels.com`, `images.pexels.com`, `unsplash.com`, `images.unsplash.com`. Tool response: `status:saved`, `requires_publish:true`. This does **not** apply/publish the network policy. Jade must review/save those environment settings and publish the environment; no additional photo selection/approval is needed and no credentials should be supplied. After application, refresh environment status before retrying a fresh source request.

```sh
# In the cloud, preserve the inherited proxy/CA; Node24 uses it explicitly.
NODE_USE_ENV_PROXY=1 npx tsx scripts/import-approved-photos.ts
```

Then inspect each downloaded image at card/detail/390px, reject wrong/placeholder pixels, commit the optimized assets/catalog and capture actual-photo screenshots. Neither waiting nor green fixture tests establishes source acceptance.

## Tests and screenshot honesty

Unit tests cover exact8-source/excluded-luxury policy, balanced covers/three-photo galleries, local hash evidence when present, redirect/credential isolation, bounds/errors, decode rejection and concurrent caching. Synthetic Chromium uses a PNG labeled **TEST FIXTURE—NOT AN APPROVED PHOTOGRAPH**, with response header `X-Photo-Evidence:synthetic-contract-fixture-not-approved-pixels`. It tests layout, navigation, labels and image-delivery mechanics without bypassing blocked domains. Production rejects this fixture path mode.

Such tests/screenshots are **contract/layout fixtures, not approval-photo download or visual verification**. The requested actual Pexels/Unsplash homepage/card/detail/390px photographs and screenshots remain an acceptance blocker until real source delivery is observed. Muse may verify the exact protected Preview through authorized SSO and report which of the8 sources actually render; never disable Deployment Protection or count fallbacks as photographs.

No Stripe/Gemini/Auth work, listing/deadline edits, production migration, merge, live payment or secret changes in this increment. Crosswalk was also checked on the user's request as Codex1111-4078-9799-8911: no Crosswalk tool is exposed, so pinned rules/files/taskitxuxa could not be read; no account/task created.
