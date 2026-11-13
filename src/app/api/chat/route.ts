import { chatInput } from "@/lib/subscriptions/model";
import { betaCommand } from "@/lib/subscriptions/db";
import { body, fail, reply, requireUser } from "@/lib/subscriptions/http";
import { appsScriptProvider, chatConfigured } from "@/lib/chat/provider";
export const runtime = "nodejs";
export async function POST(req: Request) {
  let user: string | undefined, requestId: string | undefined, reserved = false;
  try {
    chatConfigured();
    user = await requireUser(req);
    const parsed = chatInput.safeParse(await body(req));
    if (!parsed.success) throw new Error("invalid_input");
    requestId = parsed.data.requestId;
    await betaCommand("reserve", user, { request_id: requestId });
    reserved = true;
    const result = await appsScriptProvider().answer(parsed.data.question);
    const usage = await betaCommand("finish", user, { request_id: requestId, success: true });
    reserved = false;
    return reply({ ...result, usage });
  } catch (error) {
    if (reserved && user && requestId) {
      try { await betaCommand("finish", user, { request_id: requestId, success: false }); }
      catch { /* Fail closed; a short reservation lease prevents indefinite blockage, no raw chat is logged. */ }
    }
    return fail(error);
  }
}
