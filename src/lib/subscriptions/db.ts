import "server-only";
import { createClient } from "@supabase/supabase-js";
import { betaConfig } from "./config";

export async function betaCommand<T>(action: string, user: string | null, data: object = {}): Promise<T> {
  const cfg = betaConfig();
  const sb = createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: result, error } = await sb.rpc("beta_service_command", { p_action: action, p_user: user, p_data: data });
  if (error) throw new Error(["quota", "busy", "duplicate", "forbidden", "rate_limited"].includes(error.message) ? error.message : "unavailable");
  return result as T;
}
