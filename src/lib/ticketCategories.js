import { faNum } from "./utils";

// ════════════════════════════════════════════════════════════
// دسته‌بندی تیکت‌ها + فرمت استاندارد پیام درخواست اشتراک
// (یک منبع حقیقت برای Support.jsx و Subscriptions.jsx)
// ════════════════════════════════════════════════════════════

export const TICKET_CATEGORIES = [
  { id: "question", label: "سوال و راهنمایی", hint: "هر پرسش یا ابهامی دربارهٔ کار با سایت" },
  { id: "subscription", label: "خرید یا تمدید اشتراک", hint: "درخواست فعال‌سازی یا تمدید طرح" },
  { id: "feature_request", label: "پیشنهاد ویژگی", hint: "ایده برای بهتر شدن پرس‌کاد" },
  { id: "bug", label: "گزارش خطا", hint: "چیزی درست کار نمی‌کند" },
  { id: "other", label: "موارد دیگر", hint: "موضوعی که در لیست نیست" },
];

export const CATEGORY_LABELS = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.id, c.label])
);

// وضعیت‌های جریان پرداختِ تیکت اشتراک
export const PAYMENT_FLOW = {
  pending_card: { label: "در انتظار ارسال شماره کارت", color: "orange" },
  card_sent: { label: "شماره کارت ارسال شد — در انتظار واریز", color: "male" },
  awaiting_payment: { label: "کاربر فیش واریز را فرستاد", color: "amber" },
  approved: { label: "اشتراک فعال شد", color: "green" },
  rejected: { label: "درخواست رد شد", color: "red" },
};

const fmtToman = (rial) => `${faNum(Math.round((rial || 0) / 10))} تومان`;

export const SUBSCRIPTION_DURATIONS = [
  { days: 30, label: "۱ ماهه (۳۰ روز)" },
  { days: 90, label: "۳ ماهه (۹۰ روز)" },
  { days: 180, label: "۶ ماهه (۱۸۰ روز)" },
  { days: 365, label: "۱ ساله (۳۶۵ روز)" },
];

/**
 * متن استاندارد «درخواست فعال‌سازی اشتراک».
 * عمداً هیچ درخواستی برای «شماره کارت بفرستید» ندارد؛ کاربر فقط
 * درخواست فعال‌سازی می‌دهد و مدیر خودش شماره کارت را می‌فرستد.
 */
export function buildSubscriptionActivationMessage(plan, dur) {
  const priceRial =
    dur.days === 365 ? plan.priceYearly : plan.priceMonthly * Math.round(dur.days / 30);
  const subject = `درخواست فعال‌سازی اشتراک — طرح ${plan.name} (${dur.label})`;
  const message = [
    "با سلام و احترام،",
    "",
    "درخواست فعال‌سازی اشتراک را ثبت می‌کنم:",
    "",
    `• طرح درخواستی: ${plan.name}`,
    `• شناسه طرح: ${plan.id}`,
    `• دوره اشتراک: ${dur.label}`,
    `• مبلغ فاکتور: ${fmtToman(priceRial)}`,
    "",
    "لطفاً نسبت به فعال‌سازی این طرح اقدام فرمایید. با تشکر 🙏",
  ].join("\n");
  return { subject, message, amount: fmtToman(priceRial) };
}
