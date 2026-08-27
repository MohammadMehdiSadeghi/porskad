import { useState } from "react";
import {
  ACTION_TYPES,
  ACTION_TYPE_ORDER,
  GROUP_OPERATORS,
  makeCondition,
  makeRule,
} from "../../lib/logic/types";
import ConditionBuilder from "./ConditionBuilder";
import { faNum } from "../../lib/utils";

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3 py-2 font-semibold text-ink focus:outline-none transition-all";

/**
 * ویرایشگر منطق — یک Rule کامل
 */
function RuleEditor({ rule, questions, onChange, onDelete, index }) {
  const [expanded, setExpanded] = useState(true);
  const actionMeta = ACTION_TYPES[rule.action?.type] || {};

  function updateCondition(condIndex, patch) {
    const conds = [...(rule.conditions || [])];
    conds[condIndex] = { ...conds[condIndex], ...patch };
    onChange({ ...rule, conditions: conds });
  }

  function removeCondition(condIndex) {
    const conds = (rule.conditions || []).filter((_, i) => i !== condIndex);
    onChange({ ...rule, conditions: conds.length ? conds : [makeCondition()] });
  }

  function addCondition() {
    onChange({
      ...rule,
      conditions: [...(rule.conditions || []), makeCondition()],
    });
  }

  function updateAction(patch) {
    onChange({ ...rule, action: { ...rule.action, ...patch } });
  }

  // فقط سوالات قبل از هدف Action به عنوان سوال مرجع شرط
  const sourceQuestions = (() => {
    const targetId = rule.action?.target_id;
    if (!targetId) return questions;
    const targetIdx = questions.findIndex((q) => q.id === targetId);
    if (targetIdx < 0) return questions;
    return questions.slice(0, targetIdx);
  })();

  return (
    <div className="border-2 border-navy/15 rounded-pill-md bg-white overflow-hidden">
      {/* هدر Rule */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-lavender/30 transition-colors"
      >
        <span className="w-7 h-7 shrink-0 flex items-center justify-center bg-navy text-white rounded-full text-xs font-black rotate-[2deg]">
          {faNum(index + 1)}
        </span>
        <span className="text-sm font-extrabold text-navy text-right flex-1 truncate">
          {rule.name || `Rule ${index + 1}`}
        </span>
        <span className="text-[0.65rem] font-bold text-ink-subtle shrink-0">
          {rule.enabled ? "فعال" : "غیرفعال"}
        </span>
        <span className="text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t-2 border-dashed border-ink/10 pt-3">
          {/* نام و فعال/غیرفعال */}
          <div className="flex items-center gap-2">
            <input
              value={rule.name}
              onChange={(e) => onChange({ ...rule, name: e.target.value })}
              placeholder="نام Rule (اختیاری)"
              className={`${inputCls} !py-1.5 !text-xs flex-1`}
            />
            <label className="flex items-center gap-1.5 text-xs font-bold text-ink-subtle cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => onChange({ ...rule, enabled: e.target.checked })}
                className="accent-teal w-4 h-4"
              />
              فعال
            </label>
            <button
              onClick={onDelete}
              className="text-xs font-bold text-magenta-text hover:underline shrink-0"
            >
              حذف
            </button>
          </div>

          {/* ─── IF ─── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-teal-text">IF</span>
              {/* ترکیب AND/OR */}
              <select
                value={rule.group_operator}
                onChange={(e) => onChange({ ...rule, group_operator: e.target.value })}
                className={`${inputCls} !py-1 !text-[0.65rem] !w-auto`}
              >
                <option value="AND">{GROUP_OPERATORS.AND.label}</option>
                <option value="OR">{GROUP_OPERATORS.OR.label}</option>
              </select>
            </div>

            {(rule.conditions || []).map((cond, i) => (
              <div key={cond.id || i} className="flex items-start gap-2">
                {i > 0 && (
                  <span className="text-[0.6rem] font-black text-navy mt-3 shrink-0 px-1.5 py-0.5 bg-bg-lavender rounded-pill-sm">
                    {rule.group_operator}
                  </span>
                )}
                <div className="flex-1">
                  <ConditionBuilder
                    condition={cond}
                    questions={sourceQuestions}
                    index={i}
                    removable={(rule.conditions || []).length > 1}
                    onChange={(patch) => updateCondition(i, patch)}
                    onDelete={() => removeCondition(i)}
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addCondition}
              className="self-start text-[0.65rem] font-extrabold text-teal hover:text-teal-text transition-colors"
            >
              + افزودن شرط
            </button>
          </div>

          {/* ─── THEN ─── */}
          <div className="flex flex-col gap-2 border-t-2 border-dashed border-ink/10 pt-3">
            <span className="text-xs font-extrabold text-magenta-text">THEN</span>

            <div className="grid grid-cols-2 gap-2">
              {/* نوع Action */}
              <div className="flex flex-col gap-1">
                <span className="text-[0.6rem] font-bold text-ink-subtle">عمل:</span>
                <select
                  value={rule.action?.type || "SHOW_QUESTION"}
                  onChange={(e) => updateAction({ type: e.target.value, target_id: null })}
                  className={`${inputCls} !py-1.5 !text-xs`}
                >
                  {ACTION_TYPE_ORDER.map((at) => (
                    <option key={at} value={at}>
                      {ACTION_TYPES[at].icon} {ACTION_TYPES[at].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* هدف (فقط اگه END_FORM نباشه) */}
              {rule.action?.type !== "END_FORM" && (
                <div className="flex flex-col gap-1">
                  <span className="text-[0.6rem] font-bold text-ink-subtle">هدف:</span>
                  <select
                    value={rule.action?.target_id ?? ""}
                    onChange={(e) => updateAction({ target_id: e.target.value || null })}
                    className={`${inputCls} !py-1.5 !text-xs`}
                  >
                    <option value="">— انتخاب سوال —</option>
                    {questions.map((q, i) => (
                      <option key={q.id} value={q.id}>
                        {i + 1}. {q.title?.slice(0, 40) || "—"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* پیش‌نمایش متنی Rule */}
            <div className="text-[0.6rem] font-medium text-ink/70 bg-bg-mint/60 rounded-pill-sm px-2.5 py-1.5 leading-5">
              اگر{" "}
              {(rule.conditions || []).map((c, i) => {
                const srcQ = questions.find((q) => q.id === c.source_question_id);
                return (
                  <span key={c.id || i}>
                    {i > 0 && ` ${rule.group_operator} `}
                    «{srcQ?.title?.slice(0, 20) || "?"}» {c.operator}
                    {c.value ? ` «${c.value}»` : ""}
                  </span>
                );
              })}
              {" "}آنگاه {actionMeta.label}
              {rule.action?.target_id
                ? ` «${questions.find((q) => q.id === rule.action.target_id)?.title?.slice(0, 20) || "?"}»`
                : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ویرایشگر منطق کلی — لیست Ruleها
 */
export default function LogicEditor({ rules = [], questions = [], onChange }) {
  function addRule() {
    const newRule = makeRule();
    // source_question_id پیش‌فرض: اولین سوال
    if (questions.length > 0) {
      newRule.source_question_id = questions[0].id;
    }
    onChange([...rules, newRule]);
  }

  function updateRule(index, patch) {
    const updated = rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(updated);
  }

  function deleteRule(index) {
    onChange(rules.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-extrabold text-navy"> قوانین منطقی (Logic Rules)</span>
        <span className="text-[0.65rem] font-bold text-ink-subtle bg-bg-lavender rounded-pill-sm px-2 py-0.5">
          {faNum(rules.length)} Rule
        </span>
      </div>

      {rules.length === 0 && (
        <div className="text-xs font-medium text-ink-subtle text-center py-4 border-2 border-dashed border-ink/10 rounded-pill-md">
          هنوز Rule تعریف نشده. «+ افزودن Rule» بزنید.
        </div>
      )}

      {rules.map((rule, i) => (
        <RuleEditor
          key={rule.id}
          rule={rule}
          questions={questions}
          index={i}
          onChange={(patch) => updateRule(i, patch)}
          onDelete={() => deleteRule(i)}
        />
      ))}

      <button
        onClick={addRule}
        className="self-start text-xs font-extrabold text-teal hover:text-teal-text transition-colors
          border-2 border-dashed border-teal/40 rounded-pill-md px-3 py-2 hover:border-teal"
      >
        + افزودن Rule
      </button>
    </div>
  );
}
