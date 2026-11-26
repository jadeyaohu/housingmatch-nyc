import { describe, expect, it } from "vitest";
import { appointmentUTC, BookingInput, canTransitionBooking, canTransitionPayment, PACKAGES, PRIVACY_VERSION, TERMS_VERSION } from "./model";
import { consultationCopy } from "./content";

const input = { requestId: "f053e2b1-65c1-46db-b0c9-aa49ae28d6c1", package: "standard", name: "Example Person", email: "synthetic@example.test", language: "en", preferredLocal: "2030-06-01T14:30", timezone: "America/New_York", topic: "General preparation", termsAccepted: true, privacyAccepted: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION };
describe("consultation contract", () => {
  it("has one-time authoritative prices and durations", () => {
    expect(PACKAGES).toEqual({ standard: { priceCents: 5900, minutes: 30 }, expert: { priceCents: 9900, minutes: 60 } });
  });
  it("accepts only the allowlisted fields", () => {
    expect(BookingInput.safeParse(input).success).toBe(true);
    for (const field of ["priceCents", "bookingStatus", "paymentStatus", "ssn", "documents"]) expect(BookingInput.safeParse({ ...input, [field]: "paid" }).success).toBe(false);
  });
  it("requires explicit, current-version consent to both policies", () => {
    for (const change of [{ termsAccepted: false }, { privacyAccepted: false }, { termsAccepted: "true" }, { termsAccepted: undefined }, { termsVersion: "old" }, { privacyVersion: "old" }]) expect(BookingInput.safeParse({ ...input, ...change }).success).toBe(false);
  });
  it.each([{ email: "not-an-email" }, { name: "  " }, { topic: "123-45-6789" }, { topic: "x".repeat(501) }, { timezone: "not-a-zone" }, { language: "fr" }, { package: "subscription" }])("rejects invalid/minimization input %j", (change) => {
    expect(BookingInput.safeParse({ ...input, ...change }).success).toBe(false);
  });
  it("resolves wall time against its timezone", () => {
    expect(appointmentUTC("2030-06-01T14:30", "America/New_York", new Date("2030-01-01"))).toBe("2030-06-01T18:30:00.000Z");
    expect(appointmentUTC("2030-06-01T14:30", "Asia/Shanghai", new Date("2030-01-01"))).toBe("2030-06-01T06:30:00.000Z");
  });
  it("rejects nonexistent/ambiguous/past/invalid/distant times", () => {
    const now = new Date("2030-01-01");
    for (const value of ["2030-03-10T02:30", "2030-11-03T01:30", "2029-12-30T14:30", "2030-02-30T14:30", "2032-01-01T14:30"]) expect(appointmentUTC(value, "America/New_York", now)).toBeNull();
  });
  it("permits only forward human-confirmed booking and payment transitions", () => {
    expect(canTransitionBooking("requested", "confirmed")).toBe(true);
    expect(canTransitionBooking("requested", "completed")).toBe(false);
    expect(canTransitionBooking("cancelled", "confirmed")).toBe(false);
    expect(canTransitionPayment("not_started", "paid")).toBe(false);
    expect(canTransitionPayment("pending", "paid")).toBe(true);
    expect(canTransitionPayment("paid", "refunded")).toBe(true);
    expect(canTransitionPayment("refunded", "paid")).toBe(false);
  });
  it("provides EN/中文 package, consent and disclosure copy", () => {
    for (const lang of ["en", "zh"] as const) {
      const t = consultationCopy[lang];
      expect(t.standard).toBeTruthy(); expect(t.expert).toBeTruthy();
      expect(t.features.standard).toHaveLength(5); expect(t.features.expert).toHaveLength(4);
      expect(t.termsConsent).toBeTruthy(); expect(t.privacyConsent).toBeTruthy();
      for (const agency of ["HPD", "HDC", "Housing Connect"]) expect(t.disclosure).toContain(agency);
      expect(t.noCharge).toBeTruthy(); expect(t.successBody).toBeTruthy();
    }
  });
});
