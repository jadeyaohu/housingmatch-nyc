import Link from "next/link";
import { getLang } from "@/lib/lang";
import { previewDemoEnabled } from "@/lib/preview/config";
import { authConfig } from "@/lib/supabase/config";
import { bookingConfigured } from "@/lib/consultation/config";
export default async function Page() {
  const zh = await getLang() === "zh", demo = previewDemoEnabled(), auth = !!authConfig();
  const pending = zh ? "即将推出 · 尚未完成服务验收" : "Coming Soon · provider acceptance pending";
  const modules = [
    ["/listings", zh ? "房源浏览" : "Explore", zh ? "免费目录 · 申请前须核对官方来源、截止日期和要求" : "Free directory · verify official sources, deadlines and requirements before applying"],
    ["/quiz", zh ? "AMI 问卷与匹配" : "AMI Quiz / Match", zh ? "免费初步估算，不保证资格；不明确的规则需进一步核实" : "Free preliminary estimates; no eligibility guarantee. Unknown rules require confirmation"],
    ["/signup", zh ? "免费账号与收藏" : "Free account & saved listings", demo ? (zh ? "本地演示 · 虚构会话，真实服务待连接" : "LOCAL DEMO · synthetic session") : auth ? (zh ? "使用已配置的登录服务；仅账号本人可访问已保存资料" : "Configured sign-in provider; saved data is scoped to its owner") : pending],
    ["/chat", zh ? "AI 助手" : "Ask AI", pending],
    ["/pricing", zh ? "订阅方案" : "Subscriptions", pending],
    ["/consultation", zh ? "一对一咨询" : "Consultation", bookingConfigured() ? (zh ? "仅获批测试收件人可提交测试请求；不确认预约、不收取真实付款" : "Approved TEST recipients only; requests do not confirm appointments or charge real payments") : pending],
    ["/applications", zh ? "申请跟踪" : "Application tracking", zh ? "登录后保存个人手动记录，不代表官方申请状态" : "Sign in to save personal manual records; these are not official application statuses"],
    ["/notifications", zh ? "房源提醒" : "Listing alerts", zh ? "发送尚未启用；登录后可保存偏好" : "Delivery unavailable; sign in to save preferences"],
    ["/analytics", zh ? "创始人仪表盘" : "Founder Dashboard", pending],
  ];
  if (demo) modules.forEach(row => { if (!["/listings", "/quiz", "/signup"].includes(row[0])) row[2] = zh ? "本地演示 · 虚构操作，真实服务待连接" : "LOCAL DEMO · synthetic, no real provider operations"; });
  return <section><h1 className="text-3xl font-bold">{zh ? "关于、帮助与功能状态" : "About, help & feature status"}</h1>
    <p className="mt-4">{zh ? "官方住房申请免费，不保证中签或资格。未开放的服务不会模拟注册、付款或解答成功。" : "Official housing applications are free; no outcome or eligibility is guaranteed. Unavailable services do not simulate successful registration, payment or answers."}</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">{modules.map(([href, title, status]) => <article key={href} className="rounded-2xl border bg-white p-5"><Link href={href} className="font-semibold text-teal-900 underline">{title}</Link><p className="mt-2 text-sm">{status}</p></article>)}</div>
    <Link href="/privacy" className="mt-6 inline-block text-teal-800 underline">{zh ? "隐私说明（草案）" : "Privacy notice (draft)"}</Link>
  </section>;
}
