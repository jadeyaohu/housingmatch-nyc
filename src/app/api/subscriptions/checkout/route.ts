import { body, fail, reply, requireUser } from "@/lib/subscriptions/http";
import { checkoutInput } from "@/lib/subscriptions/model";
import { createSubscriptionCheckout } from "@/lib/subscriptions/stripe";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const input = checkoutInput.safeParse(await body(req));
    if (!input.success) throw new Error("invalid_input");
    return reply({ url: await createSubscriptionCheckout(user, input.data.plan) });
  } catch (error) { return fail(error); }
}
