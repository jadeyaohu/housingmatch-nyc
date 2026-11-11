import { getLang } from "@/lib/lang";
import { ConsultationPayment } from "@/components/ConsultationPayment";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function Page() { return <ConsultationPayment lang={await getLang()} returned />; }
