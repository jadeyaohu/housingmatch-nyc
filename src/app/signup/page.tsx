import { authReturnPath } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/lang";
import { authConfig } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";
import { SignupForm } from "@/components/SignupForm";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Signup({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const cfg = authConfig();
  if (!cfg) redirect("/quiz");
  const next = authReturnPath(typeof sp.next === "string" ? sp.next : null);
  if (await currentUser()) redirect(next);
  return <SignupForm cfg={cfg} lang={await getLang()} next={next} linkError={sp.error === "link"} />;
}
