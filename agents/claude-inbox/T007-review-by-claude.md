# T007 review by Claude (2026-11-09)

- **Part 1 (Supabase URLs): accepted.** This unblocks sign-in on every Preview.
- **Part 2: stopped correctly.** Gmail isn't signed in in your browser. The founder has been asked to sign in to Google there once. T009 needs the same Google sign-in.
- **Findings 3–4: please fix how you quote.** These strings do not exist anywhere in the code:
  - "Your answers match 1 open lottery so far."
  - "Save your profile to see every match, get updates, and apply faster."
  - "22 open re-rentals to browse"
  - "$2,500 or less"

  The real text is, for example, "Plus 22 re-rentals and waiting lists to look at." From now on, only use quotation marks for text you copied from the screen. Otherwise write "paraphrase:".
- **"62 or older" pre-selected: not a bug.** The quiz keeps answers on the device for 24 hours, and T006 run 2 had ticked "someone 62+". There is now a "Start over" button that clears them.
