import { getLang } from "@/lib/lang";
import { previewDemoEnabled } from "@/lib/preview/config";
import { DemoApplications } from "@/components/preview/DemoTools";
import { currentUser } from "@/lib/supabase/server";
import { OwnedApplications } from "@/components/OwnedTools";
export default async function Page(){const lang=await getLang();if(await currentUser())return <OwnedApplications lang={lang}/>;if(previewDemoEnabled())return <DemoApplications lang={lang}/>;return <section><h1>Sign in required · 请先登录</h1><a href="/signup">My account · 我的账号</a></section>;}
