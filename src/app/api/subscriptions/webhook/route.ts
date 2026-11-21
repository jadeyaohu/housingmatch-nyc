import { subscriptionConfig, subscriptionStripe } from "@/lib/subscriptions/config";
import { syncSubscriptionEvent } from "@/lib/subscriptions/stripe";
import { fail, reply } from "@/lib/subscriptions/http";
import { readBody } from "@/lib/payments/http";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const stripe = subscriptionStripe();
    const raw = await readBody(req, 65536);
    let event;
    try { event = stripe.webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", subscriptionConfig().webhook); }
    catch { return reply({ error: "invalid_signature" }, 400); }
    await syncSubscriptionEvent(event);
    return reply({ received: true });
  } catch (error) { return fail(error); }
}
