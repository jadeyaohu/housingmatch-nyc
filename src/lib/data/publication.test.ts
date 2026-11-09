import { describe, expect, it } from "vitest";
import { currentEnvironment, isPublishable, type ApprovedSources } from "./publication";
import type { Listing } from "../types";

const sources: ApprovedSources = { approved: { "Housing Connect": { approvedOn: "2026-11-09", by: "Claude", basis: "audit" } } };
const l = (o: Partial<Listing>) => ({ id: "x", dataSource: "muse", sourceName: "HDC", ...o }) as Listing;

describe("publication gate", () => {
  it("Production shows only approved Muse sources; Open Data always", () => {
    expect(isPublishable(l({ sourceName: "Housing Connect" }), sources, "production")).toBe(true);
    expect(isPublishable(l({ sourceName: "HDC" }), sources, "production")).toBe(false);
    expect(isPublishable(l({ sourceName: null }), sources, "production")).toBe(false);
    expect(isPublishable(l({ dataSource: "opendata", sourceName: "NYC Open Data" }), sources, "production")).toBe(true);
  });
  it("Preview and development show everything for auditing", () => {
    expect(isPublishable(l({ sourceName: "HDC" }), sources, "preview")).toBe(true);
    expect(isPublishable(l({ sourceName: "HDC" }), sources, "development")).toBe(true);
  });
  it("reads the Vercel environment", () => {
    expect(currentEnvironment({ VERCEL_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBe("production");
    expect(currentEnvironment({ VERCEL_ENV: "preview" } as unknown as NodeJS.ProcessEnv)).toBe("preview");
    expect(currentEnvironment({} as unknown as NodeJS.ProcessEnv)).toBe("development");
  });
});
