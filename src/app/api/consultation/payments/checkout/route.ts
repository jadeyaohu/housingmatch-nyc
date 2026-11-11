import { checkout } from "@/lib/payments/stripe";
import { failure, invitationToken, response, sameOrigin, withCookie } from "@/lib/payments/http";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req); const token = invitationToken(req); const result = await checkout(token);
    return withCookie(response({ url: result.url }), token, result.expiresAt);
  } catch (error) { return failure(error); }
}
