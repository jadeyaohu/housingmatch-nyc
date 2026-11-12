import { fail, reply, requireUser } from "@/lib/subscriptions/http";
import { cancelSubscription } from "@/lib/subscriptions/stripe";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try { await cancelSubscription(await requireUser(req)); return reply({ requested: true }); }
  catch (error) { return fail(error); }
}
