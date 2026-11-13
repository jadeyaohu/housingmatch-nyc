import { authReturnPath } from "@/lib/auth/redirect";
import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

// Magic-link and Google (OAuth) landing: exchange the one-time code for a session cookie, then continue.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/quiz";
  const safeNext = authReturnPath(next);
  try {
  const sb = await serverClient();
  if (sb && code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  } catch { /* Expired codes and network failures return to sign-in without tokens in the error URL. */ }
  return NextResponse.redirect(new URL("/signup?error=link", url.origin));
}
