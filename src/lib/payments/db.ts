import "server-only";
import { createClient } from "@supabase/supabase-js";
import { paymentConfig } from "./config";

export type Attempt = {
  id: string; booking_id: string; package_type: "standard" | "expert"; amount: number;
  currency: "usd"; state: "issued" | "creating" | "pending" | "paid" | "expired" | "failed" | "refunded";
  expires_at: string; created_at: string; checkout_started_at: string | null;
  session_id: string | null; intent_id: string | null; booking_status: string; refund_status?: string | null;
};
export type RefundRequest = { id: string; attempt_id: string; booking_id: string; intent_id: string; amount: number; status: string; stripe_id: string | null; created_at: string };
function db() {
  paymentConfig();
  return createClient(process.env.CONSULTATION_SUPABASE_URL!, process.env.CONSULTATION_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function command<T>(action: string, id: string | null = null, hash: string | null = null, actor: string | null = null, data: object = {}): Promise<T> {
  const { data: result, error } = await db().rpc("consultation_payment_command", { p_action: action, p_id: id, p_hash: hash, p_actor: actor, p_data: data });
  if (error) {
    const known = ["forbidden", "expired", "conflict", "not_found"];
    throw new Error(known.includes(error.message) ? error.message : "unavailable");
  }
  return result as T;
}
export async function operator(request: Request): Promise<string> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Error("forbidden");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new Error("forbidden");
  // Every privileged database operation independently verifies this user's public.admins membership.
  return data.user.id;
}
