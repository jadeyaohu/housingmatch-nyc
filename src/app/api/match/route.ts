import { NextResponse } from "next/server";
import { z } from "zod";
import { BOROUGHS, UNIT_TYPES } from "@/lib/types";
import { DEFAULT_CONFIG, matchAll } from "@/lib/matching/engine";
import { getListings, todayNY } from "@/lib/data/listings";
import { availabilityOf, isSecondary } from "@/lib/availability";

// Anonymous matching: input is validated, used once, and never stored or logged.
const HouseholdInput = z.object({
  size: z.number().int().min(1).max(12),
  annualIncome: z.number().int().min(0).max(5_000_000),
  boroughs: z.array(z.enum(BOROUGHS)).max(5).default([]),
  bedrooms: z.array(z.enum(UNIT_TYPES)).max(5).default([]),
  hasVoucher: z.boolean().default(false),
  hasMember62Plus: z.boolean().nullable().default(null),
  hasMember55Plus: z.boolean().nullable().default(null),
  hasDisability: z.boolean().nullable().default(null),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = HouseholdInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const listings = await getListings();
  const today = todayNY();
  const all = matchAll(parsed.data, listings, { ...DEFAULT_CONFIG, today })
    .map((r) => ({ ...r, availability: availabilityOf(r.listing, today) }))
    .filter((r) => r.availability !== "confirmed_closed");
  // Lease-up lotteries are the main result. Re-rentals / waiting lists are a separate,
  // secondary list and never counted in the main matches.
  const results = all.filter((r) => !isSecondary(r.listing));
  const rerentals = all.filter((r) => isSecondary(r.listing));
  return NextResponse.json({ results, rerentals }, { headers: { "Cache-Control": "no-store" } });
}
