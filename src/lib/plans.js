// ══════════════════════════════════════════════════════════════
// طرح‌ها و تعرفه‌های اشتراک پرس‌کاد (منطبق با پرس‌لاین)
// منبع حقیقت: جدول system_settings با کلید plans_config
// (پنل «مدیریت اشتراک‌ها» در /admin/plans-settings آن را ویرایش می‌کند)
// localStorage فقط به‌عنوان کش محلی برای رندر همزمان استفاده می‌شود.
// ══════════════════════════════════════════════════════════════
import { supabase } from "./supabaseClient.js";

export const DEFAULT_PLANS = {
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
      { text: "۵ فرم فعال همزمان", included: true },
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

export const PLANS = DEFAULT_PLANS;
export const PLANS_CONFIG_KEY = "porskad_plans_config";
const PLANS_DB_KEY = "plans_config";

// کلیدهای جای‌رفتهٔ پلن → نام ستون در پروفایل (برای نگاشت امکانات به پرچم‌ها)
export const PLAN_FEATURE_COLUMNS = {
  telegram: "can_use_telegram",
  excel: "can_export_excel",
  logic: "can_use_logic",
  file_upload: "can_upload_files",
  sms: "can_use_sms",
  webhook: "can_use_webhooks",
  branding: "can_remove_branding",
};

/**
 * لیست کلید طرح‌ها — همیشه شامل سه طرح پایه و هر طرح سفارشی‌ای
 * که سوپرادمین در پنل مدیریت اشتراک‌ها ساخته است.
 */
export function getPlanIds(config) {
  const cfg = config || getPlansSnapshot();
  const base = ["free", "pro", "enterprise"];
  const extras = Object.keys(cfg).filter((k) => !k.startsWith("_") && !base.includes(k));
  const all = [...base, ...extras];
  if (Array.isArray(cfg._planOrder) && cfg._planOrder.length) {
    const ordered = cfg._planOrder.filter((k) => all.includes(k));
    const rest = all.filter((k) => !ordered.includes(k));
    return [...ordered, ...rest];
  }
  return all;
}

// سازگاری با نام قبلی
export const PLAN_ORDER = ["free", "pro", "enterprise"];

function sanitizeConfig(raw) {
  const out = {};
  for (const key of Object.keys(DEFAULT_PLANS)) {
    out[key] = { ...DEFAULT_PLANS[key], ...(raw[key] || {}) };
    out[key].id = key;
  }
  for (const key of Object.keys(raw)) {
    if (key.startsWith("_")) continue; // متادیتای داخلی مثل _planOrder
    if (DEFAULT_PLANS[key]) continue;
    out[key] = { ...raw[key] };
    out[key].id = key;
  }
  return out;
}

/**
 * دریافت همزمان طرح‌ها از کش محلی (sync).
 * برای کامپوننت‌هایی که نمی‌توانند await کنند.
 */
export function getEffectivePlans() {
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(PLANS_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return sanitizeConfig(parsed);
      }
    }
  } catch (e) {
    console.warn("Failed to parse cached plans config:", e);
  }
  return DEFAULT_PLANS;
}

// reference به snapshot فعلی (همان آبجکت ذخیره‌شده در کش)
function getPlansSnapshot() {
  return getEffectivePlans();
}

/**
 * ذخیره تنظیمات طرح‌ها (کش محلی + رویداد تغییر + sync با دیتابیس)
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function savePlansConfig(config, { persistToDb = true } = {}) {
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(PLANS_CONFIG_KEY, JSON.stringify(config));
      window.dispatchEvent(new CustomEvent("porskad:plans_changed", { detail: config }));
    }
  } catch (e) {
    console.error("Failed to save plans config:", e);
    return { ok: false, error: e.message };
  }

  if (!persistToDb) return { ok: true };

  try {
    const { error } = await supabase.from("system_settings").upsert(
      {
        key: PLANS_DB_KEY,
        value: config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    if (error) {
      console.warn("Plans saved locally but DB sync failed:", error.message);
      return { ok: true, dbError: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn("Plans DB sync threw:", e);
    return { ok: true, dbError: e.message };
  }
}

/**
 * بازنشانی طرح‌ها به مقادیر پیش‌فرض کارخانه (محلی + دیتابیس)
 */
export async function resetPlansConfig() {
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.removeItem(PLANS_CONFIG_KEY);
      window.dispatchEvent(new CustomEvent("porskad:plans_changed", { detail: DEFAULT_PLANS }));
    }
  } catch (e) {
    console.error("Failed to reset plans config:", e);
  }
  try {
    await supabase.from("system_settings").delete().eq("key", PLANS_DB_KEY);
    return { ok: true };
  } catch (e) {
    return { ok: true, dbError: e.message };
  }
}

