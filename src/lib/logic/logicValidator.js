// ════════════════════════════════════════════════════════════════
// Logic Validator — اعتبارسنجی Ruleها
// ════════════════════════════════════════════════════════════════

/**
 * بررسی اعتبار کلی Ruleها
 * @param {Array} rules - Ruleها
 * @param {Array} questions - سوالات
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRules(rules, questions) {
  const errors = [];
  const questionIds = new Set(questions.map((q) => q.id));
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const ruleLabel = rule.name || rule.id?.slice(0, 8) || "?";

    // ─── بررسی شرط‌ها ───
    for (const group of (rule.conditions || [])) {
      for (const cond of (group.conditions || [])) {
        if (cond.source === "answer" && cond.questionId && !questionIds.has(cond.questionId)) {
          errors.push(`Rule «${ruleLabel}»: سوال مرجع شرط (${cond.questionId}) وجود ندارد.`);
        }
      }
    }

    // ─── بررسی Action ───
    const action = rule.action;
    if (!action) continue;

    if (action.type !== "END_FORM" && action.type !== "REDIRECT_URL" && action.type !== "ADD_TO_VARIABLE") {
      if (action.targetId && !questionIds.has(action.targetId)) {
        errors.push(`Rule «${ruleLabel}»: سوال مقصد (${action.targetId}) وجود ندارد.`);
      }
    }

    // ─── Self Loop ───
    if (action.type === "GO_TO_QUESTION" && action.targetId === rule.sourceQuestionId) {
      errors.push(`Rule «${ruleLabel}»: حلقه خودی (Self Loop) — سوال به خودش ارجاع دارد.`);
    }

    // ─── REDIRECT_URL بدون URL ───
    if (action.type === "REDIRECT_URL" && (!action.url || !action.url.trim())) {
      errors.push(`Rule «${ruleLabel}»: اکشن REDIRECT_URL بدون URL تعریف شده.`);
    }

    // ─── ADD_TO_VARIABLE بدون key ───
    if (action.type === "ADD_TO_VARIABLE" && !action.variableKey) {
      errors.push(`Rule «${ruleLabel}»: اکشن ADD_TO_VARIABLE بدون variableKey.`);
    }
  }

  // ─── تشخیص حلقه بازگشتی ───
  const goToRules = rules.filter((r) => r.enabled && r.action?.type === "GO_TO_QUESTION");
  const visited = new Set();

  for (const rule of goToRules) {
    visited.clear();
    let currentId = rule.sourceQuestionId;
    let safety = 0;

    while (currentId && safety < 100) {
      safety++;
      if (visited.has(currentId)) {
        const cyclePath = [...visited, currentId]
          .map((id) => questionMap.get(id)?.title || id)
          .join(" → ");
        errors.push(`حلقه بازگشتی: ${cyclePath}`);
        break;
      }
      visited.add(currentId);

      const nextRule = goToRules.find((r) => r.sourceQuestionId === currentId);
      if (nextRule && nextRule.action?.targetId) {
        currentId = nextRule.action.targetId;
      } else {
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * پیدا کردن سوالات غیرقابل‌دسترس
 */
export function findUnreachableQuestions(questions, rules) {
  if (!questions.length) return [];

  const reachable = new Set();
  reachable.add(questions[0].id); // اولین سوال همیشه reachable

  // سوالات بدون شرط visibility reachable هستن
  for (const q of questions) {
    if (!q.conditions || !q.conditions.conditions || q.conditions.conditions.length === 0) {
      reachable.add(q.id);
    }
  }

  // GO_TO ها + SHOW ها reachable می‌سازن
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.action?.type === "GO_TO_QUESTION" && rule.action?.targetId) {
      reachable.add(rule.action.targetId);
    }
    if (rule.action?.type === "SHOW_QUESTION" && rule.action?.targetId) {
      reachable.add(rule.action.targetId);
    }
  }

  // jump_actions هم reachable می‌سازن
  for (const q of questions) {
    for (const ja of (q.jump_actions || [])) {
      if (ja.action_type === "jump_to_question" && ja.target_id) {
        reachable.add(ja.target_id);
      }
    }
  }

  return questions.filter((q) => !reachable.has(q.id)).map((q) => q.id);
}
