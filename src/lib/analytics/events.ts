import { CHANNELS, documentChannel } from "./acquisition";
import { z } from "zod";
export const eventSchema = z.object({
  event: z.enum(["landing_visit", "ami_quiz_complete", "account_registration", "listing_saved", "chatbot_message", "subscription_page_view", "checkout_initiated", "subscription_activated"]),
  language: z.enum(["en", "zh"]),
  channel: z.enum(CHANNELS).optional(),
  plan: z.enum(["free", "basic", "smart"]).optional(),
}).strict();
export type GtmEvent = z.infer<typeof eventSchema>;
let visit: string | undefined;
export const CONSENT_KEY = "hm-analytics-consent-v1";
export function consented() {
  try { return window.localStorage.getItem(CONSENT_KEY) === "yes"; } catch { return false; }
}
export function trackEvent(input: GtmEvent) {
  if (process.env.NEXT_PUBLIC_GTM_EVENTS_ENABLED !== "true" || typeof window === "undefined" || !consented()) return;
  const result = eventSchema.safeParse(input);
  if (!result.success) return;
  // One document-visit UUID, no URL, identity, listing ID, question, answer or household data.
  visit ??= crypto.randomUUID();
  const target = window as Window & { dataLayer?: object[] };
  target.dataLayer ??= [];
  target.dataLayer.push({ ...result.data, channel: documentChannel(), schema_version: 2, visit_id: visit });
}
