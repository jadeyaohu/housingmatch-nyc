import type { Availability } from "@/lib/availability";
import { dict, type Lang } from "@/lib/i18n";

const style: Record<Availability, string> = {
  verified_open: "bg-teal-50 text-teal-900 ring-teal-700/20",
  verified_waitlist: "bg-sky-50 text-sky-900 ring-sky-700/20",
  unverified: "bg-stone-100 text-stone-700 ring-stone-400/30",
  confirmed_closed: "bg-stone-100 text-stone-500 ring-stone-400/30",
};

export function AvailabilityBadge({ value, lang, date }: { value: Availability; lang: Lang; date?: string | null }) {
  const label = dict[lang][`av_${value}`].replace("{date}", date ?? "");
  return (
    <span data-availability={value} className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style[value]}`}>
      {label}
    </span>
  );
}
