import { describe, expect, it } from "vitest";
import { authConfig } from "./config";
const dev = { NEXT_PUBLIC_AUTH_ENABLED: "true", NEXT_PUBLIC_AUTH_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_AUTH_SUPABASE_KEY: "synthetic-public-placeholder", NEXT_PUBLIC_EMAIL_AUTH: "1" };
describe("explicit auth configuration", () => {
  it("defaults off for local, preview and production without approved resources", () => {
    for (const VERCEL_ENV of [undefined, "preview", "production"]) expect(authConfig({ VERCEL_ENV })).toBeNull();
    expect(authConfig({ ...dev, NEXT_PUBLIC_AUTH_SUPABASE_KEY: "" })).toBeNull();
  });
  it("enables only configured providers without changing projects", () => {
    expect(authConfig(dev)).toMatchObject({ project: "dev", email: true, google: false, url: dev.NEXT_PUBLIC_AUTH_SUPABASE_URL });
    expect(authConfig({ ...dev, VERCEL_ENV: "production" })).toMatchObject({ project: "prod", url: dev.NEXT_PUBLIC_AUTH_SUPABASE_URL });
    expect(authConfig({ ...dev, NEXT_PUBLIC_AUTH_DISABLED: "1" })).toBeNull();
    expect(authConfig({ ...dev, NEXT_PUBLIC_EMAIL_AUTH: "0" })).toBeNull();
    expect(authConfig({ ...dev, NEXT_PUBLIC_AUTH_SUPABASE_URL: "http://unapproved.test" })).toBeNull();
  });
});
