// متادیتای انواع سوال — منبع واحد برای فرم‌ساز، صفحه پر کردن و گزارش‌ها

export const QUESTION_TYPES = {
  short_text: {
    label: "متن کوتاه",
    icon: "✏️",
    color: "teal",
    hint: "جواب یک‌خطی کوتاه",
    hasOptions: false,
  },
  long_text: {
    label: "متن بلند",
    icon: "📝",
    color: "navy",
    hint: "پاراگراف و توضیح کامل",
    hasOptions: false,
  },
  phone_ir: {
    label: "شماره موبایل ایران",
    icon: "📱",
    color: "magenta",
    hint: "با اعتبارسنجی 09xxxxxxxxx",
    hasOptions: false,
  },
  choice: {
    label: "چهارگزینه‌ای (چندگزینه‌ای)",
    icon: "🎯",
    color: "orange",
    hint: "۲ تا ۶ گزینه، انتخاب یکی",
    hasOptions: true,
    defaultOptions: ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
  },
  email: {
    label: "ایمیل",
    icon: "✉️",
    color: "teal",
    hint: "با اعتبارسنجی فرمت ایمیل",
    hasOptions: false,
  },
  number: {
    label: "عدد",
    icon: "🔢",
    color: "navy",
    hint: "فقط عدد",
    hasOptions: false,
  },
  rating: {
    label: "ستاره امتیاز",
    icon: "⭐",
    color: "orange",
    hint: "امتیاز ۱ تا ۵ ستاره",
    hasOptions: false,
  },
  yes_no: {
    label: "بله / خیر",
    icon: "🤔",
    color: "magenta",
    hint: "دو گزینه ساده",
    hasOptions: false,
  },
  telegram_id: {
    label: "آیدی تلگرام",
    icon: "✈️",
    color: "teal",
    hint: "آیدی تلگرام با @",
    hasOptions: false,
  },
};

export const QUESTION_TYPE_ORDER = [
  "short_text",
  "long_text",
  "phone_ir",
  "choice",
  "email",
  "number",
  "rating",
  "yes_no",
  "telegram_id",
];

// ─── عملگرهای شرطی ───
export const CONDITION_OPERATORS = {
  equals:         { label: "برابر با", needsValue: true },
  not_equals:     { label: "نابرابر با", needsValue: true },
  contains:       { label: "شامل", needsValue: true },
  gt:             { label: "بزرگ‌تر از", needsValue: true },
  lt:             { label: "کوچک‌تر از", needsValue: true },
  gte:            { label: "بزرگ‌تر یا مساوی", needsValue: true },
  lte:            { label: "کوچک‌تر یا مساوی", needsValue: true },
  is_empty:       { label: "خالی باشد", needsValue: false },
  is_not_empty:   { label: "خالی نباشد", needsValue: false },
};

export const CONDITION_OPERATOR_ORDER = [
  "equals", "not_equals", "contains",
  "gt", "lt", "gte", "lte",
  "is_empty", "is_not_empty",
];

// ─── بررسی شرط سوال بر اساس جواب‌های قبلی ───
export function evaluateCondition(condition, answers) {
  if (!condition || !condition.source_question_id) return true;
  const srcVal = answers[condition.source_question_id];
  const op = condition.operator;
  const target = condition.value;

  if (op === "is_empty") {
    return srcVal === undefined || srcVal === null || String(srcVal).trim() === "";
  }
  if (op === "is_not_empty") {
    return !(srcVal === undefined || srcVal === null || String(srcVal).trim() === "");
  }

  // اگه مقدار مرجع وجود نداره، شرط برآورده نمیشه
  if (srcVal === undefined || srcVal === null) return false;

  const src = String(srcVal).trim();
  const tgt = String(target ?? "").trim();

  switch (op) {
    case "equals":      return src === tgt;
    case "not_equals":  return src !== tgt;
    case "contains":    return src.includes(tgt);
    case "gt":          return Number(src) > Number(tgt);
    case "lt":          return Number(src) < Number(tgt);
    case "gte":         return Number(src) >= Number(tgt);
    case "lte":         return Number(src) <= Number(tgt);
    default:             return true;
  }
}

export function makeQuestion(type, position = 0) {
  const meta = QUESTION_TYPES[type];
  return {
    localId: `new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    id: null, // بعد از insert در دیتابیس پر می‌شود
    type,
    title: meta.label,
    description: "",
    required: true,
    options: meta.hasOptions ? [...meta.defaultOptions] : [],
    position,
  };
}
