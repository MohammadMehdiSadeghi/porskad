import { OPERATORS, CONDITION_SOURCES } from "../../lib/logic/types";
import { QUESTION_TYPES } from "../../lib/questionTypes";

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3 py-2 font-semibold text-ink focus:outline-none transition-all";

/**
 * سازنده شرط تکی — با اعمال سریع + دکمه حذف
 */
export default function ConditionBuilder({
  condition,
  onChange,
  onDelete,
  questions = [],
  index = 0,
  removable = true,
  variables = [],
}) {
  const source = condition.source || "answer";
  const sourceQ = questions.find((q) => q.id === condition.questionId);
  const sourceType = sourceQ?.type || "short_text";
  const typeMeta = QUESTION_TYPES[sourceType] || {};
  const availableOperators = typeMeta.conditionOperators || Object.keys(OPERATORS);
  const valueFieldType = typeMeta.valueFieldType || "text";

  const opMeta = OPERATORS[condition.operator] || {};
  const needsValue = opMeta.needsValue !== false;

  // ─── بررسی کامل بودن شرط ───
  const isComplete = condition.questionId && condition.operator &&
    (!needsValue || (condition.value && condition.value !== "|"));

  // ─── رندر فیلد مقدار ───
  function renderValueField() {
    if (!needsValue) return null;

    if (condition.operator?.startsWith("selected_count_")) {
      return (
        <input
          type="number"
          min="0"
          value={condition.value ?? ""}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="تعداد..."
          className={`${inputCls} !py-1.5 !text-xs`}
        />
      );
    }

    if (valueFieldType === "option_select" && sourceQ?.options?.length > 0) {
      return (
        <select
          value={condition.value ?? ""}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className={`${inputCls} !py-1.5 !text-xs`}
        >
          <option value="">— انتخاب مقدار —</option>
          {sourceQ.options.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (valueFieldType === "yes_no_select") {
      return (
        <select
          value={condition.value ?? ""}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className={`${inputCls} !py-1.5 !text-xs`}
        >
          <option value="">— انتخاب —</option>
          <option value="بله">بله</option>
          <option value="خیر">خیر</option>
        </select>
      );
    }

    if (condition.operator === "between") {
      const parts = (condition.value || "|").split("|");
      const minVal = parts[0] ?? "";
      const maxVal = parts[1] ?? "";
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minVal}
            onChange={(e) => onChange({ ...condition, value: `${e.target.value}|${maxVal}` })}
            placeholder="حداقل"
            className={`${inputCls} !py-1.5 !text-xs flex-1`}
          />
          <span className="text-xs font-bold text-ink-subtle">تا</span>
          <input
            type="number"
            value={maxVal}
            onChange={(e) => onChange({ ...condition, value: `${minVal}|${e.target.value}` })}
            placeholder="حداکثر"
            className={`${inputCls} !py-1.5 !text-xs flex-1`}
          />
        </div>
      );
    }

    if (valueFieldType === "number") {
      return (
        <input
          type="number"
          value={condition.value ?? ""}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="مقدار عددی..."
          className={`${inputCls} !py-1.5 !text-xs`}
        />
      );
    }

    return (
      <input
        value={condition.value ?? ""}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
        placeholder="مقدار مقایسه..."
        className={`${inputCls} !py-1.5 !text-xs`}
      />
    );
  }

  return (
    <div className={`flex flex-col gap-2 border-2 border-dashed rounded-pill-md p-3 transition-colors ${isComplete ? "border-teal/40 bg-teal/5" : "border-ink/15 bg-white/80"}`}>
      {/* هدر شرط */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-extrabold text-ink-subtle shrink-0">
          شرط {index + 1}
        </span>
        {isComplete && (
          <span className="text-xs font-bold text-teal bg-teal/10 border border-teal/30 rounded-pill-sm px-1.5 py-0.5">
            فعال
          </span>
        )}
        {removable && (
          <button
            onClick={onDelete}
            className="text-xs font-bold text-magenta-text hover:underline mr-auto"
          >
            حذف شرط
          </button>
        )}
      </div>

      {/* انتخاب منبع */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-ink-subtle">منبع:</span>
        <div className="flex gap-1.5">
          {Object.entries(CONDITION_SOURCES).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => {
                const patch = { source: key };
                if (key === "answer") { patch.questionId = null; }
                if (key === "variable" || key === "score") { patch.variableKey = key === "score" ? "score" : null; }
                onChange({ ...condition, ...patch });
              }}
              className={`text-xs font-bold px-2 py-1 rounded-pill-sm border transition-colors ${
                source === key
                  ? "bg-teal/10 border-teal/40 text-teal"
                  : "bg-white border-ink/15 text-ink-subtle hover:border-teal/30"
              }`}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* فرم شرط */}
      <div className="flex flex-col gap-2">
        {source === "answer" && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-subtle">سوال:</span>
            <select
              value={condition.questionId ?? ""}
              onChange={(e) => onChange({ ...condition, questionId: e.target.value || null })}
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
        )}

        {source === "variable" && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-subtle">متغیر:</span>
            <select
              value={condition.variableKey ?? ""}
              onChange={(e) => onChange({ ...condition, variableKey: e.target.value || null })}
              className={`${inputCls} !py-1.5 !text-xs`}
            >
              <option value="">— انتخاب متغیر —</option>
              {variables.map((v) => (
                <option key={v.key} value={v.key}>{v.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-subtle">عملگر:</span>
          <select
            value={condition.operator}
            onChange={(e) => {
              const newOp = e.target.value;
              const resetValue = newOp === "between" ? "|" : "";
              onChange({ ...condition, operator: newOp, value: resetValue });
            }}
            className={`${inputCls} !py-1.5 !text-xs`}
          >
            {availableOperators.map((op) => (
              <option key={op} value={op}>{OPERATORS[op]?.label || op}</option>
            ))}
          </select>
        </div>

        {renderValueField()}
      </div>

      {/* پیش‌نمایش متنی */}
      <div className="text-xs font-medium text-navy/70 bg-bg-lavender/60 rounded-pill-sm px-2.5 py-1.5 leading-5">
        {source === "answer" && sourceQ ? (
          <>اگر «{sourceQ.title?.slice(0, 30)}» {opMeta.label}
            {needsValue && condition.value
              ? (condition.operator === "between"
                ? (() => { const [mn, mx] = (condition.value || "|").split("|"); return ` بین «${mn || '?'}» و «${mx || '?'}»`; })()
                : ` «${condition.value}»`)
              : ""}
          </>
        ) : source === "variable" ? (
          <>اگر متغیر «{condition.variableKey || "?"}» {opMeta.label}
            {needsValue && condition.value ? ` «${condition.value}»` : ""}
          </>
        ) : (
          <>اگر امتیاز {opMeta.label}
            {needsValue && condition.value ? ` «${condition.value}»` : ""}
          </>
        )}
      </div>
    </div>
  );
}
