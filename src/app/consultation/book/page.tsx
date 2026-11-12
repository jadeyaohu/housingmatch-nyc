import { getLang } from "@/lib/lang";
import { bookingConfigured } from "@/lib/consultation/storage";
import { ConsultationBooking } from "@/components/ConsultationBooking";

export default async function BookingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <div className="mx-auto max-w-2xl"><ConsultationBooking lang={await getLang()} initialPackage={sp.package === "expert" ? "expert" : "standard"} enabled={bookingConfigured()} /></div>;
}
