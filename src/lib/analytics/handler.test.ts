import { describe, expect, it, vi } from "vitest";
import { handleEvents, readBoundedText, type Deps } from "./handler";
import { limiterKey, SHARED_BUCKET } from "./ratelimit";
import type { Limiter } from "./ratelimit";
import type { EventRow } from "./schema";

const SID = "6f1c2c1e-3a0e-4c55-9d2a-7f2f8c1b9a10";
const ev = (over: Record<string, unknown> = {}) => ({
  event_id: crypto.randomUUID(),
  session_id: SID,
  event_name: "page_view",
  path: "/",
  lang: "en",
  props: {},
  ...over,
});

const ON = {
  ANALYTICS_INGEST_ENABLED: "true",
  UPSTASH_REDIS_REST_URL: "https://example.invalid",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
  RATE_LIMIT_HMAC_SECRET: "test-secret",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "test-key",
};

function setup(env: Record<string, string | undefined> = ON, limiter?: Limiter) {
  const rows: EventRow[] = [];
  const getLimiter = vi.fn(async () => limiter ?? { limit: async () => ({ success: true, reset: Date.now() + 1000 }) });
  const getStore = vi.fn(() => ({ insert: async (r: EventRow[]) => void rows.push(...r) }));
  const deps: Deps = {
    env,
    storeConfigured: (e) => Boolean(e.NEXT_PUBLIC_SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY),
    getLimiter,
    getStore,
  };
  return { deps, rows, getLimiter, getStore };
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://housingmatch.test/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", host: "housingmatch.test", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("flag-off and fail-closed (no DB / limiter constructed)", () => {
  it("returns 204 and constructs nothing when the flag is absent", async () => {
    const { deps, getLimiter, getStore } = setup({ ...ON, ANALYTICS_INGEST_ENABLED: undefined });
    const res = await handleEvents(post({ events: [ev()] }), deps);
    expect(res.status).toBe(204);
    expect(getLimiter).not.toHaveBeenCalled();
    expect(getStore).not.toHaveBeenCalled();
  });

  it("treats any value other than exactly 'true' as off", async () => {
    for (const v of ["1", "TRUE", "yes", ""]) {
      const { deps, getStore } = setup({ ...ON, ANALYTICS_INGEST_ENABLED: v });
      expect((await handleEvents(post({ events: [ev()] }), deps)).status).toBe(204);
      expect(getStore).not.toHaveBeenCalled();
    }
  });

  it("stays off in Vercel production without explicit production approval, even if all services are configured", async () => {
    const { deps, getStore } = setup({ ...ON, VERCEL_ENV: "production" });
    expect((await handleEvents(post({ events: [ev()] }), deps)).status).toBe(204);
    expect(getStore).not.toHaveBeenCalled();
  });

  it("fails closed (503) when enabled but the rate limiter is not configured", async () => {
    for (const missing of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RATE_LIMIT_HMAC_SECRET"]) {
      const { deps, getStore } = setup({ ...ON, [missing]: undefined });
      expect((await handleEvents(post({ events: [ev()] }), deps)).status).toBe(503);
      expect(getStore).not.toHaveBeenCalled();
    }
  });

  it("fails closed (503) when enabled but the store is not configured", async () => {
    const { deps } = setup({ ...ON, SUPABASE_SERVICE_ROLE_KEY: undefined });
    expect((await handleEvents(post({ events: [ev()] }), deps)).status).toBe(503);
  });

  it("fails closed (503) when the limiter errors", async () => {
    const { deps, getStore } = setup(ON, { limit: async () => { throw new Error("down"); } });
    expect((await handleEvents(post({ events: [ev()] }), deps)).status).toBe(503);
    expect(getStore).not.toHaveBeenCalled();
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After once the controlled limiter is exhausted, and stores nothing", async () => {
    let n = 0;
    const limiter: Limiter = { limit: async () => ({ success: ++n <= 2, reset: Date.now() + 30_000 }) };
    const { deps, rows } = setup(ON, limiter);
    expect((await handleEvents(post({ events: [ev()] }), deps)).status).toBe(202);
    expect((await handleEvents(post({ events: [ev()] }), deps)).status).toBe(202);
    const res = await handleEvents(post({ events: [ev()] }), deps);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(rows).toHaveLength(2);
  });

  it("keys the limiter with an HMAC, never the raw IP", async () => {
    const keys: string[] = [];
    const { deps } = setup({ ...ON, VERCEL: "1" }, { limit: async (k) => (keys.push(k), { success: true, reset: 0 }) });
    await handleEvents(post({ events: [ev()] }, { "x-vercel-forwarded-for": "203.0.113.7" }), deps);
    expect(keys[0]).not.toContain("203.0.113.7");
    expect(keys[0]).toMatch(/^ev:[A-Za-z0-9_-]{43}$/);
  });
});

