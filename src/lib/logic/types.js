// ════════════════════════════════════════════════════════════════
// Logic Engine — تعریف ثابت‌ها و عملگرها
// ════════════════════════════════════════════════════════════════

// ─── عملگرهای شرطی ───
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
  "is_empty", "is_not_empty",
  "is_selected", "is_not_selected",
];

// ─── انواع Action ───
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

// ─── ساخت شرط خالی جدید ───
export function makeCondition() {
  return {
    id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source_question_id: null,
    operator: "equals",
    value: "",
  };
}

// ─── ساخت Action خالی جدید ───
export function makeAction() {
  return {
    type: "SHOW_QUESTION",
    target_id: null,
  };
}

// ─── ساخت Rule خالی جدید ───
export function makeRule() {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    name: "",
    group_operator: "AND",
    conditions: [makeCondition()],
    action: makeAction(),
    priority: 0,
  };
}
