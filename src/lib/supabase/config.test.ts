import { describe, expect, it } from "vitest";
import { authConfig } from "./config";

describe("authConfig", () => {
  it("production has no auth unless production keys are set (never the dev project)", () => {
    expect(authConfig({ VERCEL_ENV: "production" })).toBeNull();
    expect(authConfig({ NEXT_PUBLIC_VERCEL_ENV: "production" })).toBeNull();
    expect(authConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_AUTH_SUPABASE_URL: "https://p.supabase.co", NEXT_PUBLIC_AUTH_SUPABASE_KEY: "k" })).toMatchObject({ project: "prod" });
  });
  it("preview and local use the dev project", () => {
    expect(authConfig({ VERCEL_ENV: "preview" })?.url).toBe("https://aqjdfeqorlanwewbhidm.supabase.co");
    expect(authConfig({})?.project).toBe("dev");
  });
});
