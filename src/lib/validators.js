// ─── ابزار تبدیل ارقام ───
// ورودی فارسی/عربی را به ارقام انگلیسی تبدیل می‌کند تا اعتبارسنجی ساده شود.
export function toEnDigits(str = "") {
  if (typeof str !== "string") return "";
  return str
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

// ─── شماره موبایل ایران ───
// قابل قبول: 09xxxxxxxxx ، +989xxxxxxxxx ، 989xxxxxxxxx ، 9xxxxxxxxx
// خروجی نرمال‌شده: 09xxxxxxxxx
export function normalizeIranPhone(raw) {
  let s = toEnDigits(String(raw || "")).replace(/[\s\-()]/g, "");
  if (s.startsWith("+98")) s = "0" + s.slice(3);
  else if (s.startsWith("98") && s.length === 12) s = "0" + s.slice(2);
  else if (s.startsWith("9") && s.length === 10) s = "0" + s;
  return s;
}

export function isValidIranPhone(raw) {
  const s = normalizeIranPhone(raw);
  return /^09\d{9}$/.test(s);
}

// ─── ایمیل ───
export function isValidEmail(raw) {
  const s = String(raw || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

// ─── عدد ───
export function parseNumber(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = toEnDigits(String(raw)).trim().replace(/[٬,،\.]/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ─── ولیدیشن یک جواب بر اساس نوع سوال ───
// خروجی: رشته‌ی خطا یا null (یعنی سالم)
export function validateAnswer(question, value) {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (typeof value === "number" && Number.isNaN(value));

  if (question.required && isEmpty) {
    return "این سوال اجباریه؛ یه جواب بنویس.";
  }
  if (isEmpty) return null; // اختیاری و خالی → مشکلی نیست

  // اعتبارسنجی سفارشی (min, max, minLength, maxLength, pattern)
  const v = question.validation;
  if (v) {
    if (v.min !== undefined && v.max !== undefined) {
      const n = parseNumber(value);
      if (n !== null && (n < v.min || n > v.max)) {
        return `عدد باید بین ${v.min} تا ${v.max} باشد.`;
      }
    }
    if (v.minLength !== undefined) {
      if (String(value).trim().length < v.minLength) {
        return `حداقل ${v.minLength} کاراکتر وارد کنید.`;
      }
    }
    if (v.maxLength !== undefined) {
      if (String(value).trim().length > v.maxLength) {
        return `حداکثر ${v.maxLength} کاراکتر مجاز است.`;
      }
    }
    if (v.pattern) {
      try {
        const re = new RegExp(v.pattern);
        if (!re.test(String(value).trim())) {
          return `فرمت وارد شده مجاز نیست.`;
        }
      } catch { /* regex نامعتبر */ }
    }
  }

  switch (question.type) {
    case "phone_ir":
      return isValidIranPhone(value) ? null : "شماره موبایل معتبر نیست؛ مثل: 09123456789";
    case "email":
      return isValidEmail(value) ? null : "فرمت ایمیل درست نیست؛ مثل: name@example.com";
    case "number": {
      const n = parseNumber(value);
      if (n === null) return "فقط عدد وارد کن.";
      return null;
    }
    case "choice":
      return question.options?.includes?.(value) ? null : "یکی از گزینه‌ها را انتخاب کن.";
    case "yes_no":
      return value === "بله" || value === "خیر" ? null : "بله یا خیر را انتخاب کن.";
    case "rating": {
      const n = Number(value);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? null : "امتیاز بین ۱ تا ۵ انتخاب کن.";
    }
    case "short_text":
      return String(value).trim().length > 200 ? "جواب خیلی طولانیه؛ کوتاه‌تر بنویس." : null;
    case "long_text":
      return String(value).trim().length > 3000 ? "جواب خیلی طولانیه؛ کوتاه‌تر بنویس." : null;
    case "telegram_id": {
      const s = String(value).trim();
      if (!s.startsWith("@")) return "آیدی تلگرام باید با @ شروع بشه.";
      if (s.length < 5) return "آیدی تلگرام خیلی کوتاهه.";
      if (s.length > 64) return "آیدی تلگرام خیلی طولانیه.";
      if (!/^@[a-zA-Z0-9_]{4,63}$/.test(s)) return "آیدی تلگرام فقط حروف انگلیسی، عدد و _ مجازه.";
      return null;
    }
    default:
      return null;
  }
}

// نرمال‌سازی مقدار قبل از ذخیره در دیتابیس
export function normalizeAnswerValue(question, value) {
  if (value === null || value === undefined) return null;
  switch (question.type) {
    case "phone_ir":
      return normalizeIranPhone(value);
    case "number":
      return parseNumber(value);
    case "short_text":
    case "long_text":
    case "email":
    case "telegram_id":
      return String(value).trim();
    default:
      return value;
  }
}
