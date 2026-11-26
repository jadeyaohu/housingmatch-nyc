import { z } from "zod";
import { body, fail, reply, requireUser } from "@/lib/subscriptions/http";
import { betaCommand } from "@/lib/subscriptions/db";
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const input = z.object({ enabled: z.boolean() }).strict().safeParse(await body(req));
    if (!input.success) throw new Error("invalid_input");
    return reply(await betaCommand<object>("alerts", user, input.data));
  } catch (error) { return fail(error); }
}
