import "server-only";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { betaConfig } from "./config";
import { readBody } from "@/lib/payments/http";
export const reply = (data: object, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", ...(status === 429 ? { "Retry-After": "60" } : {}) } });
export function fail(error: unknown) {
  const code = error instanceof Error ? error.message : "unavailable";
  const status = ({ unauthenticated: 401, forbidden: 403, invalid_input: 400, quota: 429, rate_limited: 429, busy: 409, duplicate: 409 } as Record<string, number>)[code] ?? 503;
  return reply({ error: status === 503 ? "unavailable" : code }, status);
}
export async function requireUser(req?: Request) {
  const cfg = betaConfig();
  if (req && req.headers.get("origin") !== cfg.origin) throw new Error("forbidden");
  const user = await currentUser();
  if (!user) throw new Error("unauthenticated");
  return user.id;
}
export async function body(req: Request) {
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new Error("invalid_input");
  try { return JSON.parse((await readBody(req, 8192)).toString("utf8")); } catch { throw new Error("invalid_input"); }
}
