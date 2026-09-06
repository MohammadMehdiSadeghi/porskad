import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import StickerCard from "../../../components/ui/StickerCard";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../context/AuthContext";
import { QUESTION_TYPES, QUESTION_TYPE_ORDER, makeQuestion } from "../../../lib/questionTypes";
import { QUESTION_TYPE_ICONS } from "../../../lib/questionIcons";
import ConditionBuilder from "../../../components/logic/ConditionBuilder";
import { makeCondition, makeConditionGroup, makeJumpAction, GROUP_OPERATORS } from "../../../lib/logic/types";
import { faNum, slugify, copyToClipboard } from "../../../lib/utils";
import { Link2, BarChart3, Share2, Puzzle, Settings, FileText, AlignLeft } from "lucide-react";
import FormPreview from "../../../components/form/FormPreview";
import { logActivity } from "../../../lib/activityLogger";
import SEO from "../../../components/ui/SEO";

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all";

function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-extrabold text-navy">{label}</span>
      {children}
      {hint && <span className="text-[0.7rem] font-medium text-ink-subtle">{hint}</span>}
    </label>
  );
}

// نرمالایزیشن گروه شرط‌ها: تبدیل operator → group_operator + نرمالایز شرط‌های فردی
function normalizeConditionGroup(cg) {
  if (!cg) return null;
  const groupOp = cg.group_operator || cg.operator || "AND";
  const conds = (cg.conditions || []).map((c) => {
    if (c.source) return c;
    return {
      ...c,
      source: "answer",
      questionId: c.source_question_id || c.questionId || null,
      variableKey: null,
      optionId: null,
      rowId: null,
    };
  });
  return { group_operator: groupOp, conditions: conds };
}

