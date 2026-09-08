// متادیتای انواع سوال — منبع واحد برای فرم‌ساز، صفحه پر کردن و گزارش‌ها

export const QUESTION_TYPES = {
  // ─── گزینه‌ای و انتخابی ───
  choice: {
    label: "چندگزینه‌ای",
    icon: "[]",
    color: "orange",
    category: "choice",
    hint: "حداقل ۲ گزینه، انتخاب ۱ تا N گزینه",
    hasOptions: true,
    hasMaxSelections: true,
    hasDisplayMode: true,
    defaultDisplayMode: "buttons",
    defaultOptions: ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty",
                         "selected_count_equals", "selected_count_greater_than", "selected_count_less_than"],
    valueFieldType: "option_select",
  },
  picture_choice: {
    label: "چندگزینه‌ای تصویری",
    icon: "img",
    color: "magenta",
    category: "choice",
    hint: "انتخاب از میان تصاویر همراه با متن",
    hasOptions: true,
    hasMaxSelections: true,
    defaultOptions: [
      { text: "طرح ۱", image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&auto=format&fit=crop&q=60" },
      { text: "طرح ۲", image: "https://images.unsplash.com/photo-1557683316-973673baf926?w=300&auto=format&fit=crop&q=60" },
      { text: "طرح ۳", image: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=300&auto=format&fit=crop&q=60" },
      { text: "طرح ۴", image: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&auto=format&fit=crop&q=60" }
    ],
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
    valueFieldType: "option_select",
  },
  dropdown: {
    label: "لیست کشویی",
    icon: "v",
    color: "teal",
    category: "choice",
    hint: "انتخاب یک مورد از فهرست بلند",
    hasOptions: true,
    defaultOptions: ["گزینه اول", "گزینه دوم", "گزینه سوم", "گزینه چهارم"],
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
    valueFieldType: "option_select",
  },
  yes_no: {
    label: "بله / خیر",
    icon: "Y/N",
    color: "magenta",
    category: "choice",
    hint: "دو گزینه ساده و سریع",
    hasOptions: false,
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
    valueFieldType: "yes_no_select",
  },
  likert: {
    label: "طیفی (مقیاس لیکرت)",
    icon: "—",
    color: "teal",
    category: "choice",
    hint: "سنجش میزان موافقت یا رضایت روی طیف",
    hasOptions: true,
    defaultOptions: ["کاملاً مخالفم", "مخالفم", "نظری ندارم", "موافقم", "کاملاً موافقم"],
    conditionOperators: ["equals", "not_equals", "is_empty", "is_not_empty"],
    valueFieldType: "option_select",
  },
  nps: {
    label: "امتیازدهی / وفاداری (۰ تا ۱۰)",
    icon: "0-10",
    color: "orange",
    category: "choice",
    hint: "امتیاز شاخص NPS از ۰ تا ۱۰",
    hasOptions: false,
    defaultMinLabel: "اصلاً احتمال ندارد",
    defaultMaxLabel: "بسیار زیاد",
    conditionOperators: ["equals", "not_equals", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty"],
    valueFieldType: "number",
  },
  rating: {
    label: "ستاره امتیاز (۱ تا ۵)",
    icon: "*",
    color: "orange",
    category: "choice",
    hint: "امتیاز ۱ تا ۵ ستاره",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty"],
    valueFieldType: "number",
  },
  matrix: {
    label: "ماتریسی (جدول سوالات)",
    icon: "::",
    color: "navy",
    category: "choice",
    hint: "چند سوال با گزینه‌های یکسان در جدول",
    hasOptions: true,
    defaultRows: ["کیفیت خدمات", "سرعت پاسخگویی", "سهولت استفاده"],
    defaultColumns: ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"],
    conditionOperators: ["is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  ranking: {
    label: "اولویت‌دهی / رتبه‌بندی",
    icon: "123",
    color: "navy",
    category: "choice",
    hint: "مرتب‌سازی گزینه‌ها به ترتیب اهمیت و اولویت",
    hasOptions: true,
    defaultOptions: ["قیمت مناسب", "کیفیت بالا", "سرعت تحویل", "پشتیبانی قوی"],
    conditionOperators: ["is_empty", "is_not_empty"],
    valueFieldType: "text",
  },

  // ─── متنی و اطلاعاتی ───
  short_text: {
    label: "متن کوتاه",
    icon: "Aa",
    color: "teal",
    category: "text",
    hint: "جواب یک‌خطی کوتاه",
    defaultPlaceholder: "پاسخ خود را بنویسید...",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  long_text: {
    label: "متن بلند",
    icon: "¶",
    color: "navy",
    category: "text",
    hint: "پاراگراف و توضیح کامل",
    defaultPlaceholder: "پاسخ خود را بنویسید...",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  number: {
    label: "عدد",
    icon: "#",
    color: "navy",
    category: "text",
    hint: "فقط ورودی عددی",
    defaultPlaceholder: "مثلاً: ۱۲۳",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty"],
    valueFieldType: "number",
  },
  email: {
    label: "ایمیل",
    icon: "@",
    color: "teal",
    category: "text",
    hint: "با اعتبارسنجی فرمت ایمیل",
    defaultPlaceholder: "example@email.com",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "ends_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  phone_ir: {
    label: "شماره موبایل ایران",
    icon: "tel",
    color: "magenta",
    category: "text",
    hint: "با اعتبارسنجی 09xxxxxxxxx",
    defaultPlaceholder: "۰۹۱۲۳۴۵۶۷۸۹",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  link: {
    label: "لینک / وب‌سایت",
    icon: "url",
    color: "teal",
    category: "text",
    hint: "دریافت آدرس اینترنتی یا وب‌سایت معتبر",
    defaultPlaceholder: "https://example.com",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  telegram_id: {
    label: "آیدی تلگرام",
    icon: "tg",
    color: "teal",
    category: "text",
    hint: "آیدی تلگرام با @",
    defaultPlaceholder: "username@",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
    valueFieldType: "text",
  },

  // ─── پیشرفته، ساختار و رسانه‌ای ───
  statement: {
    label: "متن بدون پاسخ (توضیحی)",
    icon: "i",
    color: "teal",
    category: "advanced",
    hint: "پیام راهنما یا توضیحات بدون دریافت ورودی",
    hasOptions: false,
    isInformational: true,
    conditionOperators: ["is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  group: {
    label: "گروه سوال / بخش‌بندی",
    icon: "grp",
    color: "navy",
    category: "advanced",
    hint: "جداکننده و تیتر دسته‌بندی سوالات فرم",
    hasOptions: false,
    isInformational: true,
    conditionOperators: ["is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  file_upload: {
    label: "آپلود فایل",
    icon: "up",
    color: "magenta",
    category: "advanced",
    hint: "بارگذاری تصویر، سند یا فایل توسط کاربر",
    hasOptions: false,
    defaultAllowedTypes: "all", // all, image, pdf, document
    defaultMaxSizeMb: 10,
    conditionOperators: ["is_empty", "is_not_empty"],
    valueFieldType: "text",
  },
  payment: {
    label: "درگاه پرداخت",
    icon: "pay",
    color: "orange",
    category: "advanced",
    hint: "دریافت وجه آنلاین و صدور فاکتور",
    hasOptions: false,
    defaultAmount: 100000,
    defaultCurrency: "تومان",
    conditionOperators: ["is_empty", "is_not_empty"],
    valueFieldType: "number",
  },
};

export const QUESTION_CATEGORIES = [
  {
    key: "choice",
    title: "سوالات گزینه‌ای و مقیاسی",
    description: "انواع سوالات چندگزینه‌ای، کشویی، تصویری، طیفی و امتیازی",
    types: ["choice", "picture_choice", "dropdown", "yes_no", "likert", "nps", "rating", "matrix", "ranking"],
  },
  {
    key: "text",
    title: "سوالات متنی و اطلاعات تماس",
    description: "ورودی‌های متن، عدد، ایمیل، موبایل، لینک و آیدی",
    types: ["short_text", "long_text", "number", "email", "phone_ir", "link", "telegram_id"],
  },
  {
    key: "advanced",
    title: "پیشرفته، رسانه و ساختار فرم",
    description: "متن توضیحی، دسته‌بندی سوالات، آپلود فایل و درگاه پرداخت",
    types: ["statement", "group", "file_upload", "payment"],
  },
];

export const QUESTION_TYPE_ORDER = [
  // گزینه‌ای
  "choice",
  "picture_choice",
  "dropdown",
  "yes_no",
  "likert",
  "nps",
  "rating",
  "matrix",
  "ranking",
  // متنی
  "short_text",
  "long_text",
  "number",
  "email",
  "phone_ir",
  "link",
  "telegram_id",
  // پیشرفته
  "statement",
  "group",
  "file_upload",
  "payment",
];

export function makeQuestion(type, position = 0) {
  const meta = QUESTION_TYPES[type] || QUESTION_TYPES.short_text;
  
  let options = [];
  if (type === "picture_choice") {
    options = meta.defaultOptions ? JSON.parse(JSON.stringify(meta.defaultOptions)) : [];
  } else if (meta.hasOptions) {
    options = meta.defaultOptions ? [...meta.defaultOptions] : [];
  }

  const base = {
    localId: `new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    type,
    title: meta.isInformational ? (type === "group" ? "عنوان بخش جدید" : "راهنما و توضیحات") : meta.label,
    description: "",
    placeholder: meta.defaultPlaceholder || "",
    required: meta.isInformational ? false : true,
    options,
    position,
    conditions: null,
    jump_actions: [],
    correct_answer: null,
    points: undefined,
    display_mode: meta.hasDisplayMode ? (meta.defaultDisplayMode || "buttons") : undefined,
    max_selections: meta.hasMaxSelections ? 1 : undefined,
    validation: null,
  };

  if (type === "matrix") {
    base.rows = [...(meta.defaultRows || [])];
    base.columns = [...(meta.defaultColumns || [])];
  }

  if (type === "nps") {
    base.min_label = meta.defaultMinLabel;
    base.max_label = meta.defaultMaxLabel;
  }

  if (type === "file_upload") {
    base.allowed_file_types = meta.defaultAllowedTypes || "all";
    base.max_file_size_mb = meta.defaultMaxSizeMb || 10;
  }

  if (type === "payment") {
    base.amount = meta.defaultAmount || 100000;
    base.currency = meta.defaultCurrency || "تومان";
  }

  return base;
}

export const LEGACY_TYPE_MAP = {
  short_text: "short_text",
  long_text: "long_text",
  phone_ir: "phone_ir",
  choice: "choice",
  email: "email",
  number: "number",
  rating: "rating",
  yes_no: "yes_no",
  telegram_id: "telegram_id",
  dropdown: "choice",
  picture_choice: "choice",
  likert: "choice",
  ranking: "choice",
  matrix: "choice",
  nps: "rating",
  link: "short_text",
  file_upload: "short_text",
  payment: "number",
  statement: "short_text",
  group: "short_text",
};

export function resolveQuestion(q) {
  if (!q) return q;
  const actualType = q.validation?.type || q.validation?.original_type || q.type || "short_text";
  const rows = q.rows || q.validation?.rows || ["کیفیت خدمات", "سرعت پاسخگویی", "سهولت استفاده"];
  const columns = q.columns || q.validation?.columns || ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"];
  const min_label = q.min_label || q.validation?.min_label || "اصلاً احتمال ندارد";
  const max_label = q.max_label || q.validation?.max_label || "بسیار زیاد";
  const allowed_file_types = q.allowed_file_types || q.validation?.allowed_file_types || "all";
  const max_file_size_mb = q.max_file_size_mb || q.validation?.max_file_size_mb || 10;
  const amount = q.amount || q.validation?.amount || 100000;
  const currency = q.currency || q.validation?.currency || "تومان";

  return {
    ...q,
    type: actualType,
    rows,
    columns,
    min_label,
    max_label,
    allowed_file_types,
    max_file_size_mb,
    amount,
    currency,
  };
}


