import { OPERATORS, OPERATOR_ORDER } from "../../lib/logic/types";

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3 py-2 font-semibold text-ink focus:outline-none transition-all";

/**
 * سازنده شرط تکی
 *
 * @param {Object} condition - شرط فعلی
 * @param {Function} onChange - آپدیت شرط
 * @param {Function} onDelete - حذف شرط
 * @param {Array} questions - سوالات موجود (برای انتخاب سوال مرجع)
 * @param {number} index - شماره شرط
 * @param {boolean} removable - آیا قابل حذف هست
 */
export default function ConditionBuilder({
  condition,
  onChange,
  onDelete,
  questions = [],
  index = 0,
  removable = true,
}) {
  const opMeta = OPERATORS[condition.operator] || {};
  const needsValue = opMeta.needsValue !== false;

  // سوالات موجود برای انتخاب (فقط سوالات قبلی)
  const sourceQ = questions.find((q) => q.id === condition.source_question_id);
  const sourceIdx = sourceQ ? questions.indexOf(sourceQ) + 1 : null;

  return (
    <div className="flex flex-col gap-2 border-2 border-dashed border-ink/15 rounded-pill-md bg-white/80 p-3">
      {/* هدر شرط */}
      <div className="flex items-center gap-2">
        <span className="text-[0.65rem] font-extrabold text-ink-subtle shrink-0">
          شرط {index + 1}
        </span>
        {removable && (
          <button
            onClick={onDelete}
            className="text-[0.65rem] font-bold text-magenta-text hover:underline mr-auto"
          >
            ✕ حذف
          </button>
        )}
      </div>

      {/* فرم شرط: IF سوال operator مقدار */}
      <div className="flex flex-col gap-2">
        {/* انتخاب سوال مرجع */}
        <div className="flex flex-col gap-1">
          <span className="text-[0.6rem] font-bold text-ink-subtle">سوال:</span>
          <select
            value={condition.source_question_id ?? ""}
            onChange={(e) =>
              onChange({ ...condition, source_question_id: e.target.value || null })
            }
            className={`${inputCls} !py-1.5 !text-xs`}
          >
            <option value="">— انتخاب سوال —</option>
            {questions.map((q, i) => (
              <option key={q.id} value={q.id}>
                {i + 1}. {q.title?.slice(0, 50) || "—"}
              </option>
            ))}
          </select>
        </div>

        {/* انتخاب عملگر */}
        <div className="flex flex-col gap-1">
          <span className="text-[0.6rem] font-bold text-ink-subtle">عملگر:</span>
          <select
            value={condition.operator}
            onChange={(e) =>
              onChange({ ...condition, operator: e.target.value })
            }
            className={`${inputCls} !py-1.5 !text-xs`}
          >
            {OPERATOR_ORDER.map((op) => (
              <option key={op} value={op}>
                {OPERATORS[op].label}
              </option>
            ))}
          </select>
        </div>

        {/* مقدار مقایسه (فقط اگه نیاز باشه) */}
        {needsValue && (
          <div className="flex flex-col gap-1">
            <span className="text-[0.6rem] font-bold text-ink-subtle">مقدار:</span>
            {sourceQ?.type === "choice" && sourceQ.options?.length > 0 ? (
              <select
                value={condition.value ?? ""}
                onChange={(e) =>
                  onChange({ ...condition, value: e.target.value })
                }
                className={`${inputCls} !py-1.5 !text-xs`}
              >
                <option value="">— انتخاب مقدار —</option>
                {sourceQ.options.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : sourceQ?.type === "yes_no" ? (
              <select
                value={condition.value ?? ""}
                onChange={(e) =>
                  onChange({ ...condition, value: e.target.value })
                }
                className={`${inputCls} !py-1.5 !text-xs`}
              >
                <option value="">— انتخاب —</option>
                <option value="بله">بله</option>
                <option value="خیر">خیر</option>
              </select>
            ) : (
              <input
                value={condition.value ?? ""}
                onChange={(e) =>
                  onChange({ ...condition, value: e.target.value })
                }
                placeholder="مقدار مقایسه..."
                className={`${inputCls} !py-1.5 !text-xs`}
              />
            )}
          </div>
        )}
      </div>

      {/* پیش‌نمایش متنی شرط */}
      {sourceQ && (
        <div className="text-[0.6rem] font-medium text-navy/70 bg-bg-lavender/60 rounded-pill-sm px-2.5 py-1.5 leading-5">
          اگر «{sourceQ.title?.slice(0, 30)}» {opMeta.label}
          {needsValue && condition.value ? ` «${condition.value}»` : ""}
        </div>
      )}
    </div>
  );
}
