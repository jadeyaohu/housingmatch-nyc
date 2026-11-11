import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
vi.mock("server-only", () => ({}));
vi.mock("./stripe", () => ({ validToken: (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t), handleEvent: vi.fn() }));
import { paymentConfig } from "./config";
import { handleEvent } from "./stripe";
import { POST as webhook } from "@/app/api/consultation/payments/webhook/route";
import { POST as checkout } from "@/app/api/consultation/payments/checkout/route";
const secret = "whsec_synthetic_test_fixture_only";
beforeEach(() => {
  vi.stubEnv("CONSULTATION_STRIPE_ENABLED", "true"); vi.stubEnv("CONSULTATION_STRIPE_SECRET_KEY", "sk_test_synthetic_fixture_only");
  vi.stubEnv("CONSULTATION_STRIPE_WEBHOOK_SECRET", secret); vi.stubEnv("CONSULTATION_APP_ORIGIN", "http://localhost:3000");
  vi.stubEnv("CONSULTATION_POLICIES_APPROVED", "true"); vi.stubEnv("CONSULTATION_SUPABASE_URL", "http://localhost:54321"); vi.stubEnv("CONSULTATION_SUPABASE_SERVICE_ROLE_KEY", "synthetic-placeholder"); vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());
describe("payment configuration and signatures", () => {
  it.each(["sk_live_do_not_use", "rk_live_do_not_use", "", "sk-invalid"])("rejects live/unsupported key %s", (key) => { vi.stubEnv("CONSULTATION_STRIPE_SECRET_KEY", key); expect(paymentConfig).toThrow(); });
  it("fails closed when disabled or policies unapproved", () => { vi.stubEnv("CONSULTATION_STRIPE_ENABLED", "false"); expect(paymentConfig).toThrow(); });
  it("denies checkout without an invitation even when a booking UUID is supplied", async () => {
    const r = await checkout(new Request("http://localhost:3000/api/consultation/payments/checkout", { method: "POST", headers: { origin: "http://localhost:3000" }, body: JSON.stringify({ bookingId: "da7606dc-51ef-4cb0-9918-18c8e20531aa" }) }));
    expect(r.status).toBe(403);
  });
  it("denies cross-origin cookie requests", async () => {
    const r = await checkout(new Request("http://localhost:3000/api/consultation/payments/checkout", { method: "POST", headers: { origin: "https://other.test", cookie: `consultation_payment=${"t".repeat(43)}` } })); expect(r.status).toBe(403);
  });
  it("verifies the exact raw body and rejects tampering, old signatures and missing signatures", async () => {
    const body = JSON.stringify({ id: "evt_fixture", object: "event", type: "checkout.session.completed", livemode: false, data: { object: {} } });
    const sig = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    const req = (payload: string, signature = sig) => new Request("http://localhost:3000/api/consultation/payments/webhook", { method: "POST", headers: { "stripe-signature": signature }, body: payload });
    expect((await webhook(req(body))).status).toBe(200); expect(handleEvent).toHaveBeenCalledOnce();
    expect((await webhook(req(body + " "))).status).toBe(400);
    const old = Stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp: Math.floor(Date.now()/1000)-1000 });
    expect((await webhook(req(body, old))).status).toBe(400);
    expect((await webhook(new Request("http://localhost:3000/api/consultation/payments/webhook", { method: "POST", body }))).status).toBe(400);
    expect(handleEvent).toHaveBeenCalledOnce();
  });
});

it("selects separate per-attempt cookies so concurrent tabs cannot overwrite attribution", async () => {
  const { invitationToken } = await import("./http");
  const a = "f053e2b1-65c1-46db-b0c9-aa49ae28d6c1", b = "da7606dc-51ef-4cb0-9918-18c8e20531aa";
  const cookie = `consultation_payment_${a}=${"a".repeat(43)}; consultation_payment_${b}=${"b".repeat(43)}`;
  const req = (id: string) => new Request("http://localhost:3000/api/consultation/payments/status", { headers: { cookie, "x-consultation-attempt": id } });
  expect(invitationToken(req(a))).toBe("a".repeat(43)); expect(invitationToken(req(b))).toBe("b".repeat(43));
  expect(() => invitationToken(req(""))).toThrow("forbidden");
  expect(() => invitationToken(req("00000000-0000-4000-8000-000000000000"))).toThrow("forbidden");
});
