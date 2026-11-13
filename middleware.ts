import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "./src/lib/supabase/config";
// Refresh SSR cookies before Server Components; they cannot reliably persist refreshed cookies.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const cfg = authConfig();
  if (!cfg) return response;
  const sb = createServerClient(cfg.url, cfg.key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: cookies => {
      for (const { name, value } of cookies) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
    },
  } });
  try { await sb.auth.getUser(); } catch { /* Pages still require verified getUser; never invent a session. */ }
  return response;
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"] };
