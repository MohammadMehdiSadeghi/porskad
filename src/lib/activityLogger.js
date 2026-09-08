// ─── Activity & Auth Security Logger — ثبت فعالیت‌ها، ورودها و لاگ IP برای سوپرادمین ───
import { supabase } from "./supabaseClient";

let cachedClientIp = null;
let cachedGeo = null;

/**
 * دریافت سریع آدرس IP و موقعیت تقریبی از کلاینت (با کَش در حافظه و sessionStorage)
 */
export async function getClientPublicIp() {
  if (cachedClientIp) return { ip: cachedClientIp, geo: cachedGeo };
  if (typeof window !== "undefined") {
    const saved = sessionStorage.getItem("porskad_client_ip");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.ip) {
          cachedClientIp = parsed.ip;
          cachedGeo = parsed.geo || null;
          return { ip: cachedClientIp, geo: cachedGeo };
        }
      } catch {}
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);

    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedClientIp = data.ip;
        if (typeof window !== "undefined") {
          sessionStorage.setItem("porskad_client_ip", JSON.stringify({ ip: data.ip, geo: null }));
        }
        return { ip: data.ip, geo: null };
      }
    }
  } catch {}

  return { ip: null, geo: null };
}

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
    const { ip: clientIp } = await getClientPublicIp().catch(() => ({ ip: null }));

    const payload = {
      userId,
      email,
      action,
      browser,
      os,
      device,
      ip: clientIp,
      details: details ? { ...details, client_ip: clientIp } : { client_ip: clientIp },
    };

    let serverSuccess = false;

    // ۱. ارسال به سرورلس API
    try {
      const res = await fetch("/api/log-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        serverSuccess = true;
      }
    } catch {}

    // ۲. فالبک مستقیم Supabase RPC در صورت عدم موفقیت API سرورلس (مثلاً در حالت لوکال dev)
    if (!serverSuccess && supabase) {
      try {
        await supabase.rpc("log_auth_event", {
          p_user_id: userId,
          p_email: email,
          p_ip_address: clientIp || "127.0.0.1",
          p_action: action,
          p_device: device,
          p_browser: browser,
          p_os: os,
          p_user_agent: ua,
          p_details: details || {},
        });
      } catch {
        // فالبک درج مستقیم در جدول
        try {
          await supabase.from("auth_logs").insert({
            user_id: userId,
            email,
            ip_address: clientIp || "127.0.0.1",
            action,
            device,
            browser,
            os,
            user_agent: ua,
            details: details || {},
          });
        } catch {}
      }
    }
  } catch (err) {
    // خطاهای لاگ نباید هرگز مانع جریان کاربر شوند
  }
}

/**
 * ثبت یک فعالیت در activity_log
 */
export async function logActivity(action, targetType = null, targetId = null, details = null) {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { ip } = await getClientPublicIp().catch(() => ({ ip: null }));

    await supabase.from("activity_log").insert({
      user_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId ? String(targetId) : null,
      details: details || null,
      ip_address: ip,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (err) {
    // silently fail
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
  } catch {}
}

// ─── نام‌های خوانا برای اکشن‌ها ───
export const ACTION_LABELS = {
  login: "ورود به حساب کاربری",
  login_after_register: "ورود خودکار پس از ثبت‌نام",
  register: "ثبت‌نام کاربر جدید",
  logout: "خروج از حساب کاربری",
  failed_login: "تلاش ناموفق برای ورود",
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
