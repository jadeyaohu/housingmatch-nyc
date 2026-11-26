import { describe, it, expect } from "vitest";
import { passwordRequest, newPassword } from "./password";
describe("password auth input", () => {
  it("requires consent and a bounded valid email", () => { expect(passwordRequest.safeParse({ action: "reset", email: "bad", consent: true }).success).toBe(false); expect(passwordRequest.safeParse({ action: "reset", email: "synthetic@example.test", consent: false }).success).toBe(false); });
  it("requires strong new passwords without blocking an existing shorter password", () => { expect(newPassword.safeParse("short").success).toBe(false); expect(newPassword.safeParse("x".repeat(129)).success).toBe(false); expect(passwordRequest.safeParse({ action: "signin", email: "synthetic@example.test", password: "existing", consent: true }).success).toBe(true); expect(passwordRequest.safeParse({ action: "signup", email: "synthetic@example.test", password: "long-test-password", consent: true }).success).toBe(true); });
});
