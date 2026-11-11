import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { PACKAGES } from "@/lib/consultation/model";
import { command, type Attempt, type RefundRequest } from "./db";
import { paymentConfig, stripeClient } from "./config";

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function validToken(token: string) { return /^[A-Za-z0-9_-]{43}$/.test(token); }
function price(a: Attempt) {
  if (a.currency !== "usd" || a.amount !== PACKAGES[a.package_type]?.priceCents) throw new Error("conflict");
}
export async function invite(booking: string, actor: string) {
  const token = randomBytes(32).toString("base64url");
  const attempt = await command<Attempt>("invite", booking, tokenHash(token), actor);
  return { url: `${paymentConfig().origin}/consultation/pay#token=${token}`, expiresAt: attempt.expires_at };
}
export async function status(token: string) {
  const a = await command<Attempt>("authorize", null, tokenHash(token));
  return { attemptId: a.id, state: a.state, package: a.package_type, amount: a.amount, currency: a.currency, bookingStatus: a.booking_status, refundStatus: a.refund_status ?? null, expiresAt: a.expires_at };
}
export async function checkout(token: string) {
  const stripe = stripeClient();
  const origin = paymentConfig().origin;
  const a = await command<Attempt>("reserve", null, tokenHash(token));
  price(a);
  // Stripe's idempotency retention is >=24 hours: never recreate an ambiguous old attempt.
  if (!a.checkout_started_at || Date.now() - Date.parse(a.checkout_started_at) > 23 * 3600000) throw new Error("expired");
  let session: Stripe.Checkout.Session;
  if (a.session_id) session = await stripe.checkout.sessions.retrieve(a.session_id);
  else session = await stripe.checkout.sessions.create({
    mode: "payment", client_reference_id: a.id,
    metadata: { booking_id: a.booking_id, attempt_id: a.id },
    payment_intent_data: { metadata: { booking_id: a.booking_id, attempt_id: a.id } },
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: a.amount, product_data: { name: a.package_type === "standard" ? "Standard Consultation — 30 minutes" : "In-Depth Expert Review — 60 minutes" } } }],
    expires_at: Math.floor(Date.parse(a.checkout_started_at) / 1000) + 1800,
    success_url: `${origin}/consultation/pay/result?attempt=${a.id}`, cancel_url: `${origin}/consultation/pay/result?attempt=${a.id}&outcome=cancelled`,
  }, { idempotencyKey: `consultation-checkout:${a.id}` });
  validateSession(session, a);
  if (session.status !== "open" || !session.url || new URL(session.url).origin !== "https://checkout.stripe.com") throw new Error("conflict");
  await command("attach", a.id, null, null, { session_id: session.id });
  return { url: session.url, expiresAt: a.expires_at, attemptId: a.id };
}
export function validateSession(s: Stripe.Checkout.Session, a: Attempt) {
  price(a);
  if (s.livemode !== false || !s.id.startsWith("cs_test_") || s.mode !== "payment" || s.amount_total !== a.amount || s.currency !== "usd" || s.client_reference_id !== a.id || s.metadata?.attempt_id !== a.id || s.metadata?.booking_id !== a.booking_id || (a.session_id && a.session_id !== s.id)) throw new Error("conflict");
}
function validateIntent(pi: Stripe.PaymentIntent, a: Attempt) {
  if (pi.livemode !== false || pi.amount !== a.amount || pi.currency !== "usd" || pi.metadata?.attempt_id !== a.id || pi.metadata?.booking_id !== a.booking_id || (a.intent_id && pi.id !== a.intent_id)) throw new Error("conflict");
}
export async function refund(booking: string, actor: string) {
  const stripe = stripeClient();
  const r = await command<RefundRequest>("refund_reserve", booking, null, actor);
  if (Date.now() - Date.parse(r.created_at) > 23 * 3600000) throw new Error("expired");
  const result = r.stripe_id ? await stripe.refunds.retrieve(r.stripe_id) : await stripe.refunds.create({
    payment_intent: r.intent_id, amount: r.amount, metadata: { refund_request_id: r.id, attempt_id: r.attempt_id, booking_id: r.booking_id },
  }, { idempotencyKey: `consultation-refund:${r.id}` });
  if (result.amount !== r.amount || result.currency !== "usd" || result.payment_intent !== r.intent_id) throw new Error("conflict");
  await command("refund_attach", r.id, null, null, { stripe_id: result.id });
  // The verified webhook, never this provider response, marks the booking refunded.
  return { status: "pending" };
}
const CHECKOUT_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"]);
const REFUND_EVENTS = new Set(["refund.created", "refund.updated", "refund.failed"]);
export async function handleEvent(event: Stripe.Event) {
  if (event.livemode !== false || event.account) throw new Error("conflict");
  const stripe = stripeClient();
  if (CHECKOUT_EVENTS.has(event.type)) {
    const object = event.data.object as Stripe.Checkout.Session;
    const a = await command<Attempt>("lookup", object.metadata?.attempt_id ?? null);
    const session = await stripe.checkout.sessions.retrieve(object.id, { expand: ["payment_intent"] });
    validateSession(session, a);
    let next = session.status === "expired" ? "expired" : "pending";
    let intent: string | null = null;
    if (session.payment_status === "paid") {
      const pi = session.payment_intent;
      if (!pi || typeof pi === "string") throw new Error("conflict");
      validateIntent(pi, a);
      if (pi.status !== "succeeded" || pi.amount_received !== a.amount) throw new Error("conflict");
      next = "paid"; intent = pi.id;
    } else if (event.type === "checkout.session.async_payment_failed" && session.status === "complete") {
      const pi = session.payment_intent;
      if (!pi || typeof pi === "string") throw new Error("conflict");
      validateIntent(pi, a);
      if (pi.status === "canceled" || pi.status === "requires_payment_method") next = "failed";
    }
    await command("event", a.id, null, null, { event_id: event.id, kind: "payment", next, session_id: session.id, intent_id: intent, amount: a.amount, currency: a.currency });
  } else if (REFUND_EVENTS.has(event.type)) {
    const object = event.data.object as Stripe.Refund;
    const current = await stripe.refunds.retrieve(object.id);
    const a = await command<Attempt>("lookup", current.metadata?.attempt_id ?? null);
    price(a);
    if (!a.intent_id || current.payment_intent !== a.intent_id || current.amount !== a.amount || current.currency !== "usd" || current.metadata?.booking_id !== a.booking_id) throw new Error("conflict");
    const pi = await stripe.paymentIntents.retrieve(a.intent_id);
    validateIntent(pi, a);
    if (pi.status !== "succeeded" || pi.amount_received !== a.amount) throw new Error("conflict");
    const next = current.status === "succeeded" ? "succeeded" : ["failed", "canceled"].includes(current.status ?? "") ? "failed" : "pending";
    await command("event", a.id, null, null, { event_id: event.id, kind: "refund", next, refund_request_id: current.metadata.refund_request_id, stripe_id: current.id, amount: current.amount, currency: current.currency });
  }
}
