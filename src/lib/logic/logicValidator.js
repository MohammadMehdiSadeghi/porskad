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
  const questionPositions = new Map(questions.map((q, i) => [q.id, i]));

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // ─── بررسی شرط‌ها ───
    for (const cond of (rule.conditions || [])) {
      if (cond.source_question_id && !questionIds.has(cond.source_question_id)) {
        errors.push(`Rule «${rule.name || rule.id}»: سوال مرجع شرط (${cond.source_question_id}) وجود ندارد.`);
      }
    }

    // ─── بررسی Action ───
    const action = rule.action;
    if (action?.target_id && action.type !== "END_FORM") {
      if (!questionIds.has(action.target_id)) {
        errors.push(`Rule «${rule.name || rule.id}»: سوال مقصد (${action.target_id}) وجود ندارد.`);
      }

      // ─── Self Loop ───
      if (action.type === "GO_TO_QUESTION" && action.target_id === rule.source_question_id) {
        errors.push(`Rule «${rule.name || rule.id}»: حلقه خودی (Self Loop) — سوال به خودش ارجاع دارد.`);
      }
    }
  }

  // ─── تشخیص حلقه بازگشتی ───
  const goToRules = rules.filter((r) => r.enabled && r.action?.type === "GO_TO_QUESTION");
  const visited = new Set();

  for (const rule of goToRules) {
    visited.clear();
    let currentId = rule.source_question_id;
    let safety = 0;

    while (currentId && safety < 100) {
      safety++;
      if (visited.has(currentId)) {
        errors.push(`حلقه بازگشتی تشخیص داده شد: ${[...visited, currentId].join(" → ")}`);
        break;
      }
      visited.add(currentId);

      // پیدا کردن Rule بعدی که از این سوال شروع میشه
      const nextRule = goToRules.find((r) => r.source_question_id === currentId);
      if (nextRule && nextRule.action?.target_id) {
        currentId = nextRule.action.target_id;
      } else {
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * تشخیص سوالات غیرقابل‌دسترس
 * @param {Array} questions
 * @param {Array} rules
 * @returns {string[]} - آیدی سوالات غیرقابل‌دسترس
 */
export function findUnreachableQuestions(questions, rules) {
  if (!questions.length) return [];

  const reachable = new Set();
  reachable.add(questions[0].id); // اولین سوال همیشه reachable

  // سوالات بدون شرط reachable هستن
  for (const q of questions) {
    if (!q.condition || !q.condition.source_question_id) {
      reachable.add(q.id);
    }
  }

  // GO_TO ها reachable می‌سازن
  for (const rule of rules) {
    if (rule.enabled && rule.action?.type === "GO_TO_QUESTION" && rule.action?.target_id) {
      reachable.add(rule.action.target_id);
    }
    // SHOW ها هم reachable می‌سازن
    if (rule.enabled && rule.action?.type === "SHOW_QUESTION" && rule.action?.target_id) {
      reachable.add(rule.action.target_id);
    }
  }

  return questions.filter((q) => !reachable.has(q.id)).map((q) => q.id);
}
