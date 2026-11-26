import { z } from "zod";

// Internal plan keys stay basic/smart (Stripe TEST catalog + DB); display names are Lite/Standard.
// messages: null means unlimited daily chatbot messages. Pro ($19.99) is display-only until its
// features ship, so it is not a purchasable plan here.
export const PLANS = {
  free: { cents: 0, messages: 5 },
  basic: { cents: 499, messages: 5 },
  smart: { cents: 999, messages: null },
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
