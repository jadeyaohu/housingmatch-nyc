import { createHash } from "node:crypto";
import { z } from "zod";
import { consultationOperator,consultationCommand } from "@/lib/consultation/storage";
import { dispatchConsultationEmails } from "@/lib/consultation/email";
import { body,fail,reply } from "@/lib/subscriptions/http";
const input=z.object({requestId:z.uuid(),amountCents:z.union([z.literal(5900),z.literal(9900)]),currency:z.literal("usd"),reference:z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/),verified:z.literal(true)}).strict();
export async function POST(req:Request){
  try{
    const actor=await consultationOperator(req);
    if(process.env.CONSULTATION_MANUAL_TEST_VERIFICATION_ENABLED!=="true") throw new Error("unavailable");
    const parsed=input.safeParse(await body(req));if(!parsed.success)throw new Error("invalid_input");
    const {requestId,reference,...fields}=parsed.data;
    const result=await consultationCommand<object>("verify_payment",requestId,actor,{...fields,referenceHash:createHash("sha256").update(reference).digest("hex"),environment:"test"});
    // Queueing is atomic with verification; processing runs automatically here, with a durable retry route.
    try{await dispatchConsultationEmails(requestId);}catch{/* Leave the private outbox pending. */}
    return reply({...result,paymentVerified:true});
  }catch(error){return fail(error);}
}

export const maxDuration=60;
