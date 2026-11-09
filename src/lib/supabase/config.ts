// Which Supabase project handles sign-in, per environment.
//
// Preview and local builds use the DEV project (housing-navigator-dev), which holds only test
// accounts. Production uses the PROD project (housingmatch-prod, created 2026-11-09 with founder
// approval). The two never mix. Publishable keys are public by design; row-level security
// protects the data.

const DEV = {
  url: "https://aqjdfeqorlanwewbhidm.supabase.co",
  key: "sb_publishable_hSFTfN-FhGBCfGLFAqKqtQ_D8y9B5To",
};

const PROD = {
  url: "https://ldootzmoeuxarukxctxk.supabase.co",
  key: "sb_publishable_QgGXKudlo6KgdHdRABAqtw_mRwJU2JU",
};

// "Continue with Google" is shown only once the Google provider is switched on in that
// Supabase project (Authentication → Sign In / Providers → Google). Flip the flag here, or set
// NEXT_PUBLIC_GOOGLE_AUTH=1 / =0 to override per deployment.
const GOOGLE_ENABLED = { dev: true, prod: false }; // dev on for Muse T009 setup + test; prod after founder approval

// Email magic links need custom SMTP (domain + Resend) to reach real users; Supabase's built-in
// mailer only delivers to team members. Off in Production until that is set up
// (NEXT_PUBLIC_EMAIL_AUTH=1 / =0 overrides).
const EMAIL_ENABLED = { dev: true, prod: false };

export interface AuthConfig {
  url: string;
  key: string;
  project: "dev" | "prod";
  google: boolean;
  email: boolean;
}

function emailOn(env: Record<string, string | undefined>, project: "dev" | "prod"): boolean {
  const o = env.NEXT_PUBLIC_EMAIL_AUTH;
  if (o === "1") return true;
  if (o === "0") return false;
  return EMAIL_ENABLED[project];
}

function googleOn(env: Record<string, string | undefined>, project: "dev" | "prod"): boolean {
  const o = env.NEXT_PUBLIC_GOOGLE_AUTH;
  if (o === "1") return true;
  if (o === "0") return false;
  return GOOGLE_ENABLED[project];
}

export function authConfig(env: Record<string, string | undefined> = process.env): AuthConfig | null {
  const vercelEnv = env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV;
  if (vercelEnv === "production") {
    if (env.NEXT_PUBLIC_AUTH_DISABLED === "1") return null; // kill switch
    const google = googleOn(env, "prod");
    const email = emailOn(env, "prod");
    // No way to sign in yet → behave as if accounts don't exist (full results, no sign-up gate).
    if (!google && !email) return null;
    return { url: env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? PROD.url, key: env.NEXT_PUBLIC_AUTH_SUPABASE_KEY ?? PROD.key, project: "prod", google, email };
  }
  return { url: env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? DEV.url, key: env.NEXT_PUBLIC_AUTH_SUPABASE_KEY ?? DEV.key, project: "dev", google: googleOn(env, "dev"), email: emailOn(env, "dev") };
}
