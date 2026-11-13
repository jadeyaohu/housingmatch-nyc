import { NextResponse } from "next/server";
// Pricing v3 reuses the founder's Google Form. Legacy intake/payment routes cannot be reactivated by old env flags.
export function retiredConsultation() {
  return NextResponse.json({ error: "retired", next: "/consultation" }, { status: 410, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
