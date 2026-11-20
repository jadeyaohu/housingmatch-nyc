import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Static guardrails: secrets stay server-side and PR1a leaves the matcher untouched. */
const src = path.join(process.cwd(), "src");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
const all = files(src).map((p) => ({ p, text: readFileSync(p, "utf8") }));

describe("server/client boundary", () => {
  it("no client component references the service role key, HMAC secret, Upstash token or the analytics store", () => {
    const client = all.filter((f) => /^\s*["']use client["']/m.test(f.text));
    expect(client.length).toBeGreaterThan(0);
    for (const f of client) {
      expect(f.text, f.p).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|RATE_LIMIT_HMAC_SECRET|UPSTASH_REDIS_REST_TOKEN|analytics\/store|analytics\/ratelimit/);
    }
  });

  it("server secrets are never exposed with a NEXT_PUBLIC_ prefix", () => {
    for (const f of all) expect(f.text, f.p).not.toMatch(/NEXT_PUBLIC_(SUPABASE_SERVICE_ROLE_KEY|RATE_LIMIT|UPSTASH)/);
  });

  it("the analytics store is server-only", () => {
    expect(readFileSync(path.join(src, "lib/analytics/store.ts"), "utf8")).toMatch(/^import "server-only";/);
  });

  it("the matcher API does not import analytics", () => {
    expect(readFileSync(path.join(src, "app/api/match/route.ts"), "utf8")).not.toMatch(/analytics/);
  });
});
