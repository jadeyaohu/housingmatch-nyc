import { z } from "zod";
import { command, operator } from "@/lib/payments/db";
import { failure, jsonBody, response, sameOrigin } from "@/lib/payments/http";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req); const actor = await operator(req);
    const body = z.strictObject({ bookingId: z.uuid(), appointmentConfirmed: z.literal(true) }).safeParse(await jsonBody(req));
    if (!body.success) throw new Error("invalid_input");
    return response(await command<object>("confirm", body.data.bookingId, null, actor));
  } catch (error) { return failure(error); }
}
