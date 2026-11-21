import Link from "next/link";
import type { Lang } from "@/lib/i18n";
export function SignInToSave({ listingId, lang }: { listingId: string; lang: Lang }) {
  return <Link data-testid={`signin-save-${listingId}`} href={`/signup?next=${encodeURIComponent(`/listings/${encodeURIComponent(listingId)}`)}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline">{lang === "zh" ? "登录后收藏此房源" : "Sign in to save this home"}</Link>;
}
