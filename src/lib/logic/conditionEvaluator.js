// ════════════════════════════════════════════════════════════════
// Condition Evaluator — ارزیابی شرط‌ها
// پشتیبانی از answer/variable/score + عملگرهای چند انتخابی
// ════════════════════════════════════════════════════════════════

import { toEnDigits } from "../validators";

/**
 * دریافت مقدار منبع شرط
 * @param {Object} condition - شرط
 * @param {Object} answers - پاسخ‌ها
 * @param {Object} variables - متغیرهای سفارشی (شامل score)
 * @param {Object} hiddenFields - اطلاعات مخفی URL
 * @returns {*}
 */
function getSourceValue(condition, answers, variables, hiddenFields) {
  const { source, questionId, variableKey } = condition;

  if (source === "variable" || source === "score") {
    const key = source === "score" ? "score" : variableKey;
    return variables?.[key] ?? null;
  }

  // source === "answer"
  if (questionId) {
    let val = answers[questionId];
    if (val === undefined && hiddenFields?.[questionId] !== undefined) {
      val = hiddenFields[questionId];
    }
    return val;
  }

  return null;
}

/**
 * ارزیابی یک شرط تکی
 * @param {Object} condition - شرط
 * @param {Object} answers - پاسخ‌ها
 * @param {Object} variables - متغیرها (شامل score)
 * @param {Object} hiddenFields - اطلاعات مخفی
 * @returns {boolean}
 */
export function evaluateCondition(condition, answers, variables = {}, hiddenFields = {}) {
  if (!condition) return true;

  const srcVal = getSourceValue(condition, answers, variables, hiddenFields);
  const op = condition.operator;
  const target = condition.value;

  // ─── خالی / غیرخالی ───
  if (op === "is_empty") {
    return srcVal === undefined || srcVal === null || String(srcVal).trim() === "";
  }
  if (op === "is_not_empty") {
    return !(srcVal === undefined || srcVal === null || String(srcVal).trim() === "");
  }

  // ─── عملگرهای تعداد انتخاب (checkbox) ───
  if (op === "selected_count_equals" || op === "selected_count_greater_than" || op === "selected_count_less_than") {
    const count = Array.isArray(srcVal) ? srcVal.length : 0;
    const num = Number(target);
    if (op === "selected_count_equals") return count === num;
    if (op === "selected_count_greater_than") return count > num;
    if (op === "selected_count_less_than") return count < num;
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
    case "greater_than":         return Number(toEnDigits(src)) > Number(toEnDigits(tgt));
    case "greater_than_or_equal":return Number(toEnDigits(src)) >= Number(toEnDigits(tgt));
    case "less_than":            return Number(toEnDigits(src)) < Number(toEnDigits(tgt));
    case "less_than_or_equal":   return Number(toEnDigits(src)) <= Number(toEnDigits(tgt));
    case "between": {
      const rawParts = String(tgt).split("|");
      const minStr = (rawParts[0] ?? "").trim();
      const maxStr = (rawParts[1] ?? "").trim();
      // اگه یکی از طرفین خالی باشه، فقط طرف دیگه رو چک کن
      const hasMin = minStr !== "";
      const hasMax = maxStr !== "";
      if (!hasMin && !hasMax) return false;
      const val = Number(toEnDigits(src));
      if (isNaN(val)) return false;
      if (hasMin && hasMax) {
        const min = Number(toEnDigits(minStr));
        const max = Number(toEnDigits(maxStr));
        if (isNaN(min) || isNaN(max)) return false;
        return val >= min && val <= max;
      }
      if (hasMin) {
        const min = Number(toEnDigits(minStr));
        return !isNaN(min) && val >= min;
      }
      const max = Number(toEnDigits(maxStr));
      return !isNaN(max) && val <= max;
    }
    case "is_selected":          return src === tgt;
    case "is_not_selected":      return src !== tgt;
    default:                     return true;
  }
}

/**
 * ارزیابی یک گروه شرط (AND/OR)
 */
export function evaluateConditionGroup(groupOp, conditions, answers, variables = {}, hiddenFields = {}) {
  if (!conditions || conditions.length === 0) return true;

  if (groupOp === "OR") {
    return conditions.some((c) => evaluateCondition(c, answers, variables, hiddenFields));
  }
  return conditions.every((c) => evaluateCondition(c, answers, variables, hiddenFields));
}

/**
 * ارزیابی یک LogicRule
 * rule.conditions = LogicConditionGroup[] (بین گروه‌ها = OR)
 */
export function evaluateRule(rule, answers, variables = {}, hiddenFields = {}) {
  if (!rule || !rule.enabled) return false;
  const groups = rule.conditions || [];
  if (groups.length === 0) return true;
  // بین گروه‌ها = OR
  return groups.some((group) =>
    evaluateConditionGroup(group.operator || "AND", group.conditions || [], answers, variables, hiddenFields)
  );
}

/**
 * ارزیابی شرط‌های visibility سوال (ساختار قدیمی per-question)
 */
export function evaluateQuestionConditions(questionConditions, answers, variables = {}, hiddenFields = {}) {
  if (!questionConditions) return true;
  const { group_operator, conditions } = questionConditions;
  if (!conditions || conditions.length === 0) return true;
  return evaluateConditionGroup(group_operator || "AND", conditions, answers, variables, hiddenFields);
}
