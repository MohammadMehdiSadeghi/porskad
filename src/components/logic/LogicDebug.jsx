// ════════════════════════════════════════════════════════════════
// LogicDebug — دیباگر و پیش‌نمایش مسیر فرم
// ════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { calculateFlow } from "../../lib/logic/flowEngine";
import { validateRules, findUnreachableQuestions } from "../../lib/logic/logicValidator";

export default function LogicDebug({ questions, rules }) {
  const [answers, setAnswers] = useState({});
  const [expanded, setExpanded] = useState(false);

  // محاسبه مسیر فعلی
  const flow = useMemo(
    () => calculateFlow(questions, rules, answers),
    [questions, rules, answers]
  );

  // اعتبارسنجی
  const validation = useMemo(() => validateRules(rules, questions), [rules, questions]);
  const unreachable = useMemo(() => findUnreachableQuestions(questions, rules), [questions, rules]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs font-extrabold text-navy hover:text-teal-text transition-colors
          border-2 border-dashed border-navy/20 rounded-pill-md px-3 py-2 hover:border-navy/40"
      >
        🔍 پیش‌نمایش مسیر فرم (Debug)
      </button>
    );
  }

  return (
    <div className="border-2 border-navy/15 rounded-pill-md bg-bg-lavender/30 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-navy">🔍 دیباگ مسیر فرم</span>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs font-bold text-ink-subtle hover:text-magenta-text"
        >
          ✕ بستن
        </button>
      </div>

      {/* اعتبارسنجی */}
      {!validation.valid && (
        <div className="bg-magenta/10 border-2 border-magenta rounded-pill-md px-3 py-2">
          <span className="text-xs font-bold text-magenta-text">⚠️ خطاها:</span>
          {validation.errors.map((err, i) => (
            <p key={i} className="text-[0.65rem] text-magenta-text mt-1">• {err}</p>
          ))}
        </div>
      )}

      {unreachable.length > 0 && (
        <div className="bg-orange/10 border-2 border-orange rounded-pill-md px-3 py-2">
          <span className="text-xs font-bold text-orange">⚠️ سوالات غیرقابل‌دسترس:</span>
          {unreachable.map((id) => {
            const q = questions.find((q) => q.id === id);
            return (
              <p key={id} className="text-[0.65rem] text-orange mt-1">
                • {q?.title || id}
              </p>
            );
          })}
        </div>
      )}

      {/* تست با وارد کردن جواب */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-extrabold text-navy">تست مسیر — جواب‌ها:</span>
        {questions.slice(0, 10).map((q) => (
          <div key={q.id} className="flex items-center gap-2">
            <span className="text-[0.6rem] font-bold text-ink-subtle w-24 truncate shrink-0">
              {q.title?.slice(0, 20)}
            </span>
            <input
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              placeholder="جواب..."
              className="w-full bg-white border border-ink/20 rounded-pill-sm px-2 py-1 text-[0.65rem] font-semibold text-ink focus:outline-none focus:border-teal"
            />
          </div>
        ))}
      </div>

      {/* نتیجه */}
      <div className="flex flex-col gap-2 border-t-2 border-dashed border-ink/10 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-teal-text">
            مسیر قابل‌مشاهده ({flow.visibleQuestions.length} سوال):
          </span>
        </div>

        {flow.ended && (
          <span className="text-xs font-bold text-magenta-text">🏁 فرم پایان یافت</span>
        )}

        <div className="flex flex-wrap gap-1.5">
          {flow.visibleQuestions.map((q, i) => (
            <span
              key={q.id}
              className="text-[0.6rem] font-bold text-navy bg-white border border-navy/20 rounded-pill-sm px-2 py-0.5"
            >
              {i + 1}. {q.title?.slice(0, 25) || "?"}
            </span>
          ))}
        </div>

        {flow.triggeredRules.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-[0.6rem] font-bold text-teal-text">Rules فعال:</span>
            {flow.triggeredRules.map((r) => (
              <span
                key={r.id}
                className="text-[0.6rem] font-bold text-teal bg-teal/10 rounded-pill-sm px-2 py-0.5"
              >
                {r.name || r.id.slice(0, 8)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
