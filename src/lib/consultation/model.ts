import { z } from "zod";

export const TERMS_VERSION = "consultation-2026-11-11-draft-1";
export const PRIVACY_VERSION = "privacy-2026-11-11-draft-1";
export const PACKAGES = {
  standard: { priceCents: 5900, minutes: 30 },
  expert: { priceCents: 9900, minutes: 60 },
} as const;
export type Package = keyof typeof PACKAGES;
export const BOOKING_STATUSES = ["requested", "confirmed", "completed", "cancelled"] as const;
export const PAYMENT_STATUSES = ["not_started", "pending", "paid", "refunded"] as const;
type BookingStatus = typeof BOOKING_STATUSES[number];
type PaymentStatus = typeof PAYMENT_STATUSES[number];
export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return ({ requested: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled"], completed: [], cancelled: [] } as Record<BookingStatus, BookingStatus[]>)[from].includes(to);
}
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return ({ not_started: ["pending"], pending: ["paid", "not_started"], paid: ["refunded"], refunded: [] } as Record<PaymentStatus, PaymentStatus[]>)[from].includes(to);
}

const clean = (max: number) => z.string().trim().min(1).max(max).refine((s) => !/[\u0000-\u001f\u007f]/.test(s));
export const BookingInput = z.strictObject({
  requestId: z.uuid(),
  package: z.enum(["standard", "expert"]),
  name: clean(100),
  email: z.email().max(254),
  language: z.enum(["en", "zh"]),
  preferredLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  timezone: clean(80).refine((s) => {
    try { new Intl.DateTimeFormat("en", { timeZone: s }); return s === "UTC" || s.includes("/"); } catch { return false; }
  }),
  topic: z.string().trim().max(500).refine((s) => !/[\u0000-\u0008\u000b-\u001f\u007f]/.test(s) && !/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/.test(s)).default(""),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  termsVersion: z.literal(TERMS_VERSION),
  privacyVersion: z.literal(PRIVACY_VERSION),
});
export type BookingRequest = z.infer<typeof BookingInput>;

/** Resolve wall time with IANA rules, rejecting DST gaps AND repeated/ambiguous times. */
export function appointmentUTC(local: string, timezone: string, now = new Date()): string | null {
  const wall = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(wall)) return null;
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const asLocal = (date: number) => {
      const p = Object.fromEntries(fmt.formatToParts(new Date(date)).map((x) => [x.type, x.value]));
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    };
    const offsets = new Set<number>();
    for (let h = -36; h <= 36; h += 6) {
      const sample = wall + h * 3600000;
      offsets.add(Date.parse(`${asLocal(sample)}:00Z`) - sample);
    }
    const matches = [...offsets].map((offset) => wall - offset).filter((utc) => asLocal(utc) === local);
    if (matches.length !== 1 || matches[0] <= now.getTime() || matches[0] > now.getTime() + 365 * 86400000) return null;
    return new Date(matches[0]).toISOString();
  } catch { return null; }
}
