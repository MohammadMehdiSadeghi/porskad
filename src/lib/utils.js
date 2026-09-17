import { toEnDigits } from "./validators.js";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as jalaali from "jalaali-js";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// تبدیل اعداد به ارقام فارسی
export function toPersianDigits(n) {
  if (n === null || n === undefined) return "";
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return n.toString().replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

// ─── ارقام فارسی برای نمایش (سازگاری با کدهای موجود) ───
export function faNum(n) {
  return toPersianDigits(n);
}

// نام ماه‌های فارسی
export const PERSIAN_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

// نام روزهای هفته فارسی
export const PERSIAN_WEEKDAY_NAMES = [
  "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"
];

// فرمت تاریخ به شمسی خوانا
export function formatToJalali(date, options = {}) {
  if (!date) return "-";
  let d;
  if (typeof date === "string") {
    const parts = date.split("T")[0].split("-");
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return "-";

  const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const dayStr = toPersianDigits(j.jd);
  const yearStr = toPersianDigits(j.jy);

  if (options?.showMonthName) {
    const monthName = PERSIAN_MONTH_NAMES[j.jm - 1];
    if (options.includeDayName) {
      const dayName = PERSIAN_WEEKDAY_NAMES[d.getDay()];
      return `${dayName} ${dayStr} ${monthName} ${yearStr}`;
    }
    return `${dayStr} ${monthName} ${yearStr}`;
  }

  const monthStr = toPersianDigits(j.jm.toString().padStart(2, "0"));
  return `${yearStr}/${monthStr}/${dayStr.padStart(2, "۰")}`;
}

// ─── منطقه زمانی و تقویم ایران ───
export const IRAN_TIMEZONE = "Asia/Tehran";


function toValidDate(input) {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

// ─── تاریخ و ساعت شمسی با ساعت رسمی ایران ───
// مثل: ۱۴ مرداد ۱۴۰۴، ۲۱:۳۰
export function faDateTime(isoString, options = {}) {
  const d = toValidDate(isoString);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: IRAN_TIMEZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    }).format(d);
  } catch {
    return "—";
  }
}

// ─── فقط تاریخ شمسی (با ساعت رسمی ایران) ───
// پیش‌فرض: ۱۴۰۴/۵/۱۴
export function faDate(isoString, options = {}) {
  const d = toValidDate(isoString);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: IRAN_TIMEZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      ...options,
    }).format(d);
  } catch {
    return "—";
  }
}

// تاریخ شمسی طولانی: ۱۴ مرداد ۱۴۰۴
export function faDateLong(isoString, options = {}) {
  return faDate(isoString, { month: "long", ...options });
}

export const JALALI_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

export function jalaliToGregorian(jy, jm, jd) {
  jy = Number(jy);
  jm = Number(jm);
  jd = Number(jd);
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + ((Math.floor(jy / 33)) * 8) + (Math.floor(((jy % 33) + 3) / 4)) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * (Math.floor(days / 146097));
  days %= 146097;
  if (days > 36524) {
    gy += 100 * (Math.floor(--days / 36524));
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return { gy, gm, gd };
}

export function gregorianToJalali(gy, gm, gd) {
  gy = Number(gy);
  gm = Number(gm);
  gd = Number(gd);
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * (Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy, jm, jd };
}

export function isoToJalali(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function jalaliToIso(jy, jm, jd, endOfDay = true) {
  if (!jy || !jm || !jd) return null;
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const pad = (n) => String(n).padStart(2, "0");
  if (endOfDay) {
    return `${gy}-${pad(gm)}-${pad(gd)}T23:59:59.000Z`;
  }
  return `${gy}-${pad(gm)}-${pad(gd)}T00:00:00.000Z`;
}

// فقط ساعت با ساعت رسمی ایران (مثلاً ۲۱:۳۰)
export function faTime(isoString, options = {}) {
  const d = toValidDate(isoString);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: IRAN_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    }).format(d);
  } catch {
    return "—";
  }
}

// ─── توابع ویژه پنل گاد (تاریخ میلادی + ساعت رسمی ایران) ───
// تاریخ میلادی و ساعت ایران (مثلاً: 09/13/2026, 11:23:45)
export function godDateTime(isoString, options = {}) {
  const d = toValidDate(isoString);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: IRAN_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      ...options,
    }).format(d);
  } catch {
    return "—";
  }
}

