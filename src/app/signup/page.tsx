import { previewDemoEnabled } from "@/lib/preview/config";
import { PreviewAccount } from "@/components/preview/PreviewAccount";
import Link from "next/link";
import { authReturnPath } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/lang";
import { authConfig } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";
import { SignupForm } from "@/components/SignupForm";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Signup({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = authReturnPath(typeof sp.next === "string" ? sp.next : null);
  if (previewDemoEnabled() && sp.mode === "demo") return <PreviewAccount lang={await getLang()} signup next={typeof sp.next === "string" ? next : undefined}/>;
  const cfg = authConfig();
  if (!cfg) return previewDemoEnabled() ? <PreviewAccount lang={await getLang()} signup next={typeof sp.next === "string" ? next : undefined}/> : <section><h1>Sign-in setup pending · 登录服务尚未配置</h1><Link href="/quiz">Free Quiz · 免费问卷</Link></section>;
  if (await currentUser()) redirect(next);
  return <SignupForm cfg={cfg} lang={await getLang()} next={next} linkError={sp.error === "link"} />;
}
