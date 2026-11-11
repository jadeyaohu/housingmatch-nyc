import Link from "next/link";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/lang";
import { boroughLabel, unitLabel } from "@/lib/i18n";
import { authConfig } from "@/lib/supabase/config";
import { currentUser, serverClient } from "@/lib/supabase/server";
import { AccountActions } from "@/components/AccountActions";
import { SavedList } from "@/components/SavedList";
import { getListings, todayNY } from "@/lib/data/listings";
import { savedItems } from "@/lib/saved";

export const dynamic = "force-dynamic";

const C = {
  en: { title: "My account", signedInAs: "Signed in as", profile: "My housing profile", none: "You haven't saved a profile yet.", take: "Find my matches", edit: "Update my answers", people: "Household size", income: "Yearly income", voucher: "Voucher", areas: "Areas", sizes: "Sizes", budget: "Rent budget", any: "Any", signOut: "Sign out", del: "Delete my saved housing data", confirm: "Delete your saved profile and all saved listings? Your sign-in account remains. This cannot be undone.", deleted: "Deleted.", error: "Could not complete this request. Please retry.", yes: "Yes", no: "No", unsure: "Not sure" },
  zh: { title: "我的账号", signedInAs: "当前登录", profile: "我的住房资料", none: "你还没有保存资料。", take: "查找我的匹配", edit: "修改我的回答", people: "家庭人数", income: "年收入", voucher: "住房补助券", areas: "区域", sizes: "户型", budget: "租金预算", any: "不限", signOut: "退出登录", del: "删除我的住房资料和收藏", confirm: "确定删除家庭资料和所有收藏吗？登录账号仍保留，删除后无法恢复。", deleted: "已删除。", error: "无法完成此请求，请重试。", yes: "有", no: "没有", unsure: "不确定" },
} as const;

export default async function Account() {
  const cfg = authConfig();
  if (!cfg) redirect("/");
  const user = await currentUser();
  if (!user) redirect("/signup?next=/account");
  const lang = await getLang();
  const t = C[lang];
  const sb = await serverClient();
  const { data: p } = (await sb?.from("household_profiles").select("*").eq("user_id", user.id).maybeSingle()) ?? { data: null };
  const { data: savedRows } = (await sb?.from("saved_listings").select("listing_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false })) ?? { data: null };
  const saved = savedItems(
    (savedRows ?? []).map((r: { listing_id: string }) => r.listing_id),
    await getListings(),
    todayNY(),
    (l) => [l.borough ? boroughLabel[lang][l.borough] : null, l.address].filter(Boolean).join(" · "),
  );
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-stone-100 py-2"><dt className="text-stone-500">{k}</dt><dd className="text-right text-stone-900">{v}</dd></div>
  );
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
      <p className="mt-1 text-sm text-stone-600">{t.signedInAs} {user.email}</p>
      <h2 className="mt-6 font-semibold">{t.profile}</h2>
      {p ? (
        <dl data-testid="profile" className="mt-2 text-sm">
          {row(t.people, p.household_size)}
          {row(t.income, `$${Number(p.annual_income).toLocaleString("en-US")}`)}
          {row(t.voucher, t[p.voucher as "yes" | "no" | "unsure"])}
          {row(t.areas, p.boroughs?.length ? p.boroughs.map((b: string) => boroughLabel[lang][b] ?? b).join(", ") : t.any)}
          {row(t.sizes, p.bedrooms?.length ? p.bedrooms.map((u: string) => unitLabel[lang][u] ?? u).join(", ") : t.any)}
          {row(t.budget, p.rent_max ? `$${Number(p.rent_max).toLocaleString("en-US")}` : t.any)}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-stone-600">{t.none}</p>
      )}
      <SavedList cfg={cfg} items={saved} lang={lang} />
      <Link href="/quiz" className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-teal-800 font-semibold text-white hover:bg-teal-900">{p ? t.edit : t.take}</Link>
      <AccountActions cfg={cfg} labels={{ signOut: t.signOut, del: t.del, confirm: t.confirm, deleted: t.deleted, error: t.error }} />
    </div>
  );
}