// فقط تاریخ میلادی بر اساس افق ایران (مثلاً: 09/13/2026)
export function godDate(isoString, options = {}) {
  const d = toValidDate(isoString);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: IRAN_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...options,
    }).format(d);
  } catch {
    return "—";
  }
}

// فقط ساعت رسمی ایران برای پنل گاد (مثلاً: 11:23:45)
export function godTime(isoString, options = {}) {
  const d = toValidDate(isoString);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: IRAN_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      ...options,
    }).format(d);
  } catch {
    return "—";
  }
}

export function faRelative(isoString) {
  const d = toValidDate(isoString);
  if (!d) return "—";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 0) return "به‌زودی"; // تاریخ از آینده
  if (diff < 60) return "همین الان";
  if (diff < 3600) return `${faNum(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${faNum(Math.floor(diff / 3600))} ساعت پیش`;
  if (diff < 86400 * 7) return `${faNum(Math.floor(diff / 86400))} روز پیش`;
  return faDateTime(isoString);
}

// ─── مدت زمان خوانا ───
export function faDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${faNum(s)} ثانیه`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${faNum(m)} دقیقه و ${faNum(r)} ثانیه` : `${faNum(m)} دقیقه`;
  const h = Math.floor(m / 60);
  return `${faNum(h)} ساعت و ${faNum(m % 60)} دقیقه`;
}

// ─── تشخیص دستگاه / مرورگر / سیستم‌عامل از User-Agent ───
export function parseUserAgent(ua = navigator.userAgent) {
  const uaLower = ua.toLowerCase();

  let device = "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(uaLower)) device = "tablet";
  else if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(uaLower)) device = "mobile";

  let browser = "سایر";
  if (uaLower.includes("edg/")) browser = "Edge";
  else if (uaLower.includes("opr/") || uaLower.includes("opera")) browser = "Opera";
  else if (uaLower.includes("chrome/") && !uaLower.includes("chromium")) browser = "Chrome";
  else if (uaLower.includes("firefox/")) browser = "Firefox";
  else if (uaLower.includes("safari/") && !uaLower.includes("chrome")) browser = "Safari";

  let os = "سایر";
  if (uaLower.includes("android")) os = "Android";
  else if (/iphone|ipad|ipod/.test(uaLower)) os = "iOS";
  else if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("mac os")) os = "macOS";
  else if (uaLower.includes("linux")) os = "Linux";

  return { device, browser, os };
}

// ─── ساخت slug تصادفی کوتاه ───
const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function randomSlug(length = 8) {
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += SLUG_ALPHABET[arr[i] % SLUG_ALPHABET.length];
  return out;
}

// اسلاگ امن برای URL (فقط حروف کوچک، عدد و خط تیره)
export function slugify(str = "") {
  return toEnDigits(str)
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

// ─── میانبر کپی کلیپ‌بورد ───
export async function copyToClipboard(text) {
  // در context امن (HTTPS/localhost) از Clipboard API استفاده کن
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback به روش قدیمی
    }
  }
  // فالبک برای مرورگرهای قدیمی / http
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

export const DEVICE_FA = {
  mobile: "موبایل",
  tablet: "تبلت",
  desktop: "دسکتاپ",
};

// ─── تولید شناسه استاندارد UUID v4 با فالبک کامل ───
export function generateUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // ignore & fallback
    }
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      +c ^
      ((typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint8Array(1))[0]
        : Math.floor(Math.random() * 256)) &
        (15 >> (+c / 4)))
    ).toString(16)
  );
}

// ─── تشخیص مدل فرم (منحصراً دو مدل: مرحله به مرحله یا ثبت‌نامی) ───
export function getFormModelBadge(form) {
  if (!form) return { label: "مرحله به مرحله", color: "teal" };
  const fType = String(form.form_type || "").trim().toLowerCase();
  if (fType === "registration") {
    return { label: "ثبت‌نامی", color: "orange" };
  }
  return { label: "مرحله به مرحله", color: "teal" };
}
