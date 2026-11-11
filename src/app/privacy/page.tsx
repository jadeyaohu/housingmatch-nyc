import { consultationCopy } from "@/lib/consultation/content";
import { PRIVACY_VERSION } from "@/lib/consultation/model";
import { getLang } from "@/lib/lang";

const C = {
  en: {
    title: "Privacy notice",
    updated: "Draft — last updated 2026-11-09. Pending founder and legal review.",
    items: [
      ["What we collect", "Without an account: nothing is stored. Your answers are used once to compute matches and kept only in your own browser for up to 24 hours. With a free account: your email, and — only if you choose to save it — household size, yearly income, voucher status, whether someone is 62+ or has a disability, whether you live in NYCHA housing or someone is a city employee or veteran, and your area, size and budget preferences. Your ZIP code is used only to check community preferences and is never stored on our servers. If you save homes, we store which listings you saved."],
      ["What we never collect", "Social Security numbers, ID documents, pay stubs, bank information, immigration documents or your Housing Connect password."],
      ["How we use it", "Only to show your matches and send reminders you ask for. We do not sell or share your data, and we do not use it to make any housing decision — only landlords and the City do that."],
      ["Your choices", "You can delete your saved profile at any time on the My account page. To delete your account entirely, contact us."],
      ["Not a government service", "HousingMatch NYC is independent and not affiliated with NYC Housing Connect, HPD, HDC or any government agency. Applying through Housing Connect is always free."],
    ],
  },
  zh: {
    title: "隐私说明",
    updated: "草稿，最后更新 2026-11-09，待创始人和法律审核。",
    items: [
      ["我们收集什么", "未注册时：不保存任何信息。你的回答只用来计算一次匹配，并且只在你自己的浏览器里保留最多 24 小时。注册免费账号后：保存你的邮箱；只有在你选择保存时，才会保存家庭人数、年收入、是否有住房补助券、家中是否有 62 岁以上或残障成员、是否住 NYCHA 公房、家里是否有人是市政府雇员或退伍军人，以及你的区域、户型和预算偏好。你的邮编只用来判断社区优先，不会存到我们的服务器上。如果你收藏房源，我们会保存你收藏了哪些房源。"],
      ["我们绝不收集", "社会安全号、身份证件、工资单、银行信息、移民文件，或你的 Housing Connect 密码。"],
      ["我们怎么使用", "只用来显示你的匹配结果和发送你订阅的提醒。我们不会出售或分享你的数据，也不会用它做任何住房决定——住房决定只由房东和市政府做出。"],
      ["你的选择", "你可以随时在「我的账号」页面删除保存的资料。如需彻底删除账号，请联系我们。"],
      ["不是政府服务", "HousingMatch NYC 是独立的工具，与 NYC Housing Connect、HPD、HDC 或任何政府机构均无关联。通过 Housing Connect 申请始终免费。"],
    ],
  },
} as const;

export default async function Privacy() {
  const lang = await getLang();
  const t = C[lang];
  const consultation = consultationCopy[lang];
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
      <p className="mt-2 text-sm text-stone-500">{t.updated}</p>
      {t.items.map(([h, b]) => (
        <section key={h} className="mt-6">
          <h2 className="font-semibold text-stone-900">{h}</h2>
          <p className="mt-1 leading-relaxed text-stone-700">{b}</p>
        </section>
      ))}
      <section className="mt-8 border-t border-stone-200 pt-6">
        <h2 className="text-xl font-semibold">{consultation.privacy}</h2>
        <p className="mt-2 text-xs text-stone-500">{PRIVACY_VERSION} — {consultation.draft}</p>
        {consultation.privacySections.slice(1).map(([title, body]) => <section key={title} className="mt-5"><h3 className="font-semibold">{title}</h3><p className="mt-1 leading-relaxed text-stone-700">{body}</p></section>)}
      </section>
    </article>
  );
}
