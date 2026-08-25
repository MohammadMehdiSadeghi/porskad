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
  };
}
