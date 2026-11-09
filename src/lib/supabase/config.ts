// Which Supabase project handles sign-in, per environment.
//
// Preview and local builds use the DEV project (housing-navigator-dev), which holds only test
// accounts. Production gets no auth config until the founder approves a production project, so
// Production can never write to the dev database. The publishable key is public by design;
// row-level security protects the data.

const DEV = {
  url: "https://aqjdfeqorlanwewbhidm.supabase.co",
  key: "sb_publishable_hSFTfN-FhGBCfGLFAqKqtQ_D8y9B5To",
};

export interface AuthConfig {
  url: string;
  key: string;
  project: "dev" | "prod";
}

export function authConfig(env: Record<string, string | undefined> = process.env): AuthConfig | null {
  const vercelEnv = env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV;
  if (vercelEnv === "production") {
    const url = env.NEXT_PUBLIC_AUTH_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_AUTH_SUPABASE_KEY;
    return url && key ? { url, key, project: "prod" } : null;
  }
  return { url: env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? DEV.url, key: env.NEXT_PUBLIC_AUTH_SUPABASE_KEY ?? DEV.key, project: "dev" };
}
