import "server-only";
import { z } from "zod";

export interface ChatProvider { answer(question: string): Promise<{ answer: string; source: "faq" | "gemini" }> }
const output = z.object({ answer: z.string().trim().min(1).max(12000), source: z.enum(["faq", "gemini"]) });
export function chatConfigured() {
  if (process.env.CHAT_ENABLED !== "true" || process.env.CHAT_UPSTREAM_REVIEWED !== "true" || process.env.CHAT_DATA_POLICY_APPROVED !== "true" || process.env.VERCEL_ENV === "production") throw new Error("unavailable");
  const url = new URL(process.env.CHAT_APPS_SCRIPT_URL ?? "");
  if (url.origin !== "https://script.google.com" || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) || url.search || url.hash || url.username || url.password) throw new Error("unavailable");
  return url.href;
}
async function boundedJson(res: Response) {
  if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) throw new Error("unavailable");
  const reader = res.body?.getReader();
  if (!reader) throw new Error("unavailable");
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 65536) { await reader.cancel(); throw new Error("unavailable"); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}
export function appsScriptProvider(fetcher: typeof fetch = fetch): ChatProvider {
  return { async answer(question) {
    const url = chatConfigured();
    const signal = AbortSignal.timeout(12000);
    let res = await fetcher(url, { method: "POST", body: JSON.stringify({ question }), headers: { "Content-Type": "application/json" }, redirect: "manual", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal });
    // ContentService redirects its response to Google content hosting. Never replay the POST or forward credentials.
    if ([302, 303].includes(res.status)) {
      const target = new URL(res.headers.get("location") ?? "", url);
      if (target.origin !== "https://script.googleusercontent.com" || target.username || target.password) throw new Error("unavailable");
      await res.body?.cancel();
      res = await fetcher(target, { method: "GET", redirect: "error", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", signal });
    }
    const parsed = output.safeParse(await boundedJson(res));
    if (!parsed.success) throw new Error("unavailable");
    return parsed.data;
  } };
}