describe("request validation", () => {
  it("accepts a valid batch and returns 202", async () => {
    const { deps, rows } = setup();
    const res = await handleEvents(post({ events: [ev(), ev({ event_name: "matcher_started" })] }), deps);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: 2 });
    expect(rows.map((r) => r.event_name)).toEqual(["page_view", "matcher_started"]);
    expect(rows[0].source).toBeNull();
  });

  it("rejects bodies over the size cap with 413", async () => {
    const { deps, getStore } = setup();
    const res = await handleEvents(post("x".repeat(9000)), deps);
    expect(res.status).toBe(413);
    expect(getStore).not.toHaveBeenCalled();
  });

  it("rejects a declared Content-Length over the cap before reading", async () => {
    const { deps } = setup();
    expect((await handleEvents(post({ events: [ev()] }, { "content-length": "99999" }), deps)).status).toBe(413);
  });

  it("rejects non-JSON content types and malformed JSON", async () => {
    const { deps } = setup();
    expect((await handleEvents(post({ events: [ev()] }, { "content-type": "text/plain" }), deps)).status).toBe(415);
    expect((await handleEvents(post("{not json"), deps)).status).toBe(400);
  });

  it("drops bot user agents with 204 and a cross-origin request with 403", async () => {
    const { deps, rows } = setup();
    expect((await handleEvents(post({ events: [ev()] }, { "user-agent": "Googlebot/2.1" }), deps)).status).toBe(204);
    expect((await handleEvents(post({ events: [ev()] }, { origin: "https://evil.example" }), deps)).status).toBe(403);
    expect(rows).toHaveLength(0);
  });

  it("passes duplicate event_ids to the idempotent store unchanged (dedup happens on conflict)", async () => {
    const { deps, rows } = setup();
    const e = ev();
    await handleEvents(post({ events: [e] }), deps);
    await handleEvents(post({ events: [e] }), deps);
    expect(rows.every((r) => r.event_id === e.event_id)).toBe(true);
  });
});

/** A chunked body with no Content-Length; counts how many bytes the server actually pulled. */
function streamingPost(chunkBytes: number, chunks: number) {
  let pulled = 0;
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(ctrl) {
      if (sent >= chunks) return ctrl.close();
      sent++;
      pulled += chunkBytes;
      ctrl.enqueue(new Uint8Array(chunkBytes).fill(0x20));
    },
  });
  const req = new Request("https://housingmatch.test/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", host: "housingmatch.test" },
    body,
    duplex: "half",
  } as RequestInit);
  return { req, pulled: () => pulled };
}

describe("bounded body read (no trust in Content-Length)", () => {
  it("rejects an undeclared-length chunked body over 8 KB with 413 and stops reading early", async () => {
    const { deps, getStore } = setup();
    const s = streamingPost(1024, 1000); // would be ~1 MB if fully buffered
    expect(s.req.headers.get("content-length")).toBeNull();
    const res = await handleEvents(s.req, deps);
    expect(res.status).toBe(413);
    expect(s.pulled()).toBeLessThanOrEqual(8 * 1024 + 2 * 1024); // cap + at most a chunk or two of read-ahead
    expect(getStore).not.toHaveBeenCalled();
  });

  it("rejects a falsified small Content-Length with an oversized stream", async () => {
    const { deps } = setup();
    const s = streamingPost(4096, 10);
    const req = new Request(s.req, { headers: { "content-type": "application/json", host: "housingmatch.test", "content-length": "10" } });
    expect((await handleEvents(req, deps)).status).toBe(413);
  });

  it("readBoundedText returns the body under the cap and null over it", async () => {
    const small = new Request("https://x.test", { method: "POST", body: "a".repeat(8 * 1024) });
    expect(await readBoundedText(small, 8 * 1024)).toHaveLength(8 * 1024);
    const big = new Request("https://x.test", { method: "POST", body: "a".repeat(8 * 1024 + 1) });
    expect(await readBoundedText(big, 8 * 1024)).toBeNull();
    expect(await readBoundedText(new Request("https://x.test", { method: "POST" }), 10)).toBe("");
  });

  it("accepts a valid chunked body under the cap", async () => {
    const { deps, rows } = setup();
    const text = JSON.stringify({ events: [ev()] });
    const half = Math.floor(text.length / 2);
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(enc.encode(text.slice(0, half))); c.enqueue(enc.encode(text.slice(half))); c.close(); },
    });
    const req = new Request("https://housingmatch.test/api/events", {
      method: "POST", headers: { "content-type": "application/json", host: "housingmatch.test" }, body, duplex: "half",
    } as RequestInit);
    expect((await handleEvents(req, deps)).status).toBe(202);
    expect(rows).toHaveLength(1);
  });
});

