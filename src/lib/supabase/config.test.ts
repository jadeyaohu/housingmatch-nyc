import { describe, expect, it } from "vitest";
import { authConfig } from "./config";

describe("authConfig", () => {
  it("production uses the prod project, never the dev one, and can be switched off", () => {
    expect(authConfig({ VERCEL_ENV: "production" })).toMatchObject({ project: "prod", url: "https://ldootzmoeuxarukxctxk.supabase.co" });
    expect(authConfig({ NEXT_PUBLIC_VERCEL_ENV: "production" })?.url).not.toContain("aqjdfeqorlanwewbhidm");
    expect(authConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_AUTH_DISABLED: "1" })).toBeNull();
  });
  it("preview and local use the dev project", () => {
    expect(authConfig({ VERCEL_ENV: "preview" })?.url).toBe("https://aqjdfeqorlanwewbhidm.supabase.co");
    expect(authConfig({})?.project).toBe("dev");
  });

  it("hides Google sign-in until the provider is switched on, with an env override", () => {
    expect(authConfig({})?.google).toBe(false);
    expect(authConfig({ NEXT_PUBLIC_GOOGLE_AUTH: "1" })?.google).toBe(true);
    expect(authConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_GOOGLE_AUTH: "0" })?.google).toBe(false);
  });
});
