// Explicit per-environment configuration only. Never fall back to an embedded live/dev project.
export interface AuthConfig { url: string; key: string; project: "dev" | "prod"; google: boolean; email: boolean }
export function authConfig(env: Record<string, string | undefined> = process.env): AuthConfig | null {
  if (env.NEXT_PUBLIC_AUTH_ENABLED !== "true" || env.NEXT_PUBLIC_AUTH_DISABLED === "1") return null;
  const url = env.NEXT_PUBLIC_AUTH_SUPABASE_URL, key = env.NEXT_PUBLIC_AUTH_SUPABASE_KEY;
  if (!url || !key) return null;
  try { const u = new URL(url); if (u.protocol !== "https:" && !(u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname))) return null; } catch { return null; }
  const google = env.NEXT_PUBLIC_GOOGLE_AUTH === "1", email = env.NEXT_PUBLIC_EMAIL_AUTH === "1";
  if (!google && !email) return null;
  return { url, key, project: (env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV) === "production" ? "prod" : "dev", google, email };
}
