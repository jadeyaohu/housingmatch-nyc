import { ingestGate, type Env } from "./config";
import { clientIdentity, limiterKey, rateLimitConfigured, type Limiter } from "./ratelimit";
import { EventBatchSchema, MAX_BODY_BYTES, toRow } from "./schema";
import type { EventStore } from "./store";

/**
 * POST /api/events logic, with dependencies injected so it can be tested without
 * Supabase or Upstash. Order matters:
 *   1. gate (flag off → 204, nothing constructed)
 *   2. fail closed if limiter or store isn't configured (503)
 *   3. noise filters (Origin, bot UA) — not security controls
 *   4. rate limit (429)
 *   5. size cap (413, enforced while streaming), JSON + strict schema (400)
 *   6. idempotent insert (202 = validated events received; duplicates are ignored by the DB)
 */
export type Deps = {
  env: Env;
  storeConfigured: (env: Env) => boolean;
  getLimiter: () => Promise<Limiter>;
  getStore: () => EventStore;
};

function originHost(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

/**
 * Reads the request body as UTF-8, stopping as soon as more than `max` bytes have arrived.
 * Returns null on overflow (the stream is cancelled, so the rest is never buffered).
 */
export async function readBoundedText(req: Request, max: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel("body_too_large").catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder().decode(buf);
}

const BOT_UA = /bot|crawler|spider|preview|scanner|headless/i;
const json = (status: number, body?: object, headers: Record<string, string> = {}) =>
  new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: { "Cache-Control": "no-store", ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
  });

export async function handleEvents(req: Request, deps: Deps): Promise<Response> {
  const { env } = deps;
  if (!ingestGate(env).enabled) return json(204);
  if (!rateLimitConfigured(env) || !deps.storeConfigured(env)) return json(503, { error: "ingestion_unavailable" });

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && originHost(origin) !== host) return json(403, { error: "forbidden_origin" });
  if (BOT_UA.test(req.headers.get("user-agent") ?? "")) return json(204);

  let limiter: Limiter;
  try {
    limiter = await deps.getLimiter();
  } catch {
    return json(503, { error: "ingestion_unavailable" });
  }
  let allowed: { success: boolean; reset: number };
  try {
    allowed = await limiter.limit(limiterKey(clientIdentity(req.headers, env), env.RATE_LIMIT_HMAC_SECRET!));
  } catch {
    return json(503, { error: "ingestion_unavailable" }); // limiter outage → fail closed
  }
  if (!allowed.success) {
    const retry = Math.max(1, Math.ceil((allowed.reset - Date.now()) / 1000));
    return json(429, { error: "rate_limited" }, { "Retry-After": String(retry) });
  }

  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return json(415, { error: "json_only" });
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return json(413, { error: "too_large" });
  // Never trust Content-Length: read the stream with a hard cumulative cap.
  const text = await readBoundedText(req, MAX_BODY_BYTES);
  if (text === null) return json(413, { error: "too_large" });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const parsed = EventBatchSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: "invalid_event" });

  try {
    await deps.getStore().insert(parsed.data.events.map(toRow));
  } catch {
    return json(503, { error: "ingestion_unavailable" });
  }
  return json(202, { accepted: parsed.data.events.length });
}
