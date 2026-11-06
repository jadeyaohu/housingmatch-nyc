import { describe, expect, it, vi } from "vitest";
import { handleEvents, type Deps } from "./handler";
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
    const { deps } = setup(ON, { limit: async (k) => (keys.push(k), { success: true, reset: 0 }) });
    await handleEvents(post({ events: [ev()] }, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), deps);
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
