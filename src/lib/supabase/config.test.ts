import { describe, expect, it } from "vitest";
import { authConfig } from "./config";

describe("authConfig", () => {
  it("production uses the prod project, never the dev one, and can be switched off", () => {
    const on = { NEXT_PUBLIC_GOOGLE_AUTH: "1" };
    expect(authConfig({ VERCEL_ENV: "production", ...on })).toMatchObject({ project: "prod", url: "https://ldootzmoeuxarukxctxk.supabase.co" });
    expect(authConfig({ NEXT_PUBLIC_VERCEL_ENV: "production", ...on })?.url).not.toContain("aqjdfeqorlanwewbhidm");
    expect(authConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_AUTH_DISABLED: "1" })).toBeNull();
  });
  it("preview and local use the dev project", () => {
    expect(authConfig({ VERCEL_ENV: "preview" })?.url).toBe("https://aqjdfeqorlanwewbhidm.supabase.co");
    expect(authConfig({})?.project).toBe("dev");
  });

  it("hides Google sign-in until the provider is switched on, with an env override", () => {
    expect(authConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_EMAIL_AUTH: "1" })?.google).toBe(false);
    expect(authConfig({})?.google).toBe(true);
    expect(authConfig({ NEXT_PUBLIC_GOOGLE_AUTH: "1" })?.google).toBe(true);
    expect(authConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_GOOGLE_AUTH: "0", NEXT_PUBLIC_EMAIL_AUTH: "1" })?.google).toBe(false);
  });

  it("Production has no accounts until a sign-in method is switched on; email needs its own flag", () => {
    expect(authConfig({ VERCEL_ENV: "production" })).toBeNull();
    expect(authConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_GOOGLE_AUTH: "1" })).toMatchObject({ google: true, email: false });
    expect(authConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_EMAIL_AUTH: "1" })).toMatchObject({ google: false, email: true });
    expect(authConfig({})).toMatchObject({ project: "dev", email: true });
  });
});
