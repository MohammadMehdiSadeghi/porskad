// ════════════════════════════════════════════════════════════════
// Logic Engine — تعریف ثابت‌ها و عملگرها
// مدل شرطی‌سازی مشابه پرس‌لاین: شرط روی هر سوال + اکشن پرش روی هر گزینه
// ════════════════════════════════════════════════════════════════

// ─── عملگرهای شرطی (پایه) ───
export const OPERATORS = {
  equals:              { label: "برابر با",          needsValue: true,  type: "text" },
  not_equals:          { label: "نابرابر با",        needsValue: true,  type: "text" },
  contains:            { label: "شامل",              needsValue: true,  type: "text" },
  not_contains:        { label: "شامل نباشد",        needsValue: true,  type: "text" },
  starts_with:         { label: "شروع شود با",       needsValue: true,  type: "text" },
  ends_with:           { label: "پایان یابد با",      needsValue: true,  type: "text" },
  greater_than:        { label: "بزرگ‌تر از",         needsValue: true,  type: "number" },
  greater_than_or_equal:{ label: "بزرگ‌تر یا مساوی", needsValue: true,  type: "number" },
  less_than:           { label: "کوچک‌تر از",         needsValue: true,  type: "number" },
  less_than_or_equal:  { label: "کوچک‌تر یا مساوی",   needsValue: true,  type: "number" },
  between:             { label: "بین دو عدد",        needsValue: true,  type: "range" },
  is_empty:            { label: "خالی باشد",          needsValue: false, type: "empty" },
  is_not_empty:        { label: "خالی نباشد",         needsValue: false, type: "empty" },
  is_selected:         { label: "انتخاب شده",         needsValue: true,  type: "select" },
  is_not_selected:     { label: "انتخاب نشده",        needsValue: true,  type: "select" },
};

export const OPERATOR_ORDER = [
  "equals", "not_equals",
  "contains", "not_contains",
  "starts_with", "ends_with",
  "greater_than", "greater_than_or_equal",
  "less_than", "less_than_or_equal",
  "between",
  "is_empty", "is_not_empty",
  "is_selected", "is_not_selected",
];

// ─── عملگرهای مناسب برای هر نوع سوال ───
// بخش ۳ مستند پرس‌لاین
export const TYPE_OPERATORS = {
  // ۳.۱ تک‌انتخابی / ۳.۱۳ بله‌خیر / تصویری
  choice:    ["is_selected", "is_not_selected", "is_empty"],
  yes_no:    ["is_selected", "is_not_selected", "is_empty"],

  // ۳.۲ چندانتخابی
  checkbox:  ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],

  // ۳.۴ عدد / ۳.۸ درجه‌بندی
  number:    ["equals", "not_equals", "greater_than", "greater_than_or_equal",
              "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty"],
  rating:    ["equals", "not_equals", "greater_than", "greater_than_or_equal",
              "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty"],

  // ۳.۵ متن کوتاه / ۳.۵ متن بلند
  short_text: ["equals", "not_equals", "contains", "not_contains",
               "starts_with", "ends_with", "is_empty", "is_not_empty"],
  long_text:  ["equals", "not_equals", "contains", "not_contains",
               "starts_with", "ends_with", "is_empty", "is_not_empty"],

  // ۳.۶ ایمیل / شماره موبایل
  email:     ["equals", "not_equals", "contains", "ends_with",
              "is_empty", "is_not_empty"],
  phone_ir:  ["equals", "not_equals", "contains", "starts_with",
              "is_empty", "is_not_empty"],
  telegram_id: ["equals", "not_equals", "contains", "starts_with",
                "is_empty", "is_not_empty"],
};

// ─── نوع فیلد مقدار عملگر بر اساس نوع سوال ───
// تعیین می‌کند سلکت باشد، اینپوت عددی باشد، یا رنج باشد
export const TYPE_VALUE_FIELD = {
  choice:    "option_select",
  yes_no:    "yes_no_select",
  checkbox:  "option_select",
  number:    "number",
  rating:    "number",
  short_text: "text",
  long_text:  "text",
  email:     "text",
  phone_ir:  "text",
  telegram_id: "text",
};

// ─── عملگرهای پرش (اکشن) — بخش ۲ مستند ───
export const JUMP_ACTION_TYPES = {
  jump_to_question: { label: "پرش به سوال", icon: "⏭" },
  end_form:         { label: "پایان فرم",   icon: "🏁" },
  redirect_url:     { label: "هدایت به لینک", icon: "🔗" },
};

export const JUMP_ACTION_TYPE_ORDER = [
  "jump_to_question",
  "end_form",
  "redirect_url",
];

// ─── انواع Action (قدیمی — برای سازگاری) ───
export const ACTION_TYPES = {
  SHOW_QUESTION:   { label: "نمایش سوال",          icon: "👁" },
  HIDE_QUESTION:   { label: "مخفی کردن سوال",       icon: "🙈" },
  GO_TO_QUESTION:  { label: "رفتن به سوال",         icon: "⏭" },
  END_FORM:        { label: "پایان فرم",            icon: "🏁" },
};

export const ACTION_TYPE_ORDER = [
  "SHOW_QUESTION",
  "HIDE_QUESTION",
  "GO_TO_QUESTION",
  "END_FORM",
];

// ─── انواع ترکیب شرط‌ها ───
export const GROUP_OPERATORS = {
  AND: { label: "و (AND)", icon: "AND" },
  OR:  { label: "یا (OR)", icon: "OR" },
};

// ════════════════════════════════════════════════════════════════
// فکتوری‌ها (ساخت اشیاء خالی جدید)
// ════════════════════════════════════════════════════════════════

// ─── ساخت شرط تکی ───
export function makeCondition() {
  return {
    id: crypto.randomUUID(),
    source_question_id: null,
    operator: "equals",
    value: "",
  };
}

// ─── ساخت گروه شرط‌ها (برای visibility یک سوال) ───
export function makeConditionGroup() {
  return {
    group_operator: "AND",
    conditions: [makeCondition()],
  };
}

// ─── ساخت اکشن پرش (روی یک گزینه) ───
export function makeJumpAction() {
  return {
    id: crypto.randomUUID(),
    option_index: -1,        // -1 = فیلد کلی (не گزینه خاص)
    action_type: "jump_to_question",
    target_id: null,         // آیدی سوال مقصد
    target_url: null,        // URL برای redirect
  };
}

// ─── ساخت Action خالی جدید (قدیمی) ───
export function makeAction() {
  return {
    type: "SHOW_QUESTION",
    target_id: null,
  };
}

// ─── ساخت Rule خالی جدید (قدیمی) ───
export function makeRule() {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    name: "",
    group_operator: "AND",
    conditions: [makeCondition()],
    action: makeAction(),
    priority: 0,
  };
}

// ─── بررسی آیا نوع سوال چندگزینه‌ای است ───
export function isChoiceType(type) {
  return type === "choice" || type === "yes_no" || type === "checkbox";
}

// ─── بررسی آیا نوع سوال عددی است ───
export function isNumericType(type) {
  return type === "number" || type === "rating";
}
