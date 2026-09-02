import { toEnDigits } from "./validators";

// ─── ارقام فارسی برای نمایش ───
export function faNum(n) {
  return String(n ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

// ─── تاریخ و ساعت شمسی ───
// مثل: ۱۴ مرداد ۱۴۰۴، ۲۱:۳۰
export function faDateTime(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "—";
  }
}

export function faRelative(isoString) {
  if (!isoString) return "—";
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
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
