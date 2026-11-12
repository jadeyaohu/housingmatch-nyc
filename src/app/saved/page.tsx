import { previewDemoEnabled } from "@/lib/preview/config";
import { getLang } from "@/lib/lang";
import { getListings } from "@/lib/data/listings";
import { DemoSaved } from "@/components/preview/DemoSaveButton";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
export default async function Page(){if(await currentUser())redirect("/account#saved");if(!previewDemoEnabled())redirect("/signup?next=/account");return <DemoSaved lang={await getLang()} listings={(await getListings()).map(l=>({id:l.id,title:l.projectName}))}/>;}