// ─── کارت ویرایش یک سوال ───
function QuestionEditor({ q, index, total, allQuestions, onChange, onMove, onDelete }) {
  const meta = QUESTION_TYPES[q.type];
  const rots = index % 2 ? "rotate-[0.4deg]" : "-rotate-[0.4deg]";
  const isChoice = q.type === "choice" || q.type === "yes_no";

  function setOpt(i, val) {
    const opts = [...q.options];
    opts[i] = val;
    onChange({ options: opts });
  }

  // ─── مدیریت شرط‌های visibility ───
  const conditions = q.conditions; // { group_operator, conditions }

  function toggleConditionGroup() {
    if (conditions) {
      onChange({ conditions: null });
    } else {
      onChange({ conditions: makeConditionGroup() });
    }
  }

  function updateConditionGroup(patch) {
    onChange({ conditions: { ...conditions, ...patch } });
  }

  function addConditionToGroup() {
    const newConds = [...(conditions.conditions || []), makeCondition()];
    updateConditionGroup({ conditions: newConds });
  }

  function updateGroupCondition(condIndex, patch) {
    const newConds = [...(conditions.conditions || [])];
    newConds[condIndex] = { ...newConds[condIndex], ...patch };
    updateConditionGroup({ conditions: newConds });
  }

  // ساختار شرط سازگار با مدل جدید: اگه source نداشت، از questionId قدیمی بساز
  function normalizeCondition(cond) {
    if (cond.source) return cond; // مدل جدید
    return {
      ...cond,
      source: "answer",
      questionId: cond.source_question_id || cond.questionId || null,
      variableKey: null,
      optionId: null,
      rowId: null,
    };
  }

  function removeGroupCondition(condIndex) {
    const newConds = (conditions.conditions || []).filter((_, i) => i !== condIndex);
    if (newConds.length === 0) {
      onChange({ conditions: null });
    } else {
      updateConditionGroup({ conditions: newConds });
    }
  }

  // ─── مدیریت Jump Actions ───
  const jumpActions = q.jump_actions || [];

  function addJumpAction(optionIndex = -1) {
    const newJa = makeJumpAction();
    newJa.option_index = optionIndex;
    onChange({ jump_actions: [...jumpActions, newJa] });
  }

  function updateJumpAction(jaIndex, patch) {
    const newJa = [...jumpActions];
    newJa[jaIndex] = { ...newJa[jaIndex], ...patch };
    onChange({ jump_actions: newJa });
  }

  function removeJumpAction(jaIndex) {
    onChange({ jump_actions: jumpActions.filter((_, i) => i !== jaIndex) });
  }

  // سوالات موجود برای انتخاب (فقط سوالات بعدی — نمی‌توان به قبل پرش کرد)
  const targetQuestions = allQuestions.slice(index + 1);

  // ─── فیلتر سوالات مرجع شرط (فقط سوالات قبلی) ───
  const sourceQuestions = allQuestions.filter((_, j) => j < index);

  return (
    <div className={rots}>
      <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
        <div className="p-4 sm:p-5 flex flex-col gap-3.5">
          {/* هدر: شماره + نوع + عملیات */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-8 h-8 flex items-center justify-center bg-navy text-white rounded-full text-sm font-black rotate-[3deg]">
              {faNum(index + 1)}
            </span>
            <Badge color={meta.color}>
              {(() => { const Icon = QUESTION_TYPE_ICONS[q.type]; return Icon ? <Icon size={12} /> : null; })()} {meta.label}
            </Badge>
            <label className="flex items-center gap-1.5 text-xs font-bold text-ink-subtle mr-auto cursor-pointer select-none">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => onChange({ required: e.target.checked })}
                className="accent-teal w-4 h-4"
              />
              اجباری
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onMove(-1)}
                disabled={index === 0}
                className="w-8 h-8 rounded-pill-md border-2 border-ink/20 bg-white font-black text-ink hover:bg-bg-neutral disabled:opacity-30 transition-colors"
                title="بالا"
              >
                ↑
              </button>
              <button
                onClick={() => onMove(1)}
                disabled={index === total - 1}
                className="w-8 h-8 rounded-pill-md border-2 border-ink/20 bg-white font-black text-ink hover:bg-bg-neutral disabled:opacity-30 transition-colors"
                title="پایین"
              >
                ↓
              </button>
              <button
                onClick={onDelete}
                className="w-8 h-8 rounded-pill-md border-2 border-magenta/40 bg-white font-black text-magenta-text hover:bg-magenta/10 transition-colors"
                title="حذف سوال"
              >
                ✕
              </button>
            </div>
          </div>

          <input
            value={q.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="متن سوال..."
            className={`${inputCls} !text-base !font-extrabold`}
          />
          <input
            value={q.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="توضیح اختیاری (مثلاً: فقط شهر فعلیت را بنویس)"
            className={`${inputCls} !text-sm`}
          />

          {/* placeholder سفارشی — فقط برای فیلدهای متنی */}
          {!isChoice && (
            <Field label="متن راهنما (Placeholder)" hint="متنی که داخل فیلد نمایش داده می‌شود">
              <input
                value={q.placeholder ?? ""}
                onChange={(e) => onChange({ placeholder: e.target.value })}
                placeholder={meta.defaultPlaceholder || "متن راهنما..."}
                className={`${inputCls} !text-sm`}
              />
            </Field>
          )}

          {/* ─── اعتبارسنجی سفارشی ─── */}
          {(q.type === "number" || q.type === "short_text" || q.type === "long_text") && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-teal/30 rounded-pill-md bg-bg-mint/30 p-3">
              <span className="text-xs font-extrabold text-teal-text"> قوانین اعتبارسنجی</span>
              {q.type === "number" && (
                <div className="flex gap-2">
                  <Field label="حداقل" hint="مقدار حداقل">
                    <input
                      type="number"
                      value={q.validation?.min ?? ""}
                      onChange={(e) => onChange({ validation: { ...q.validation, min: e.target.value ? Number(e.target.value) : undefined } })}
                      placeholder="مثلاً ۱۳"
                      className={`${inputCls} !py-1.5 !text-xs`}
                    />
                  </Field>
                  <Field label="حداکثر" hint="مقدار حداکثر">
                    <input
                      type="number"
                      value={q.validation?.max ?? ""}
                      onChange={(e) => onChange({ validation: { ...q.validation, max: e.target.value ? Number(e.target.value) : undefined } })}
                      placeholder="مثلاً ۱۸"
                      className={`${inputCls} !py-1.5 !text-xs`}
                    />
                  </Field>
                </div>
              )}
              {(q.type === "short_text" || q.type === "long_text") && (
                <div className="flex gap-2">
                  <Field label="حداقل کاراکتر">
                    <input
                      type="number"
                      value={q.validation?.minLength ?? ""}
                      onChange={(e) => onChange({ validation: { ...q.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })}
                      placeholder="مثلاً ۲"
                      className={`${inputCls} !py-1.5 !text-xs`}
                    />
                  </Field>
                  <Field label="حداکثر کاراکتر">
                    <input
                      type="number"
                      value={q.validation?.maxLength ?? ""}
                      onChange={(e) => onChange({ validation: { ...q.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })}
                      placeholder="مثلاً ۱۰۰"
                      className={`${inputCls} !py-1.5 !text-xs`}
                    />
                  </Field>
                </div>
              )}
              <Field label="الگو (Regex)
" hint="اختیاری — مثلاً: ^[a-zA-Z]+$">
                <input
                  value={q.validation?.pattern ?? ""}
                  onChange={(e) => onChange({ validation: { ...q.validation, pattern: e.target.value || undefined } })}
                  placeholder="^\d+$"
                  dir="ltr"
                  className={`${inputCls} !py-1.5 !text-xs text-left`}
                />
              </Field>
            </div>
          )}

          {/* ─── گزینه‌ها (چندگزینه‌ای) ─── */}
          {meta.hasOptions && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-orange/50 rounded-pill-md bg-[#FEF7EC]/60 p-3">
              <span className="text-xs font-extrabold text-orange">
                گزینه‌ها ({faNum(q.options.length)} — حداقل ۲)
              </span>
              {q.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full border-2 border-orange/50 text-orange text-xs font-black">
                    {faNum(i + 1)}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => setOpt(i, e.target.value)}
                    className={`${inputCls} !py-2 !text-sm`}
                  />
                  <button
                    onClick={() => onChange({ options: q.options.filter((_, j) => j !== i) })}
                    disabled={q.options.length <= 2}
                    className="w-7 h-7 shrink-0 rounded-pill-sm border border-ink/20 text-ink-subtle hover:text-magenta-text hover:border-magenta/40 disabled:opacity-30"
                    title="حذف گزینه"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => onChange({ options: [...q.options, `گزینه ${faNum(q.options.length + 1)}`] })}
                disabled={false}
                className="self-start text-xs font-extrabold text-orange hover:text-orange-alt disabled:opacity-40 transition-opacity"
              >
                + افزودن گزینه
              </button>
            </div>
          )}

          {/* ─── حالت نمایش گزینه‌ها (فقط choice) ─── */}
          {meta.hasDisplayMode && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-extrabold text-navy">حالت نمایش</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ display_mode: "buttons" })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-pill-md border-2 text-xs font-bold transition-all ${
                    (q.display_mode || "buttons") === "buttons"
                      ? "border-teal bg-teal/10 text-teal-text"
                      : "border-ink/15 bg-white text-ink-subtle hover:border-teal/40"
                  }`}
                >
                  <span className="text-sm">☐</span> دکمه‌ای
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ display_mode: "dropdown" })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-pill-md border-2 text-xs font-bold transition-all ${
                    q.display_mode === "dropdown"
                      ? "border-teal bg-teal/10 text-teal-text"
                      : "border-ink/15 bg-white text-ink-subtle hover:border-teal/40"
                  }`}
                >
                  <span className="text-sm">▾</span> کشویی (دراپ‌داون)
                </button>
              </div>
              <span className="text-[0.6rem] font-medium text-ink-subtle">
                {(q.display_mode || "buttons") === "buttons" 
                  ? "گزینه‌ها به‌صورت دکمه‌های جداگانه نمایش داده می‌شوند"
                  : "گزینه‌ها در یک لیست کشویی نمایش داده می‌شوند"}
              </span>
            </div>
          )}

          {/* ─── تعداد انتخاب مجاز (فقط choice) ─── */}
          {meta.hasMaxSelections && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-orange/40 rounded-pill-md bg-[#FEF7EC]/40 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-orange">تعداد انتخاب مجاز</span>
                {(q.max_selections ?? 1) > 1 && (
                  <span className="text-[0.55rem] font-bold text-teal bg-teal/10 border border-teal/30 rounded-pill-sm px-1.5 py-0.5">
                    چند انتخابی
                  </span>
                )}
              </div>
              <span className="text-[0.6rem] font-medium text-ink-subtle">
                کاربر چند گزینه می‌تواند انتخاب کند؟ ۱ = تک‌انتخابی، بیشتر از ۱ = چند انتخابی
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max={q.options?.length || 4}
                  value={q.max_selections ?? 1}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const patch = { max_selections: val };
                    // اگه max_selections > 1 شد و display_mode دراپ‌داون بود → به دکمه‌ای برگردان
                    if (val > 1 && q.display_mode === "dropdown") {
                      patch.display_mode = "buttons";
                    }
                    onChange(patch);
                  }}
                  className="flex-1 accent-orange h-1.5 cursor-pointer"
                />
                <span className="min-w-[2rem] text-center text-sm font-black text-orange bg-white border-2 border-orange/30 rounded-pill-sm px-2 py-1">
                  {faNum(q.max_selections ?? 1)}
                </span>
              </div>
              <span className="text-[0.55rem] font-medium text-ink-subtle">
                {(q.max_selections ?? 1) === 1
                  ? "کاربر فقط یک گزینه می‌تواند انتخاب کند (حالت رادیویی)"
                  : `کاربر حداکثر ${faNum(q.max_selections)} گزینه می‌تواند انتخاب کند`
                }
              </span>
            </div>
          )}

          {/* ─── گزینه صحیح (Correct Answer) ─── */}
          {isChoice && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-teal/40 rounded-pill-md bg-teal/5 p-3">
              <span className="text-xs font-extrabold text-teal-text">
                🎯 گزینه صحیح (برای نمره‌دهی)
              </span>
              <span className="text-[0.6rem] font-medium text-ink-subtle">
                اگه گزینه صحیح مشخص کنید، بعد از ارسال فرم به کاربر نمره نمایش داده می‌شود.
              </span>

              {/* choice با max_selections > 1 → چند انتخابی */}
              {q.type === "choice" && (q.max_selections ?? 1) > 1 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.6rem] font-medium text-ink-subtle">چند گزینه صحیح انتخاب کنید:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((opt, i) => {
                      const correctArr = Array.isArray(q.correct_answer) ? q.correct_answer : [];
                      const isSelected = correctArr.includes(opt);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? correctArr.filter((v) => v !== opt)
                              : [...correctArr, opt];
                            onChange({ correct_answer: next.length > 0 ? next : null });
                          }}
                          className={`text-[0.65rem] font-bold px-3 py-1.5 rounded-pill-md border-2 transition-all cursor-pointer ${
                            isSelected
                              ? "border-teal bg-teal text-white"
                              : "border-ink/15 bg-white text-ink hover:border-teal/40"
                          }`}
                        >
                          {isSelected ? "✓ " : ""}{opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* تک انتخابی: choice (max=1) یا yes_no */
                <div className="flex flex-wrap gap-1.5">
                  {(q.type === "yes_no" ? ["بله", "خیر"] : q.options).map((opt, i) => {
                    const isSelected = q.correct_answer === opt;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onChange({ correct_answer: isSelected ? null : opt })}
                        className={`text-[0.65rem] font-bold px-3 py-1.5 rounded-pill-md border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-teal bg-teal text-white"
                            : "border-ink/15 bg-white text-ink hover:border-teal/40"
                        }`}
                      >
                        {isSelected ? "✓ " : ""}{opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* امتیاز هر سوال */}
              <Field label="امتیاز این سوال" hint="تعداد نمره برای پاسخ صحیح">
                <input
                  type="number"
                  min="0"
                  value={q.points ?? ""}
                  onChange={(e) => onChange({ points: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="مثلاً ۱۰"
                  className={`${inputCls} !py-1.5 !text-xs w-32`}
                />
              </Field>
            </div>
          )}

          {/* ─── شرط نمایش (Visibility Condition) ─── */}
          {index > 0 && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-navy/20 rounded-pill-md bg-bg-lavender/40 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm"></span>
                <span className="text-xs font-extrabold text-navy">شرط نمایش</span>
                {conditions ? (
                  <span className="text-[0.6rem] font-bold text-teal bg-teal/10 border border-teal/30 rounded-pill-sm px-2 py-0.5">
                    فعال
                  </span>
                ) : (
                  <span className="text-[0.6rem] font-bold text-ink-subtle bg-ink/5 border border-ink/10 rounded-pill-sm px-2 py-0.5">
                    بدون شرط
                  </span>
                )}
                {conditions && (
                  <button
                    onClick={toggleConditionGroup}
                    className="text-[0.65rem] font-bold text-magenta-text hover:underline mr-auto"
                  >
                    ✕ حذف شرط
                  </button>
                )}
              </div>

              {conditions ? (
                <div className="flex flex-col gap-2">
                  {/* سوییچ AND/OR */}
                  {conditions.conditions?.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[0.6rem] font-bold text-ink-subtle">ترکیب:</span>
                      <select
                        value={conditions.group_operator}
                        onChange={(e) => updateConditionGroup({ group_operator: e.target.value })}
                        className={`${inputCls} !py-1 !text-[0.65rem] !w-auto`}
                      >
                        <option value="AND">{GROUP_OPERATORS.AND.label}</option>
                        <option value="OR">{GROUP_OPERATORS.OR.label}</option>
                      </select>
                    </div>
                  )}

                  {/* لیست شرط‌ها */}
                  {(conditions.conditions || []).map((cond, i) => {
                    const normalized = normalizeCondition(cond);
                    return (
                      <div key={cond.id || i} className="flex items-start gap-2">
                        {i > 0 && (
                          <span className="text-[0.6rem] font-black text-navy mt-3 shrink-0 px-1.5 py-0.5 bg-bg-lavender rounded-pill-sm">
                            {conditions.group_operator}
                          </span>
                        )}
                        <div className="flex-1">
                          <ConditionBuilder
                            condition={normalized}
                            questions={sourceQuestions}
                            index={i}
                            removable={(conditions.conditions || []).length > 1}
                            onChange={(patch) => updateGroupCondition(i, patch)}
                            onDelete={() => removeGroupCondition(i)}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={addConditionToGroup}
                    className="self-start text-[0.65rem] font-extrabold text-teal hover:text-teal-text transition-colors"
                  >
                    + افزودن شرط
                  </button>
                </div>
              ) : (
                <button
                  onClick={toggleConditionGroup}
                  className="self-start text-[0.7rem] font-extrabold text-teal hover:text-teal-text transition-colors
                    border-2 border-dashed border-teal/40 rounded-pill-md px-3 py-2 hover:border-teal"
                >
                  + افزودن شرط نمایش
                </button>
              )}
            </div>
          )}

          {/* ─── اکشن پرش (Jump Actions) — فقط چندگزینه‌ای / بله-خیر ─── */}
          {isChoice && index < total - 1 && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-magenta/20 rounded-pill-md bg-magenta/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm"></span>
                <span className="text-xs font-extrabold text-navy">اکشن پرش (Jump)</span>
                {jumpActions.length > 0 && (
                  <span className="text-[0.6rem] font-bold text-magenta-text bg-magenta/10 border border-magenta/30 rounded-pill-sm px-2 py-0.5">
                    {faNum(jumpActions.length)} اکشن
                  </span>
                )}
              </div>

              <span className="text-[0.6rem] font-medium text-ink-subtle leading-5">
                اگر گزینه خاصی انتخاب شد، به سوال مشخصی پرش کن یا فرم تمام شود.
              </span>

              {/* لیست اکشن‌ها */}
              {jumpActions.map((ja, i) => {
                const jaLabel = ja.option_index >= 0 && q.options?.[ja.option_index]
                  ? `گزینه «${q.options[ja.option_index]}»`
                  : " generally";
                return (
                  <div key={ja.id || i} className="flex flex-col gap-1.5 bg-white rounded-pill-md border border-ink/10 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.6rem] font-extrabold text-magenta-text shrink-0">
                        {jaLabel}:
                      </span>
                      <select
                        value={ja.action_type}
                        onChange={(e) => updateJumpAction(i, { action_type: e.target.value, target_id: null, target_url: null })}
                        className={`${inputCls} !py-1 !text-[0.65rem] !w-auto flex-1`}
                      >
                        {JUMP_ACTION_TYPE_ORDER.map((t) => (
                          <option key={t} value={t}>
                            {JUMP_ACTION_TYPES[t].icon} {JUMP_ACTION_TYPES[t].label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeJumpAction(i)}
                        className="text-[0.65rem] font-bold text-magenta-text hover:underline shrink-0"
                      >
                        ✕
                      </button>
                    </div>

                    {/* انتخاب هدف */}
                    {ja.action_type === "jump_to_question" && (
                      <select
                        value={ja.target_id ?? ""}
                        onChange={(e) => updateJumpAction(i, { target_id: e.target.value || null })}
                        className={`${inputCls} !py-1.5 !text-xs`}
                      >
                        <option value="">— انتخاب سوال مقصد —</option>
                        {targetQuestions.map((tq, ti) => (
                          <option key={tq.id} value={tq.id}>
                            {allQuestions.indexOf(tq) + 1}. {tq.title?.slice(0, 40) || "—"}
                          </option>
                        ))}
                      </select>
                    )}

                    {ja.action_type === "redirect_url" && (
                      <input
                        value={ja.target_url ?? ""}
                        onChange={(e) => updateJumpAction(i, { target_url: e.target.value })}
                        placeholder="https://..."
                        dir="ltr"
                        className={`${inputCls} !py-1.5 !text-xs`}
                      />
                    )}
                  </div>
                );
              })}

              {/* دکمه افزودن اکشن — به ازای هر گزینه یک اکشن */}
              {q.type === "choice" ? (
                <div className="flex flex-wrap gap-1.5">
                  {q.options.map((opt, optIdx) => {
                    const hasAction = jumpActions.some((ja) => ja.option_index === optIdx);
                    return (
                      <button
                        key={optIdx}
                        onClick={() => addJumpAction(optIdx)}
                        disabled={hasAction}
                        className="text-[0.6rem] font-extrabold text-magenta-text hover:text-magenta transition-colors
                          border border-dashed border-magenta/30 rounded-pill-sm px-2 py-1 hover:border-magenta
                          disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {opt.slice(0, 15)} {hasAction ? "✓" : "→"}
                      </button>
                    );
                  })}
                </div>
              ) : q.type === "yes_no" ? (
                <div className="flex gap-2">
                  {["بله", "خیر"].map((opt, optIdx) => {
                    const hasAction = jumpActions.some((ja) => ja.option_index === optIdx);
                    return (
                      <button
                        key={optIdx}
                        onClick={() => addJumpAction(optIdx)}
                        disabled={hasAction}
                        className="text-[0.6rem] font-extrabold text-magenta-text hover:text-magenta transition-colors
                          border border-dashed border-magenta/30 rounded-pill-sm px-2 py-1 hover:border-magenta
                          disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {opt} {hasAction ? "✓" : "→"}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </StickerCard>
    </div>
  );
}

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const { user, isOwner, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      const { data: f, error } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
      if (error || !f) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!isOwner() && (!user || (f.manager_id !== user.id && f.created_by !== user.id))) {
        push("شما به این فرم دسترسی ندارید.", "error");
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("form_id", id)
        .order("position");
      setForm(f);
      setQuestions((qs ?? []).map((q) => ({
        ...q,
        localId: q.id,
        placeholder: q.placeholder ?? "",
        validation: q.validation ?? null,
        correct_answer: q.correct_answer ?? null,
        points: q.points ?? undefined,
        max_selections: q.max_selections ?? 1,
        // مهاجرت: اگه conditions وجود نداشت از condition قدیمی بساز
        conditions: normalizeConditionGroup(q.conditions ?? (q.condition ? { group_operator: "AND", conditions: [q.condition] } : null)),
        jump_actions: q.jump_actions ?? [],
      })));

      setLoading(false);
    }
    load();
  }, [id, user?.id, isOwner, authLoading]);

  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const setFormField = useCallback((patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }, []);

  const updateQuestion = useCallback((localId, patch) => {
    setQuestions((qs) => qs.map((q) => (q.localId === localId ? { ...q, ...patch } : q)));
    setDirty(true);
  }, []);

  const addQuestion = useCallback((type) => {
    setQuestions((qs) => [...qs, makeQuestion(type, qs.length)]);
    setDirty(true);
  }, []);

  const deleteQuestion = useCallback((localId) => {
    setQuestions((qs) => qs.filter((q) => q.localId !== localId));
    setDirty(true);
  }, []);

  const moveQuestion = useCallback((localId, dir) => {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.localId === localId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    setDirty(true);
  }, []);

  const publicUrl = useMemo(
    () => (form?.slug ? `${window.location.origin}/f/${form.slug}` : ""),
    [form?.slug],
  );

  async function save() {
    if (saving) return;
    const cleanSlug = slugify(form.slug);
    if (cleanSlug.length < 3) {
      setSlugError("اسلاگ باید حداقل ۳ کاراکتر باشد.");
      return;
    }
    if (!form.title.trim()) {
      push("عنوان فرم خالی است", "error");
      return;
    }
    const emptyQ = questions.find((q) => !q.title.trim());
    if (emptyQ) {
      push("یکی از سوال‌ها متن خالی دارد", "error");
      return;
    }
    const badChoice = questions.find(
      (q) => q.type === "choice" && (q.options.length < 2 || q.options.some((o) => !o.trim())),
    );
    if (badChoice) {
      push("سوال چندگزینه‌ای باید حداقل ۲ گزینه‌ی غیرخالی داشته باشد", "error");
      return;
    }

    setSaving(true);
    setSlugError(null);
    try {
      const pForm = {
        title: form.title.trim(),
        description: form.description ?? "",
        slug: cleanSlug,
        welcome_title: form.welcome_title,
        welcome_message: form.welcome_message,
        exit_title: form.exit_title,
        exit_message: form.exit_message,
        published: form.published,
        form_type: form.form_type || "step_by_step",
        identifier_mapping: form.identifier_mapping ?? null,
      };
      const pQuestions = questions.map((q, i) => ({
        id: q.id ?? null,
        type: q.type,
        title: q.title.trim(),
        description: q.description ?? "",
        placeholder: q.placeholder ?? "",
        validation: q.validation ?? null,
        required: !!q.required,
        options: q.type === "choice" ? q.options.map((o) => o.trim()) : q.type === "yes_no" ? ["بله", "خیر"] : [],
        position: i,
        conditions: q.conditions ?? null,
        jump_actions: q.jump_actions ?? [],
        correct_answer: q.correct_answer ?? null,
        points: q.points ?? null,
        display_mode: q.display_mode ?? null,
        max_selections: q.max_selections ?? 1,
      }));

      const { data: freshQs, error } = await supabase.rpc("save_form", {
        p_form_id: id,
        p_form: pForm,
        p_questions: pQuestions,
      });

      logActivity("edit_form", "form", id, { title: form.title, slug: cleanSlug, questions: pQuestions.length });

      if (error) {
        if (
          error.code === "23505" ||
          (error.message ?? "").includes("forms_slug_key") ||
          (error.message ?? "").includes("duplicate key")
        ) {
          setSlugError("این اسلاگ قبلاً استفاده شده.");
        }
        throw error;
      }

      if (Array.isArray(freshQs)) {
        setQuestions((prev) => prev.map((pq) => {
          const saved = freshQs.find((fq) => fq.id === pq.id || fq.id === pq.localId);
          if (saved) {
            return {
              ...pq,
              id: saved.id,
              localId: saved.id,
            };
          }
          return pq;
        }));
      }

      setForm((f) => ({ ...f, slug: cleanSlug }));
      setDirty(false);
      push("همه‌چیز ذخیره شد");
    } catch (err) {
      console.error(err);
      push("ذخیره ناموفق بود: " + (err.message ?? ""), "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="فرم‌ساز در حال بارگذاری..." />;

  if (notFound) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <StickerCard theme="magenta">
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <span className="text-5xl">-</span>
            <h2 className="text-xl font-black text-navy">این فرم پیدا نشد!</h2>
            <Button as={Link} to="/admin/forms" variant="navy">برگشت به لیست فرم‌ها</Button>
          </div>
        </StickerCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 max-w-7xl mx-auto">
      {/* ─── ستون اصلی: ویرایشگر ─── */}
      <div className="flex flex-col gap-5 flex-1 min-w-0">
      <SEO
        title={`ویرایش فرم: ${form.title}`}
        description={form.description || `فرم‌ساز — ${form.title}`}
        url={`/admin/forms/${id}`}
        noIndex
      />
      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button as={Link} to="/admin/forms" variant="ghost" size="sm">↩ فرم‌ها</Button>
          <h1 className="text-2xl font-black text-navy">فرم‌ساز</h1>
          {dirty && <Badge color="orange" rotate="rotate-[2deg]">• تغییرات</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {form.published && (
            <>
              <Button variant="white" size="sm" onClick={async () => {
                const ok = await copyToClipboard(publicUrl);
                push(ok ? "لینک کپی شد!" : publicUrl, ok ? "success" : "info");
              }}><Link2 size={14} /> کپی لینک</Button>
              <Button as="a" href={`/f/${form.slug}`} target="_blank" variant="white" size="sm">
                پیش‌نمایش
              </Button>
            </>
          )}
          <Button as={Link} to={`/admin/forms/${id}/responses`} variant="white" size="sm">
            <BarChart3 size={14} /> پاسخ‌ها
          </Button>
          <Button as={Link} to={`/admin/forms/${id}/share`} variant="white" size="sm">
            <Share2 size={14} /> اشتراک‌گذاری
          </Button>
          <Button variant="teal" onClick={save} disabled={saving || !dirty}>
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </Button>
        </div>
      </div>

      {/* تنظیمات فرم */}
      <div className="-rotate-[0.4deg]">
        <StickerCard theme="navy" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-lg font-black text-navy flex items-center gap-2">
              تنظیمات فرم
              <label className="mr-auto flex items-center gap-2 text-sm font-extrabold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setFormField({ published: e.target.checked })}
                  className="accent-teal w-5 h-5"
                />
                {form.published ? "منتشرشده" : "پیش‌نویس"}
              </label>
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="عنوان فرم">
                <input value={form.title} onChange={(e) => setFormField({ title: e.target.value })} className={inputCls} />
              </Field>
              <Field label="اسلاگ لینک (انگلیسی)" hint={slugError ?? "لینک فرم: /f/اسلاگ"}>
                <input
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => setFormField({ slug: e.target.value })}
                  className={`${inputCls} text-left ${slugError ? "!border-magenta" : ""}`}
                />
              </Field>
            </div>

            <Field label="توضیح فرم (اختیاری)">
              <textarea
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => setFormField({ description: e.target.value })}
                className={`${inputCls} resize-y`}
              />
            </Field>

            {/* انتخاب نوع فرم */}
            <div className="border-t-2 border-dashed border-navy/15 pt-4">
              <Field label={<><Settings size={14} /> نوع فرم</>}>
                <div className="flex gap-3">
                  {[
                    { key: "step_by_step", label: "مرحله به مرحله", icon: "📄", desc: "هر سوال یک صفحه جداگانه" },
                    { key: "registration", label: "ثبت‌نامی", icon: "reg", desc: "همه فیلدها یکجا در یک صفحه" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setFormField({ form_type: t.key })}
                      className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        form.form_type === t.key
                          ? "border-teal bg-teal/10 shadow-sm"
                          : "border-ink/15 bg-white hover:border-teal/40"
                      }`}
                    >
                      <span className="text-navy">{t.key === "step_by_step" ? <FileText size={24} /> : <AlignLeft size={24} />}</span>
                      <div className="text-right">
                        <span className={`text-sm font-black block ${form.form_type === t.key ? "text-teal-text" : "text-navy"}`}>
                          {t.label}
                        </span>
                        <span className="text-[0.65rem] text-ink/50">{t.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* ─── شناسه‌های گروه‌بندی برای آنالیتیکس چندانتخابی ─── */}
            <div className="border-t-2 border-dashed border-navy/15 pt-4">
              <Field
                label={<><BarChart3 size={14} /> شناسه‌های آنالیتیکس (گروه‌بندی گزارش چندانتخابی)</>}
                hint="فیلدهای متنی که نقش «شناسه» دارند — مثل نام فرد (سطح ۱) و نام تیم (سطح ۲). گزارش تحلیل سوال‌های چندانتخابی به تفکیک همین سطح‌ها ساخته می‌شود. خالی بگذار = گزارش گروهی غیرفعال."
              >
                {questions.filter((q) => ["short_text", "long_text", "email", "phone_ir", "telegram_id"].includes(q.type)).length === 0 ? (
                  <span className="text-xs font-bold text-ink/40 bg-bg-neutral rounded-pill-md px-3 py-2 block">
                    اول یک فیلد متنی به فرم اضافه کن؛ بعد اینجا به‌عنوان شناسه انتخابش می‌کنی.
                  </span>
                ) : (
                  <div className="flex flex-col gap-2">
                    {questions
                      .filter((q) => ["short_text", "long_text", "email", "phone_ir", "telegram_id"].includes(q.type))
                      .map((q) => {
                        const mapping = Array.isArray(form.identifier_mapping) ? form.identifier_mapping : [];
                        const current = mapping.find((m) => m.field_id === q.id || m.field_id === q.localId);
                        const currentLevel = current ? current.level : 0;
                        const MAX_LEVELS = 3;
                        return (
                          <div key={q.localId || q.id} className="flex items-center gap-2 bg-white border-2 border-ink/10 rounded-pill-md px-3 py-2">
                            <span className="text-xs font-bold text-navy flex-1 truncate">{q.title || "بدون عنوان"}</span>
                            <select
                              value={currentLevel}
                              onChange={(e) => {
                                const lvl = Number(e.target.value);
                                let next = mapping.filter((m) => m.field_id !== q.id && m.field_id !== q.localId);
                                if (lvl > 0) {
                                  next = next.filter((m) => m.level !== lvl);
                                  next.push({ level: lvl, field_id: q.id ?? q.localId, label: q.title });
                                }
                                next.sort((a, b) => a.level - b.level);
                                setFormField({ identifier_mapping: next.length ? next : null });
                              }}
                              className={`text-xs font-bold rounded-pill-sm border-2 px-2 py-1.5 cursor-pointer focus:outline-none ${
                                currentLevel > 0 ? "border-teal bg-teal/10 text-teal-text" : "border-ink/15 bg-white text-ink/60"
                              }`}
                            >
                              <option value={0}>— شناسه نیست</option>
                              {Array.from({ length: MAX_LEVELS }, (_, i) => i + 1).map((lvl) => (
                                <option key={lvl} value={lvl}>سطح {faNum(lvl)}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                  </div>
                )}
              </Field>
            </div>

            <div className="border-t-2 border-dashed border-navy/15 pt-4 grid sm:grid-cols-2 gap-4">
              <Field label="عنوان پیام ورود">
                <input value={form.welcome_title} onChange={(e) => setFormField({ welcome_title: e.target.value })} className={inputCls} />
              </Field>
              <Field label="عنوان پیام خروج">
                <input value={form.exit_title} onChange={(e) => setFormField({ exit_title: e.target.value })} className={inputCls} />
              </Field>
              <Field label="متن پیام ورود">
                <textarea rows={2} value={form.welcome_message} onChange={(e) => setFormField({ welcome_message: e.target.value })} className={`${inputCls} resize-y`} />
              </Field>
              <Field label="متن پیام خروج">
                <textarea rows={2} value={form.exit_message} onChange={(e) => setFormField({ exit_message: e.target.value })} className={`${inputCls} resize-y`} />
              </Field>
            </div>
          </div>
        </StickerCard>
      </div>

      {/* سوال‌ها */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-black text-navy">
          سوال‌ها ({faNum(questions.length)})
        </h2>

        {questions.map((q, i) => (
          <QuestionEditor
            key={q.localId}
            q={q}
            index={i}
            total={questions.length}
            allQuestions={questions}
            onChange={(patch) => updateQuestion(q.localId, patch)}
            onMove={(dir) => moveQuestion(q.localId, dir)}
            onDelete={() => deleteQuestion(q.localId)}
          />
        ))}

        {/* افزودن سوال جدید */}
        <div className="rotate-[0.4deg]">
          <StickerCard theme="orange" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
            <div className="p-4 sm:p-5 flex flex-col gap-3">
              <span className="text-sm font-black text-orange">افزودن سوال جدید — نوعش را انتخاب کن:</span>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPE_ORDER.map((key) => {
                  const t = QUESTION_TYPES[key];
                  return (
                    <button
                      key={key}
                      onClick={() => addQuestion(key)}
                      title={t.hint}
                      className="flex items-center gap-1.5 bg-white border-2 border-orange/60 rounded-pill-md px-3 py-2
                        text-xs font-extrabold text-ink hover:-translate-y-0.5 hover:border-orange hover:rotate-[-1deg] transition-all cursor-pointer"
                    >
                      {(() => { const Icon = QUESTION_TYPE_ICONS[key]; return Icon ? <Icon size={14} className="text-orange" /> : null; })()}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </StickerCard>
        </div>

        {/* نوار ذخیره پایین */}
        <div className="sticky bottom-4 flex justify-end">
          <Button variant="teal" size="lg" onClick={save} disabled={saving || !dirty} rotate="-rotate-[1deg]">
            {saving ? "در حال ذخیره..." : "ذخیره‌ی همه‌ی تغییرات"}
          </Button>
        </div>
      </div>
      </div>

      {/* ─── ستون پیش‌نمایش (فقط دسکتاپ) ─── */}
      <div className="hidden lg:block w-[320px] shrink-0 sticky top-20 self-start">
        <div className="rounded-2xl border-2 border-navy/20 bg-white overflow-hidden shadow-lg">
          <FormPreview form={form} questions={questions} />
        </div>
      </div>
    </div>
  );
}
