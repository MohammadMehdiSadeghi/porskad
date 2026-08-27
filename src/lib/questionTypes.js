// متادیتای انواع سوال — منبع واحد برای فرم‌ساز، صفحه پر کردن و گزارش‌ها

export const QUESTION_TYPES = {
  short_text: {
    label: "متن کوتاه",
    icon: "✏️",
    color: "teal",
    hint: "جواب یک‌خطی کوتاه",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  long_text: {
    label: "متن بلند",
    icon: "📝",
    color: "navy",
    hint: "پاراگراف و توضیح کامل",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  phone_ir: {
    label: "شماره موبایل ایران",
    icon: "📱",
    color: "magenta",
    hint: "با اعتبارسنجی 09xxxxxxxxx",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  choice: {
    label: "چهارگزینه‌ای (چندگزینه‌ای)",
    icon: "🎯",
    color: "orange",
    hint: "۲ تا ۶ گزینه، انتخاب یکی",
    hasOptions: true,
    defaultOptions: ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
    valueFieldType: "option_select",
  },
  email: {
    label: "ایمیل",
    icon: "✉️",
    color: "teal",
    hint: "با اعتبارسنجی فرمت ایمیل",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "ends_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  number: {
    label: "عدد",
    icon: "🔢",
    color: "navy",
    hint: "فقط عدد",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty"],
    valueFieldType: "number",
  },
  rating: {
    label: "ستاره امتیاز",
    icon: "⭐",
    color: "orange",
    hint: "امتیاز ۱ تا ۵ ستاره",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty"],
    valueFieldType: "number",
  },
  yes_no: {
    label: "بله / خیر",
    icon: "🤔",
    color: "magenta",
    hint: "دو گزینه ساده",
    hasOptions: false,
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
    valueFieldType: "yes_no_select",
  },
  telegram_id: {
    label: "آیدی تلگرام",
    icon: "✈️",
    color: "teal",
    hint: "آیدی تلگرام با @",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
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
    // ─── منطق شرطی (پرس‌لاین) ───
    conditions: null,       // { group_operator: "AND"|"OR", conditions: [...] }
    jump_actions: [],       // [{ option_index, action_type, target_id, target_url }]
  };
}
