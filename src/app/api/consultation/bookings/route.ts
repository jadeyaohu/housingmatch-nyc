import { NextResponse } from "next/server";
import { appointmentUTC,BookingInput } from "@/lib/consultation/model";
import { consultationConfig } from "@/lib/consultation/config";
import { saveBooking } from "@/lib/consultation/storage";
import { dispatchConsultationEmails } from "@/lib/consultation/email";
import { readBody } from "@/lib/payments/http";
export const runtime="nodejs";
const reply=(data:object,status:number)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer",...(status===429?{"Retry-After":"60"}:{})}});
export async function POST(req:Request) {
  try {
    const cfg=consultationConfig();
    if(req.headers.get("origin")!==cfg.origin) return reply({error:"forbidden"},403);
    if(req.headers.get("content-type")?.split(";")[0].trim()!=="application/json") return reply({error:"invalid_input"},400);
    let input;
    try{input=BookingInput.safeParse(JSON.parse((await readBody(req,8192)).toString("utf8")));}catch{return reply({error:"invalid_input"},400);}
    if(!input.success) return reply({error:"invalid_input"},400);
    const utc=appointmentUTC(input.data.preferredLocal,input.data.timezone);
    if(!utc) return reply({error:"invalid_input"},400);
    const result=await saveBooking(input.data,utc);
    let sent=result.acknowledgment==="sent";
    try{sent=(await dispatchConsultationEmails(result.id)).sent>0 || sent;}catch{/* Request and outbox are committed; email failure must not discard a valid receipt. */}
    return reply({...result,acknowledgment:sent?"sent":"queued"},201);
  }catch(error){
    const code=error instanceof Error?error.message:"unavailable";
    const status=({invalid_input:400,conflict:409,rate_limited:429} as Record<string,number>)[code]??503;
    return reply({error:status===503?"unavailable":code},status);
  }
}

export const maxDuration=60;
