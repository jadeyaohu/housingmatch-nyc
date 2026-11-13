import "server-only";
import { NextResponse } from "next/server";
import { paymentConfig } from "./config";
import { validToken } from "./stripe";

export function response(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" } });
}
export function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "unavailable";
  const status = ({ forbidden: 403, expired: 410, conflict: 409, not_found: 404, invalid_input: 400 } as Record<string, number>)[message] ?? 503;
  return response({ error: status === 503 ? "unavailable" : message }, status);
}
export function sameOrigin(req: Request) { if (req.headers.get("origin") !== paymentConfig().origin) throw new Error("forbidden"); }
export async function readBody(req: Request, max: number): Promise<Buffer> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("invalid_input");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new Error("invalid_input"); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function jsonBody(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) throw new Error("invalid_input");
  try { return JSON.parse((await readBody(req, 2048)).toString("utf8")); } catch { throw new Error("invalid_input"); }
}
export const attemptIdValid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
function cookieName(id: string) {
  if (!attemptIdValid(id)) throw new Error("forbidden");
  return `${paymentConfig().origin.startsWith("https:") ? "__Host-" : ""}consultation_payment_${id}`;
}
export function invitationToken(req: Request) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (bearer && validToken(bearer)) return bearer;
  // Public attempt UUID is a selector only; its matching secret cookie is still mandatory.
  const name = cookieName(req.headers.get("x-consultation-attempt") ?? "");
  const token = req.headers.get("cookie")?.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${name}=`))?.split("=")[1] ?? "";
  if (!validToken(token)) throw new Error("forbidden");
  return token;
}
export function withCookie(result: NextResponse, token: string, expires: string, attemptId: string) {
  result.cookies.set(cookieName(attemptId), token, { httpOnly: true, sameSite: "lax", secure: paymentConfig().origin.startsWith("https:"), path: "/", expires: new Date(expires) });
  return result;
}
