import "server-only";
import { z } from "zod";
import { consultationConfig, schedulingLink } from "./config";
import { consultationCommand } from "./storage";
import { consultationCopy } from "./content";
import { PACKAGES, type Package } from "./model";
export type EmailMessage = {to:string;subject:string;text:string};
export type EmailJob = {id:string;token:string;kind:"acknowledgment"|"scheduling";bookingId:string;email:string;package:Package;language:"en"|"zh";priceCents:number;message:EmailMessage|null};
export interface EmailTransport { send(message:EmailMessage,idempotencyKey:string):Promise<string> }
export function renderConsultationEmail(job:EmailJob):EmailMessage {
  const zh=job.language==="zh", t=consultationCopy[job.language], pkg=PACKAGES[job.package];
  if(job.priceCents!==pkg.priceCents) throw new Error("conflict");
  const summary=`${t.reference}: ${job.bookingId}\n${t[job.package]} — $${job.priceCents/100} / ${pkg.minutes} ${t.minutes}\n${t.features[job.package].map(s=>`• ${s}`).join("\n")}`;
  let text:string;
  if(job.kind==="acknowledgment") {
    const configured=process.env.CONSULTATION_PAYMENT_INSTRUCTIONS_APPROVED==="true" ? process.env[zh?"CONSULTATION_PAYMENT_INSTRUCTIONS_ZH":"CONSULTATION_PAYMENT_INSTRUCTIONS_EN"]?.trim() : undefined;
    if(configured && (configured.length>3000 || (!!process.env.CONSULTATION_TEST_SCHEDULING_URL && configured.includes(process.env.CONSULTATION_TEST_SCHEDULING_URL)))) throw new Error("unavailable");
    const instructions=configured || (zh?"测试占位说明：付款方式尚未批准或配置，请勿付款。":"TEST placeholder: payment method is not approved/configured. Do not pay.");
    text=`${zh?"已收到您的咨询申请。状态：等待付款。":"We received your consultation request. Status: Awaiting Payment."}\n\n${summary}\n\n${instructions}\n\n${zh?"收到付款后须人工核实，之后才会发送预约链接。此邮件不确认预约时段。":"Actual payment must be manually verified before a scheduling link is emailed. This email does not confirm an appointment."}`;
  } else text=`${zh?"测试付款已由授权人员人工核实，请通过以下链接申请预约时间。":"Your TEST payment was manually verified by an authorized operator. Use this link to request an appointment time."}\n\n${summary}\n\n${schedulingLink()}\n\n${zh?"预约时段仍需确认，本邮件不是已确认的日历预约。":"The appointment time still requires confirmation; this email is not a confirmed calendar reservation."}`;
  return {to:job.email,subject:zh?(job.kind==="acknowledgment"?"已收到咨询申请 — 等待付款":"咨询测试付款已核实 — 预约时间"):(job.kind==="acknowledgment"?"Consultation request received — Awaiting Payment":"Consultation TEST payment verified — scheduling"),text:`${text}\n\n${t.disclosure}`};
}
export function emailTransport(fetcher:typeof fetch=fetch):EmailTransport|null {
  const cfg=consultationConfig();
  if(process.env.CONSULTATION_EMAIL_TEST_ENABLED!=="true") return null;
  const local=process.env.CONSULTATION_EMAIL_TEST_ENDPOINT;
  if(local) {
    const u=new URL(local);
    if(process.env.BETA_FIXTURES!=="synthetic" || process.env.CONSULTATION_SYNTHETIC_HARNESS!=="true" || u.protocol!=="http:" || u.hostname!=="127.0.0.1" || u.username || u.password || u.search || u.hash || u.pathname!=="/send") throw new Error("unavailable");
  } else if(!process.env.CONSULTATION_RESEND_API_KEY || !z.email().safeParse(process.env.CONSULTATION_EMAIL_FROM).success) return null;
  return {async send(message,key){
    if(!cfg.recipients.includes(message.to.toLowerCase())) throw new Error("forbidden");
    const response=await fetcher(local || "https://api.resend.com/emails",{method:"POST",redirect:"error",cache:"no-store",referrerPolicy:"no-referrer",signal:AbortSignal.timeout(10000),headers:{"Content-Type":"application/json","Idempotency-Key":key,...(!local?{Authorization:`Bearer ${process.env.CONSULTATION_RESEND_API_KEY}`}:{})},body:JSON.stringify({from:process.env.CONSULTATION_EMAIL_FROM || "synthetic@example.test",to:message.to,subject:message.subject,text:message.text})});
    if(!response.ok) throw new Error("unavailable");
    const data=z.object({id:z.string().min(1).max(200)}).safeParse(await response.json());
    if(!data.success) throw new Error("unavailable");
    return data.data.id;
  }};
}
export async function dispatchConsultationEmails(bookingId:string|null, transport:EmailTransport|null=emailTransport()) {
  if(!transport) return {sent:0,queued:true};
  let sent=0;
  for(let i=0;i<3;i++) {
    const job=await consultationCommand<EmailJob|null>("claim_email",bookingId);
    if(!job) break;
    try {
      const message=await consultationCommand<EmailMessage>("prepare_email",job.id,null,{token:job.token,message:job.message || renderConsultationEmail(job)});
      const providerId=await transport.send(message,`consultation-email-${job.id}`);
      await consultationCommand("complete_email",job.id,null,{token:job.token,providerId});sent++;
    } catch {
      try{await consultationCommand("release_email",job.id,null,{token:job.token});}catch{/* Lease recovery; never log email/content/provider errors. */}
      return {sent,queued:true};
    }
  }
  return {sent,queued:sent===0};
}
