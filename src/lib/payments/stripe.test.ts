import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ command: vi.fn(), create: vi.fn(), retrieve: vi.fn(), refundCreate: vi.fn(), refundRetrieve: vi.fn(), intent: vi.fn() }));
vi.mock("./db", () => ({ command: mocks.command }));
vi.mock("./config", () => ({ paymentConfig: () => ({ origin: "http://localhost:3000" }), stripeClient: () => ({ checkout: { sessions: { create: mocks.create, retrieve: mocks.retrieve } }, refunds: { create: mocks.refundCreate, retrieve: mocks.refundRetrieve }, paymentIntents: { retrieve: mocks.intent } }) }));
import { checkout, handleEvent, invite, refund, tokenHash, validateSession } from "./stripe";
import type { Attempt } from "./db";
const a: Attempt = { id: "f053e2b1-65c1-46db-b0c9-aa49ae28d6c1", booking_id: "da7606dc-51ef-4cb0-9918-18c8e20531aa", package_type: "standard", amount: 5900, currency: "usd", state: "creating", expires_at: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString(), checkout_started_at: new Date().toISOString(), session_id: null, intent_id: null, booking_status: "requested" };
const session = () => ({ id: "cs_test_synthetic", livemode: false, mode: "payment", amount_total: a.amount, currency: "usd", client_reference_id: a.id, metadata: { attempt_id: a.id, booking_id: a.booking_id }, status: "open", url: "https://checkout.stripe.com/c/pay/cs_test_synthetic", payment_status: "unpaid" });
const pi = () => ({ id: "pi_synthetic", livemode: false, amount: 5900, amount_received: 5900, currency: "usd", status: "succeeded", metadata: { attempt_id: a.id, booking_id: a.booking_id } });
const event = (type = "checkout.session.completed") => ({ id: "evt_synthetic", type, livemode: false, data: { object: session() } }) as unknown as Stripe.Event;
beforeEach(() => { vi.clearAllMocks(); mocks.command.mockResolvedValue(a); mocks.create.mockResolvedValue(session()); });
describe("test-mode payment orchestration", () => {
  it("stores only a hashed expiring capability and returns a fragment invitation", async () => {
    const result = await invite(a.booking_id, "operator");
    const token = new URL(result.url).hash.slice(7);
    expect(token).toHaveLength(43); expect(result.url).not.toContain("?token");
    expect(mocks.command).toHaveBeenCalledWith("invite", a.booking_id, tokenHash(token), "operator");
  });
  it.each([["standard", 5900], ["expert", 9900]] as const)("uses authoritative %s price and stable Checkout idempotency", async (pkg, amount) => {
    const attempt = { ...a, package_type: pkg, amount }; mocks.command.mockImplementation((op) => Promise.resolve(op === "reserve" ? attempt : {}));
    mocks.create.mockResolvedValue({ ...session(), amount_total: amount });
    await checkout("t".repeat(43)); await checkout("t".repeat(43));
    const [payload, options] = mocks.create.mock.calls[0];
    expect(payload.mode).toBe("payment"); expect(payload.line_items[0].price_data.unit_amount).toBe(amount);
    expect(payload.line_items[0].price_data.currency).toBe("usd");
    expect(options.idempotencyKey).toBe(`consultation-checkout:${a.id}`);
    expect(mocks.create.mock.calls[1]).toEqual(mocks.create.mock.calls[0]);
    expect(payload).not.toHaveProperty("customer_email");
  });
  it("reuses an attached session rather than creating another", async () => {
    mocks.command.mockResolvedValue({ ...a, session_id: "cs_test_synthetic" }); mocks.retrieve.mockResolvedValue(session());
    await checkout("t".repeat(43)); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("refuses expired invitation or an old ambiguous operation", async () => {
    mocks.command.mockRejectedValueOnce(new Error("expired")); await expect(checkout("t".repeat(43))).rejects.toThrow("expired");
    mocks.command.mockResolvedValue({ ...a, checkout_started_at: new Date(Date.now() - 24 * 3600000).toISOString() });
    await expect(checkout("t".repeat(43))).rejects.toThrow("expired"); expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([{ livemode: true }, { amount_total: 1 }, { currency: "eur" }, { metadata: { attempt_id: "other", booking_id: a.booking_id } }])("rejects mismatched/live Checkout objects %j", (change) => {
    expect(() => validateSession({ ...session(), ...change } as unknown as Stripe.Checkout.Session, a)).toThrow("conflict");
  });
  it("retrieves current provider state so stale expiration cannot regress a paid payment", async () => {
    mocks.retrieve.mockResolvedValue({ ...session(), status: "complete", payment_status: "paid", payment_intent: pi() });
    await handleEvent(event("checkout.session.expired"));
    expect(mocks.command).toHaveBeenLastCalledWith("event", a.id, null, null, expect.objectContaining({ next: "paid", intent_id: "pi_synthetic", event_id: "evt_synthetic" }));
    expect(mocks.command.mock.calls.some((c) => c[0] === "confirm")).toBe(false);
  });
  it("records final async failure but never trusts event payload alone", async () => {
    mocks.retrieve.mockResolvedValue({ ...session(), status: "complete", payment_status: "unpaid", payment_intent: { ...pi(), status: "requires_payment_method" } });
    await handleEvent(event("checkout.session.async_payment_failed"));
    expect(mocks.command).toHaveBeenLastCalledWith("event", a.id, null, null, expect.objectContaining({ next: "failed" }));
  });
  it("records session expiry, and replay keeps the same event identity", async () => {
    mocks.retrieve.mockResolvedValue({ ...session(), status: "expired" });
    await handleEvent(event("checkout.session.expired")); await handleEvent(event("checkout.session.expired"));
    const writes = mocks.command.mock.calls.filter((c) => c[0] === "event");
    expect(writes[0]).toEqual(writes[1]); expect(writes[0][4].next).toBe("expired");
  });
  it("rejects live events without any provider call", async () => {
    await expect(handleEvent({ ...event(), livemode: true })).rejects.toThrow("conflict"); expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it("does not turn a redirect/unpaid session into paid", async () => {
    mocks.retrieve.mockResolvedValue({ ...session(), status: "complete", payment_status: "unpaid" });
    await handleEvent(event()); expect(mocks.command).toHaveBeenLastCalledWith("event", a.id, null, null, expect.objectContaining({ next: "pending" }));
  });
  it("refund API response does not mark booking refunded; idempotency survives retries", async () => {
    const r = { id: "refund-local", booking_id: a.booking_id, attempt_id: a.id, intent_id: "pi_synthetic", amount: 5900, stripe_id: null, created_at: new Date().toISOString() };
    mocks.command.mockImplementation((op) => Promise.resolve(op === "refund_reserve" ? r : {}));
    mocks.refundCreate.mockResolvedValue({ id: "re_synthetic", amount: 5900, currency: "usd", payment_intent: "pi_synthetic", status: "succeeded" });
    expect(await refund(a.booking_id, "operator")).toEqual({ status: "pending" }); await refund(a.booking_id, "operator");
    expect(mocks.refundCreate.mock.calls[0]).toEqual(mocks.refundCreate.mock.calls[1]);
    expect(mocks.command.mock.calls.some((c) => c[0] === "event")).toBe(false);
  });
  it.each(["succeeded", "failed", "pending"])("persists verified full refund state %s", async (state) => {
    mocks.command.mockResolvedValue({ ...a, state: "paid", intent_id: "pi_synthetic" }); mocks.intent.mockResolvedValue(pi());
    mocks.refundRetrieve.mockResolvedValue({ id: "re_synthetic", amount: 5900, currency: "usd", payment_intent: "pi_synthetic", status: state, metadata: { attempt_id: a.id, booking_id: a.booking_id, refund_request_id: "refund-local" } });
    await handleEvent({ ...event("refund.updated"), data: { object: { id: "re_synthetic" } } } as Stripe.Event);
    expect(mocks.command).toHaveBeenLastCalledWith("event", a.id, null, null, expect.objectContaining({ kind: "refund", next: state }));
  });
});
