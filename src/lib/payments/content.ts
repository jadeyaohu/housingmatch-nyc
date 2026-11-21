export const paymentCopy = {
  en: {
    title: "Your consultation payment", badge: "STRIPE TEST MODE ONLY", intro: "An optional, one-time educational consultation. Review your package before opening Stripe’s secure test Checkout.", standard: "Standard Consultation · 30 minutes", expert: "In-Depth Expert Review · 60 minutes",
    issued: "Invitation ready", creating: "Preparing your payment", pending: "Payment pending", paid: "Test payment received", expired: "Invitation or Checkout expired", failed: "Payment was not completed", refunded: "Full test refund confirmed",
    refundPending: "Refund requested; awaiting verified Stripe confirmation. Payment remains paid until the full refund succeeds.", refundFailed: "The refund failed. Contact your operator to review and retry; no successful refund has been recorded.",
    bookingCompleted: "The appointment is marked completed.", bookingCancelled: "The booking was cancelled. Refund status is tracked separately.",
    loading: "Checking verified payment status…", pay: "Continue to Stripe test Checkout", refresh: "Check payment status", error: "This invitation is unavailable, expired or cannot be verified. Contact the operator who sent it. No payment status is inferred from this page.", retry: "We could not open Checkout. Retry the same invitation or contact your operator. Do not make a second payment through a different link.",
    unpaid: "No successful payment has been verified. If Checkout was closed, you may return to it while the session is still open.", receipt: "A verified Stripe webhook recorded this test payment. Appointment confirmation is a separate action handled by your operator.", separate: "Payment alone does not confirm an appointment. Your operator manages appointment status separately. HousingMatch NYC is independent from HPD, HDC and NYC Housing Connect. Official applications remain free; consultation does not guarantee eligibility, housing placement or selection.",
    cancelled: "Checkout was closed. This does not cancel your booking or prove payment failed; the verified status below is authoritative.",
    closed: "You returned from Checkout. Closing or returning from Stripe is not evidence of payment or refund.", test: "Use Stripe’s synthetic test payment details only. Never enter real card or applicant information in this development flow.", free: "Continue free housing matching", confirmed: "An operator separately confirmed the appointment.", notConfirmed: "Appointment not confirmed.", privacy: "Privacy policy", terms: "Consultation terms", cancellation: "Cancellation policy",
  },
  zh: {
    title: "您的咨询付款", badge: "仅限 STRIPE 测试模式", intro: "自愿选择的一次性教育咨询。请先核对套餐，再前往 Stripe 安全测试收银台。", standard: "标准咨询 · 30 分钟", expert: "深度专家评估 · 60 分钟",
    issued: "付款邀请已就绪", creating: "正在准备付款", pending: "付款处理中", paid: "已收到测试付款", expired: "邀请或付款会话已过期", failed: "付款未完成", refunded: "已确认全额测试退款",
    refundPending: "已申请退款，正在等待 Stripe 核验确认。全额退款成功前，付款状态仍为已付款。", refundFailed: "退款失败，请联系工作人员审核并重试，尚未记录成功退款。",
    bookingCompleted: "咨询已标记为完成。", bookingCancelled: "咨询申请已取消，退款状态另行记录。",
    loading: "正在查询已核验的付款状态…", pay: "前往 Stripe 测试收银台", refresh: "查询付款状态", error: "此邀请不可用、已过期或无法核验。请联系发送邀请的工作人员。本页面不会自行推断付款状态。", retry: "无法打开收银台。请使用同一邀请重试或联系工作人员。请勿使用其他链接再次付款。",
    unpaid: "尚未核实成功付款。如已关闭收银台，可在会话仍有效时返回。", receipt: "已验证的 Stripe Webhook 已记录此测试付款。预约确认由工作人员另行处理。", separate: "付款本身不代表预约已确认，预约状态由工作人员另行管理。HousingMatch NYC 与 HPD、HDC 及 NYC Housing Connect 无关联。官方申请仍免费；咨询不保证符合资格、获得住房或中选。",
    cancelled: "已关闭收银台。这不会取消咨询申请，也不代表付款失败；请以以下已核验状态为准。",
    closed: "您已从收银台返回。关闭或返回 Stripe 不代表付款或退款成功。", test: "仅使用 Stripe 虚构测试付款信息。请勿在此开发流程中填写真实银行卡或申请人资料。", free: "继续免费住房匹配", confirmed: "工作人员已另行确认预约。", notConfirmed: "预约尚未确认。", privacy: "隐私政策", terms: "咨询条款", cancellation: "取消政策",
  },
} as const;
