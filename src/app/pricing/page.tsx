import { getLang } from "@/lib/lang";
import { subscriptionConfig } from "@/lib/subscriptions/config";
import { SubscriptionPricing } from "@/components/SubscriptionPricing";
export default async function PricingPage() {
  let enabled = false;
  try { subscriptionConfig(); enabled=true; } catch { /* Test subscriptions stay explicitly gated. */ }
  return <SubscriptionPricing lang={await getLang()} enabled={enabled}/>;
}
