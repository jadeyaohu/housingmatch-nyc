import { consultationOperator,consultationCommand } from "@/lib/consultation/storage";
import { dispatchConsultationEmails } from "@/lib/consultation/email";
import { fail,reply } from "@/lib/subscriptions/http";
export async function POST(req:Request){
  try{
    const actor=await consultationOperator(req);
    await consultationCommand("authorize_dispatch",null,actor);
    return reply(await dispatchConsultationEmails(null));
  }catch(error){return fail(error);}
}

export const maxDuration=60;
