"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { passwordRequest } from "@/lib/auth/password";
import { authReturnPath } from "@/lib/auth/redirect";
import type { AuthConfig } from "@/lib/supabase/config";
import type { Lang } from "@/lib/i18n";
export function PasswordAuth({ cfg, lang, next, accepted }: { cfg: AuthConfig; lang: Lang; next: string; accepted: boolean }) {
  const zh = lang === "zh", router = useRouter();
  const [action, setAction] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy || !accepted) return;
    const data = new FormData(e.currentTarget), email = String(data.get("email") ?? "").trim();
    const parsed = passwordRequest.safeParse({ action, email, password: data.get("password"), consent: accepted });
    if (!parsed.success) { setMessage(zh ? "请填写有效邮箱；新密码需为 12–128 个字符。" : "Use a valid email; new passwords must be 12–128 characters."); return; }
    setBusy(true); setMessage("");
    try {
      const sb = browserClient(cfg), redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(authReturnPath(next))}`;
      if (parsed.data.action === "reset") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=%2Fauth%2Freset-password` });
        if (error) throw error;
        setMessage(zh ? "如该邮箱可接收重置邮件，请查收并在此浏览器打开链接。" : "If this address can receive a reset email, check your inbox and open the link in this browser.");
      } else if (parsed.data.action === "signup") {
        const { data: result, error } = await sb.auth.signUp({ email, password: parsed.data.password, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        // Auto-confirmed registration is not evidence that verification emails work.
        if (result.session) { await sb.auth.signOut(); setMessage(zh ? "注册暂不可用：需先启用邮箱验证。" : "Registration unavailable: email confirmation must be enabled first."); }
        else setMessage(zh ? "如可注册，请查收验证邮件；验证前不会登录。" : "If registration is available for this address, check your verification email. You are not signed in until verified.");
      } else {
        const { data: result, error } = await sb.auth.signInWithPassword({ email, password: parsed.data.password });
        if (error || !result.user?.email_confirmed_at || !result.session) { if (result.session) await sb.auth.signOut(); throw new Error("unverified_or_invalid"); }
        router.replace(authReturnPath(next)); router.refresh();
      }
    } catch { setMessage(zh ? "无法完成请求。请核对登录信息、验证邮箱，或稍后重试。" : "Could not complete the request. Check your credentials, verify your email, or try again later."); }
    finally { setBusy(false); }
  }
  return <section data-testid="password-auth" className="mt-5">
    <div className="flex flex-wrap gap-3">{(["signin", "signup", "reset"] as const).map(key => <button key={key} type="button" disabled={busy} aria-pressed={action === key} onClick={() => { setAction(key); setMessage(""); }} className="min-h-11 rounded-lg border px-3 text-sm aria-pressed:bg-teal-50">{key === "signin" ? zh ? "登录" : "Log in" : key === "signup" ? zh ? "注册" : "Register" : zh ? "忘记密码" : "Forgot password"}</button>)}</div>
    <form onSubmit={submit} className="mt-4 space-y-4">
      <label className="block">{zh ? "电子邮箱" : "Email address"}<input name="email" type="email" autoComplete="email" required maxLength={254} className="mt-2 min-h-12 w-full rounded-xl border px-3" /></label>
      {action !== "reset" && <label className="block">{zh ? "密码" : "Password"}<input key={action} name="password" type="password" required minLength={action === "signup" ? 12 : 1} maxLength={128} autoComplete={action === "signup" ? "new-password" : "current-password"} className="mt-2 min-h-12 w-full rounded-xl border px-3" /></label>}
      <button disabled={!accepted || busy} className="min-h-12 w-full rounded-xl bg-teal-800 px-4 font-semibold text-white disabled:opacity-50">{busy ? zh ? "处理中…" : "Please wait…" : action === "signin" ? zh ? "使用密码登录" : "Log in with password" : action === "signup" ? zh ? "注册并验证邮箱" : "Register & verify email" : zh ? "发送重置邮件" : "Send reset email"}</button>
    </form>
    {message && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm">{message}</p>}
  </section>;
}
