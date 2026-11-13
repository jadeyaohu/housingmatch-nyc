"use client";
import { useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/supabase/browser";
import { newPassword } from "@/lib/auth/password";
import type { AuthConfig } from "@/lib/supabase/config";
import type { Lang } from "@/lib/i18n";
export function ResetPassword({ cfg, lang }: { cfg: AuthConfig; lang: Lang }) {
  const zh = lang === "zh";
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const form = new FormData(e.currentTarget), parsed = newPassword.safeParse(form.get("password"));
    if (!parsed.success || parsed.data !== form.get("confirmation")) { setError(true); return; }
    setBusy(true); setError(false);
    try {
      const sb = browserClient(cfg), { data, error: authError } = await sb.auth.getUser();
      if (authError || !data.user) throw new Error("unauthenticated");
      const { error: updateError } = await sb.auth.updateUser({ password: parsed.data });
      if (updateError) throw updateError;
      await sb.auth.signOut(); setDone(true);
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-md"><h1 className="text-3xl font-bold">{zh ? "设置新密码" : "Set a new password"}</h1>{done ? <p role="status" className="mt-5">{zh ? "密码已更新，请重新登录。" : "Password updated. Please log in again."} <Link href="/signup" className="underline">{zh ? "登录" : "Log in"}</Link></p> : <form onSubmit={submit} className="mt-5 space-y-4">{["password", "confirmation"].map(name => <label key={name} className="block">{name === "password" ? zh ? "新密码（12–128 字符）" : "New password (12–128 characters)" : zh ? "确认密码" : "Confirm password"}<input name={name} type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="mt-2 min-h-12 w-full rounded-xl border px-3"/></label>)}<button disabled={busy} className="min-h-12 rounded-xl bg-teal-800 px-4 text-white disabled:opacity-50">{zh ? "更新密码" : "Update password"}</button></form>}{error && <p role="alert" className="mt-4 text-red-800">{zh ? "无法更新密码。请核对密码或重新申请重置链接。" : "Could not update password. Check the passwords or request a fresh reset link."}</p>}</section>;
}
