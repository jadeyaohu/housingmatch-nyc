import "server-only";
import type Stripe from "stripe";
import { PLANS, type Plan } from "./model";
import { subscriptionStripe, subscriptionConfig } from "./config";
import { validCatalogPrice } from "./catalog";
import { betaCommand } from "./db";

export function subscriptionEntitlement(sub: Stripe.Subscription): { plan: Plan; valid_until: string | null } {
  const item = sub.items.data[0];
  const price = item?.price;
  const invoice = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
  const plan = price?.unit_amount === 499 ? "basic" : price?.unit_amount === 999 ? "smart" : "free";
  const valid = !sub.livemode && sub.status === "active" && sub.items.data.length === 1 && item.quantity === 1 &&
    Number.isSafeInteger(item.current_period_end) && item.current_period_end > Date.now()/1000 && price.currency === "usd" && price.recurring?.interval === "month" && price.recurring.interval_count === 1 &&
    invoice?.status === "paid" && invoice.amount_paid >= PLANS[plan].cents && plan !== "free";
  return { plan: valid ? plan : "free", valid_until: valid ? new Date(item.current_period_end * 1000).toISOString() : null };
}
export async function createSubscriptionCheckout(user: string, plan: "basic" | "smart") {
  const stripe = subscriptionStripe();
  const { origin } = subscriptionConfig();
  const configuredPrice=process.env[plan==="basic"?"SUBSCRIPTIONS_STRIPE_BASIC_PRICE_ID":"SUBSCRIPTIONS_STRIPE_SMART_PRICE_ID"];
  if(configuredPrice&&(!/^price_[A-Za-z0-9]+$/.test(configuredPrice)||!validCatalogPrice(await stripe.prices.retrieve(configuredPrice,{expand:["product"]}),plan)))throw new Error("unavailable");
  const previous = await betaCommand<{ attempt: string | null; session: string | null }>("checkout_info", user);
  if (previous.attempt) {
    if (!previous.session) throw new Error("busy"); // Ambiguous creation requires reconciliation, never a second purchase.
    const old = await stripe.checkout.sessions.retrieve(previous.session);
    if (old.livemode) throw new Error("forbidden");
    if (old.status !== "expired") {
      if (old.status !== "complete" || !old.subscription) throw new Error("busy");
      const sub = await stripe.subscriptions.retrieve(typeof old.subscription === "string" ? old.subscription : old.subscription.id);
      if (sub.livemode || !["canceled", "incomplete_expired"].includes(sub.status)) throw new Error("busy");
    }
    await betaCommand("checkout_clear", user, { session: previous.session });
  }
  const row = await betaCommand<{ attempt: string; customer: string | null }>("checkout_begin", user);
  const customer = row.customer ?? (await stripe.customers.create({ metadata: { housingmatch_user: user } }, { idempotencyKey: `beta-customer-${user}` })).id;
  await betaCommand("customer_attach", user, { attempt: row.attempt, customer });
  const session = await stripe.checkout.sessions.create({ mode: "subscription", customer,
    line_items: configuredPrice ? [{price:configuredPrice,quantity:1}] : [{ price_data: { currency: "usd", unit_amount: PLANS[plan].cents, recurring: { interval: "month" }, product_data: { name: `HousingMatch ${plan} — TEST` } }, quantity: 1 }],
    subscription_data: { metadata: { housingmatch_plan: plan } },
    success_url: `${origin}/pricing?checkout=returned`, cancel_url: `${origin}/pricing?checkout=cancelled`,
  }, { idempotencyKey: `beta-checkout-${row.attempt}` });
  if (session.livemode || !session.url || new URL(session.url).origin !== "https://checkout.stripe.com") throw new Error("unavailable");
  await betaCommand("checkout_attach", user, { attempt: row.attempt, customer, session: session.id });
  return session.url;
}
const id = (value: string | { id: string } | null | undefined) => typeof value === "string" ? value : value?.id;
export function eventSubscription(event: Stripe.Event) {
  if (event.type.startsWith("customer.subscription.")) return (event.data.object as Stripe.Subscription).id;
  if (event.type === "checkout.session.completed") return id((event.data.object as Stripe.Checkout.Session).subscription);
  if (event.type.startsWith("invoice.")) return id((event.data.object as Stripe.Invoice).parent?.subscription_details?.subscription);
}
/** Re-read current invoice payments on every event; a later invoice event cannot re-grant a refunded period. */
export async function currentInvoiceUnrefunded(stripe:Stripe,sub:Stripe.Subscription){
 const invoice=typeof sub.latest_invoice==='object'?sub.latest_invoice:null;if(!invoice?.id)return false;
 const payments=await stripe.invoicePayments.list({invoice:invoice.id,status:'paid',limit:100});
 if(payments.has_more||!payments.data.length)return false;
 for(const p of payments.data){
  if(id(p.invoice)!==invoice.id||p.status!=='paid')return false;
  let charge:Stripe.Charge|null=null;
  if(p.payment.type==='charge'&&p.payment.charge){const value=p.payment.charge;charge=typeof value==='string'?await stripe.charges.retrieve(value):value;}
  else if(p.payment.type==='payment_intent'&&p.payment.payment_intent){const value=p.payment.payment_intent;const intent=await stripe.paymentIntents.retrieve(typeof value==='string'?value:value.id,{expand:['latest_charge']});if(intent.livemode||intent.status!=='succeeded')return false;const c=intent.latest_charge;charge=typeof c==='string'?await stripe.charges.retrieve(c):c;}
  if(!charge||charge.livemode||id(charge.customer)!==id(sub.customer)||charge.currency!=='usd'||!charge.paid||!charge.captured||charge.refunded||charge.amount_refunded>0)return false;
 }
 return true;
}
export async function syncSubscriptionEvent(event: Stripe.Event) {
  if (event.livemode) throw new Error("forbidden");
  const supported = ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "checkout.session.completed", "invoice.paid", "invoice.payment_failed", "charge.refunded", "refund.created", "refund.updated", "refund.failed"];
  if (!supported.includes(event.type)) return;
  const stripe = subscriptionStripe();
  let subId = eventSubscription(event);
  let customer = id((event.data.object as { customer?: string | { id: string } | null }).customer);
  if(event.type.startsWith('refund.')){const refund=event.data.object as Stripe.Refund;const chargeId=id(refund.charge);if(!chargeId)return;const charge=await stripe.charges.retrieve(chargeId);if(charge.livemode)throw new Error('forbidden');customer=id(charge.customer);}
  if (!customer) return;
  const { user_id: user } = await betaCommand<{ user_id: string | null }>("customer_user", null, { customer });
  if (!user) return; // Foreign products/customers do not grant access.
  if(event.type==='charge.refunded'||event.type.startsWith('refund.')){const current=await betaCommand<{subscription:string|null;customer:string|null}>('cancel_info',user);if(current.customer!==customer)throw new Error('forbidden');subId=current.subscription??undefined;}
  if(!subId)return;
  const claim = await betaCommand<{ duplicate?: boolean; token?: string }>("webhook_begin", user, { event: event.id });
  if (claim.duplicate) return;
  try {
    // Serialize first, then retrieve authoritative current state: delayed events never replay old entitlements.
    const sub = await stripe.subscriptions.retrieve(subId, { expand: ["latest_invoice"] });
    if (id(sub.customer) !== customer || sub.livemode) throw new Error("forbidden");
    const sessions = await stripe.checkout.sessions.list({ subscription: subId, limit: 1 });
    const session = sessions.data[0];
    if (session?.livemode) throw new Error("forbidden");
    const entitlement=subscriptionEntitlement(sub);
    if(entitlement.plan!=="free"&&!await currentInvoiceUnrefunded(stripe,sub)){entitlement.plan="free";entitlement.valid_until=null;}
    await betaCommand("webhook_finish", user, { token: claim.token, event: event.id, subscription: subId,
      session: session?.id ?? null, ...entitlement, cancel_at_period_end: sub.cancel_at_period_end });
  } catch (error) {
    await betaCommand("webhook_abort", user, { token: claim.token });
    throw error;
  }
}
export async function cancelSubscription(user: string) {
  const { subscription, customer } = await betaCommand<{ subscription: string | null; customer: string | null }>("cancel_info", user);
  if (!subscription || !customer) throw new Error("forbidden");
  const stripe = subscriptionStripe();
  const sub = await stripe.subscriptions.retrieve(subscription);
  if (sub.livemode || id(sub.customer) !== customer) throw new Error("forbidden");
  await stripe.subscriptions.update(subscription, { cancel_at_period_end: true }, { idempotencyKey: `beta-cancel-${subscription}` });
  // Webhook reconciliation remains the only entitlement writer; no optimistic grant from the browser.
}
