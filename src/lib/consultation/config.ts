import "server-only";
import { z } from "zod";
export function consultationConfig() {
  const origin = process.env.CONSULTATION_APP_ORIGIN ?? "";
  const url = process.env.CONSULTATION_SUPABASE_URL ?? "";
  const key = process.env.CONSULTATION_SUPABASE_SERVICE_ROLE_KEY ?? "";
  const parsed = new URL(origin), database = new URL(url);
  const safe = (u: URL) => u.protocol === "https:" || (u.protocol === "http:" && ["localhost","127.0.0.1"].includes(u.hostname));
  const recipients = (process.env.CONSULTATION_TEST_RECIPIENTS ?? "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
  if (process.env.CONSULTATION_BOOKING_ENABLED !== "true" || process.env.CONSULTATION_POLICIES_APPROVED !== "true" ||
      process.env.CONSULTATION_NONPRODUCTION_APPROVED !== "true" || process.env.VERCEL_ENV === "production" ||
      parsed.origin !== origin || !safe(parsed) || !safe(database) || database.username || database.password || !key ||
      !recipients.length || recipients.some(r=>!z.email().safeParse(r).success)) throw new Error("unavailable");
  return { origin, url, key, recipients };
}
export function bookingConfigured() { try { consultationConfig(); return true; } catch { return false; } }
export function schedulingLink(): string {
  const value = process.env.CONSULTATION_TEST_SCHEDULING_URL ?? "";
  const url = new URL(value);
  if (process.env.CONSULTATION_SCHEDULING_APPROVED !== "true" || url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("unavailable");
  return url.href;
}
