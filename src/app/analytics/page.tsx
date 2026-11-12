import { getLang } from "@/lib/lang";
import { previewDemoEnabled } from "@/lib/preview/config";
import { DemoDashboard } from "@/components/preview/DemoTools";
export default async function Page(){const lang=await getLang();if(previewDemoEnabled())return <DemoDashboard lang={lang}/>;return <section><h1>Dashboard not connected · 仪表盘尚未连接</h1><a href="/signup">My account · 我的账号</a></section>;}
