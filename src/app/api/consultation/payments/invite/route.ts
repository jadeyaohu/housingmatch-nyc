import { z } from "zod";
import { operator } from "@/lib/payments/db";
import { invite } from "@/lib/payments/stripe";
import { failure, jsonBody, response, sameOrigin } from "@/lib/payments/http";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req); const actor = await operator(req);
    const body = z.strictObject({ bookingId: z.uuid(), availabilityAgreed: z.literal(true) }).safeParse(await jsonBody(req));
    if (!body.success) throw new Error("invalid_input");
    return response(await invite(body.data.bookingId, actor), 201);
  } catch (error) { return failure(error); }
}
