import { paymentConfig, stripeClient } from "@/lib/payments/config";
import { handleEvent } from "@/lib/payments/stripe";
import { failure, readBody, response } from "@/lib/payments/http";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const stripe = stripeClient();
    const body = await readBody(req, 65536);
    const signature = req.headers.get("stripe-signature");
    if (!signature) return response({ error: "invalid_signature" }, 400);
    let event;
    try { event = stripe.webhooks.constructEvent(body, signature, paymentConfig().webhook); }
    catch { return response({ error: "invalid_signature" }, 400); }
    await handleEvent(event);
    return response({ received: true });
  } catch (error) { return failure(error); }
}
