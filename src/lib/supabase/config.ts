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

export interface AuthConfig {
  url: string;
  key: string;
  project: "dev" | "prod";
}

export function authConfig(env: Record<string, string | undefined> = process.env): AuthConfig | null {
  const vercelEnv = env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV;
  if (vercelEnv === "production") {
    if (env.NEXT_PUBLIC_AUTH_DISABLED === "1") return null; // kill switch
    return { url: env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? PROD.url, key: env.NEXT_PUBLIC_AUTH_SUPABASE_KEY ?? PROD.key, project: "prod" };
  }
  return { url: env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? DEV.url, key: env.NEXT_PUBLIC_AUTH_SUPABASE_KEY ?? DEV.key, project: "dev" };
}
