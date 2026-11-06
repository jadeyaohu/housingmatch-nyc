import { createHmac } from "node:crypto";
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

/** First hop as set by the Vercel edge; falls back to a shared bucket. */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}

export function rateLimitConfigured(env: Env): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN && env.RATE_LIMIT_HMAC_SECRET);
}

/** Builds the real Upstash limiter. Only called when ingestion is enabled and configured. */
export async function createUpstashLimiter(env: Env): Promise<Limiter> {
  const [{ Ratelimit }, { Redis }] = await Promise.all([import("@upstash/ratelimit"), import("@upstash/redis")]);
  const rl = new Ratelimit({
    redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! }),
    limiter: Ratelimit.slidingWindow(EVENTS_LIMIT.requests, EVENTS_LIMIT.window),
    prefix: "hn001",
    analytics: false,
  });
  return { limit: async (key) => {
    const r = await rl.limit(key);
    return { success: r.success, reset: r.reset };
  } };
}
