// ════════════════════════════════════════════════════════════════
// Condition Evaluator — ارزیابی شرط‌ها
// پشتیبانی از شرط‌های گروهی (AND/OR) روی هر سوال
// ════════════════════════════════════════════════════════════════

/**
 * ارزیابی یک شرط تکی
 * @param {Object} condition - شرط { source_question_id, operator, value }
 * @param {Object} answers - پاسخ‌های کاربر { questionId: value }
 * @param {Object} hiddenFields - اطلاعات مخفی (URL params) { key: value }
 * @returns {boolean}
 */
export function evaluateCondition(condition, answers, hiddenFields = {}) {
  if (!condition || !condition.source_question_id) return true;

  // پشتیبانی از hidden fields
  let srcVal = answers[condition.source_question_id];
  if (srcVal === undefined && hiddenFields[condition.source_question_id] !== undefined) {
    srcVal = hiddenFields[condition.source_question_id];
  }

  const op = condition.operator;
  const target = condition.value;

  // ─── خالی / غیرخالی ───
  if (op === "is_empty") {
    return srcVal === undefined || srcVal === null || String(srcVal).trim() === "";
  }
  if (op === "is_not_empty") {
    return !(srcVal === undefined || srcVal === null || String(srcVal).trim() === "");
  }

  // ─── اگه مقدار مرجع وجود نداره ───
  if (srcVal === undefined || srcVal === null) return false;

  // ─── برای checkbox / آرایه ───
  if (Array.isArray(srcVal)) {
    if (op === "is_selected") {
      return srcVal.includes(target);
    }
    if (op === "is_not_selected") {
      return !srcVal.includes(target);
    }
    // سایر عملگرها روی اولین مقدار
    return evaluateSingleValue(String(srcVal[0] ?? "").trim(), op, target);
  }

  // ─── مقدار تکی ───
  return evaluateSingleValue(String(srcVal).trim(), op, target);
}

/**
 * ارزیابی یک مقدار تکی
 */
function evaluateSingleValue(src, op, target) {
  const tgt = String(target ?? "").trim();

  switch (op) {
    case "equals":               return src === tgt;
    case "not_equals":           return src !== tgt;
    case "contains":             return src.includes(tgt);
    case "not_contains":         return !src.includes(tgt);
    case "starts_with":          return src.startsWith(tgt);
    case "ends_with":            return src.endsWith(tgt);
    case "greater_than":         return Number(src) > Number(tgt);
    case "greater_than_or_equal":return Number(src) >= Number(tgt);
    case "less_than":            return Number(src) < Number(tgt);
    case "less_than_or_equal":   return Number(src) <= Number(tgt);
    case "between": {
      // مقدار فرمت "min|max"
      const parts = String(tgt).split("|");
      const min = Number(parts[0] ?? 0);
      const max = Number(parts[1] ?? 0);
      const val = Number(src);
      return val >= min && val <= max;
    }
    case "is_selected":          return src === tgt;
    case "is_not_selected":      return src !== tgt;
    default:                     return true;
  }
}

/**
 * ارزیابی یک گروه شرط (AND/OR)
 * @param {string} groupOp - "AND" یا "OR"
 * @param {Array} conditions - آرایه شرط‌ها
 * @param {Object} answers - پاسخ‌ها
 * @param {Object} hiddenFields - اطلاعات مخفی
 * @returns {boolean}
 */
export function evaluateConditionGroup(groupOp, conditions, answers, hiddenFields = {}) {
  if (!conditions || conditions.length === 0) return true;

  if (groupOp === "OR") {
    return conditions.some((c) => evaluateCondition(c, answers, hiddenFields));
  }

  // پیش‌فرض: AND
  return conditions.every((c) => evaluateCondition(c, answers, hiddenFields));
}

/**
 * ارزیابی کامل یک Rule (قدیمی — برای سازگاری با LogicEditor)
 * @param {Object} rule - LogicRule
 * @param {Object} answers - پاسخ‌ها
 * @param {Object} hiddenFields - اطلاعات مخفی
 * @returns {boolean}
 */
export function evaluateRule(rule, answers, hiddenFields = {}) {
  if (!rule || !rule.enabled) return false;
  return evaluateConditionGroup(rule.group_operator, rule.conditions, answers, hiddenFields);
}

/**
 * ارزیابی شرط‌های visibility یک سوال
 * فیلد conditions سوال: { group_operator, conditions }
 * @param {Object} questionConditions - شرط‌های سوال
 * @param {Object} answers - پاسخ‌ها
 * @param {Object} hiddenFields - اطلاعات مخفی
 * @returns {boolean}
 */
export function evaluateQuestionConditions(questionConditions, answers, hiddenFields = {}) {
  if (!questionConditions) return true; // بدون شرط → همیشه نمایش
  const { group_operator, conditions } = questionConditions;
  if (!conditions || conditions.length === 0) return true;
  return evaluateConditionGroup(group_operator || "AND", conditions, answers, hiddenFields);
}