describe("rate-limit identity hardening (spoofed headers)", () => {
  const keysFor = async (env: Record<string, string | undefined>, headerSets: Record<string, string>[]) => {
    const keys: string[] = [];
    const { deps } = setup(env, { limit: async (k) => (keys.push(k), { success: true, reset: 0 }) });
    for (const h of headerSets) await handleEvents(post({ events: [ev()] }, h), deps);
    return keys;
  };
  const shared = limiterKey(SHARED_BUCKET, ON.RATE_LIMIT_HMAC_SECRET);

  it("off Vercel, ignores every client-supplied IP header (all callers share one bucket)", async () => {
    const keys = await keysFor(ON, [
      { "x-forwarded-for": "198.51.100.1" },
      { "x-forwarded-for": "198.51.100.2" },
      { "x-real-ip": "198.51.100.3" },
      { "x-vercel-forwarded-for": "198.51.100.4" },
      {},
    ]);
    expect(new Set(keys)).toEqual(new Set([shared]));
  });

  it("never uses x-real-ip, even on Vercel", async () => {
    const keys = await keysFor({ ...ON, VERCEL: "1" }, [{ "x-real-ip": "198.51.100.5" }, { "x-real-ip": "198.51.100.6" }]);
    expect(new Set(keys)).toEqual(new Set([shared]));
  });

  it("on Vercel, rotating a spoofed leftmost X-Forwarded-For hop cannot mint new buckets", async () => {
    const keys = await keysFor({ ...ON, VERCEL: "1" }, [
      { "x-forwarded-for": "1.1.1.1, 203.0.113.9" },
      { "x-forwarded-for": "2.2.2.2, 203.0.113.9" },
      { "x-forwarded-for": "not-an-ip" },
      { "x-forwarded-for": "" },
    ]);
    expect(new Set(keys)).toEqual(new Set([shared]));
  });

  it("on Vercel, prefers x-vercel-forwarded-for over x-forwarded-for and keys distinct real clients separately", async () => {
    const env = { ...ON, VERCEL: "1" };
    const keys = await keysFor(env, [
      { "x-vercel-forwarded-for": "203.0.113.10", "x-forwarded-for": "9.9.9.9" },
      { "x-vercel-forwarded-for": "203.0.113.10", "x-forwarded-for": "8.8.8.8" },
      { "x-vercel-forwarded-for": "2001:db8::1" },
    ]);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toBe(limiterKey("203.0.113.10", ON.RATE_LIMIT_HMAC_SECRET));
    expect(keys[2]).not.toBe(keys[0]);
    expect(keys.includes(shared)).toBe(false);
  });

  it("spoofing cannot escape the 429: one real client rotating fake headers is still limited", async () => {
    const counts = new Map<string, number>();
    const limiter: Limiter = {
      limit: async (k) => {
        counts.set(k, (counts.get(k) ?? 0) + 1);
        return { success: counts.get(k)! <= 3, reset: Date.now() + 60_000 };
      },
    };
    const { deps } = setup({ ...ON, VERCEL: "1" }, limiter);
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await handleEvents(post({ events: [ev()] }, { "x-vercel-forwarded-for": "203.0.113.20", "x-forwarded-for": `10.0.0.${i}`, "x-real-ip": `10.1.0.${i}` }), deps)).status);
    }
    expect(statuses).toEqual([202, 202, 202, 429, 429]);
  });
});