/**
 * بارگذاری طرح‌ها از دیتابیس و به‌روزرسانی کش محلی.
 * اگر کاربر دسترسی خواندن نداشته باشد یا جدول خالی باشد، کش فعلی برمی‌گردد.
 */
export async function loadPlansConfig() {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", PLANS_DB_KEY)
      .maybeSingle();
    if (error || !data || !data.value) return getEffectivePlans();
    const config = sanitizeConfig(data.value);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(PLANS_CONFIG_KEY, JSON.stringify(config));
      window.dispatchEvent(new CustomEvent("porskad:plans_changed", { detail: config }));
    }
    return config;
  } catch (e) {
    console.warn("Could not load plans from database:", e);
    return getEffectivePlans();
  }
}

/**
 * اعمال یک کانفیگ روی state محلی (کش + رویداد) بدون نوشتن در دیتابیس.
 */
export function applyPlansConfig(config) {
  const sanitized = sanitizeConfig(config || {});
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(PLANS_CONFIG_KEY, JSON.stringify(sanitized));
      window.dispatchEvent(new CustomEvent("porskad:plans_changed", { detail: sanitized }));
    }
  } catch (e) {
    console.error("Failed to apply plans config:", e);
  }
  return sanitized;
}

/**
 * دریافت اطلاعات یک طرح بر اساس شناسه
 */
export function getPlan(planId) {
  const currentPlans = getEffectivePlans();
  if (!planId) return currentPlans.free || DEFAULT_PLANS.free;
  const key = String(planId).toLowerCase();
  if (currentPlans[key]) return currentPlans[key];
  if (key === "unlimited" || key === "enterprise") return currentPlans.enterprise;
  if (key === "pro" || key === "professional") return currentPlans.pro;
  return currentPlans.free || DEFAULT_PLANS.free;
}

/**
 * شمارش زندهٔ کاربران هر طرح از جدول profiles (برای پنل مدیریت اشتراک‌ها).
 * فقط سوپرادمین‌ها به کل ردیف‌ها دسترسی دارند (RLS 0064).
 */
export async function fetchLivePlanUserCounts() {
  try {
    const { data: ownerRows, error: ownerErr } = await supabase
      .from("profiles")
      .select("plan", { count: "exact", head: true })
      .eq("is_owner", true);
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("plan")
      .neq("is_owner", true);
    if (error || !rows) return { ok: false, counts: {}, total: 0 };

    const counts = {};
    for (const r of rows) {
      const key = String(r.plan || "free").toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return {
      ok: true,
      counts,
      owners: ownerErr ? 0 : (ownerRows?.length ?? 0) || 0,
      total: rows.length,
    };
  } catch (e) {
    return { ok: false, counts: {}, total: 0 };
  }
}

/**
 * بررسی اینکه آیا کاربر به یک قابلیت دسترسی دارد یا خیر
 */
export function canUserAccessFeature(profile, featureKey) {
  if (!profile) return false;
  if (profile.is_owner) return true;

  // ۱. بررسی دسترسی‌های صریح و کاستوم تنظیم‌شده روی پروفایل توسط ادمین
  if (featureKey === "telegram" || featureKey === "can_use_telegram") {
    if (profile.can_use_telegram !== undefined && profile.can_use_telegram !== null) {
      return Boolean(profile.can_use_telegram);
    }
  }
  if (featureKey === "excel" || featureKey === "can_export_excel") {
    if (profile.can_export_excel !== undefined && profile.can_export_excel !== null) {
      return Boolean(profile.can_export_excel);
    }
  }
  if (featureKey === "logic" && profile.can_use_logic !== undefined) {
    return Boolean(profile.can_use_logic);
  }
  if (featureKey === "file_upload" && profile.can_upload_files !== undefined) {
    return Boolean(profile.can_upload_files);
  }
  if ((featureKey === "sms_notification" || featureKey === "respondent_auth") && profile.can_use_sms !== undefined) {
    return Boolean(profile.can_use_sms);
  }
  if (featureKey === "webhook" && profile.can_use_webhooks !== undefined) {
    return Boolean(profile.can_use_webhooks);
  }
  if (featureKey === "remove_branding" && profile.can_remove_branding !== undefined) {
    return Boolean(profile.can_remove_branding);
  }

  // ۲. بررسی سطح دسترسی بر اساس طرح اشتراک کاربر
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
