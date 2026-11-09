# T009: Set up "Continue with Google" sign-in
priority: high · created: 2026-11-09 · do right after T007 (T007 sets the redirect URLs this test needs)

The founder approved this in chat on 2026-11-09. Use the founder's own Google account (pangfangdan@gmail.com) in the browser. Nothing here costs money. If any screen asks for a credit card or for billing, **stop** and report it.

## SECRET RULE: read before you start
The **client secret** must go **only** into the two Supabase screens in step 4:
- never into GitHub, a result file, a screenshot, notes, or chat;
- blur or crop it out of every screenshot.

The **client ID** is not secret. Please write it in your result.

## 1. Create the Google Cloud project
Go to https://console.cloud.google.com. Click the project picker at the top left → **New project**.
- Name: `HousingMatch NYC`
- No organization
- Create it, then make sure it is the selected project.

## 2. Set up the consent screen
Left menu: **Google Auth Platform** (older name: "APIs & Services → OAuth consent screen"). Click **Get started**.
- App name: `HousingMatch NYC`
- User support email: pangfangdan@gmail.com
- Audience: **External**
- Contact email: pangfangdan@gmail.com
- Agree to the Google API policy and create.

Leave the publishing status as **Testing** for now; do not publish. Under **Audience → Test users**, add `pangfangdan@gmail.com`.

Scopes: add nothing. The defaults (email, profile, openid) are all we need.

## 3. Create the OAuth client
Left menu: **Clients** → **Create client**.
- Application type: **Web application**
- Name: `HousingMatch Supabase`
- Authorized JavaScript origins: leave empty.
- **Authorized redirect URIs:** add exactly these two:
  ```
  https://aqjdfeqorlanwewbhidm.supabase.co/auth/v1/callback
  https://ldootzmoeuxarukxctxk.supabase.co/auth/v1/callback
  ```
- Create. Keep the dialog with the **Client ID** and **Client secret** open for step 4.

## 4. Turn Google on in both Supabase projects
Go to https://supabase.com/dashboard (sign in with GitHub). Do this for **housing-navigator-dev** and then for **housingmatch-prod**:
1. Open **Authentication → Sign In / Providers → Google**.
2. Enable it and paste the Client ID and Client secret.
3. Leave everything else as it is and **Save**.

Do **not** touch the project "House of bounce".

## 5. Test on the Preview (not Production)
Preview: https://housingmatch-nyc-git-milestone-2-quiz-yao-s-projects16.vercel.app/signup. Use Vercel login via GitHub, as in T006.
1. Phone size 390 × 844. You should see a **Continue with Google** button above the email box. Screenshot it in EN and 中文.
2. Tap it and sign in with pangfangdan@gmail.com. Write down exactly what the Google screen says. Screenshot it, cropping any personal info except the app or site name.
3. After Google, where do you land? Is "My account" / "我的账号" visible in the header? Screenshot it.
4. Open /account and sign out. Did that work?
5. Then do the quiz with this **made-up** household: anywhere / any size / no limit / 2 people / 50000 / voucher No / none.
   - Since you're signed in, do you get the full results directly?
   - Do **not** tick the "save my profile" consent box. We don't store anything for this test.

## Result
Write to `agents/claude-inbox/T009-result.md`. Include:
- the Client ID;
- confirmation that both Supabase projects show Google enabled;
- the results of each step in 5.

Remember the secret rule.
