import { afterEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { previewDemoEnabled } from "./config";
afterEach(() => vi.unstubAllEnvs());
describe("Local-only synthetic journeys", () => {
  function local() { vi.stubEnv("VERCEL_ENV", ""); vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", ""); vi.stubEnv("BETA_PREVIEW_DEMO", "true"); vi.stubEnv("BETA_FIXTURES", ""); }
  it("defaults off", () => { local(); vi.stubEnv("BETA_PREVIEW_DEMO", ""); expect(previewDemoEnabled()).toBe(false); });
  it("requires local development or explicit synthetic fixtures", () => { local(); vi.stubEnv("NODE_ENV", "production"); expect(previewDemoEnabled()).toBe(false); vi.stubEnv("BETA_FIXTURES", "synthetic"); expect(previewDemoEnabled()).toBe(true); });
  it("permits an explicitly enabled local developer session", () => { local(); vi.stubEnv("NODE_ENV", "development"); expect(previewDemoEnabled()).toBe(true); });
  it.each(["preview", "production", "development"])("cannot enable on hosted %s even with fixtures", env => { for (const key of ["VERCEL_ENV", "NEXT_PUBLIC_VERCEL_ENV"]) { local(); vi.stubEnv("BETA_FIXTURES", "synthetic"); vi.stubEnv(key, env); expect(previewDemoEnabled()).toBe(false); } });
});
