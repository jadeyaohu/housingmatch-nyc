import "server-only";
import Stripe from "stripe";
import { authConfig } from "@/lib/supabase/config";

export function betaConfig() {
  const auth = authConfig();
  const origin = process.env.BETA_APP_ORIGIN ?? "";
  const u = new URL(origin);
  if (!auth || auth.project === "prod" || process.env.BETA_NONPRODUCTION_APPROVED !== "true" || process.env.BETA_SERVICES_ENABLED !== "true" || process.env.VERCEL_ENV === "production" ||
      !process.env.BETA_SUPABASE_SERVICE_ROLE_KEY || process.env.BETA_SUPABASE_URL !== auth.url ||
      u.origin !== origin || (u.protocol !== "https:" && !(u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname)))) throw new Error("unavailable");
  return { origin, url: auth.url, key: process.env.BETA_SUPABASE_SERVICE_ROLE_KEY };
}
export function subscriptionConfig() {
  const base = betaConfig();
  const key = process.env.SUBSCRIPTIONS_STRIPE_SECRET_KEY ?? "";
  const webhook = process.env.SUBSCRIPTIONS_STRIPE_WEBHOOK_SECRET ?? "";
  if (process.env.SUBSCRIPTIONS_ENABLED !== "true" || !/^sk_test_\w+$/.test(key) || !/^whsec_\w+$/.test(webhook)) throw new Error("unavailable");
  return { ...base, key, webhook };
}
export const subscriptionStripe = () => new Stripe(subscriptionConfig().key, { maxNetworkRetries: 1, timeout: 10000 });
