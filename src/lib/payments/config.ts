import "server-only";
import Stripe from "stripe";

export function paymentConfig() {
  const key = process.env.CONSULTATION_STRIPE_SECRET_KEY ?? "";
  const webhook = process.env.CONSULTATION_STRIPE_WEBHOOK_SECRET ?? "";
  const origin = process.env.CONSULTATION_APP_ORIGIN ?? "";
  const url = new URL(origin);
  if (process.env.CONSULTATION_STRIPE_ENABLED !== "true" || !/^sk_test_\w+$/.test(key) || !webhook.startsWith("whsec_") ||
    !process.env.CONSULTATION_SUPABASE_URL || !process.env.CONSULTATION_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.CONSULTATION_POLICIES_APPROVED !== "true" || url.origin !== origin ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("unavailable");
  return { key, webhook, origin };
}
export function stripeClient() { return new Stripe(paymentConfig().key, { maxNetworkRetries: 1, timeout: 10000 }); }
