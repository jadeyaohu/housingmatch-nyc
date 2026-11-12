import Link from "next/link";
import { getLang } from "@/lib/lang";
import { CHINESE_CONSULTATION_FORM } from "@/lib/consultation/form";
export const metadata = { referrer: "no-referrer" as const };
export default async function ConsultationPage() {
  const zh = await getLang() === "zh";
  return <article className="mx-auto max-w-3xl space-y-6">
    <p className="text-xs font-bold uppercase tracking-widest text-teal-800">{zh ? "可选中文住房教育咨询" : "Optional Chinese-language housing education"}</p>
    <h1 className="text-4xl font-bold">{zh ? "中文住房教育咨询" : "Chinese-language consultation"}</h1>
    <p className="leading-relaxed text-stone-600">{zh ? "使用已有 Google 表单提交咨询意向，不创建新的预约表格。所有安排需人工审核与确认。" : "Chinese-language consultation requests use the existing Google Form. Every appointment requires human review and confirmation. English users can continue with free tools and chatbot plans."}</p>
    <div className="grid gap-4 sm:grid-cols-2"><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">{zh ? "标准咨询" : "Standard consultation"}</h2><p className="mt-3 text-3xl font-bold">$59 <span className="text-base font-normal">/ 30 {zh ? "分钟" : "minutes"}</span></p></section><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">{zh ? "深入咨询" : "In-depth consultation"}</h2><p className="mt-3 text-3xl font-bold">$99 <span className="text-base font-normal">/ 60 {zh ? "分钟" : "minutes"}</span></p></section></div>
    <aside className="rounded-2xl bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">{zh ? "此页面为待审核的服务草案，不收款。提交意向不代表预约成功，不会自动发送确认邮件。请勿提交社安号、身份证件、工资单、银行资料等敏感信息。Google 表单由外部服务处理；其当前内容、权限和隐私设置仍待核验。" : "Draft offer pending approval. No payment is collected here. A request is not a confirmed appointment and does not trigger a confirmation email. Do not submit SSNs, identity documents, paystubs or bank details. The external Google Form's current content, permissions and privacy settings still require verification."}</aside>
    {zh && <a href={CHINESE_CONSULTATION_FORM} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-flex min-h-12 items-center rounded-xl bg-teal-800 px-6 font-semibold text-white">打开已有 Google 咨询意向表（外部网站） ↗</a>}
    <p className="text-sm leading-relaxed">{zh ? "HousingMatch NYC 独立于 HPD、HDC 和 NYC Housing Connect。官方住房申请免费。咨询仅为可选教育指导，不提高中签率，不保证资格或住房，不代办或加急官方申请。" : "HousingMatch NYC is independent of HPD, HDC and NYC Housing Connect. Official housing applications are free. Optional education never improves selection odds or guarantees eligibility or placement; no application processing or expediting service is offered."}</p>
    <div className="flex flex-wrap gap-5 text-teal-800 underline"><Link href="/quiz">{zh ? "免费资格问卷" : "Free eligibility Quiz"}</Link><Link href="/listings">{zh ? "免费房源搜索" : "Free housing search"}</Link><Link href="/pricing">{zh ? "聊天方案" : "Chatbot plans"}</Link><Link href="/privacy">{zh ? "隐私草案" : "Draft privacy notice"}</Link></div>
  </article>;
}
