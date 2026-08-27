// ════════════════════════════════════════════════════════════════
// Logic Engine — تعریف ثابت‌ها و عملگرها (نسخه نهایی)
// مدل شرطی‌سازی مشابه پرس‌لاین: LogicRule متمرکز + شرط روی هر سوال
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
  // ─── عملگرهای جدید: تعداد انتخاب (برای checkbox) ───
  selected_count_equals:         { label: "تعداد انتخاب برابر با",   needsValue: true,  type: "number" },
  selected_count_greater_than:   { label: "تعداد انتخاب بیشتر از",    needsValue: true,  type: "number" },
  selected_count_less_than:      { label: "تعداد انتخاب کمتر از",     needsValue: true,  type: "number" },
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
  "selected_count_equals", "selected_count_greater_than", "selected_count_less_than",
];

// ─── عملگرهای مناسب برای هر نوع سوال ───
export const TYPE_OPERATORS = {
  choice:    ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
  yes_no:    ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
  checkbox:  ["is_selected", "is_not_selected", "is_empty", "is_not_empty",
              "selected_count_equals", "selected_count_greater_than", "selected_count_less_than"],
  number:    ["equals", "not_equals", "greater_than", "greater_than_or_equal",
              "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty"],
  rating:    ["equals", "not_equals", "greater_than", "greater_than_or_equal",
              "less_than", "less_than_or_equal", "between", "is_empty", "is_not_empty"],
  short_text: ["equals", "not_equals", "contains", "not_contains",
               "starts_with", "ends_with", "is_empty", "is_not_empty"],
  long_text:  ["equals", "not_equals", "contains", "not_contains",
               "starts_with", "ends_with", "is_empty", "is_not_empty"],
  email:     ["equals", "not_equals", "contains", "ends_with", "is_empty", "is_not_empty"],
  phone_ir:  ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
  telegram_id: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
};

// ─── نوع فیلد مقدار عملگر ───
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

// ─── منبع مقدار شرط (بخش ۸ مستند) ───
export const CONDITION_SOURCES = {
  answer:   { label: "پاسخ سوال",   icon: "💬" },
  variable: { label: "متغیر سفارشی", icon: "🔤" },
  score:    { label: "امتیاز",       icon: "📊" },
};

// ─── اکشن‌های jump (legacy — برای jump_actions روی گزینه‌ها) ───
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

// ─── انواع Action ───
export const ACTION_TYPES = {
  SHOW_QUESTION:    { label: "نمایش سوال",      icon: "👁" },
  HIDE_QUESTION:    { label: "مخفی کردن سوال",   icon: "🙈" },
  GO_TO_QUESTION:   { label: "پرش به سوال",     icon: "⏭" },
  END_FORM:         { label: "پایان فرم",       icon: "🏁" },
  REDIRECT_URL:     { label: "هدایت به لینک",   icon: "🔗" },
  ADD_TO_VARIABLE:  { label: "تغییر متغیر",     icon: "➕" },
};

export const ACTION_TYPE_ORDER = [
  "SHOW_QUESTION",
  "HIDE_QUESTION",
  "GO_TO_QUESTION",
  "END_FORM",
  "REDIRECT_URL",
  "ADD_TO_VARIABLE",
];

// ─── رفتار پاسخ هنگام مخفی شدن سوال ───
export const HIDDEN_BEHAVIORS = {
  KEEP:  { label: "نگه‌داشتن پاسخ", desc: "پاسخ در داده خام ذخیره می‌شود ولی در Submit اعمال نمی‌شود" },
  CLEAR: { label: "پاک کردن پاسخ",  desc: "پاسخ کاملاً حذف می‌شود" },
};

// ─── انواع ترکیب شرط‌ها ───
export const GROUP_OPERATORS = {
  AND: { label: "و (AND)", icon: "AND" },
  OR:  { label: "یا (OR)", icon: "OR" },
};

// ─── حداکثر مراحل Flow (جلوگیری از loop بی‌نهایت) ───
export const MAX_FLOW_STEPS = 1000;

// ════════════════════════════════════════════════════════════════
// فکتوری‌ها
// ════════════════════════════════════════════════════════════════

// ─── ساخت شرط تکی ───
export function makeCondition() {
  return {
    id: crypto.randomUUID(),
    source: "answer",           // "answer" | "variable" | "score"
    questionId: null,           // وقتی source = "answer"
    variableKey: null,          // وقتی source = "variable" یا "score"
    operator: "equals",
    value: "",
    optionId: null,             // برای چندگزینه‌ای
    rowId: null,                // برای ماتریسی/طیفی
  };
}

// ─── ساخت گروه شرط‌ها ───
export function makeConditionGroup() {
  return {
    group_operator: "AND",      // AND یا OR بین شرط‌های داخل این گروه
    conditions: [makeCondition()],
  };
}

// ─── ساخت LogicRule ───
export function makeRule() {
  return {
    id: crypto.randomUUID(),
    formId: null,
    sourceQuestionId: null,     // سوالی که این Rule رویش تعریف شده
    priority: 0,
    enabled: true,
    conditions: [makeConditionGroup()],  // بین گروه‌ها = OR
    action: { type: "SHOW_QUESTION", targetId: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── ساخت Action خالی ───
export function makeAction(type = "SHOW_QUESTION") {
  const base = { type };
  if (type === "END_FORM") return { ...base, endId: null };
  if (type === "REDIRECT_URL") return { ...base, url: "" };
  if (type === "ADD_TO_VARIABLE") return { ...base, variableKey: "", amount: 0 };
  return { ...base, targetId: null };
}

// ─── ساخت jump action برای گزینه (legacy) ───
export function makeJumpAction() {
  return {
    id: crypto.randomUUID(),
    option_index: -1,
    action_type: "jump_to_question",
    target_id: null,
    target_url: null,
  };
}

// ─── ساخت سوال جدید ───
export function makeQuestion(type, position = 0) {
  return {
    localId: `new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    type,
    title: "",
    description: "",
    required: true,
    options: [],
    position,
    conditions: null,
    jump_actions: [],
  };
}

// ════════════════════════════════════════════════════════════════
// توابع کمکی
// ════════════════════════════════════════════════════════════════

export function isChoiceType(type) {
  return type === "choice" || type === "yes_no" || type === "checkbox";
}

export function isNumericType(type) {
  return type === "number" || type === "rating";
}

/**
 * ساخت Dependency Graph از Ruleها
 * برمی‌گرداند: Map<sourceId, Set<ruleId>>
 */
export function buildDependencyGraph(rules) {
  const graph = new Map();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const deps = extractDependencies(rule);
    for (const dep of deps) {
      if (!graph.has(dep)) graph.set(dep, new Set());
      graph.get(dep).add(rule.id);
    }
  }
  return graph;
}

/**
 * استخراج وابستگی‌های یک Rule
 */
function extractDependencies(rule) {
  const deps = new Set();
  for (const group of (rule.conditions || [])) {
    for (const cond of (group.conditions || [])) {
      if (cond.source === "answer" && cond.questionId) {
        deps.add(cond.questionId);
      }
      if (cond.source === "variable" && cond.variableKey) {
        deps.add(`var:${cond.variableKey}`);
      }
      if (cond.source === "score") {
        deps.add("var:score");
      }
    }
  }
  // action target هم dependency نیست (فقط output)
  return deps;
}
