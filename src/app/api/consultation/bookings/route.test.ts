import { describe, it, expect } from "vitest";
import { POST } from "./route";
describe("retired consultation intake", () => {
  it("returns only a migration notice, never reads or writes customer input", async () => {
    const response = POST();
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({error:"retired",next:"/consultation"});
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
});
