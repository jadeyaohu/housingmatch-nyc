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
    google: "Continue with Google",
    subGoogle: "No password needed. Free, no credit card.",
    or: "or use your email",
    googleError: "Google sign-in didn't work. Please try again or use your email.",
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
    google: "用 Google 账号继续",
    subGoogle: "不需要设置密码。免费，不需要信用卡。",
    or: "或者用邮箱",
    googleError: "Google 登录没有成功，请重试或改用邮箱。",
  },
} as const;

export function SignupForm({ cfg, lang, next, linkError }: { cfg: AuthConfig; lang: Lang; next: string; linkError: boolean }) {
  const t = C[lang];
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [gState, setGState] = useState<"idle" | "going" | "error">("idle");

  async function google() {
    setGState("going");
    const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await browserClient(cfg).auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect } });
    if (error) setGState("error"); // on success the browser navigates to Google
  }

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
      <p className="mt-2 text-stone-600">{cfg.google || !cfg.email ? t.subGoogle : t.sub}</p>
      {linkError && state === "idle" && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t.linkError}</p>}
      {state === "sent" ? (
        <p data-testid="signup-sent" className="mt-6 rounded-xl bg-teal-50 p-4 text-teal-950">{t.sent}</p>
      ) : (
        <>
        {cfg.google && (
          <div className="mt-6">
            <button
              type="button"
              data-testid="google-signin"
              onClick={google}
              disabled={gState === "going"}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-stone-300 bg-white font-semibold text-stone-900 hover:bg-stone-50 disabled:opacity-60"
            >
              <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              {t.google}
            </button>
            {gState === "error" && <p className="mt-2 text-sm text-red-800">{t.googleError}</p>}
            {cfg.email && <p className="mt-6 text-center text-sm text-stone-500">{t.or}</p>}
          </div>
        )}
        {cfg.email && (
        <form onSubmit={submit} className={cfg.google ? "mt-4 space-y-4" : "mt-6 space-y-4"}>
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
        </>
      )}
      <p className="mt-6 text-xs leading-relaxed text-stone-500">{t.privacy}</p>
    </div>
  );
}
