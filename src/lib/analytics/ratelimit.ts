import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { Env } from "./config";

/**
 * Enforceable server-side rate limiting (HN-001 §5) via Upstash.
 *
 * - The client IP is never stored. The limiter key is HMAC-SHA256(ip, RATE_LIMIT_HMAC_SECRET),
 *   and Upstash keeps it only for the sliding window.
 * - Fail closed: if ingestion is enabled but any of UPSTASH_REDIS_REST_URL,
 *   UPSTASH_REDIS_REST_TOKEN or RATE_LIMIT_HMAC_SECRET is missing, the route refuses requests.
 */

export interface Limiter {
  limit(key: string): Promise<{ success: boolean; reset: number }>;
}

export const EVENTS_LIMIT = { requests: 60, window: "60 s" } as const;

export function limiterKey(ip: string, secret: string): string {
  return "ev:" + createHmac("sha256", secret).update(ip).digest("base64url");
}

/** Bucket used when no trustworthy per-client IP exists. Conservative: all such callers share one window. */
export const SHARED_BUCKET = "shared:untrusted";

/**
 * Trusted client identity for rate limiting.
 *
 * Only on Vercel (VERCEL === "1"): Vercel's edge overwrites X-Forwarded-For with the
 * connecting client's IP and does not forward caller-supplied values (no Trusted Proxy on
 * our plan), and sets x-vercel-forwarded-for identically. We read x-vercel-forwarded-for first
 * (it survives an upstream proxy overwriting x-forwarded-for), then x-forwarded-for, and accept
 * it only if it is exactly ONE syntactically valid IP. Anything else (a comma list, garbage,
 * missing) means the header did not come from the edge as expected → shared bucket.
 *
 * Anywhere else (local dev, self-hosting, tests) no header is trusted → shared bucket.
 * x-real-ip is never used.
 */
export function clientIdentity(headers: Headers, env: Env): string {
  if (env.VERCEL !== "1") return SHARED_BUCKET;
  const raw = headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
  const ip = raw?.trim() ?? "";
  if (!ip || ip.includes(",") || isIP(ip) === 0) return SHARED_BUCKET;
  return ip;
}

export function rateLimitConfigured(env: Env): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN && env.RATE_LIMIT_HMAC_SECRET);
}

/** Upstash call budget. On timeout the SDK *allows* the request; we convert that to an error below. */
export const UPSTASH_TIMEOUT_MS = 2000;

export class LimiterUnavailableError extends Error {
  constructor(reason: string) {
    super(`rate_limiter_unavailable:${reason}`);
    this.name = "LimiterUnavailableError";
  }
}

type UpstashResult = { success: boolean; reset: number; reason?: string };

/**
 * Maps an Upstash Ratelimit response to our fail-closed contract.
 *
 * The SDK resolves `{ success: true, reason: "timeout" }` when Redis doesn't answer within
 * `timeout` ms (it fails OPEN by design). We treat that, and any other success-with-a-reason
 * soft path we don't explicitly recognise, as "limiter unavailable" → the handler returns 503
 * and never writes. A real denial (`success: false`, incl. reason "cacheBlock"/"denyList")
 * stays a denial → 429. Only `success: true` with no reason (Redis actually counted) admits.
 */
export function interpretUpstashResult(r: UpstashResult): { success: boolean; reset: number } {
  if (r.reason === "timeout") throw new LimiterUnavailableError("timeout");
  if (r.success === true) {
    if (r.reason !== undefined) throw new LimiterUnavailableError(`unexpected_reason:${r.reason}`);
    return { success: true, reset: r.reset };
  }
  if (r.success === false) return { success: false, reset: r.reset };
  throw new LimiterUnavailableError("malformed_response");
}

/** Builds the real Upstash limiter. Only called when ingestion is enabled and configured. */
export async function createUpstashLimiter(env: Env): Promise<Limiter> {
  const [{ Ratelimit }, { Redis }] = await Promise.all([import("@upstash/ratelimit"), import("@upstash/redis")]);
  const rl = new Ratelimit({
    redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! }),
    limiter: Ratelimit.slidingWindow(EVENTS_LIMIT.requests, EVENTS_LIMIT.window),
    prefix: "hn001",
    analytics: false,
    timeout: UPSTASH_TIMEOUT_MS,
  });
  return { limit: async (key) => interpretUpstashResult(await rl.limit(key)) };
}
