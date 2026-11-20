/**
 * Ingestion gate for /api/events (HN-001).
 *
 * Disabled by default. Enabled only when ANALYTICS_INGEST_ENABLED is exactly "true".
 * On Vercel production (VERCEL_ENV === "production") it additionally requires
 * ANALYTICS_PRODUCTION_APPROVED === "true", so the public write route can never turn on
 * in production just because some other variable (Supabase, Upstash) happens to exist.
 *
 * Env is read per request, but Vercel only applies env changes on (re)deploy.
 */
export type Env = Record<string, string | undefined>;

export type IngestGate =
  | { enabled: false; reason: "flag_off" | "production_not_approved" }
  | { enabled: true };

export function ingestGate(env: Env): IngestGate {
  if (env.ANALYTICS_INGEST_ENABLED !== "true") return { enabled: false, reason: "flag_off" };
  if (env.VERCEL_ENV === "production" && env.ANALYTICS_PRODUCTION_APPROVED !== "true") {
    return { enabled: false, reason: "production_not_approved" };
  }
  return { enabled: true };
}
