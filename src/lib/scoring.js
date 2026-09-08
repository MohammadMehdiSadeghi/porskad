// ══════════════════════════════════════════════════════════════
// Scoring — محاسبه امتیاز آزمون
// ══════════════════════════════════════════════════════════════

/**
 * بررسی پاسخ صحیح یک سوال
 * @param {Object} question - سوال
 * @param {*} answer - پاسخ کاربر
 * @returns {boolean} آیا پاسخ صحیح است؟
 */
export function isCorrectAnswer(question, answer) {
  const correct = question.correct_answer;
  if (correct === null || correct === undefined) return false; // سوال نمره‌دار نیست
  if (answer === null || answer === undefined || answer === "") return false;

  switch (question.type) {
    case "choice":
      // اگه correct_answer آرایه باشه (multi-select)، همه باید درست انتخاب شده باشن
      if (Array.isArray(correct)) {
        if (!Array.isArray(answer)) return false;
        const sortedA = [...answer].sort();
        const sortedC = [...correct].sort();
        return sortedA.length === sortedC.length && sortedA.every((v, i) => v === sortedC[i]);
      }
      return answer === correct;
    case "yes_no":
      return answer === correct;

    case "number":
    case "rating": {
      const numAnswer = Number(answer);
      const numCorrect = Number(correct);
      return !isNaN(numAnswer) && !isNaN(numCorrect) && numAnswer === numCorrect;
    }

    default:
      return String(answer).trim() === String(correct).trim();
  }
}

/**
 * محاسبه امتیاز کل فرم
 * @param {Array} questions - سوالات فرم (فقط visible)
 * @param {Object} answers - پاسخ‌های کاربر { questionId: value }
 * @returns {{ score: number, total: number, details: Array<{questionId, correct, points}> }}
 */
export function calculateScore(questions, answers) {
  let score = 0;
  let total = 0;
  const details = [];

  for (const q of questions) {
    if (q.points && q.points > 0) {
      total += q.points;
      const correct = isCorrectAnswer(q, answers[q.id]);
      if (correct) score += q.points;
      details.push({ questionId: q.id, correct, points: q.points });
    }
  }

  return { score, total, details };
}

/**
 * آیا فرم حالت آزمون/نمره‌دهی دارد؟
 * @param {Array} questions - سوالات فرم
 * @returns {boolean}
 */
export function hasScoring(questions) {
  return questions.some((q) => q.points && q.points > 0);
}
