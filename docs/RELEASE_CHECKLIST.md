# Production release checklist: PR #8 + PR #9

Production = `main` → housingmatch-nyc.vercel.app. Nothing below happens without the founder's explicit approval.

## What ships
- **M0:** re-rentals separated from lease-up matches; availability states; per-source publication gate; mobile header fix (#7).
- **M1:** waiting-list lotteries are secondary; community districts come from building data; quality warnings.
- **M2:** landing page, quiz, match-count preview, free account (email link; Google optional), full personalized results.
- **M3:** budget fit and priority groups (community district / NYCHA / city employee or veteran); the ZIP is never stored.
- **M4 (start):** saved homes with deadline states on My account.
- **New page:** listing detail at `/listings/[id]`.

## Before merging (Claude unless noted)
1. **Prod database** `housingmatch-prod` (ldootzmoeuxarukxctxk): apply migrations `0004_profile_priority_groups.sql` and `0005_saved_listings.sql`. These are additive, with no data changes. Re-run the security advisors afterwards. *Without this, saving a profile or a home fails in Production.*
2. **Prod auth URL settings** (Muse task):
   - Site URL `https://housingmatch-nyc.vercel.app`. Use the custom domain instead once it is bought.
   - Redirect URL `https://housingmatch-nyc.vercel.app/**`.
3. **Email sign-in for real users.** Supabase's built-in email reaches team members only.
   - **Option A:** buy the domain (~$10–15/yr, **founder approval: money**), set up Resend with custom SMTP, then turn on sign-up.
   - **Option B:** launch with **Google sign-in only**. This needs T009 done and `GOOGLE_ENABLED.prod = true`. The email box would be hidden in Production until A is done.
4. **Google sign-in** (if used): T009 must be complete, with the provider enabled in the prod project. Publish the Google consent screen (no review is needed for email/profile). Before a custom domain, the consent screen shows the supabase.co address.
5. **Merge order:** PR #8 → main, then retarget PR #9 to main and merge. Close the stale PRs #2, #3, #4 and #6.
6. **Kill switch.** If sign-in misbehaves, set `NEXT_PUBLIC_AUTH_DISABLED=1` in Vercel Production env. This needs Vercel access: founder re-authorizes the Vercel connector, or Muse does it in the dashboard. The quiz then shows full results without accounts.

## After merging: verify on Production (Muse)
- Home → quiz → preview counts → sign-in → full results → save a home → My account → delete profile → sign out.
- Phone 390 × 844 and 320 × 640, in EN and 中文.
- Re-rentals stay out of the main counts. Waiting lists show as secondary.
- `/listings/hc-<an open lottery>` opens, and its official link goes to the right Housing Connect page.

## Rollback
Revert the merge commit on `main`; Vercel redeploys the previous version. The database migrations are additive, so they can stay in place.

## Founder decisions needed
- [ ] Approve the release (PR #8 + #9 to Production).
- [ ] Sign-up at launch: **A** (buy the domain + email) or **B** (Google only first).
- [ ] (Later) Supabase Pro for the prod project (~$25/month: no auto-pause, daily backups) once there are real users.
