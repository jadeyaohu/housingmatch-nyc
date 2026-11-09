import { getLang } from "@/lib/lang";
import { Quiz } from "@/components/Quiz";

export const metadata = { title: "Find my matches · HousingMatch NYC" };

export default async function QuizPage() {
  const lang = await getLang();
  return <Quiz lang={lang} authEnabled={process.env.NEXT_PUBLIC_AUTH_ENABLED === "1"} />;
}
