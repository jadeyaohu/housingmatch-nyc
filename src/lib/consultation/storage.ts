import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { PRIVACY_VERSION, TERMS_VERSION, type BookingRequest } from "./model";

export function bookingConfigured(): boolean {
  return process.env.CONSULTATION_BOOKING_ENABLED === "true" &&
    process.env.CONSULTATION_POLICIES_APPROVED === "true" &&
    !!process.env.CONSULTATION_SUPABASE_URL && !!process.env.CONSULTATION_SUPABASE_SERVICE_ROLE_KEY;
}
export async function saveBooking(input: BookingRequest, preferredUTC: string) {
  if (!bookingConfigured()) throw new Error("unavailable");
  const db = createClient(process.env.CONSULTATION_SUPABASE_URL!, process.env.CONSULTATION_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const fingerprint = createHash("sha256").update(JSON.stringify([
    input.package, input.name, input.email, input.language, input.preferredLocal,
    input.timezone, input.topic, TERMS_VERSION, PRIVACY_VERSION,
  ])).digest("hex");
  const { data, error } = await db.rpc("request_consultation", {
    p_id: input.requestId, p_package: input.package, p_name: input.name,
    p_email: input.email, p_language: input.language, p_local: input.preferredLocal,
    p_timezone: input.timezone, p_preferred_at: preferredUTC, p_topic: input.topic,
    p_terms: TERMS_VERSION, p_privacy: PRIVACY_VERSION, p_fingerprint: fingerprint,
  });
  if (error) {
    if (error.message === "rate_limited") throw new Error("rate_limited");
    if (error.message === "idempotency_conflict") throw new Error("conflict");
    throw new Error("unavailable");
  }
  if (!data || data !== input.requestId) throw new Error("unavailable");
  return { id: input.requestId, status: "requested" as const, paymentStatus: "not_started" as const };
}
