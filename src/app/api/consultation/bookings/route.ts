import { NextResponse } from "next/server";
import { appointmentUTC, BookingInput } from "@/lib/consultation/model";
import { bookingConfigured, saveBooking } from "@/lib/consultation/storage";

export const runtime = "nodejs";
const MAX_BYTES = 8192;
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
function reply(body: object, status: number, extra = {}) {
  return NextResponse.json(body, { status, headers: { ...headers, ...extra } });
}
export async function POST(req: Request) {
  // Browser CSRF boundary; not a substitute for the database's global submission cap.
  const internal = new URL(req.url);
  // Next may normalize req.url to localhost behind its listener/proxy. The browser's
  // Host header is authoritative for same-origin checks unless a canonical origin is pinned.
  const expectedOrigin = process.env.CONSULTATION_APP_ORIGIN ?? `${internal.protocol}//${req.headers.get("host") ?? internal.host}`;
  if (req.headers.get("origin") !== expectedOrigin) return reply({ error: "forbidden" }, 403);
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply({ error: "invalid_input" }, 415);
  if (!bookingConfigured()) return reply({ error: "unavailable" }, 503);
  const reader = req.body?.getReader();
  if (!reader) return reply({ error: "invalid_input" }, 400);
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) { await reader.cancel(); return reply({ error: "too_large" }, 413); }
      chunks.push(value);
    }
    const parsed = BookingInput.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) return reply({ error: "invalid_input" }, 400);
    const preferredUTC = appointmentUTC(parsed.data.preferredLocal, parsed.data.timezone);
    if (!preferredUTC) return reply({ error: "invalid_input" }, 400);
    try {
      return reply(await saveBooking(parsed.data, preferredUTC), 201);
    } catch (error) {
      const code = error instanceof Error ? error.message : "unavailable";
      if (code === "rate_limited") return reply({ error: code }, 429, { "Retry-After": "60" });
      if (code === "conflict") return reply({ error: code }, 409);
      return reply({ error: "unavailable" }, 503);
    }
  } catch {
    return reply({ error: "invalid_input" }, 400);
  } finally { reader.releaseLock(); }
}
