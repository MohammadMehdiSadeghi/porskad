import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// ════════════════════════════════════════════════════════════
// کنترل تب‌های کاربری از پنل گاد
// هر تبِ پنل کاربری سه حالت دارد:
//   on         → فعال (عادی)
//   maintenance → حالت موقت بروزرسانی (کاربر پیام «در حال بروزرسانی» می‌بیند)
//   disabled   → کاملاً غیرفعال (از منو حذف + مسیر مسدود)
// تنظیمات در system_settings با کلید user_tabs_config ذخیره می‌شود
// و از طریق RPC سوپرادمین update_system_settings نوشته می‌شود.
// ════════════════════════════════════════════════════════════

export const USER_TABS_SETTINGS_KEY = "user_tabs_config";

export const USER_TABS = [
  { id: "forms",    label: "فرم‌های من",       path: "/admin/forms" },
  { id: "embed",    label: "اشتراک‌گذاری",     path: "/admin/embed" },
  { id: "telegram", label: "اتصال به تلگرام",  path: "/admin/telegram" },
  { id: "support",  label: "پشتیبانی",         path: "/admin/support" },
  { id: "profile",  label: "پروفایل و سهمیه",  path: "/admin/profile" },
];

export const TAB_STATE_ON = "on";
export const TAB_STATE_MAINTENANCE = "maintenance";
export const TAB_STATE_DISABLED = "disabled";

export const DEFAULT_MAINTENANCE_MESSAGE =
  "این بخش از سایت در حال بروزرسانی می‌باشد. 🛠️\nتلاش می‌کنیم هرچه زودتر بهبودهای جدید را در اختیارتان بگذاریم؛ از شکیبایی شما سپاسگزاریم.";

export const DEFAULT_USER_TABS_CONFIG = Object.fromEntries(
  USER_TABS.map((t) => [
    t.id,
    { state: TAB_STATE_ON, message: "" },
  ]),
);

// merge با پیش‌فرضها تا کلید جدید افزوده‌شده جا نیفتد
export function normalizeUserTabsConfig(raw) {
  const base = structuredClone ? structuredClone(DEFAULT_USER_TABS_CONFIG) : JSON.parse(JSON.stringify(DEFAULT_USER_TABS_CONFIG));
  if (!raw || typeof raw !== "object") return base;
  for (const tab of USER_TABS) {
    const entry = raw[tab.id];
    if (entry && typeof entry === "object") {
      const state = [TAB_STATE_ON, TAB_STATE_MAINTENANCE, TAB_STATE_DISABLED].includes(entry.state)
        ? entry.state
        : TAB_STATE_ON;
      base[tab.id] = { state, message: String(entry.message ?? "") };
    }
  }
  return base;
}

// ─── کش در حافظهٔ ماژول + رویداد برای همهٔ کامپوننت‌ها ───
let cacheConfig = null;
const EVT = "porskad:user_tabs_updated";

export function getUserTabsConfig() {
  return cacheConfig || DEFAULT_USER_TABS_CONFIG;
}

/**
 * بارگذاری تنظیمات تب‌ها از دیتابیس (برای همهٔ کاربران — RPC عمومی است).
 * هر بار فراخوانی از سرور می‌خواند؛ در ورود به پنل و بعد از ذخیرهٔ گاد استفاده می‌شود.
 */
export async function loadUserTabsConfigFromDb() {
  try {
    const { data, error } = await supabase.rpc("get_system_settings");
    if (error) throw error;
    const raw = data?.[USER_TABS_SETTINGS_KEY];
    cacheConfig = normalizeUserTabsConfig(raw);
  } catch (e) {
    if (!cacheConfig) cacheConfig = DEFAULT_USER_TABS_CONFIG;
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
  return cacheConfig;
}

/** هوک: کل کانفیگ تب‌ها را واکنشی برمی‌گرداند (برای سایدبار) */
export function useUserTabsConfig() {
  const [cfg, setCfg] = useState(getUserTabsConfig);
  useEffect(() => {
    const onUpdate = () => setCfg(getUserTabsConfig());
    window.addEventListener(EVT, onUpdate);
    return () => window.removeEventListener(EVT, onUpdate);
  }, []);
  return cfg;
}

/** هوک: وضعیت تب فعلی را واکنشی برمی‌گرداند */
export function useUserTab(id) {
  const [cfg, setCfg] = useState(getUserTabsConfig);
  useEffect(() => {
    const onUpdate = () => setCfg(getUserTabsConfig());
    window.addEventListener(EVT, onUpdate);
    return () => window.removeEventListener(EVT, onUpdate);
  }, []);
  const entry = cfg?.[id] || { state: TAB_STATE_ON, message: "" };
  const tab = USER_TABS.find((t) => t.id === id);
  return {
    tab,
    state: entry.state,
    maintenanceMessage: entry.message?.trim() || DEFAULT_MAINTENANCE_MESSAGE,
    isBlocked: entry.state === TAB_STATE_DISABLED || entry.state === TAB_STATE_MAINTENANCE,
    isHidden: entry.state === TAB_STATE_DISABLED,
  };
}

export { EVT as USER_TABS_UPDATED_EVENT };
