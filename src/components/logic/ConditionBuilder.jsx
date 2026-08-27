import { OPERATORS, CONDITION_SOURCES } from "../../lib/logic/types";
import { QUESTION_TYPES } from "../../lib/questionTypes";

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3 py-2 font-semibold text-ink focus:outline-none transition-all";

/**
 * سازنده شرط تکی (نسخه نهایی)
 */
export default function ConditionBuilder({
  condition,
  onChange,
  onDelete,
  questions = [],
  index = 0,
  removable = true,
  variables = [],  // نام متغیرهای موجود [{key, label}]
}) {
  const source = condition.source || "answer";
  const sourceQ = questions.find((q) => q.id === condition.questionId);
  const sourceType = sourceQ?.type || "short_text";
  const typeMeta = QUESTION_TYPES[sourceType] || {};
  const availableOperators = typeMeta.conditionOperators || Object.keys(OPERATORS);
  const valueFieldType = typeMeta.valueFieldType || "text";

  const opMeta = OPERATORS[condition.operator] || {};
  const needsValue = opMeta.needsValue !== false;

  // ─── رندر فیلد مقدار ───
  function renderValueField() {
    if (!needsValue) return null;

    // selected_count → اینپوت عددی
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

    // choice / checkbox: سلکت از بین گزینه‌ها
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

    // yes_no
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

    // between
    if (condition.operator === "between") {
      const parts = (condition.value || "").split("|");
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={parts[0] ?? ""}
            onChange={(e) => onChange({ ...condition, value: `${e.target.value}|${parts[1] ?? ""}` })}
            placeholder="حداقل"
            className={`${inputCls} !py-1.5 !text-xs flex-1`}
          />
          <span className="text-xs font-bold text-ink-subtle">تا</span>
          <input
            type="number"
            value={parts[1] ?? ""}
            onChange={(e) => onChange({ ...condition, value: `${parts[0] ?? ""}|${e.target.value}` })}
            placeholder="حداکثر"
            className={`${inputCls} !py-1.5 !text-xs flex-1`}
          />
        </div>
      );
    }

    // عدد
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

    // متن
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
    <div className="flex flex-col gap-2 border-2 border-dashed border-ink/15 rounded-pill-md bg-white/80 p-3">
      {/* هدر شرط */}
      <div className="flex items-center gap-2">
        <span className="text-[0.65rem] font-extrabold text-ink-subtle shrink-0">
          شرط {index + 1}
        </span>
        {removable && (
          <button onClick={onDelete} className="text-[0.65rem] font-bold text-magenta-text hover:underline mr-auto">
            ✕ حذف
          </button>
        )}
      </div>

      {/* انتخاب منبع */}
      <div className="flex flex-col gap-1">
        <span className="text-[0.6rem] font-bold text-ink-subtle">منبع:</span>
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
              className={`text-[0.6rem] font-bold px-2 py-1 rounded-pill-sm border transition-colors ${
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
        {/* انتخاب سوال مرجع (فقط source=answer) */}
        {source === "answer" && (
          <div className="flex flex-col gap-1">
            <span className="text-[0.6rem] font-bold text-ink-subtle">سوال:</span>
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

        {/* انتخاب متغیر (فقط source=variable) */}
        {source === "variable" && (
          <div className="flex flex-col gap-1">
            <span className="text-[0.6rem] font-bold text-ink-subtle">متغیر:</span>
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

        {/* source=score → نیازی به انتخاب نیست */}

        {/* انتخاب عملگر */}
        <div className="flex flex-col gap-1">
          <span className="text-[0.6rem] font-bold text-ink-subtle">عملگر:</span>
          <select
            value={condition.operator}
            onChange={(e) => onChange({ ...condition, operator: e.target.value })}
            className={`${inputCls} !py-1.5 !text-xs`}
          >
            {availableOperators.map((op) => (
              <option key={op} value={op}>{OPERATORS[op]?.label || op}</option>
            ))}
          </select>
        </div>

        {/* مقدار مقایسه */}
        {renderValueField()}
      </div>

      {/* پیش‌نمایش متنی */}
      <div className="text-[0.6rem] font-medium text-navy/70 bg-bg-lavender/60 rounded-pill-sm px-2.5 py-1.5 leading-5">
        {source === "answer" && sourceQ ? (
          <>اگر «{sourceQ.title?.slice(0, 30)}» {opMeta.label}
            {needsValue && condition.value
              ? (condition.operator === "between"
                ? ` بین «${condition.value.split("|")[0]}» و «${condition.value.split("|")[1]}»`
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
