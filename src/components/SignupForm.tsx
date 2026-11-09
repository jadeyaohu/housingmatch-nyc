"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import type { AuthConfig } from "@/lib/supabase/config";
import type { Lang } from "@/lib/i18n";

const C = {
  en: {
    title: "Create your free account",
    sub: "We'll email you a sign-in link — no password needed. Free, no credit card.",
    email: "Email address",
    send: "Email me a sign-in link",
    sending: "Sending…",
    sent: "Check your email. Open the link on this device to continue. (Check spam if you don't see it.)",
    error: "We couldn't send the link. Please check the email address and try again.",
    linkError: "That sign-in link didn't work or has expired. Please request a new one.",
    privacy: "We use your email only to sign you in and send the reminders you choose. We never sell your data.",
    preview: "Test environment — use a test email only.",
  },
  zh: {
    title: "免费注册账号",
    sub: "我们会把登录链接发到你的邮箱，不需要设置密码。免费，不需要信用卡。",
    email: "电子邮箱",
    send: "把登录链接发到我的邮箱",
    sending: "发送中…",
    sent: "请查收邮件，在这台设备上打开链接继续。（没收到的话请看看垃圾邮件。）",
    error: "链接发送失败，请检查邮箱地址后重试。",
    linkError: "这个登录链接无效或已过期，请重新获取。",
    privacy: "你的邮箱只用于登录和发送你选择接收的提醒。我们绝不出售你的数据。",
    preview: "测试环境，请只使用测试邮箱。",
  },
} as const;

export function SignupForm({ cfg, lang, next, linkError }: { cfg: AuthConfig; lang: Lang; next: string; linkError: boolean }) {
  const t = C[lang];
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await browserClient(cfg).auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect, shouldCreateUser: true } });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      {cfg.project === "dev" && <p className="mb-4 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900">{t.preview}</p>}
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">{t.title}</h1>
      <p className="mt-2 text-stone-600">{t.sub}</p>
      {linkError && state === "idle" && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t.linkError}</p>}
      {state === "sent" ? (
        <p data-testid="signup-sent" className="mt-6 rounded-xl bg-teal-50 p-4 text-teal-950">{t.sent}</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-800">{t.email}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 min-h-14 w-full rounded-2xl border-2 border-stone-300 px-4 text-lg outline-none focus:border-teal-700"
            />
          </label>
          <button disabled={state === "sending"} className="min-h-14 w-full rounded-2xl bg-teal-800 font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
            {state === "sending" ? t.sending : t.send}
          </button>
          {state === "error" && <p className="text-sm text-red-800">{t.error}</p>}
        </form>
      )}
      <p className="mt-6 text-xs leading-relaxed text-stone-500">{t.privacy}</p>
    </div>
  );
}
