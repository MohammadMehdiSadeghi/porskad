// ════════════════════════════════════════════════════════════════
// Flow Engine — محاسبه مسیر قابل‌مشاهده فرم
// مدل پرس‌لاین: LogicRule متمرکز + متغیرها + Checkbox multi-branch
// ════════════════════════════════════════════════════════════════

import { evaluateRule, evaluateQuestionConditions } from "./conditionEvaluator";
import { MAX_FLOW_STEPS } from "./types";

/**
 * محاسبه مسیر نهایی فرم
 *
 * @param {Array} questions - سوالات فرم (مرتب‌شده بر اساس position)
 * @param {Array} rules - LogicRuleها
 * @param {Object} answers - پاسخ‌های کاربر
 * @param {Object} variables - متغیرهای سفارشی (شامل score)
 * @param {Object} hiddenFields - اطلاعات مخفی URL
 * @returns {Object} FlowResult
 */
export function calculateFlow(questions, rules, answers, variables = {}, hiddenFields = {}) {
  // ─── ۱. شرط visibility هر سوال ───
  const visibleByCondition = questions.filter((q) =>
    evaluateQuestionConditions(q.conditions, answers, variables, hiddenFields)
  );

  // ─── ۲. ارزیابی Ruleها ───
  const activeRules = (rules || [])
    .filter((r) => r.enabled && evaluateRule(r, answers, variables, hiddenFields))
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  // ─── ۳. جمع‌آوری actionها ───
  const showTargets = new Set();
  const hideTargets = new Set();
  const goToTargets = new Map(); // sourceQuestionId → targetId
  let endForm = false;
  let endTarget = null;
  const variableChanges = []; // { variableKey, amount }

  for (const rule of activeRules) {
    const action = rule.action;
    if (!action || !action.type) continue;

    switch (action.type) {
      case "SHOW_QUESTION":
        if (action.targetId) showTargets.add(action.targetId);
        break;
      case "HIDE_QUESTION":
        if (action.targetId) hideTargets.add(action.targetId);
        break;
      case "GO_TO_QUESTION":
        if (action.targetId && rule.sourceQuestionId) {
          goToTargets.set(rule.sourceQuestionId, action.targetId);
        }
        break;
      case "END_FORM":
        endForm = true;
        endTarget = action.endId || null;
        break;
      case "ADD_TO_VARIABLE":
        if (action.variableKey) {
          variableChanges.push({
            variableKey: action.variableKey,
            amount: Number(action.amount) || 0,
          });
        }
        break;
    }
  }

  // ─── ۴. اگه END_FORM فعال شد ───
  if (endForm) {
    return {
      visibleQuestions: [],
      visibleIds: new Set(),
      triggeredRules: activeRules,
      ended: true,
      endTarget,
      variableChanges,
    };
  }

  // ─── ۵. شروع با سوالات visible ───
  let visible = [...visibleByCondition];

  // ─── ۶. GO_TO ها رو اعمال کن ───
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  let path = [];
  let i = 0;
  let steps = 0;

  while (i < visible.length && steps < MAX_FLOW_STEPS) {
    steps++;
    const q = visible[i];
    path.push(q);

    const goToId = goToTargets.get(q.id);
    if (goToId && questionMap.has(goToId)) {
      const targetIdx = visible.findIndex((dq) => dq.id === goToId);
      if (targetIdx > i) {
        i = targetIdx;
        continue;
      }
    }
    i++;
  }

  // ─── ۷. SHOW/HIDE ───
  const pathIds = new Set(path.map((q) => q.id));

  for (const targetId of showTargets) {
    if (!pathIds.has(targetId) && questionMap.has(targetId)) {
      const q = questionMap.get(targetId);
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

  const finalVisible = path.filter((q) => !hideTargets.has(q.id));
  const visibleIds = new Set(finalVisible.map((q) => q.id));

  return {
    visibleQuestions: finalVisible,
    visibleIds,
    triggeredRules: activeRules,
    ended: false,
    endTarget: null,
    variableChanges,
  };
}

/**
 * ارزیابی مرحله بعدی با در نظر گرفتن jump_actions
 * برای checkbox: صف چندمسیره
 */
export function evaluateNextStep(currentQuestion, answer, questions, visibleQuestions, jumpQueue = []) {
  const jumpActions = currentQuestion.jump_actions || [];

  if (!jumpActions.length) {
    return checkJumpQueue(jumpQueue);
  }

  // ─── choice / yes_no ───
  if (currentQuestion.type === "choice" || currentQuestion.type === "yes_no") {
    let selectedIndices = [];

    if (currentQuestion.type === "yes_no") {
      if (answer === "بله" || answer === "true" || answer === true) {
        selectedIndices = [0];
      } else if (answer === "خیر" || answer === "false" || answer === false) {
        selectedIndices = [1];
      }
    } else if (currentQuestion.type === "choice" && (currentQuestion.max_selections ?? 1) <= 1) {
      const optIdx = currentQuestion.options?.findIndex((o) => o === answer);
      if (optIdx >= 0) selectedIndices = [optIdx];
    }

    for (const idx of selectedIndices) {
      const ja = jumpActions.find((j) => j.option_index === idx);
      if (ja) return resolveJumpAction(ja, jumpQueue);
    }

    return checkJumpQueue(jumpQueue);
  }

  // ─── choice با چند انتخاب → صف چند مقصد ───
  if (currentQuestion.type === "choice" && (currentQuestion.max_selections ?? 1) > 1 && Array.isArray(answer)) {
    // بر اساس ترتیب چیدمان گزینه‌ها (نه ترتیب انتخاب کاربر)
    const destinations = [];
    for (let idx = 0; idx < (currentQuestion.options?.length || 0); idx++) {
      if (answer.includes(currentQuestion.options[idx])) {
        const ja = jumpActions.find((j) => j.option_index === idx);
        if (ja && ja.action_type === "jump_to_question" && ja.target_id) {
          destinations.push(ja.target_id);
        }
        if (ja && ja.action_type === "end_form") {
          destinations.push("__END_FORM__");
        }
      }
    }

    // Deduplicate
    const uniqueDestinations = [...new Set(destinations)];

    // اگه END_FORM وجود داشت
    if (uniqueDestinations.includes("__END_FORM__")) {
      return { type: "end" };
    }

    // اولین مقصد مستقیم اجرا بشه، بقیه صف
    if (uniqueDestinations.length > 0) {
      const first = uniqueDestinations.shift();
      // بقیه رو به صف اضافه کن
      for (const d of uniqueDestinations) {
        jumpQueue.push(d);
      }
      return { type: "jump", targetId: first };
    }

    return checkJumpQueue(jumpQueue);
  }

  // ─── متن / عدد: jump فیلد کلی ───
  for (const ja of jumpActions) {
    if (ja.option_index === -1) {
      return resolveJumpAction(ja, jumpQueue);
    }
  }

  return checkJumpQueue(jumpQueue);
}

function resolveJumpAction(ja, jumpQueue) {
  if (ja.action_type === "end_form") return { type: "end" };
  if (ja.action_type === "redirect_url" && ja.target_url) {
    return { type: "redirect", url: ja.target_url };
  }
  if (ja.action_type === "jump_to_question" && ja.target_id) {
    if (jumpQueue.length > 0) {
      jumpQueue.push(ja.target_id);
      const nextTarget = jumpQueue.shift();
      return { type: "jump", targetId: nextTarget };
    }
    return { type: "jump", targetId: ja.target_id };
  }
  return { type: "next" };
}

function checkJumpQueue(jumpQueue) {
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
  return questions.length;
}

/**
 * پیدا کردن مرحله قبلی قابل نمایش
 */
export function findPrevStep(currentStep, questions, visibleIds) {
  for (let i = currentStep - 1; i >= 0; i--) {
    if (visibleIds.has(questions[i].id)) return i;
  }
  return -1;
}
