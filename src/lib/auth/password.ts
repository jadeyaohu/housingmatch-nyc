import { z } from "zod";
export const emailInput = z.email().max(254);
export const newPassword = z.string().min(12).max(128);
export const passwordRequest = z.discriminatedUnion("action", [
  z.object({ action: z.literal("signup"), email: emailInput, password: newPassword, consent: z.literal(true) }),
  z.object({ action: z.literal("signin"), email: emailInput, password: z.string().min(1).max(128), consent: z.literal(true) }),
  z.object({ action: z.literal("reset"), email: emailInput, consent: z.literal(true) }),
]);
