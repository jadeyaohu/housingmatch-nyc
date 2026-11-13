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
  const lang = await getLang();
  if (!cfg) return previewDemoEnabled() ? <PreviewAccount lang={await getLang()} signup next={typeof sp.next === "string" ? next : undefined}/> : <section><h1>{lang === "zh" ? "登录服务尚未配置" : "Sign-in setup pending"}</h1><p data-testid="auth-unavailable" className="mt-4 max-w-xl leading-relaxed">{lang === "zh" ? "登录服务暂未配置，当前无法注册或登录。你的资料不会被发送或保存。你仍可免费浏览房源并使用 AMI 问卷。" : "Sign-in is not configured yet, so registration and login are unavailable. Your information is not sent or stored. You can still browse housing and use the free AMI Quiz."}</p><Link href="/quiz">{lang === "zh" ? "免费问卷" : "Free Quiz"}</Link></section>;
  if (await currentUser()) redirect(next);
  return <SignupForm cfg={cfg} lang={await getLang()} next={next} linkError={sp.error === "link"} />;
}
