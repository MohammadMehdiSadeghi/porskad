// ══════════════════════════════════════════════════════════════
// طرح‌ها و تعرفه‌های اشتراک پرس‌کاد (منطبق با پرس‌لاین)
// ══════════════════════════════════════════════════════════════
import { supabase } from "./supabaseClient.js";

export const PLANS = {
  free: {
    id: "free",
    name: "رایگان",
    nameEn: "Free",
    badgeColor: "gray",
    priceMonthly: 0,
    priceYearly: 0,
    description: "شروع سریع برای ساخت فرم‌های ساده و آزمون‌های پایه",
    monthlyResponsesLimit: 100,
    maxForms: 5,
    storageMb: 100, // 100 مگابایت
    features: [
      { text: "۱۰۰ پاسخ ماهانه", included: true },
      { text: "تعداد نامحدود سوال در هر فرم", included: true },
      { text: "افزودن ویدیو و تصویر به سوال‌ها", included: true },
      { text: "قالب‌ها و رنگ‌بندی اختصاصی", included: true },
      { text: "پایپینگ پاسخ (Piping)", included: true },
      { text: "اشتراک‌گذاری: لینک، QR، شبکه‌های اجتماعی", included: true },
      { text: "نمایش: آی‌فریم، پاپ‌آپ، اسلایدر و ویجت", included: true },
      { text: "افزونه وردپرس و کدهای Embed", included: true },
      { text: "خروجی داده‌ها به صورت Excel و CSV", included: true },
      { text: "نمودارهای گرافیکی و آمار توصیفی", included: true },
      { text: "تنظیم مدت زمان پاسخ‌دهی و زمان‌بندی", included: true },
      { text: "تصادفی‌سازی سوالات و گزینه‌ها", included: true },
      { text: "شرط‌گذاری و انشعاب پیشرفته (Logic)", included: false },
      { text: "سیستم نمره‌دهی و آزمون‌ساز خودکار", included: false },
      { text: "آپلود فایل توسط پاسخ‌دهنده", included: false },
      { text: "درگاه پرداخت آنلاین داخل فرم", included: false },
      { text: "احراز هویت پیامکی و ایمیلی پاسخ‌دهنده", included: false },
      { text: "وب‌هوک لحظه‌ای (Webhook) و Google Sheets", included: false },
    ],
  },
  pro: {
    id: "pro",
    name: "حرفه‌ای",
    nameEn: "Professional",
    badgeColor: "teal",
    isPopular: true,
    priceMonthly: 30000, // 30,000 تومان = 300,000 ریال
    priceYearly: 300000, // با ۱۷٪ تخفیف سالانه
    description: "فرم‌سازی پیشرفته، آزمون‌ساز با تصحیح خودکار، آپلود فایل و درگاه پرداخت",
    monthlyResponsesLimit: 4000, // سقف منصفانه ۴ هزار پاسخ
    maxForms: 50,
    storageMb: 2048, // ۲ گیگابایت
    features: [
      { text: "همه امکانات طرح رایگان", included: true },
      { text: "۴,۰۰۰ پاسخ در ماه (استفاده منصفانه)", included: true },
      { text: "۵۰ فرم فعال همزمان", included: true },
      { text: "۲ گیگابایت فضای آپلود فایل", included: true },
      { text: "افزودن شرط به پرسشنامه (Logic & Branching)", included: true },
      { text: "افزودن امتیاز و محاسبات به پرسشنامه (کوییز)", included: true },
      { text: "تعریف کلید و تصحیح خودکار آزمون", included: true },
      { text: "آپلود فایل توسط پاسخ‌دهنده (تصویر، PDF، صوت، ویدیو)", included: true },
      { text: "درگاه پرداخت آنلاین و صدور فاکتور", included: true },
      { text: "اطلاع‌رسانی ایمیلی و تلگرامی به طراح و پاسخ‌دهنده", included: true },
      { text: "سفارشی‌سازی کامل صفحه پایان و پیام خروج", included: true },
      { text: "زیردامنه و لینک اختصاصی فرم", included: true },
      { text: "جلوگیری از ثبت چندباره پاسخ (IP / Fingerprint)", included: true },
      { text: "تنظیم سقف و ظرفیت ثبت پاسخ (فرم نوبت‌دهی)", included: true },
      { text: "دکمه چت مستقیم واتساپ با پاسخ‌دهنده", included: true },
      { text: "احراز هویت پیامکی و OTP پاسخ‌دهنده", included: false },
      { text: "متغیرهای محاسباتی و اطلاعات مخفی (Hidden Fields)", included: false },
      { text: "وب‌هوک لحظه‌ای (Webhook) و اتصال به Google Sheets", included: false },
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "سازمانی",
    nameEn: "Enterprise",
    badgeColor: "orange",
    isEnterprise: true,
    priceMonthly: 70000, // 70,000 تومان = 700,000 ریال
    priceYearly: 700000, // با ۱۷٪ تخفیف سالانه
    description: "تیم‌ها، احراز هویت پیامکی، وب‌هوک، متغیرهای مخفی و گزارش‌ساز چندلایه",
    monthlyResponsesLimit: 12000, // سقف منصفانه ۱۲ هزار پاسخ
    maxForms: 999999, // نامحدود
    storageMb: 4096, // ۴ گیگابایت
    features: [
      { text: "همه امکانات طرح حرفه‌ای", included: true },
      { text: "۱۲,۰۰۰ پاسخ در ماه (استفاده منصفانه)", included: true },
      { text: "تعداد نامحدود فرم فعال", included: true },
      { text: "۴ گیگابایت فضای آپلود فایل", included: true },
      { text: "احراز هویت پاسخ‌دهندگان از طریق پیامک (SMS OTP) و ایمیل", included: true },
      { text: "متغیرهای محاسباتی، فرمول‌نویسی و محاسبه‌گر پیشرفته", included: true },
      { text: "درج اطلاعات مخفی (Hidden Fields / URL parameters)", included: true },
      { text: "اطلاع‌رسانی پیامکی (SMS) به پاسخ‌دهنده و طراح", included: true },
      { text: "ثبت موقعیت مکانی پاسخ‌دهندگان (Geo-tagging)", included: true },
      { text: "وب‌هوک اختصاصی (Webhook) برای ارسال پاسخ‌ها به سیستم مشتری", included: true },
      { text: "هدایت پاسخ‌دهنده به صفحه دلخواه (Redirect on Submit)", included: true },
      { text: "یکپارچگی با Google Sheets و Zapier", included: true },
      { text: "ویرایش پاسخنامه توسط مدیر و کاربر", included: true },
      { text: "گزارش‌ساز پیشرفته با فیلترهای چندلایه و اختصاصی", included: true },
      { text: "تیم چندنفره و مدیریت نقش‌های کاربری", included: true },
    ],
  },
};

export const PLAN_ORDER = ["free", "pro", "enterprise"];

/**
 * دریافت اطلاعات طرح بر اساس شناسه
 */
export function getPlan(planId) {
  if (!planId) return PLANS.free;
  const key = String(planId).toLowerCase();
  if (key === "unlimited" || key === "enterprise") return PLANS.enterprise;
  if (key === "pro" || key === "professional") return PLANS.pro;
  return PLANS.free;
}

/**
 * بررسی اینکه آیا کاربر به یک قابلیت دسترسی دارد یا خیر
 */
export function canUserAccessFeature(profile, featureKey) {
  if (!profile) return false;
  if (profile.is_owner) return true;

  const userPlan = getPlan(profile.plan);

  switch (featureKey) {
    case "logic":
    case "scoring":
    case "file_upload":
    case "payment":
    case "whatsapp_chat":
    case "response_limit":
    case "prevent_duplicate":
    case "custom_exit":
      return userPlan.id === "pro" || userPlan.id === "enterprise";

    case "respondent_auth":
    case "sms_notification":
    case "hidden_fields":
    case "geotagging":
    case "webhook":
    case "redirect_url":
    case "google_sheets":
    case "edit_response":
    case "custom_reports":
      return userPlan.id === "enterprise";

    default:
      return true;
  }
}

/**
 * شبیه‌سازی و ثبت ارتقای اشتراک کاربر
 */
export async function upgradeUserSubscription(userId, targetPlanId, durationDays = 30) {
  try {
    const planMeta = getPlan(targetPlanId);
    const quotaResetDate = new Date();
    quotaResetDate.setDate(quotaResetDate.getDate() + durationDays);

    const updatePayload = {
      plan: planMeta.id,
      max_forms: planMeta.maxForms,
      max_responses_per_month: planMeta.monthlyResponsesLimit,
      quota_reset_at: quotaResetDate.toISOString(),
      can_use_telegram: true,
      can_export_excel: true,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, profile: data };
  } catch (err) {
    console.error("Subscription upgrade failed:", err);
    return { success: false, error: err.message };
  }
}
