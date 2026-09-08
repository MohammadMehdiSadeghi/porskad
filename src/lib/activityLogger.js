// ─── Activity Logger — ثبت فعالیت‌ها، ورودها و لاگ IP برای سوپرادمین ───
import { supabase } from "./supabaseClient";

/**
 * تشخیص مرورگر، سیستم‌عامل و نوع دستگاه
 */
export function parseUserAgent(ua = "") {
  const userAgent = ua || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  let browser = "Other";
  let os = "Other";
  let device = "Desktop";

  if (!userAgent) return { browser, os, device };

  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
    device = /ipad|tablet/i.test(userAgent) ? "Tablet" : "Mobile";
  } else {
    device = "Desktop";
  }

  if (/windows/i.test(userAgent)) os = "Windows";
  else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS";
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";
  else if (/android/i.test(userAgent)) os = "Android";
  else if (/linux/i.test(userAgent)) os = "Linux";

  if (/edg/i.test(userAgent)) browser = "Edge";
  else if (/chrome|crios/i.test(userAgent) && !/opr|opera|edg/i.test(userAgent)) browser = "Chrome";
  else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
  else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = "Safari";
  else if (/opr|opera/i.test(userAgent)) browser = "Opera";
  else if (/samsungbrowser/i.test(userAgent)) browser = "Samsung Browser";

  return { browser, os, device };
}

/**
 * ثبت لاگ احراز هویت (ورود، ثبت‌نام، خروج) همراه با IP در بک‌اند و دیتابیس
 * کاملاً ناهمگام و بدون مسدودسازی روند برنامه یا پاسخ به فرم‌ها
 */
export async function logAuthEvent({ userId = null, email = null, action = "login", details = null } = {}) {
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const { browser, os, device } = parseUserAgent(ua);

    // ۱. ارسال به اندپوینت سرورلس برای ثبت مطمئن IP واقعی
    fetch("/api/log-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        email,
        action,
        browser,
        os,
        device,
        details,
      }),
    }).catch(() => {
      // فالبک از طریق Supabase مستقیم در صورت عدم دسترسی به API
      if (supabase && userId) {
        supabase.rpc("log_auth_event", {
          p_user_id: userId,
          p_email: email,
          p_action: action,
          p_device: device,
          p_browser: browser,
          p_os: os,
          p_user_agent: ua,
          p_details: details || {},
        }).catch(() => {});
      }
    });
  } catch (err) {
    // خطاهای لاگ نباید هرگز مانع جریان کاربر شوند
  }
}

/**
 * ثبت یک فعالیت در activity_log
 * @param {string} action - نوع عمل (login, create_form, edit_form, ...)
 * @param {string} targetType - نوع هدف (form, response, user, ...)
 * @param {string} targetId - آیدی هدف
 * @param {object} details - جزئیات اضافی
 */
export async function logActivity(action, targetType = null, targetId = null, details = null) {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_log").insert({
      user_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId ? String(targetId) : null,
      details: details || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (err) {
    // silently fail — logging should never break the app
    console.warn("Activity log failed:", err.message);
  }
}

/**
 * ثبت خطا در error_log
 */
export async function logError(message, source = "client", url = null) {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("error_log").insert({
      user_id: user?.id || null,
      message,
      source,
      url: url || (typeof window !== "undefined" ? window.location.href : null),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // silently fail
  }
}

// ─── نام‌های خوانا برای اکشن‌ها ───
export const ACTION_LABELS = {
  login: "ورود به حساب کاربری",
  register: "ثبت‌نام کاربر جدید",
  logout: "خروج از حساب کاربری",
  create_form: "ایجاد فرم",
  edit_form: "ویرایش فرم",
  delete_form: "حذف فرم",
  publish_form: "انتشار فرم",
  unpublish_form: "غیرفعال کردن فرم",
  view_responses: "مشاهده پاسخ‌ها",
  export_responses: "خروجی پاسخ‌ها",
  create_manager: "ایجاد مدیر",
  edit_manager: "ویرایش مدیر",
  delete_manager: "حذف مدیر",
  activate_manager: "فعال‌سازی مدیر",
  deactivate_manager: "غیرفعال‌سازی مدیر",
  change_permissions: "تغییر مجوزها",
  change_visibility: "تغییر نمایش مدیران",
  save_settings: "ذخیره تنظیمات",
  impersonate: "ورود به عنوان کاربر",
  test_log: "تست لاگ",
  submit_form: "ارسال فرم",
};
