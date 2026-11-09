import { getLang } from "@/lib/lang";
import { Quiz } from "@/components/Quiz";
import { authConfig } from "@/lib/supabase/config";
import { currentUser, serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Find my matches · HousingMatch NYC" };
export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const lang = await getLang();
  const cfg = authConfig();
  const user = cfg ? await currentUser() : null;
  let profile = null;
  if (user) {
    const sb = await serverClient();
    const { data } = (await sb?.from("household_profiles").select("*").eq("user_id", user.id).maybeSingle()) ?? { data: null };
    if (data)
      profile = {
        boroughs: data.boroughs ?? [], bedrooms: data.bedrooms ?? [], rentMax: data.rent_max, size: data.household_size,
        income: String(data.annual_income), voucher: data.voucher, senior: data.has_member_62_plus, disability: data.has_disability,
      };
  }
  return <Quiz lang={lang} auth={cfg} signedIn={!!user} profile={profile} />;
}
