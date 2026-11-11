import { status } from "@/lib/payments/stripe";
import { failure, invitationToken, response, sameOrigin, withCookie } from "@/lib/payments/http";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req); const token = invitationToken(req);
    const { expiresAt, ...state } = await status(token);
    return withCookie(response(state), token, expiresAt, state.attemptId);
  } catch (error) { return failure(error); }
}
