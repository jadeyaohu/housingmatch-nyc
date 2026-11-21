import { previewDemoEnabled } from "@/lib/preview/config";
import { getLang } from "@/lib/lang";
import { Chatbot } from "@/components/Chatbot";
import { betaConfig } from "@/lib/subscriptions/config";
import { chatConfigured } from "@/lib/chat/provider";
export default async function ChatPage() {
  let enabled = false;
  try { betaConfig(); chatConfigured(); enabled = true; } catch { /* Real provider activation is explicit. */ }
  const demo=!enabled && previewDemoEnabled();
  return <Chatbot lang={await getLang()} enabled={enabled||demo} demo={demo}/>;
}
