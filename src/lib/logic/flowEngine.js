// ════════════════════════════════════════════════════════════════
// Flow Engine — محاسبه مسیر قابل‌مشاهده فرم
// مدل پرس‌لاین: شرط visibility روی هر سوال + پرش روی هر گزینه
// ════════════════════════════════════════════════════════════════

import { evaluateQuestionConditions, evaluateRule } from "./conditionEvaluator";

const MAX_FLOW_STEPS = 1000;

/**
 * محاسبه مسیر نهایی فرم بر اساس شرط‌های هر سوال و پاسخ‌ها
 *
 * @param {Array} questions - سوالات فرم (مرتب‌شده بر اساس position)
 * @param {Array} rules - Ruleهای منطقی قدیمی (سازگاری)
 * @param {Object} answers - پاسخ‌های کاربر { questionId: value }
 * @param {Object} hiddenFields - اطلاعات مخفی (URL params) { key: value }
 * @returns {{
 *   visibleQuestions: Array,
 *   visibleIds: Set,
 *   triggeredRules: Array,
 *   ended: boolean,
 *   endTarget: null|string,
 * }}
 */
export function calculateFlow(questions, rules, answers, hiddenFields = {}) {
  // ─── ۱. شرط visibility هر سوال را بررسی کن ───
  // هر سوال یک فیلد conditions دارد:
  //   { group_operator: "AND"|"OR", conditions: [{ source_question_id, operator, value }] }
  // اگر شرط برقرار باشد، سوال نمایش داده می‌شود
  const visibleByCondition = questions.filter((q) =>
    evaluateQuestionConditions(q.conditions, answers, hiddenFields)
  );

  // ─── ۲. Ruleهای قدیمی (سازگاری) ───
  const activeRules = (rules || [])
    .filter((r) => r.enabled && evaluateRule(r, answers, hiddenFields))
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  // جمع‌آوری actionهای Ruleهای قدیمی
  const showTargets = new Set();
  const hideTargets = new Set();
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

  // ─── ۴. شروع با سوالاتی که شرط visibility رو برآورده می‌کنن ───
  let visible = [...visibleByCondition];

  // ─── ۵. SHOW/HIDE Ruleهای قدیمی ───
  const visibleIds = new Set(visible.map((q) => q.id));

  // SHOW: اضافه کن
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  for (const targetId of showTargets) {
    if (!visibleIds.has(targetId) && questionMap.has(targetId)) {
      const q = questionMap.get(targetId);
      let inserted = false;
      for (let j = 0; j < visible.length; j++) {
        if ((q.position ?? 0) < (visible[j].position ?? 0)) {
          visible.splice(j, 0, q);
          visibleIds.add(targetId);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        visible.push(q);
        visibleIds.add(targetId);
      }
    }
  }

  // HIDE: حذف کن
  const finalVisible = visible.filter((q) => !hideTargets.has(q.id));
  const finalIds = new Set(finalVisible.map((q) => q.id));

  return {
    visibleQuestions: finalVisible,
    visibleIds: finalIds,
    triggeredRules: activeRules,
    ended: false,
    endTarget: null,
  };
}

/**
 * محاسبه مرحله بعدی با در نظر گرفتن jump_actions سوال فعلی
 * این تابع در runtime توسط form viewer فراخوانی می‌شود
 *
 * @param {Object} currentQuestion - سوال فعلی
 * @param {*} answer - پاسخ کاربر به سوال فعلی
 * @param {Array} questions - همه سوالات
 * @param {Array} visibleQuestions - سوالات قابل مشاهده فعلی
 * @param {Array} jumpQueue - صف پرش‌های معلق (برای checkbox)
 * @returns {{ type: "next"|"jump"|"end"|"redirect", targetId?: string, url?: string }}
 */
export function evaluateNextStep(currentQuestion, answer, questions, visibleQuestions, jumpQueue = []) {
  const jumpActions = currentQuestion.jump_actions || [];

  // ─── اگه jump_actions خالیه → مرحله بعدی عادی ───
  if (!jumpActions.length) {
    return checkJumpQueue(jumpQueue, visibleQuestions);
  }

  // ─── checkbox: برای هر گزینه انتخاب‌شده، پرش صف بساز ───
  if (currentQuestion.type === "choice" || currentQuestion.type === "yes_no") {
    // پیدا کردن ایندکس گزینه انتخاب‌شده
    let selectedIndices = [];

    if (currentQuestion.type === "yes_no") {
      if (answer === "بله" || answer === "true" || answer === true) {
        selectedIndices = [0]; // بله = ایندکس ۰
      } else if (answer === "خیر" || answer === "false" || answer === false) {
        selectedIndices = [1]; // خیر = ایندکس ۱
      }
    } else if (currentQuestion.type === "choice") {
      // choice: answer is the option text
      const optIdx = currentQuestion.options?.findIndex((o) => o === answer);
      if (optIdx >= 0) selectedIndices = [optIdx];
    }

    // پیدا کردن jump action متناسب با گزینه انتخاب‌شده
    for (const idx of selectedIndices) {
      const ja = jumpActions.find((j) => j.option_index === idx);
      if (ja) {
        return resolveJumpAction(ja, jumpQueue);
      }
    }

    // اگه هیچ jump actionای مطابقت نداشت → مرحله بعدی عادی
    return checkJumpQueue(jumpQueue, visibleQuestions);
  }

  // ─── متن / عدد: اولین jump action منطبق ───
  for (const ja of jumpActions) {
    if (ja.option_index === -1) {
      // jump فیلد کلی (برای متن/عدد/ایمیل)
      return resolveJumpAction(ja, jumpQueue);
    }
  }

  return checkJumpQueue(jumpQueue, visibleQuestions);
}

/**
 * اجرای jump action
 */
function resolveJumpAction(ja, jumpQueue) {
  if (ja.action_type === "end_form") {
    return { type: "end" };
  }
  if (ja.action_type === "redirect_url" && ja.target_url) {
    return { type: "redirect", url: ja.target_url };
  }
  if (ja.action_type === "jump_to_question" && ja.target_id) {
    // اگه صف پرش وجود داره، اول اونو خالی کن
    if (jumpQueue.length > 0) {
      // هدف فعلی رو به انتهای صف اضافه کن
      jumpQueue.push(ja.target_id);
      const nextTarget = jumpQueue.shift();
      return { type: "jump", targetId: nextTarget };
    }
    return { type: "jump", targetId: ja.target_id };
  }
  return { type: "next" };
}

/**
 * بررسی صف پرش
 */
function checkJumpQueue(jumpQueue, visibleQuestions) {
  if (jumpQueue.length > 0) {
    const nextTarget = jumpQueue.shift();
    return { type: "jump", targetId: nextTarget };
  }
  return { type: "next" };
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
