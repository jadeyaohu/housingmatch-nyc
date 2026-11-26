import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => ({ rpc })) }));
import { bookingConfigured, saveBooking } from "./storage";
import { PRIVACY_VERSION, TERMS_VERSION, type BookingRequest } from "./model";
const input: BookingRequest = { requestId: "f053e2b1-65c1-46db-b0c9-aa49ae28d6c1", package: "standard", name: "Example Person", email: "synthetic@example.test", language: "en", preferredLocal: "2030-06-01T14:30", timezone: "America/New_York", topic: "", termsAccepted: true, privacyAccepted: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION };
function configured() {
  vi.stubEnv("CONSULTATION_BOOKING_ENABLED", "true"); vi.stubEnv("CONSULTATION_POLICIES_APPROVED", "true");
  vi.stubEnv("CONSULTATION_SUPABASE_URL", "http://localhost:54321"); vi.stubEnv("CONSULTATION_SUPABASE_SERVICE_ROLE_KEY", "synthetic-test-placeholder");
}
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("server-only booking storage", () => {
  it("requires explicit approval and dedicated credentials", () => {
    vi.stubEnv("CONSULTATION_BOOKING_ENABLED", ""); expect(bookingConfigured()).toBe(false);
    configured(); expect(bookingConfigured()).toBe(true);
    vi.stubEnv("CONSULTATION_POLICIES_APPROVED", "false"); expect(bookingConfigured()).toBe(false);
  });
  it("never silently falls back to file or public credentials", async () => {
    vi.stubEnv("CONSULTATION_BOOKING_ENABLED", "false");
    await expect(saveBooking(input, "2030-06-01T18:30:00Z")).rejects.toThrow("unavailable");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("submits only allowlisted fields and a stable fingerprint for retries", async () => {
    configured(); rpc.mockResolvedValue({ data: input.requestId, error: null });
    await saveBooking(input, "2030-06-01T18:30:00Z"); await saveBooking(input, "2030-06-01T18:30:00Z");
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
    const [name, params] = rpc.mock.calls[0]; expect(name).toBe("request_consultation");
    expect(params).not.toHaveProperty("payment_status"); expect(params).not.toHaveProperty("price_cents");
    expect(params.p_fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
