import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createHash } from "node:crypto";
import { type BookingRequest } from "./model";
import { consultationConfig } from "./config";
export { bookingConfigured } from "./config";
export function consultationDb() {
  const cfg = consultationConfig();
  return createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export async function consultationCommand<T>(action: string, id: string | null = null, actor: string | null = null, data: object = {}): Promise<T> {
  const {data:result,error}=await consultationDb().rpc("native_consultation_command",{p_action:action,p_id:id,p_actor:actor,p_data:data});
  if(error) throw new Error(["forbidden","conflict","rate_limited","not_found","busy"].includes(error.message)?error.message:"unavailable");
  return result as T;
}
export async function saveBooking(input: BookingRequest, preferredUTC: string) {
  const cfg=consultationConfig();
  if(!cfg.recipients.includes(input.email.trim().toLowerCase())) throw new Error("invalid_input");
  const {submissionKey,...fields}=input;
  const fingerprint=createHash("sha256").update(JSON.stringify(fields)).digest("hex");
  const result=await consultationCommand<unknown>("request",submissionKey,null,{...fields,email:input.email.trim().toLowerCase(),preferredUTC,fingerprint});
  const receipt=z.object({id:z.uuid(),status:z.enum(["awaiting_payment","payment_verified","scheduling_invited"]),paymentStatus:z.enum(["pending","paid"]),acknowledgment:z.enum(["queued","sent"])}).safeParse(result);
  if(!receipt.success) throw new Error("unavailable");
  return receipt.data;
}
export async function consultationOperator(request: Request) {
  const cfg=consultationConfig();
  if(request.headers.get("origin")!==cfg.origin) throw new Error("forbidden");
  const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if(!token) throw new Error("forbidden");
  const {data,error}=await consultationDb().auth.getUser(token);
  if(error || !data.user) throw new Error("forbidden");
  return data.user.id; // Every privileged command independently checks admins membership in SQL.
}
