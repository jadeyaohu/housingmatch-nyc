# T007 — Dev Supabase: sign-in link settings, then a real sign-in test
priority: high · created: 2026-11-09 · do after T006
The Founder authorized changes to the **dev** project only. Do **not** touch the project named "House of bounce".

### Part 1 — settings (dev project only)
1. Go to https://supabase.com/dashboard/project/aqjdfeqorlanwewbhidm/auth/url-configuration (project **housing-navigator-dev**). Sign in with GitHub if asked.
2. **Site URL:** set to `https://housingmatch-nyc-git-milestone-2-quiz-yao-s-projects16.vercel.app` → Save.
3. **Redirect URLs:** add these three (one at a time) → Save:
   - `https://housingmatch-nyc-git-*-yao-s-projects16.vercel.app/**`
   - `http://localhost:3000/**`
   - `http://localhost:3300/**`
4. Screenshot the page after saving.

### Part 2 — sign-in test on the Preview
1. Open https://housingmatch-nyc-git-milestone-2-quiz-yao-s-projects16.vercel.app/quiz (Vercel login with GitHub if asked). Do the quiz with the made-up household from T006.
2. On the preview screen, tap "Create my free account". Enter the Founder's email **pangfangdan@gmail.com** and tap "Email me a sign-in link".
3. If you can open that Gmail inbox in the same browser: open the newest email from Supabase and tap the sign-in link **in the same browser**. If you can't open the inbox, stop here and say so.
4. After sign-in you should land on full results. Tick the consent box and tap "Save my profile". Then open "My account": does it show the made-up household?
5. Tap "Delete my saved profile" → confirm → the profile should be gone. Then "Sign out".

Report each step's result, exact on-screen text for any error, and screenshots (settings page, email received — sender + subject only, full results after sign-in, My account before and after delete).
