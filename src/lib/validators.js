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
  let s = toEnDigits(String(raw || "")).replace(/[^\d+]/g, "");
  // حذف پیشوند‌های متداول
  if (s.startsWith("+98")) s = "0" + s.slice(3);
  else if (s.startsWith("0098")) s = "0" + s.slice(4);
  else if (s.startsWith("98") && s.length >= 12) s = "0" + s.slice(2);
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

// ─── لینک / وب‌سایت ───
export function isValidUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  try {
    const url = new URL(s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`);
    return Boolean(url.hostname && url.hostname.includes("."));
  } catch {
    return false;
  }
}

// ─── کد ملی ایران ───
export function isValidIranNationalId(raw) {
  const code = toEnDigits(String(raw || "")).replace(/\D/g, "");
  if (code.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(code)) return false; // تمام ارقام یکسان نامعتبر است

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(code[i]) * (10 - i);
  }
  const remainder = sum % 11;
  const lastDigit = Number(code[9]);

  return remainder < 2 ? lastDigit === remainder : lastDigit === 11 - remainder;
}

// ─── رمز عبور ───
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export function isValidPassword(pass) {
  if (typeof pass !== "string") return false;
  return PASSWORD_REGEX.test(pass);
}

// ─── عدد ───
export function parseNumber(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = toEnDigits(String(raw)).trim().replace(/[٬,،]/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ─── ولیدیشن یک جواب بر اساس نوع سوال ───
// خروجی: رشته‌ی خطا یا null (یعنی سالم)
export function validateAnswer(question, value) {
  // سوالات صرفاً اطلاعاتی هیچ اعتبارسنجی نیاز ندارند
  if (question.type === "statement" || question.type === "group") {
    return null;
  }

  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (typeof value === "number" && Number.isNaN(value)) ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);

  if (question.required && isEmpty) {
    return "این سوال اجباری است؛ لطفاً پاسخ دهید.";
  }
  if (isEmpty) return null; // اختیاری و خالی → مشکلی نیست

  // اعتبارسنجی سفارشی (min, max, minLength, maxLength, pattern)
  const v = question.validation;
  if (v) {
    if (v.min !== undefined || v.max !== undefined) {
      const n = parseNumber(value);
      if (n === null && (question.type === "number" || question.type === "nps" || question.type === "rating")) {
        return "فقط عدد وارد کنید.";
      }
      if (n !== null) {
        if (v.min !== undefined && v.max !== undefined && (n < v.min || n > v.max)) {
          return `عدد باید بین ${v.min} تا ${v.max} باشد.`;
        }
        if (v.min !== undefined && v.max === undefined && n < v.min) {
          return `عدد باید حداقل ${v.min} باشد.`;
        }
        if (v.max !== undefined && v.min === undefined && n > v.max) {
          return `عدد باید حداکثر ${v.max} باشد.`;
        }
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

    case "national_id":
      return isValidIranNationalId(value) ? null : "کد ملی ۱۰ رقمی معتبر نیست.";

    case "email":
      return isValidEmail(value) ? null : "فرمت ایمیل درست نیست؛ مثل: name@example.com";

    case "link":
      return isValidUrl(value) ? null : "آدرس اینترنتی معتبر نیست؛ مثل: https://example.com";

    case "number": {
      const n = parseNumber(value);
      if (n === null) return "فقط عدد وارد کنید.";
      return null;
    }

    case "choice":
    case "dropdown":
    case "likert": {
      const opts = question.options || [];
      const optTexts = opts.map((o) => (typeof o === "object" ? o.text || o.label : o));
      const maxSel = question.max_selections ?? 1;

      if (maxSel > 1 && question.type === "choice") {
        // حالت چند انتخابی
        const arr = Array.isArray(value) ? value : (value != null ? [value] : []);
        if (arr.length === 0) return "حداقل یک گزینه انتخاب کنید.";
        if (arr.length > maxSel) return `حداکثر ${maxSel} گزینه می‌توانید انتخاب کنید.`;
        const invalid = arr.filter((v) => !optTexts.includes(v));
        if (invalid.length > 0) return "یکی از گزینه‌ها نامعتبر است.";
        return null;
      }
      return optTexts.includes(value) ? null : "یکی از گزینه‌ها را انتخاب کنید.";
    }

    case "picture_choice": {
      const opts = question.options || [];
      const optKeys = opts.map((o, idx) => (typeof o === "object" ? o.text || `opt_${idx}` : o));
      const maxSel = question.max_selections ?? 1;

      if (maxSel > 1) {
        const arr = Array.isArray(value) ? value : (value != null ? [value] : []);
        if (arr.length === 0) return "حداقل یک تصویر انتخاب کنید.";
        if (arr.length > maxSel) return `حداکثر ${maxSel} تصویر می‌توانید انتخاب کنید.`;
        return null;
      }
      return value ? null : "یکی از گزینه‌های تصویری را انتخاب کنید.";
    }

    case "yes_no":
      return value === "بله" || value === "خیر" ? null : "بله یا خیر را انتخاب کنید.";

    case "rating": {
      const n = Number(value);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? null : "امتیاز بین ۱ تا ۵ ستاره انتخاب کنید.";
    }

    case "nps": {
      const n = Number(value);
      return Number.isInteger(n) && n >= 0 && n <= 10 ? null : "امتیازی از ۰ تا ۱۰ انتخاب کنید.";
    }

    case "matrix": {
      if (typeof value !== "object" || value === null) return "لطفاً به سوالات جدول پاسخ دهید.";
      const rows = question.rows || [];
      if (question.required) {
        const missing = rows.filter((r) => !value[r]);
        if (missing.length > 0) {
          return `لطفاً گزینه مورد نظر برای تمام سطرها را مشخص کنید.`;
        }
      }
      return null;
    }

    case "ranking": {
      const arr = Array.isArray(value) ? value : [];
      const opts = question.options || [];
      if (question.required && arr.length < opts.length) {
        return "لطفاً تمام گزینه‌ها را به ترتیب اولویت مرتب کنید.";
      }
      return null;
    }

    case "file_upload": {
      if (!value) return "لطفاً فایل مورد نظر را آپلود کنید.";
      if (typeof value === "object" && value.name) {
        const valRes = validateUploadedFile(value, question);
        if (!valRes.isValid) return valRes.error;
      }
      return null;
    }

    case "payment": {
      if (!value) return "پرداخت انجام نشده است.";
      return null;
    }

    case "short_text":
      return String(value).trim().length > 255 ? "حداکثر ۲۵۵ کاراکتر مجاز است." : null;

    case "long_text": {
      const maxL = question.validation?.maxLength || question.max_length;
      if (maxL && String(value).trim().length > maxL) {
        return `حداکثر ${maxL} کاراکتر مجاز است.`;
      }
      return null;
    }

    case "telegram_id": {
      const s = String(value).trim();
      if (!s.startsWith("@")) return "آیدی تلگرام باید با @ شروع شود.";
      if (s.length < 5) return "آیدی تلگرام خیلی کوتاه است.";
      if (s.length > 64) return "آیدی تلگرام خیلی طولانی است.";
      if (!/^@[a-zA-Z0-9_]{4,63}$/.test(s)) return "آیدی تلگرام فقط شامل حروف انگلیسی، عدد و _ مجاز است.";
      return null;
    }

    default:
      return null;
  }
}

// ══════════════════════════════════════════════════════════════
// تنظیمات و اعتبارسنجی آپلود فایل
// ══════════════════════════════════════════════════════════════
export const FILE_TYPE_PRESETS = {
  all: { label: "همه فرمت‌ها (آزاد)", extensions: [] },
  image: { label: "تصاویر (JPG, PNG, WebP, GIF, SVG)", extensions: ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"] },
  document: { label: "اسناد و آفیس (PDF, Word, Excel, PowerPoint, Text)", extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "csv"] },
  archive: { label: "فایل‌های فشرده (ZIP, RAR, 7Z, TAR)", extensions: ["zip", "rar", "7z", "tar", "gz"] },
  media: { label: "صوتی و تصویری (MP3, MP4, WAV, MOV)", extensions: ["mp3", "wav", "ogg", "mp4", "mkv", "mov", "avi", "webm"] },
  custom: { label: "پسوندهای سفارشی و دلخواه", extensions: [] },
};

/**
 * دریافت لیست پسوندهای مجاز برای یک سوال
 */
export function getAllowedExtensions(question) {
  const allowedType = question.validation?.allowed_file_types || question.allowed_file_types || "all";
  const customExts = question.validation?.custom_extensions || question.custom_extensions || "";
  
  let extensions = [];
  if (allowedType !== "all" && FILE_TYPE_PRESETS[allowedType]) {
    extensions = [...FILE_TYPE_PRESETS[allowedType].extensions];
  }
  
  if (customExts) {
    const parsed = customExts
      .split(/[,\s|،]+/)
      .map((e) => e.replace(/^\./, "").trim().toLowerCase())
      .filter(Boolean);
    extensions = Array.from(new Set([...extensions, ...parsed]));
  }

  return extensions;
}

/**
 * اعتبارسنجی فایل آپلود شده از نظر حجم و پسوند مجاز
 */
export function validateUploadedFile(file, question) {
  if (!file) {
    return { isValid: false, error: "فایلی انتخاب نشده است." };
  }

  const fileName = file.name || "";
  const fileSize = file.size || 0;
  const maxMb = Number(question.validation?.max_file_size_mb || question.max_file_size_mb || 10);
  const maxBytes = maxMb * 1024 * 1024;

  // ۱. بررسی حجم فایل
  if (fileSize > maxBytes) {
    const sizeInMb = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `حجم فایل انتخابی (${sizeInMb} مگابایت) بیشتر از سقف مجاز (${maxMb} مگابایت) است.`,
    };
  }

  // ۲. بررسی پسوند فایل
  const allowedExtensions = getAllowedExtensions(question);
  if (allowedExtensions.length > 0) {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (!ext || !allowedExtensions.includes(ext)) {
      return {
        isValid: false,
        error: `فرمت فایل انتخابی (${ext ? `.${ext}` : "نامشخص"}) مجاز نیست. پسوندهای مجاز: ${allowedExtensions.join("، ")}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * تولید مقدار ویژگی accept برای تگ input file
 */
export function getFileAcceptString(question) {
  const allowedType = question.validation?.allowed_file_types || question.allowed_file_types || "all";
  const exts = getAllowedExtensions(question);
  
  if (allowedType === "image" && exts.length === 0) return "image/*";
  if (exts.length > 0) {
    return exts.map((e) => `.${e}`).join(",");
  }
  return "*/*";
}

// نرمال‌سازی مقدار قبل از ذخیره در دیتابیس
export function normalizeAnswerValue(question, value) {
  if (value === null || value === undefined) return null;
  switch (question.type) {
    case "phone_ir":
      return normalizeIranPhone(value);
    case "number":
    case "nps":
    case "rating":
      return parseNumber(value);
    case "link": {
      const s = String(value).trim();
      if (s && !s.startsWith("http://") && !s.startsWith("https://")) {
        return `https://${s}`;
      }
      return s;
    }
    case "short_text":
    case "long_text":
    case "email":
    case "telegram_id":
      return String(value).trim();
    default:
      return value;
  }
}

