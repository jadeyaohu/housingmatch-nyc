import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Adapter-level regression tests for the Upstash SDK's fail-open timeout (Codex P1).
 * `@upstash/ratelimit` and `@upstash/redis` are mocked at the module level, so the REAL
 * createUpstashLimiter() adapter runs against controlled SDK responses — no network.
 */
const sdk = vi.hoisted(() => ({
  next: { success: true, reset: 0, limit: 60, remaining: 59, pending: Promise.resolve() } as Record<string, unknown>,
  ctorOpts: null as Record<string, unknown> | null,
  calls: 0,
}));

vi.mock("@upstash/redis", () => ({ Redis: class { constructor(_: unknown) {} } }));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = () => "sliding";
    constructor(opts: Record<string, unknown>) {
      sdk.ctorOpts = opts;
    }
    async limit() {
      sdk.calls++;
      return sdk.next;
    }
  }
  return { Ratelimit };
});

import { handleEvents, type Deps } from "./handler";
import { createUpstashLimiter, LimiterUnavailableError, UPSTASH_TIMEOUT_MS } from "./ratelimit";
import type { EventRow } from "./schema";

const ENV = {
  ANALYTICS_INGEST_ENABLED: "true",
  UPSTASH_REDIS_REST_URL: "https://example.invalid",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
  RATE_LIMIT_HMAC_SECRET: "test-secret",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "test-key",
};
const sdkResult = (over: Record<string, unknown>) => ({ success: true, limit: 60, remaining: 59, reset: Date.now() + 60_000, pending: Promise.resolve(), ...over });

function deps() {
  const insert = vi.fn(async (_rows: EventRow[]) => {});
  const d: Deps = {
    env: ENV,
    storeConfigured: () => true,
    getLimiter: () => createUpstashLimiter(ENV), // the real adapter, mocked SDK underneath
    getStore: () => ({ insert }),
  };
  return { d, insert };
}
const req = () =>
  new Request("https://housingmatch.test/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", host: "housingmatch.test" },
    body: JSON.stringify({
      events: [{ event_id: crypto.randomUUID(), session_id: crypto.randomUUID(), event_name: "page_view", path: "/", lang: "en", props: {} }],
    }),
  });

beforeEach(() => {
  sdk.calls = 0;
  sdk.next = sdkResult({});
});

describe("Upstash adapter: timeout must fail closed", () => {
  it("rejects the SDK's fail-open timeout ({ success: true, reason: 'timeout' }) at the adapter", async () => {
    sdk.next = sdkResult({ success: true, reason: "timeout" });
    const limiter = await createUpstashLimiter(ENV);
    await expect(limiter.limit("ev:k")).rejects.toBeInstanceOf(LimiterUnavailableError);
  });

  it("end to end: SDK timeout → HTTP 503 and the store is never called", async () => {
    sdk.next = sdkResult({ success: true, reason: "timeout" });
    const { d, insert } = deps();
    const res = await handleEvents(req(), d);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "ingestion_unavailable" });
    expect(insert).not.toHaveBeenCalled();
    expect(sdk.calls).toBe(1);
  });

  it("also fails closed on an unrecognised success-with-reason soft path", async () => {
    sdk.next = sdkResult({ success: true, reason: "somethingNew" });
    const { d, insert } = deps();
    expect((await handleEvents(req(), d)).status).toBe(503);
    expect(insert).not.toHaveBeenCalled();
  });

  it("fails closed on a malformed SDK response", async () => {
    sdk.next = { reset: 0 } as Record<string, unknown>;
    const { d, insert } = deps();
    expect((await handleEvents(req(), d)).status).toBe(503);
    expect(insert).not.toHaveBeenCalled();
  });

  it("normal success (Redis counted, no reason) still admits → 202 and writes", async () => {
    sdk.next = sdkResult({ success: true });
    const { d, insert } = deps();
    expect((await handleEvents(req(), d)).status).toBe(202);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, "cacheBlock", "denyList"])("a real denial (success: false, reason %s) → 429, no write", async (reason) => {
    sdk.next = sdkResult({ success: false, remaining: 0, ...(reason ? { reason } : {}) });
    const { d, insert } = deps();
    const res = await handleEvents(req(), d);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
  });

  it("configures an explicit, short SDK timeout", async () => {
    await createUpstashLimiter(ENV);
    expect(sdk.ctorOpts?.timeout).toBe(UPSTASH_TIMEOUT_MS);
    expect(UPSTASH_TIMEOUT_MS).toBeLessThanOrEqual(2000);
  });
});
