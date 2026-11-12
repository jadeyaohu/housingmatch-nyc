import { fail, reply, requireUser } from "@/lib/subscriptions/http";
import { betaCommand } from "@/lib/subscriptions/db";
export async function GET() {
  try { return reply(await betaCommand<object>("status", await requireUser())); }
  catch (error) { return fail(error); }
}
