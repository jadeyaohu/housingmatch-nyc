import type { Lang } from "../i18n";

// Uses the existing Lang/getLang cookie mechanism. Draft copy: edit and bump model versions together.
export const consultationCopy = {
  en: {
    nav: "Consultation", eyebrow: "OPTIONAL · ONE-TIME GUIDANCE", title: "Want personalized guidance on your housing applications?",
    intro: "Get one-on-one guidance from a housing specialist. Understand your eligibility, organize your documents, and navigate the NYC affordable housing application process with more confidence.",
    standard: "Standard Consultation", expert: "In-Depth Expert Review", minutes: "minutes", oneTime: "One-time purchase · not a subscription", booking: "Book a Consultation", free: "Find my matches — free", browse: "Browse housing — free",
    features: {
      standard: ["One remote consultation", "Preliminary household income and AMI analysis", "Personalized public housing opportunity suggestions", "General application preparation guidance", "AI-assisted summary with human review"],
      expert: ["One remote consultation", "Detailed review of self-employment, variable or multiple income sources, and complex households", "Human-reviewed written report", "One written follow-up question within seven calendar days"],
    },
    disclosure: "HousingMatch NYC is independent from HPD, HDC and NYC Housing Connect. Official Housing Connect applications are free. Consultation purchases do not improve selection odds. There is no housing placement or eligibility guarantee. You are requesting optional educational guidance, not an official application service.",
    draft: "Draft terms and policies — pending founder approval. Live payments are not enabled.",
    noCharge: "Submit a request only; no charge or calendar reservation. Status stays Awaiting Payment until payment is manually verified. Only then can a scheduling email be sent. Use test details only while configuration and policies are pending.",
    bookTitle: "Tell us when you’d like to talk", bookIntro: "Share only the basics. No documents or payment details are needed.",
    package: "Package", name: "Customer name", email: "Email address", language: "Consultation language", date: "Preferred date and time", timezone: "Timezone (IANA name)", timezoneHint: "For example America/New_York, Asia/Shanghai or Europe/London. This is a preference, not confirmed availability.", topic: "Consultation topic (optional, 500 characters maximum)", sensitive: "Do not include Social Security numbers, identity documents, bank statements, paystubs or other sensitive details. There are no document uploads.",
    termsConsent: "I accept the draft consultation terms and cancellation policy.", privacyConsent: "I accept the draft privacy policy and consent to using these details to handle my request.", terms: "Consultation terms", cancellation: "Cancellation policy", privacy: "Privacy policy", submit: "Send booking request", sending: "Sending…",
    unavailable: "Booking requests are not available yet. No information has been saved. Please return after setup and policy review are complete.",
    verifiedBody: "Your TEST payment has been manually verified. A scheduling invitation is queued or delivered; your appointment time is still not confirmed.", success: "Booking request received", successBody: "Status: Awaiting Payment. Your appointment is not confirmed and no payment has been charged. An acknowledgment email is queued in your selected language. Follow payment instructions only when approved and included; otherwise do not pay. A scheduling link is sent only after manual payment verification.", reference: "Request ID", invalid: "Check the required fields, consent boxes, email and timezone. Choose a future time within one year; repeated or skipped daylight-saving times are not accepted. Remove sensitive numbers from the topic.", error: "We could not verify that your request was saved. Your appointment is not confirmed. Retry without changing this form to rereuse the same submission token without creating a duplicate request.", limited: "Requests are temporarily limited. Please try again in a minute.",
    homeTitle: "Want personalized guidance on your housing applications?", homeBody: "Get one-on-one guidance from a housing specialist. Understand your eligibility, organize your documents, and navigate the NYC affordable housing application process with more confidence.",
    version: "Version", effective: "Draft only — no effective date until approved.",
    termsSections: [
      ["What you are purchasing", "Standard: $59 for 30 minutes remotely, preliminary household income/AMI analysis, public opportunity suggestions, preparation guidance and an AI-assisted summary reviewed by a human. Expert: $99 for 60 minutes remotely, more detailed complex-income/household review, a human-reviewed written report and one written follow-up question within seven calendar days after the consultation. Both are one-time purchases."],
      ["A request is not a reservation", "Submitting this form does not confirm availability, create a calendar reservation or charge you. A human must agree on the appointment with you. The request remains Awaiting Payment. An acknowledgment includes package details, price and services. Payment instructions appear only when approved/configured. A verified authorized operator must verify actual payment before a scheduling link is emailed; this does not itself confirm a slot."],
      ["Scope and limitations", "Educational guidance is not legal, tax or financial advice. We do not submit an official housing application for you. The responsible housing provider determines eligibility. No result, placement or selection odds are guaranteed."],
      ["Human review and AI", "Any promised AI-assisted summary is reviewed by a human before delivery. Do not send sensitive documents through this form. A separate approved process is required before sharing consultation information with any AI provider."],
      ["Approval required", "These terms are an editable product draft pending founder and appropriate legal review. Paid transactions are disabled. See the cancellation and privacy policies before requesting a consultation."],
    ],
    cancellationSections: [
      ["Before confirmation", "You may withdraw an unconfirmed request without a fee. Reply to the coordination email when received. No payment is collected in this phase."],
      ["Draft future policy", "Proposed for review: cancellations at least 24 hours before a confirmed appointment receive a full refund; one reschedule may be requested. Later cancellations and no-shows require human review. If HousingMatch cancels, offer a reschedule or full refund. No automatic refund decisions or payment processing are implemented."],
      ["Before payment launch", "The founder must approve cancellation, rescheduling, refund timelines, delivery expectations and customer contact arrangements before any money is accepted. This draft is not an active checkout policy."],
    ],
    privacySections: [
      ["Free matching", "The free matcher uses household inputs to calculate preliminary results without saving those inputs. Public listings and official application links remain free."],
      ["Booking requests", "If booking storage is enabled, we save your selected package, name, email, consultation language, preferred date/time/timezone, optional topic, request/payment states and versioned consent timestamps. We use them only to coordinate and deliver the requested consultation. We collect no card details and offer no document uploads."],
      ["Access and retention", "Booking records are not publicly readable. Only authorized server-side operations and designated staff may access them. Before launch, the founder must approve a retention/deletion schedule and publish a working privacy contact. Until then, keep bookings restricted to synthetic development tests."],
      ["Your choices", "Do not include SSNs, identity documents, bank statements or paystubs. You may withdraw a request or ask for correction/deletion through the coordination email once received. No consultation data is sent to analytics or an AI service by this implementation."],
    ],
  },
  zh: {
    nav: "咨询", eyebrow: "自愿选择 · 一次性指导", title: "纽约可负担住房申请太复杂？让专业顾问帮你梳理！",
    intro: "一对一了解收入与 AMI 匹配、申请材料准备和 Housing Connect 申请流程，让你的住房申请更清晰、更有条理。",
    standard: "标准咨询", expert: "深度专家评估", minutes: "分钟", oneTime: "一次性购买 · 非订阅", booking: "预约一对一咨询", free: "免费查找匹配", browse: "免费浏览房源",
    features: {
      standard: ["一次远程咨询", "家庭收入和 AMI 初步分析", "个性化公共住房机会建议", "一般申请准备指导", "AI 辅助总结，经人工审核"],
      expert: ["一次远程咨询", "针对自雇、浮动收入、多收入来源或复杂家庭情况的详细分析", "经人工审核的书面报告", "咨询后七个自然日内可提出一个书面跟进问题"],
    },
    disclosure: "HousingMatch NYC 与 HPD、HDC 及 NYC Housing Connect 均无关联。Housing Connect 官方申请免费。购买咨询不会提高住房抽签中选概率，不保证获得住房或符合资格。您申请的是自愿选择的教育性指导，而非官方申请服务。",
    draft: "条款和政策均为草案，待创始人批准。尚未启用正式付款。",
    noCharge: "仅提交咨询申请，不扣款、不预留时段。状态保持「等待付款」，须经人工核实付款后，系统才会发送预约链接。配置及政策批准前，请仅使用测试资料。",
    bookTitle: "告诉我们您希望何时沟通", bookIntro: "只需提供基本信息，无需提交文件或付款资料。",
    package: "套餐", name: "客户姓名", email: "电子邮箱", language: "咨询语言", date: "意向日期和时间", timezone: "时区（IANA 名称）", timezoneHint: "例如 America/New_York、Asia/Shanghai 或 Europe/London。此时间仅为意向，并非已确认预约。", topic: "咨询主题（选填，最多 500 个字符）", sensitive: "请勿填写社会安全号码、身份证件、银行流水、工资单或其他敏感信息。本表单不接受文件上传。",
    termsConsent: "我接受咨询条款和取消政策草案。", privacyConsent: "我接受隐私政策草案，并同意使用这些信息处理咨询申请。", terms: "咨询条款", cancellation: "取消政策", privacy: "隐私政策", submit: "提交咨询申请", sending: "提交中…",
    unavailable: "咨询申请尚未开放，未保存任何信息。请在配置和政策审核完成后再来。",
    verifiedBody: "您的测试付款已由人工核实。预约邀请已加入队列或已发送，具体预约时间仍未确认。", success: "已收到咨询申请", successBody: "状态：等待付款。您的预约尚未确认，也未自动扣款。系统已按所选语言将确认收件邮件加入队列。仅在付款方式获批且邮件提供说明后再付款，否则请勿付款。人工核实付款后，系统才会发送预约链接。", reference: "Request ID／申请编号", invalid: "请检查必填项、同意框、邮箱和时区。请选择未来一年内的时间；不接受夏令时重复或不存在的时间。请删除主题中的敏感号码。", error: "无法确认申请是否已保存，预约尚未确认。请勿更改本表单内容，直接重试以重用提交标记并避免重复申请。", limited: "申请暂时受限，请一分钟后重试。",
    homeTitle: "纽约可负担住房申请太复杂？让专业顾问帮你梳理！", homeBody: "一对一了解收入与 AMI 匹配、申请材料准备和 Housing Connect 申请流程，让你的住房申请更清晰、更有条理。",
    version: "版本", effective: "仅为草案，批准前无生效日期。",
    termsSections: [
      ["服务内容", "标准咨询：$59／30 分钟远程咨询，提供家庭收入和 AMI 初步分析、公共住房机会建议、准备指导及经人工审核的 AI 辅助总结。深度评估：$99／60 分钟，提供复杂收入或家庭情况详细分析、人工审核书面报告，以及咨询后七个自然日内的一个书面跟进问题。两者均为一次性购买。"],
      ["申请不是预约", "提交表单不代表有可用时段、完成预约或收款。必须由人工与您协商并确认时间。申请保持「等待付款」。确认收件邮件包含套餐、价格和服务内容，仅在获批并配置后提供付款说明。授权人员须人工核实实际付款后，系统才会发送预约链接；这不代表已确认时段。"],
      ["服务范围与限制", "教育性指导不是法律、税务或财务建议。我们不会代您提交官方住房申请。最终资格由住房提供方审核。不保证任何结果、住房安排或中选概率。"],
      ["人工审核与 AI", "承诺提供的 AI 辅助总结须经人工审核后交付。请勿通过本表单提交敏感文件。向任何 AI 服务商提供咨询信息前，必须另行建立经批准的流程。"],
      ["尚待批准", "条款是可编辑的产品草案，需创始人及适当法律审核。付费交易尚未启用。申请前请阅读取消政策和隐私政策。"],
    ],
    cancellationSections: [
      ["确认前", "可免费撤回未确认的申请。收到协调邮件后可直接回复。本阶段不收取费用。"],
      ["未来政策草案", "拟议政策待审核：在已确认预约前至少 24 小时取消可全额退款，可申请一次改期；较晚取消及未出席由人工审核。若 HousingMatch 取消，提供改期或全额退款。尚未实现自动退款或付款处理。"],
      ["启用付款前", "收款前，创始人须批准取消、改期、退款时限、交付预期及客户联系方式。此草案不是已生效的付款政策。"],
    ],
    privacySections: [
      ["免费匹配", "免费匹配工具使用家庭输入计算初步结果，不保存这些输入。公共房源和官方申请链接保持免费。"],
      ["咨询申请", "启用存储后，我们保存所选套餐、姓名、邮箱、咨询语言、意向日期／时间／时区、选填主题、申请与付款状态，以及带版本的同意时间。仅用于协调和提供所申请的咨询。不收集银行卡资料，也不接受文件上传。"],
      ["访问与保留", "申请记录不对公众开放，仅授权的服务端操作和指定人员可访问。上线前，创始人须批准保留／删除规则并公布有效的隐私联系方式。在此之前，仅限使用虚构的开发测试信息。"],
      ["您的选择", "请勿填写社会安全号码、身份证件、银行流水或工资单。收到协调邮件后，可回复申请撤回、更正或删除。本实现不会将咨询信息发送给分析工具或 AI 服务。"],
    ],
  },
} as const satisfies Record<Lang, object>;
