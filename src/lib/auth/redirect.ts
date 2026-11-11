/** Return a same-origin relative destination; reject protocol-relative and backslash redirects. */
export function authReturnPath(input: string | null): string {
  if (!input || !input.startsWith("/") || /[\\\u0000-\u0020]/.test(input)) return "/quiz";
  try { const u=new URL(input,"https://app.invalid"); return u.origin === "https://app.invalid" ? `${u.pathname}${u.search}${u.hash}` : "/quiz"; } catch { return "/quiz"; }
}
