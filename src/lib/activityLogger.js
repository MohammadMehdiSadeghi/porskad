// ─── Activity Logger — ثبت فعالیت‌های مدیران ───
import { supabase } from "./supabaseClient";

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
      user_agent: navigator.userAgent,
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
      url: url || window.location.href,
      user_agent: navigator.userAgent,
    });
  } catch {
    // silently fail
  }
}

// ─── نام‌های خوانا برای اکشن‌ها ───
export const ACTION_LABELS = {
  login: "ورود به پنل",
  logout: "خروج از پنل",
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
