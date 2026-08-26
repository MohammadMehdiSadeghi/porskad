// ════════════════════════════════════════════════════════════════
// Flow Engine — محاسبه مسیر قابل‌مشاهده فرم
// ════════════════════════════════════════════════════════════════

import { evaluateRule } from "./conditionEvaluator";

const MAX_FLOW_STEPS = 1000;

/**
 * محاسبه مسیر نهایی فرم بر اساس Ruleها و پاسخ‌ها
 *
 * @param {Array} questions - سوالات فرم (مرتب‌شده بر اساس position)
 * @param {Array} rules - Ruleهای منطقی فعال
 * @param {Object} answers - پاسخ‌های کاربر { questionId: value }
 * @returns {{
 *   visibleQuestions: Array,
 *   visibleIds: Set,
 *   triggeredRules: Array,
 *   ended: boolean,
 * }}
 */
export function calculateFlow(questions, rules, answers) {
  // ─── ۱. فعال‌ترین Ruleها رو پیدا کن ───
  const activeRules = (rules || [])
    .filter((r) => r.enabled && evaluateRule(r, answers))
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  // ─── ۲. Actionها رو جمع‌آوری کن ───
  const showTargets = new Set();
  const hideTargets = new Set();
  const goToTargets = new Map(); // sourceIndex → targetId
  let endForm = false;
  let endTarget = null;

  for (const rule of activeRules) {
    const action = rule.action;
    if (!action || !action.type) continue;

    switch (action.type) {
      case "SHOW_QUESTION":
        if (action.target_id) showTargets.add(action.target_id);
        break;
      case "HIDE_QUESTION":
        if (action.target_id) hideTargets.add(action.target_id);
        break;
      case "GO_TO_QUESTION":
        if (action.target_id) goToTargets.set(rule.source_question_id, action.target_id);
        break;
      case "END_FORM":
        endForm = true;
        endTarget = action.target_id || null;
        break;
    }
  }

  // ─── ۳. اگه END_FORM فعال شد ───
  if (endForm) {
    return {
      visibleQuestions: [],
      visibleIds: new Set(),
      triggeredRules: activeRules,
      ended: true,
      endTarget,
    };
  }

  // ─── ۴. سوالات پیش‌فرض (بدون شرط) ───
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // ─── ۵. محاسبه visible بر اساس condition سوال ───
  let defaultVisible = questions.filter((q) => {
    if (!q.condition || !q.condition.source_question_id) return true;
    const srcVal = answers[q.condition.source_question_id];
    return evaluateSimpleCondition(q.condition, srcVal);
  });

  // ─── ۶. GO_TO ها رو اعمال کن ───
  let path = [];
  let i = 0;
  let steps = 0;

  while (i < defaultVisible.length && steps < MAX_FLOW_STEPS) {
    steps++;
    const q = defaultVisible[i];
    path.push(q);

    // آیا این سوال GO_TO داره؟
    const goToId = goToTargets.get(q.id);
    if (goToId && questionMap.has(goToId)) {
      // پیدا کردن ایندکس سوال مقصد در defaultVisible
      const targetIdx = defaultVisible.findIndex((dq) => dq.id === goToId);
      if (targetIdx > i) {
        i = targetIdx;
        continue;
      }
    }

    i++;
  }

  // ─── ۷. SHOW/HIDE Ruleها رو اعمال کن ───
  //SHOW: سوالاتی که Rule گفته نمایش بدن ولی در مسیر نیستن → اضافه کن
  //HIDE: سوالاتی که Rule گفته مخفی کن → حذف کن
  const pathIds = new Set(path.map((q) => q.id));

  // SHOW targets
  for (const targetId of showTargets) {
    if (!pathIds.has(targetId) && questionMap.has(targetId)) {
      const q = questionMap.get(targetId);
      // اضافه کن بعد از آخرین سوالی که positionش کمتره
      let inserted = false;
      for (let j = 0; j < path.length; j++) {
        if ((q.position ?? 0) < (path[j].position ?? 0)) {
          path.splice(j, 0, q);
          pathIds.add(targetId);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        path.push(q);
        pathIds.add(targetId);
      }
    }
  }

  // HIDE targets
  const visible = path.filter((q) => !hideTargets.has(q.id));
  const visibleIds = new Set(visible.map((q) => q.id));

  // ─── ۸. GO_TO های اضافی که بعد از مقصد اومدن رو حذف کن ───
  // (اگه Q1 → Q5 باشه، Q2/Q3/Q4 نباید باشن)

  return {
    visibleQuestions: visible,
    visibleIds,
    triggeredRules: activeRules,
    ended: false,
    endTarget: null,
  };
}

/**
 * ارزیابی ساده شرط (برای condition فیلد سوال)
 */
function evaluateSimpleCondition(condition, srcVal) {
  if (!condition || !condition.source_question_id) return true;
  const op = condition.operator;
  const target = condition.value;

  if (op === "is_empty") {
    return srcVal === undefined || srcVal === null || String(srcVal).trim() === "";
  }
  if (op === "is_not_empty") {
    return !(srcVal === undefined || srcVal === null || String(srcVal).trim() === "");
  }
  if (srcVal === undefined || srcVal === null) return false;

  const src = String(srcVal).trim();
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
    case "is_selected":          return String(srcVal).includes(tgt);
    case "is_not_selected":      return !String(srcVal).includes(tgt);
    default:                     return true;
  }
}

/**
 * پیدا کردن مرحله بعدی قابل نمایش
 */
export function findNextStep(currentStep, questions, visibleIds) {
  for (let i = currentStep + 1; i < questions.length; i++) {
    if (visibleIds.has(questions[i].id)) return i;
  }
  return questions.length; // تمام شد
}

/**
 * پیدا کردن مرحله قبلی قابل نمایش
 */
export function findPrevStep(currentStep, questions, visibleIds) {
  for (let i = currentStep - 1; i >= 0; i--) {
    if (visibleIds.has(questions[i].id)) return i;
  }
  return -1; // برگشت به خوش‌آمد
}
