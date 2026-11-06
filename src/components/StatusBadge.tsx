import type { MatchStatus } from "@/lib/types";

const styles: Record<MatchStatus, string> = {
  LIKELY_MATCH: "bg-teal-50 text-teal-900 ring-teal-700/30",
  NEEDS_REVIEW: "bg-amber-50 text-amber-900 ring-amber-600/30",
  UNLIKELY_MATCH: "bg-stone-100 text-stone-600 ring-stone-400/30",
};
const dot: Record<MatchStatus, string> = {
  LIKELY_MATCH: "bg-teal-600",
  NEEDS_REVIEW: "bg-amber-500",
  UNLIKELY_MATCH: "bg-stone-400",
};

export function StatusBadge({ status, label }: { status: MatchStatus; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} aria-hidden />
      {label}
    </span>
  );
}
