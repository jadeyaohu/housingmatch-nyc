import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/consultation/storage", () => ({ bookingConfigured: vi.fn(), saveBooking: vi.fn() }));
import { bookingConfigured, saveBooking } from "@/lib/consultation/storage";
import { POST } from "./route";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/consultation/model";

const valid = { requestId: "f053e2b1-65c1-46db-b0c9-aa49ae28d6c1", package: "standard", name: "Example Person", email: "synthetic@example.test", language: "en", preferredLocal: "2030-06-01T14:30", timezone: "America/New_York", topic: "", termsAccepted: true, privacyAccepted: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION };
function request(body: unknown = valid, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/consultation/bookings", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-01")); vi.mocked(bookingConfigured).mockReturnValue(true); });
afterEach(() => vi.unstubAllEnvs());
describe("booking POST security", () => {
  it("keeps Phase 1 working with an empty optional canonical origin", async () => {
    vi.stubEnv("CONSULTATION_APP_ORIGIN", "");
    vi.mocked(saveBooking).mockResolvedValue({ id: valid.requestId, status: "requested", paymentStatus: "not_started" });
    expect((await POST(request())).status).toBe(201);
  });
  it("denies cross-origin writes before storage", async () => {
    expect((await POST(request(valid, "https://other.test"))).status).toBe(403);
    expect(saveBooking).not.toHaveBeenCalled();
  });
  it("accepts the browser host when Next normalizes its internal URL", async () => {
    vi.mocked(saveBooking).mockResolvedValue({ id: valid.requestId, status: "requested", paymentStatus: "not_started" });
    const req = new Request("http://localhost:3000/api/consultation/bookings", { method: "POST", headers: { Origin: "http://127.0.0.1:3000", Host: "127.0.0.1:3000", "Content-Type": "application/json" }, body: JSON.stringify(valid) });
    expect((await POST(req)).status).toBe(201);
  });
  it("fails closed without configured storage", async () => {
    vi.mocked(bookingConfigured).mockReturnValue(false);
    expect((await POST(request())).status).toBe(503);
    expect(saveBooking).not.toHaveBeenCalled();
  });
  it.each([{ termsAccepted: false }, { privacyAccepted: false }, { paymentStatus: "paid" }, { preferredLocal: "2029-01-01T14:30" }])("rejects invalid request without writes %j", async (change) => {
    expect((await POST(request({ ...valid, ...change }))).status).toBe(400);
    expect(saveBooking).not.toHaveBeenCalled();
  });
  it("caps actual streamed bytes, not just Content-Length", async () => {
    expect((await POST(request({ ...valid, topic: "x".repeat(9000) }))).status).toBe(413);
    expect(saveBooking).not.toHaveBeenCalled();
  });
  it("returns only request reference/state, never contact or payment data", async () => {
    vi.mocked(saveBooking).mockResolvedValue({ id: valid.requestId, status: "requested", paymentStatus: "not_started" });
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: valid.requestId, status: "requested", paymentStatus: "not_started" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([["rate_limited", 429], ["conflict", 409], ["secret provider error", 503]])("maps %s without leaking provider details", async (error, status) => {
    vi.mocked(saveBooking).mockRejectedValue(new Error(error as string));
    const response = await POST(request());
    expect(response.status).toBe(status);
    const body = await response.text();
    expect(body).not.toContain("secret"); expect(body).not.toContain(valid.email);
  });
});
