"use client";
import { usePreview, PreviewNotice } from "./preview/PreviewProvider";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { consultationCopy } from "@/lib/consultation/content";
import { appointmentUTC, BookingInput, PACKAGES, PRIVACY_VERSION, TERMS_VERSION, type Package } from "@/lib/consultation/model";

export function ConsultationBooking({ lang, initialPackage, enabled, demo=false }: { lang: Lang; initialPackage: Package; enabled: boolean; demo?: boolean }) {
  const t = consultationCopy[lang];
  const preview=usePreview();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"invalid" | "error" | "limited" | "unavailable" | null>(null);
  const [verified, setVerified] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const busy = useRef(false);
  const attempt = useRef<{ body: string; id: string } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !enabled) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fields = {
      package: form.get("package"), name: form.get("name"), email: form.get("email"),
      language: form.get("language"), preferredLocal: form.get("preferredLocal"), timezone: form.get("timezone"),
      topic: form.get("topic"), termsAccepted: form.get("termsAccepted") === "on", privacyAccepted: form.get("privacyAccepted") === "on",
      termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION,
    };
    const body = JSON.stringify(fields);
    if (attempt.current?.body !== body) attempt.current = { body, id: crypto.randomUUID() };
    const parsed = BookingInput.safeParse({ ...fields, submissionKey: attempt.current.id });
    if (!parsed.success) { setError("invalid"); return; }
    if(demo){
      if(!appointmentUTC(parsed.data.preferredLocal,parsed.data.timezone)){setError("invalid");return;}
      const id=crypto.randomUUID();
      preview.update(s=>({...s,requests:[...s.requests,{id,package:parsed.data.package,language:parsed.data.language,state:"awaiting_payment" as const}].slice(-5)}));
      setReference(id);setVerified(false);return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/consultation/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
        credentials: "same-origin", referrerPolicy: "no-referrer", cache: "no-store",
      });
      if (response.ok) {
        const result = await response.json();
        if (!["awaiting_payment","payment_verified","scheduling_invited"].includes(result.status) || !/^[0-9a-f-]{36}$/.test(result.id) || !["pending","paid"].includes(result.paymentStatus)) throw new Error("unexpected_response");
        setReference(result.id);
        setVerified(result.status !== "awaiting_payment");
        formElement.reset();
      } else setError(response.status === 400 ? "invalid" : response.status === 429 ? "limited" : "error");
    } catch { setError("error"); }
    finally { busy.current = false; setPending(false); }
  }
  const field = "mt-2 block w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base disabled:bg-stone-100";
  if (reference) return <><>{demo&&<PreviewNotice lang={lang}/>}</><section role="status" className="rounded-3xl border border-teal-200 bg-teal-50 p-6 sm:p-8"><h1 className="text-3xl font-bold">{t.success}</h1><p className="mt-4 leading-relaxed">{demo ? (lang==="zh"?"演示申请仅保存在会话内存中，未保存真实请求或发送邮件。状态：等待付款。请在「我的」查看演示邮件并模拟测试付款核实。":"DEMO request exists only in session memory. No real request was saved or email sent. Status: Awaiting Payment. Open My to view demo messages and simulate TEST verification.") : verified ? t.verifiedBody : t.successBody}</p><p className="mt-5 break-all text-sm">{demo?"DEMO Request ID":t.reference}: {reference}</p><Link href="/quiz" className="mt-6 inline-block font-semibold text-teal-800 underline">{t.free}</Link>{demo&&<Link href="/account" className="ml-5 min-h-11 text-teal-800 underline">{lang === "zh" ? "查看演示邮件与模拟付款核实" : "View demo inbox & simulated verification"}</Link>}</section></>;
  return <>
    {demo && <PreviewNotice lang={lang}/>}
    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.bookTitle}</h1>
    <p className="mt-3 text-stone-600">{t.bookIntro}</p>
    <p className="mt-5 rounded-xl bg-teal-50 p-4 text-sm leading-relaxed text-teal-950">{t.noCharge}</p>
    {!enabled && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-950">{t.unavailable}</p>}
    <form onSubmit={submit} className="mt-7 rounded-3xl border border-stone-200 bg-white p-5 sm:p-8" aria-label={t.booking}>
      <fieldset disabled={!enabled || pending} className="min-w-0 space-y-5">
        <legend className="sr-only">{t.booking}</legend>
        <label className="block font-medium">{t.package}<select name="package" defaultValue={initialPackage} className={field} required>{(["standard", "expert"] as const).map((key) => <option key={key} value={key}>{t[key]} — ${PACKAGES[key].priceCents / 100} / {PACKAGES[key].minutes} {t.minutes}</option>)}</select></label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block font-medium">{t.name}<input name="name" defaultValue={demo?"Demo Visitor":undefined} readOnly={demo} autoComplete="name" required maxLength={100} className={field} /></label>
          <label className="block font-medium">{t.email}<input name="email" defaultValue={demo?"demo@example.test":undefined} readOnly={demo} type="email" autoComplete="email" required maxLength={254} className={field} /></label>
        </div>
        <label className="block font-medium">{t.language}<select name="language" defaultValue={lang} className={field} required><option value="en">English</option><option value="zh">简体中文</option></select></label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block font-medium">{t.date}<input name="preferredLocal" type="datetime-local" required className={`${field} min-w-0`} /></label>
          <label className="block font-medium">{t.timezone}<input name="timezone" defaultValue="America/New_York" required maxLength={80} spellCheck={false} aria-describedby="timezone-hint" className={field} /></label>
        </div>
        <p id="timezone-hint" className="text-sm text-stone-500">{t.timezoneHint}</p>
        <label className="block font-medium">{t.topic}<textarea name="topic" rows={3} maxLength={500} aria-describedby="sensitive-hint" className={field} /></label>
        <p id="sensitive-hint" className="text-sm leading-relaxed text-stone-600">{t.sensitive}</p>
        <p className="text-sm text-amber-900">{t.draft}</p>
        <div className="flex flex-wrap gap-4 text-sm text-teal-800 underline"><Link href="/consultation/terms" target="_blank" rel="noopener noreferrer">{t.terms}</Link><Link href="/consultation/cancellation" target="_blank" rel="noopener noreferrer">{t.cancellation}</Link><Link href="/privacy" target="_blank" rel="noopener noreferrer">{t.privacy}</Link></div>
        <label className="flex items-start gap-3 text-sm leading-relaxed"><input name="termsAccepted" type="checkbox" required className="mt-1 size-4 shrink-0 accent-teal-800" /><span>{t.termsConsent}</span></label>
        <label className="flex items-start gap-3 text-sm leading-relaxed"><input name="privacyAccepted" type="checkbox" required className="mt-1 size-4 shrink-0 accent-teal-800" /><span>{t.privacyConsent}</span></label>
        <button type="submit" className="w-full rounded-xl bg-teal-800 px-5 py-3 font-semibold text-white hover:bg-teal-900 disabled:opacity-50">{pending ? t.sending : t.submit}</button>
      </fieldset>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-relaxed text-red-900">{t[error]}</p>}
    </form>
    <p className="mt-6 text-sm leading-relaxed text-stone-600">{t.disclosure}</p>
  </>;
}
