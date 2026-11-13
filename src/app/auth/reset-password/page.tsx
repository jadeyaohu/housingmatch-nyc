import Link from "next/link";
import { getLang } from "@/lib/lang";
import { authConfig } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";
import { ResetPassword } from "@/components/ResetPassword";
export default async function Page() {
  const cfg = authConfig(), lang = await getLang();
  if (!cfg || !await currentUser()) return <section><h1>{lang === "zh" ? "需要有效的重置链接" : "A valid reset link is required"}</h1><Link href="/signup" className="mt-5 inline-block underline">{lang === "zh" ? "返回登录并申请新链接" : "Return to sign-in and request a new link"}</Link></section>;
  return <ResetPassword cfg={cfg} lang={lang}/>;
}
