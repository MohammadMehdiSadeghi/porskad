import { useState, useEffect, useCallback } from "react";
import { OPERATORS, CONDITION_SOURCES } from "../../lib/logic/types";
import { QUESTION_TYPES } from "../../lib/questionTypes";

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3 py-2 font-semibold text-ink focus:outline-none transition-all";

/**
 * سازنده شرط تکی — با دکمه اعمال صریح
 * تغییرات ابتدا در state محلی ذخیره و با کلیک «اعمال» به والد ارسال می‌شوند.
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
  // ─── state محلی برای تغییرات ───
  const [draft, setDraft] = useState({ ...condition });
  const [dirty, setDirty] = useState(false);

  // اگه condition از بیرون تغییر کرد (مثلاً لود اولیه)، draft رو آپدیت کن
  useEffect(() => {
    setDraft({ ...condition });
    setDirty(false);
  }, [condition.id]); // فقط وقتی شرط عوض شد (id فرق کرد)

  const source = draft.source || "answer";
  const sourceQ = questions.find((q) => q.id === draft.questionId);
  const sourceType = sourceQ?.type || "short_text";
  const typeMeta = QUESTION_TYPES[sourceType] || {};
  const availableOperators = typeMeta.conditionOperators || Object.keys(OPERATORS);
  const valueFieldType = typeMeta.valueFieldType || "text";

  const opMeta = OPERATORS[draft.operator] || {};
  const needsValue = opMeta.needsValue !== false;

  // ─── آپدیت draft ───
  const patchDraft = useCallback((patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }, []);

  // ─── اعمال شرط به والد ───
  const applyCondition = useCallback(() => {
    console.log('[ConditionBuilder] اعمال شرط:', { draft, source: draft.source, questionId: draft.questionId, operator: draft.operator, value: draft.value });
    onChange({ ...draft });
    setDirty(false);
  }, [draft, onChange]);

  // ─── رندر فیلد مقدار ───
  function renderValueField() {
    if (!needsValue) return null;

    // selected_count → اینپوت عددی
    if (draft.operator?.startsWith("selected_count_")) {
      return (
        <input
          type="number"
          min="0"
          value={draft.value ?? ""}
          onChange={(e) => patchDraft({ value: e.target.value })}
          placeholder="تعداد..."
          className={`${inputCls} !py-1.5 !text-xs`}
        />
      );
    }

    // choice / checkbox: سلکت از بین گزینه‌ها
    if (valueFieldType === "option_select" && sourceQ?.options?.length > 0) {
      return (
        <select
          value={draft.value ?? ""}
          onChange={(e) => patchDraft({ value: e.target.value })}
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
          value={draft.value ?? ""}
          onChange={(e) => patchDraft({ value: e.target.value })}
          className={`${inputCls} !py-1.5 !text-xs`}
        >
          <option value="">— انتخاب —</option>
          <option value="بله">بله</option>
          <option value="خیر">خیر</option>
        </select>
      );
    }

    // between
    if (draft.operator === "between") {
      const parts = (draft.value || "|").split("|");
      const minVal = parts[0] ?? "";
      const maxVal = parts[1] ?? "";
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minVal}
            onChange={(e) => patchDraft({ value: `${e.target.value}|${maxVal}` })}
            placeholder="حداقل"
            className={`${inputCls} !py-1.5 !text-xs flex-1`}
          />
          <span className="text-xs font-bold text-ink-subtle">تا</span>
          <input
            type="number"
            value={maxVal}
            onChange={(e) => patchDraft({ value: `${minVal}|${e.target.value}` })}
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
          value={draft.value ?? ""}
          onChange={(e) => patchDraft({ value: e.target.value })}
          placeholder="مقدار عددی..."
          className={`${inputCls} !py-1.5 !text-xs`}
        />
      );
    }

    // متن
    return (
      <input
        value={draft.value ?? ""}
        onChange={(e) => patchDraft({ value: e.target.value })}
        placeholder="مقدار مقایسه..."
        className={`${inputCls} !py-1.5 !text-xs`}
      />
    );
  }

  return (
    <div className={`flex flex-col gap-2 border-2 border-dashed rounded-pill-md p-3 transition-colors ${dirty ? "border-orange/50 bg-[#FEF7EC]/40" : "border-ink/15 bg-white/80"}`}>
      {/* هدر شرط */}
      <div className="flex items-center gap-2">
        <span className="text-[0.65rem] font-extrabold text-ink-subtle shrink-0">
          شرط {index + 1}
        </span>
        {dirty && (
          <span className="text-[0.55rem] font-bold text-orange bg-orange/10 border border-orange/30 rounded-pill-sm px-1.5 py-0.5">
            تغییر ذخیره نشده
          </span>
        )}
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
                patchDraft(patch);
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
              value={draft.questionId ?? ""}
              onChange={(e) => patchDraft({ questionId: e.target.value || null })}
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
              value={draft.variableKey ?? ""}
              onChange={(e) => patchDraft({ variableKey: e.target.value || null })}
              className={`${inputCls} !py-1.5 !text-xs`}
            >
              <option value="">— انتخاب متغیر —</option>
              {variables.map((v) => (
                <option key={v.key} value={v.key}>{v.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* انتخاب عملگر */}
        <div className="flex flex-col gap-1">
          <span className="text-[0.6rem] font-bold text-ink-subtle">عملگر:</span>
          <select
            value={draft.operator}
            onChange={(e) => {
              const newOp = e.target.value;
              const resetValue = newOp === "between" ? "|" : "";
              patchDraft({ operator: newOp, value: resetValue });
            }}
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

      {/* ─── دکمه اعمال ─── */}
      <button
        onClick={applyCondition}
        disabled={!dirty}
        className={`self-start flex items-center gap-1.5 text-[0.65rem] font-extrabold px-3 py-1.5 rounded-pill-md border-2 transition-all ${
          dirty
            ? "bg-teal text-white border-teal hover:bg-teal-text shadow-sm cursor-pointer"
            : "bg-bg-neutral text-ink/30 border-ink/10 cursor-not-allowed"
        }`}
      >
        {dirty ? "اعمال شرط ✓" : "اعمال شد ✓"}
      </button>

      {/* پیش‌نمایش متنی */}
      <div className="text-[0.6rem] font-medium text-navy/70 bg-bg-lavender/60 rounded-pill-sm px-2.5 py-1.5 leading-5">
        {source === "answer" && sourceQ ? (
          <>اگر «{sourceQ.title?.slice(0, 30)}» {opMeta.label}
            {needsValue && draft.value
              ? (draft.operator === "between"
                ? (() => { const [mn, mx] = (draft.value || "|").split("|"); return ` بین «${mn || '?'}» و «${mx || '?'}»`; })()
                : ` «${draft.value}»`)
              : ""}
          </>
        ) : source === "variable" ? (
          <>اگر متغیر «{draft.variableKey || "?"}» {opMeta.label}
            {needsValue && draft.value ? ` «${draft.value}»` : ""}
          </>
        ) : (
          <>اگر امتیاز {opMeta.label}
            {needsValue && draft.value ? ` «${draft.value}»` : ""}
          </>
        )}
      </div>
    </div>
  );
}
