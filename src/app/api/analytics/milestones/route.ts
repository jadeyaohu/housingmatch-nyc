import { betaCommand } from "@/lib/subscriptions/db";
import { requireUser, reply, fail } from "@/lib/subscriptions/http";
export async function POST(req: Request) {
  try {
    if (process.env.NEXT_PUBLIC_GTM_EVENTS_ENABLED !== "true") throw new Error("unavailable");
    return reply(await betaCommand<object>("milestones", await requireUser(req)));
  } catch (error) { return fail(error); }
}
