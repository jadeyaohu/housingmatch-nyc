import { previewDemoEnabled } from "@/lib/preview/config";
import { getLang } from "@/lib/lang";
import { bookingConfigured } from "@/lib/consultation/storage";
import { ConsultationBooking } from "@/components/ConsultationBooking";

export default async function BookingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const lang=await getLang(),pkg=sp.package === "expert" ? "expert" : "standard",real=bookingConfigured(),demo=!real&&previewDemoEnabled();
  return <div className="mx-auto max-w-2xl"><ConsultationBooking key={`${lang}-${pkg}`} lang={lang} initialPackage={pkg} enabled={real||demo} demo={demo}/></div>;
}
