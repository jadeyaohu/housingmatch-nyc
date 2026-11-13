import { z } from "zod";

export const PLANS = {
  free: { cents: 0, messages: 1 },
  basic: { cents: 499, messages: 5 },
  smart: { cents: 999, messages: 15 },
} as const;
export type Plan = keyof typeof PLANS;
export const paidPlan = z.enum(["basic", "smart"]);
export const checkoutInput = z.object({ plan: paidPlan, consent: z.literal(true) }).strict();
export const chatInput = z.object({
  question: z.string().trim().min(1).max(1000).refine(s => !/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(s), "personal_data"),
  requestId: z.uuid(), consent: z.literal(true),
}).strict();
export function nyDay(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
