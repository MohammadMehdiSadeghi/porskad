import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import StickerCard from "../../../components/ui/StickerCard";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import { FormBuilderSkeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../context/AuthContext";
import { QUESTION_TYPES, QUESTION_TYPE_ORDER, QUESTION_CATEGORIES, makeQuestion } from "../../../lib/questionTypes";
import { QUESTION_TYPE_ICONS } from "../../../lib/questionIcons";
import ConditionBuilder from "../../../components/logic/ConditionBuilder";
import { makeCondition, makeConditionGroup, makeJumpAction, GROUP_OPERATORS } from "../../../lib/logic/types";
import { faNum, slugify, copyToClipboard } from "../../../lib/utils";
import { Link2, BarChart3, Share2, Puzzle, Settings, FileText, AlignLeft, ArrowRight, Eye, Save, Target, Check, ChevronDown, ChevronUp, LayoutGrid, Trash2, X, Sun, Moon, Monitor, Image, Sliders, Gauge, Grid, ListOrdered, Info, Layers, Upload, CreditCard } from "lucide-react";
import FormPreview from "../../../components/form/FormPreview";
import { logActivity } from "../../../lib/activityLogger";
import SEO from "../../../components/ui/SEO";

const inputCls =
  "w-full bg-white dark:bg-slate-800/90 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink dark:text-white placeholder:text-ink/40 dark:placeholder:text-slate-500 focus:outline-none transition-all";

function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-extrabold text-navy dark:text-slate-200">{label}</span>
      {children}
      {hint && <span className="text-xs font-medium text-ink-subtle dark:text-slate-400">{hint}</span>}
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
                className="w-8 h-8 rounded-pill-md border-2 border-ink/20 bg-white flex items-center justify-center text-ink hover:bg-bg-neutral disabled:opacity-30 transition-colors"
                title="بالا"
              >
                <ChevronUp size={15} />
              </button>
              <button
                onClick={() => onMove(1)}
                disabled={index === total - 1}
                className="w-8 h-8 rounded-pill-md border-2 border-ink/20 bg-white flex items-center justify-center text-ink hover:bg-bg-neutral disabled:opacity-30 transition-colors"
                title="پایین"
              >
                <ChevronDown size={15} />
              </button>
              <button
                onClick={onDelete}
                className="w-8 h-8 rounded-pill-md border-2 border-magenta/40 bg-white flex items-center justify-center text-magenta-text hover:bg-magenta/10 transition-colors"
                title="حذف سوال"
              >
                <Trash2 size={15} />
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
              {q.type === "short_text" && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-teal-text">سقف مجاز: حداکثر ۲۵۵ کاراکتر</span>
                  <div className="flex gap-2">
                    <Field label="حداقل کاراکتر" hint="اختیاری">
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={q.validation?.minLength ?? ""}
                        onChange={(e) => onChange({ validation: { ...q.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })}
                        placeholder="مثلاً ۲"
                        className={`${inputCls} !py-1.5 !text-xs`}
                      />
                    </Field>
                    <Field label="حداکثر کاراکتر (تا ۲۵۵)" hint="پیش‌فرض: ۲۵۵">
                      <input
                        type="number"
                        min="1"
                        max="255"
                        value={q.validation?.maxLength ?? ""}
                        onChange={(e) => onChange({ validation: { ...q.validation, maxLength: e.target.value ? Math.min(255, Number(e.target.value)) : undefined } })}
                        placeholder="۲۵۵"
                        className={`${inputCls} !py-1.5 !text-xs`}
                      />
                    </Field>
                  </div>
                </div>
              )}
              {q.type === "long_text" && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-teal-text">محدودیت کاراکتر (پیش‌فرض آزاد و نامحدود)</span>
                  <div className="flex gap-2">
                    <Field label="حداقل کاراکتر" hint="اختیاری">
                      <input
                        type="number"
                        min="0"
                        value={q.validation?.minLength ?? ""}
                        onChange={(e) => onChange({ validation: { ...q.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })}
                        placeholder="اختیاری"
                        className={`${inputCls} !py-1.5 !text-xs`}
                      />
                    </Field>
                    <Field label="حداکثر کاراکتر" hint="خالی = بدون سقف و آزاد">
                      <input
                        type="number"
                        min="1"
                        value={q.validation?.maxLength ?? ""}
                        onChange={(e) => onChange({ validation: { ...q.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })}
                        placeholder="مثلاً ۱۰۰۰ (خالی = آزاد)"
                        className={`${inputCls} !py-1.5 !text-xs`}
                      />
                    </Field>
                  </div>
                </div>
              )}
              <Field label="الگو (Regex)" hint="اختیاری — مثلاً: ^[a-zA-Z]+$">
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

          {/* ─── گزینه‌ها (چندگزینه‌ای، دراپ‌داون، لیکرت، اولویت‌دهی) ─── */}
          {meta.hasOptions && q.type !== "picture_choice" && q.type !== "matrix" && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-orange/50 dark:border-amber-500/40 rounded-pill-md bg-[#FEF7EC]/60 dark:bg-amber-950/20 p-3">
              <span className="text-xs font-extrabold text-orange dark:text-amber-300">
                گزینه‌ها ({faNum(q.options.length)} — حداقل ۲)
              </span>
              {q.options.map((opt, i) => {
                const optText = typeof opt === "object" ? opt.text : opt;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full border-2 border-orange/50 dark:border-amber-500/40 text-orange dark:text-amber-300 text-xs font-black">
                      {faNum(i + 1)}
                    </span>
                    <input
                      value={optText}
                      onChange={(e) => setOpt(i, e.target.value)}
                      className={`${inputCls} !py-2 !text-sm`}
                    />
                    <button
                      onClick={() => onChange({ options: q.options.filter((_, j) => j !== i) })}
                      disabled={q.options.length <= 2}
                      className="w-7 h-7 shrink-0 rounded-pill-sm border border-ink/20 dark:border-slate-700 flex items-center justify-center text-ink-subtle dark:text-slate-400 hover:text-magenta-text hover:border-magenta/40 disabled:opacity-30 cursor-pointer"
                      title="حذف گزینه"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => onChange({ options: [...q.options, `گزینه ${faNum(q.options.length + 1)}`] })}
                disabled={false}
                className="self-start text-xs font-extrabold text-orange dark:text-amber-300 hover:text-orange-alt disabled:opacity-40 transition-opacity cursor-pointer"
              >
                + افزودن گزینه
              </button>
            </div>
          )}

          {/* ─── گزینه‌های تصویری (Picture Choice) ─── */}
          {q.type === "picture_choice" && (
            <div className="flex flex-col gap-2.5 border-2 border-dashed border-magenta/40 dark:border-pink-500/40 rounded-pill-md bg-magenta/5 dark:bg-pink-950/20 p-3">
              <span className="text-xs font-extrabold text-magenta-text dark:text-pink-300 flex items-center gap-1">
                <Image size={14} /> گزینه‌های تصویری ({faNum((q.options || []).length)})
              </span>
              {(q.options || []).map((opt, i) => {
                const optText = typeof opt === "object" ? opt.text : String(opt);
                const optImage = typeof opt === "object" ? opt.image : "";
                return (
                  <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-ink/10 dark:border-slate-700">
                    <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-magenta/10 text-magenta-text text-xs font-black">
                      {faNum(i + 1)}
                    </span>
                    <input
                      value={optText}
                      onChange={(e) => {
                        const next = [...(q.options || [])];
                        next[i] = { text: e.target.value, image: optImage };
                        onChange({ options: next });
                      }}
                      placeholder="عنوان گزینه..."
                      className={`${inputCls} !py-1.5 !text-xs flex-1`}
                    />
                    <input
                      value={optImage}
                      onChange={(e) => {
                        const next = [...(q.options || [])];
                        next[i] = { text: optText, image: e.target.value };
                        onChange({ options: next });
                      }}
                      placeholder="لینک عکس (URL)..."
                      dir="ltr"
                      className={`${inputCls} !py-1.5 !text-xs flex-1 text-left`}
                    />
                    {optImage && (
                      <img src={optImage} alt="" className="w-8 h-8 rounded object-cover border shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={() => onChange({ options: (q.options || []).filter((_, j) => j !== i) })}
                      disabled={(q.options || []).length <= 2}
                      className="w-7 h-7 shrink-0 rounded border border-ink/20 flex items-center justify-center text-magenta-text hover:bg-magenta/10 disabled:opacity-30 cursor-pointer self-end sm:self-auto"
                      title="حذف گزینه"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => onChange({ options: [...(q.options || []), { text: `طرح ${faNum((q.options || []).length + 1)}`, image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&auto=format&fit=crop&q=60" }] })}
                className="self-start text-xs font-extrabold text-magenta-text dark:text-pink-300 hover:underline cursor-pointer"
              >
                + افزودن گزینه تصویری جدید
              </button>
            </div>
          )}

          {/* ─── الگوهای آماده طیف لیکرت ─── */}
          {q.type === "likert" && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-teal/40 rounded-pill-md bg-teal/5 dark:bg-teal-950/20 p-3">
              <span className="text-xs font-extrabold text-teal-text dark:text-teal flex items-center gap-1">
                <Sliders size={14} /> الگوهای پیش‌فرض طیف لیکرت
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "موافقت (۵ تایی)", opts: ["کاملاً مخالفم", "مخالفم", "نظری ندارم", "موافقم", "کاملاً موافقم"] },
                  { label: "رضایت (۵ تایی)", opts: ["خیلی ناراضی", "ناراضی", "متوسط", "راضی", "خیلی راضی"] },
                  { label: "کیفیت (۵ تایی)", opts: ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"] },
                  { label: "تناوب (۵ تایی)", opts: ["هیچ‌وقت", "به‌ندرت", "گاهی", "اغلب", "همیشه"] },
                ].map((p, pi) => (
                  <button
                    key={pi}
                    type="button"
                    onClick={() => onChange({ options: p.opts })}
                    className="text-xs font-bold px-2.5 py-1 rounded-pill-sm border border-teal/30 bg-white dark:bg-slate-800 text-teal-text dark:text-teal hover:bg-teal/10 cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── برچسب‌های وفاداری NPS ─── */}
          {q.type === "nps" && (
            <div className="flex flex-col sm:flex-row gap-2 border-2 border-dashed border-orange/40 rounded-pill-md bg-orange/5 dark:bg-amber-950/20 p-3">
              <Field label="برچسب حداقل (امتیاز ۰)" hint="مثلاً: اصلاً احتمال ندارد">
                <input
                  value={q.validation?.min_label || q.min_label || "اصلاً احتمال ندارد"}
                  onChange={(e) => onChange({ validation: { ...q.validation, min_label: e.target.value }, min_label: e.target.value })}
                  className={`${inputCls} !py-1.5 !text-xs`}
                />
              </Field>
              <Field label="برچسب حداکثر (امتیاز ۱۰)" hint="مثلاً: بسیار زیاد">
                <input
                  value={q.validation?.max_label || q.max_label || "بسیار زیاد"}
                  onChange={(e) => onChange({ validation: { ...q.validation, max_label: e.target.value }, max_label: e.target.value })}
                  className={`${inputCls} !py-1.5 !text-xs`}
                />
              </Field>
            </div>
          )}

          {/* ─── ماتریسی (جدول سطرهای سوال و ستون‌های گزینه‌ها) ─── */}
          {q.type === "matrix" && (
            <div className="flex flex-col gap-3 border-2 border-dashed border-navy/20 dark:border-slate-700 rounded-pill-md bg-navy/5 dark:bg-slate-800/40 p-3">
              {/* سطرها */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-extrabold text-navy dark:text-slate-200 flex items-center gap-1">
                  <Grid size={14} /> سطرهای سوال (موضوعات ارزیابی):
                </span>
                {(q.validation?.rows || q.rows || ["کیفیت خدمات", "سرعت پاسخگویی", "سهولت استفاده"]).map((r, ri, arr) => (
                  <div key={ri} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-ink-subtle">{faNum(ri + 1)}.</span>
                    <input
                      value={r}
                      onChange={(e) => {
                        const copy = [...arr]; copy[ri] = e.target.value;
                        onChange({ validation: { ...q.validation, rows: copy }, rows: copy });
                      }}
                      className={`${inputCls} !py-1.5 !text-xs`}
                    />
                    <button
                      type="button"
                      disabled={arr.length <= 1}
                      onClick={() => {
                        const copy = arr.filter((_, j) => j !== ri);
                        onChange({ validation: { ...q.validation, rows: copy }, rows: copy });
                      }}
                      className="text-magenta-text p-1 hover:opacity-80 disabled:opacity-20 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const arr = q.validation?.rows || q.rows || ["کیفیت خدمات", "سرعت پاسخگویی", "سهولت استفاده"];
                    const copy = [...arr, `موضوع ${faNum(arr.length + 1)}`];
                    onChange({ validation: { ...q.validation, rows: copy }, rows: copy });
                  }}
                  className="self-start text-xs font-extrabold text-teal hover:underline cursor-pointer"
                >
                  + افزودن سطر جدید
                </button>
              </div>

              {/* ستون‌ها */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-ink/10 dark:border-slate-700">
                <span className="text-xs font-extrabold text-navy dark:text-slate-200">
                  ستون‌های پاسخ (گزینه‌ها):
                </span>
                {(q.validation?.columns || q.columns || ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"]).map((c, ci, arr) => (
                  <div key={ci} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-ink-subtle">ستون {faNum(ci + 1)}:</span>
                    <input
                      value={c}
                      onChange={(e) => {
                        const copy = [...arr]; copy[ci] = e.target.value;
                        onChange({ validation: { ...q.validation, columns: copy }, columns: copy });
                      }}
                      className={`${inputCls} !py-1.5 !text-xs`}
                    />
                    <button
                      type="button"
                      disabled={arr.length <= 2}
                      onClick={() => {
                        const copy = arr.filter((_, j) => j !== ci);
                        onChange({ validation: { ...q.validation, columns: copy }, columns: copy });
                      }}
                      className="text-magenta-text p-1 hover:opacity-80 disabled:opacity-20 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const arr = q.validation?.columns || q.columns || ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"];
                    const copy = [...arr, `گزینه ${faNum(arr.length + 1)}`];
                    onChange({ validation: { ...q.validation, columns: copy }, columns: copy });
                  }}
                  className="self-start text-xs font-extrabold text-teal hover:underline cursor-pointer"
                >
                  + افزودن ستون جدید
                </button>
              </div>
            </div>
          )}

          {/* ─── تنظیمات آپلود فایل ─── */}
          {q.type === "file_upload" && (
            <div className="flex flex-col gap-2.5 border-2 border-dashed border-magenta/40 rounded-pill-md bg-magenta/5 dark:bg-pink-950/20 p-3">
              <span className="text-xs font-extrabold text-magenta-text dark:text-pink-300 flex items-center gap-1">
                <Upload size={14} /> تنظیمات بارگذاری فایل
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Field label="نوع فایل‌های مجاز" hint="محدود کردن پسوند">
                  <select
                    value={q.validation?.allowed_file_types || q.allowed_file_types || "all"}
                    onChange={(e) => onChange({ validation: { ...q.validation, allowed_file_types: e.target.value }, allowed_file_types: e.target.value })}
                    className={`${inputCls} !py-1.5 !text-xs`}
                  >
                    <option value="all">همه فرمت‌ها (آزاد)</option>
                    <option value="image">فقط تصاویر (JPG, PNG, WebP)</option>
                    <option value="pdf">فقط اسناد PDF</option>
                    <option value="document">اسناد و فایل‌ها (PDF, Word, Excel, ZIP)</option>
                  </select>
                </Field>
                <Field label="حداکثر حجم مجاز (مگابایت)" hint="حداکثر تا ۵۰ مگابایت">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={q.validation?.max_file_size_mb || q.max_file_size_mb || 10}
                    onChange={(e) => onChange({ validation: { ...q.validation, max_file_size_mb: Number(e.target.value) }, max_file_size_mb: Number(e.target.value) })}
                    className={`${inputCls} !py-1.5 !text-xs`}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ─── تنظیمات درگاه پرداخت ─── */}
          {q.type === "payment" && (
            <div className="flex flex-col gap-2.5 border-2 border-dashed border-orange/40 rounded-pill-md bg-orange/5 dark:bg-amber-950/20 p-3">
              <span className="text-xs font-extrabold text-orange dark:text-amber-300 flex items-center gap-1">
                <CreditCard size={14} /> تنظیمات پرداخت آنلاین
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Field label="مبلغ پرداختی" hint="مبلغ به عدد">
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={q.validation?.amount || q.amount || 100000}
                    onChange={(e) => onChange({ validation: { ...q.validation, amount: Number(e.target.value) }, amount: Number(e.target.value) })}
                    className={`${inputCls} !py-1.5 !text-xs`}
                  />
                </Field>
                <Field label="واحد پولی" hint="تومان یا ریال">
                  <select
                    value={q.validation?.currency || q.currency || "تومان"}
                    onChange={(e) => onChange({ validation: { ...q.validation, currency: e.target.value }, currency: e.target.value })}
                    className={`${inputCls} !py-1.5 !text-xs`}
                  >
                    <option value="تومان">تومان</option>
                    <option value="ریال">ریال</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* ─── حالت نمایش گزینه‌ها (فقط choice) ─── */}
          {meta.hasDisplayMode && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-extrabold text-navy dark:text-slate-200">حالت نمایش</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ display_mode: "buttons" })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-pill-md border-2 text-xs font-bold transition-all cursor-pointer ${
                    (q.display_mode || "buttons") === "buttons"
                      ? "border-teal bg-teal/10 dark:bg-teal-500/20 text-teal-text dark:text-teal"
                      : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink-subtle dark:text-slate-300 hover:border-teal/40"
                  }`}
                >
                  <LayoutGrid size={13} /> دکمه‌ای
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ display_mode: "dropdown" })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-pill-md border-2 text-xs font-bold transition-all cursor-pointer ${
                    q.display_mode === "dropdown"
                      ? "border-teal bg-teal/10 dark:bg-teal-500/20 text-teal-text dark:text-teal"
                      : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink-subtle dark:text-slate-300 hover:border-teal/40"
                  }`}
                >
                  <ChevronDown size={13} /> کشویی (دراپ‌داون)
                </button>
              </div>
              <span className="text-xs font-medium text-ink-subtle dark:text-slate-400">
                {(q.display_mode || "buttons") === "buttons" 
                  ? "گزینه‌ها به‌صورت دکمه‌های جداگانه نمایش داده می‌شوند"
                  : "گزینه‌ها در یک لیست کشویی نمایش داده می‌شوند"}
              </span>
            </div>
          )}

          {/* ─── تعداد انتخاب مجاز (فقط choice) ─── */}
          {meta.hasMaxSelections && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-orange/40 dark:border-amber-500/40 rounded-pill-md bg-[#FEF7EC]/40 dark:bg-amber-950/20 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-orange dark:text-amber-300">تعداد انتخاب مجاز</span>
                {(q.max_selections ?? 1) > 1 && (
                  <span className="text-xs font-bold text-teal bg-teal/10 border border-teal/30 rounded-pill-sm px-1.5 py-0.5">
                    چند انتخابی
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-ink-subtle dark:text-slate-400">
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
                <span className="min-w-[2rem] text-center text-sm font-black text-orange dark:text-amber-300 bg-white dark:bg-slate-800 border-2 border-orange/30 dark:border-amber-500/40 rounded-pill-sm px-2 py-1">
                  {faNum(q.max_selections ?? 1)}
                </span>
              </div>
              <span className="text-xs font-medium text-ink-subtle dark:text-slate-400">
                {(q.max_selections ?? 1) === 1
                  ? "کاربر فقط یک گزینه می‌تواند انتخاب کند (حالت رادیویی)"
                  : `کاربر حداکثر ${faNum(q.max_selections)} گزینه می‌تواند انتخاب کند`
                }
              </span>
            </div>
          )}

          {/* ─── گزینه صحیح (Correct Answer) ─── */}
          {isChoice && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-teal/40 dark:border-teal-500/40 rounded-pill-md bg-teal/5 dark:bg-teal-950/20 p-3">
              <span className="text-xs font-extrabold text-teal-text dark:text-teal flex items-center gap-1">
                <Target size={14} /> گزینه صحیح (برای نمره‌دهی)
              </span>
              <span className="text-xs font-medium text-ink-subtle dark:text-slate-400">
                اگه گزینه صحیح مشخص کنید، بعد از ارسال فرم به کاربر نمره نمایش داده می‌شود.
              </span>

              {/* choice با max_selections > 1 → چند انتخابی */}
              {q.type === "choice" && (q.max_selections ?? 1) > 1 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-subtle dark:text-slate-400">چند گزینه صحیح انتخاب کنید:</span>
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
                          className={`text-xs font-bold px-3 py-1.5 rounded-pill-md border-2 transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? "border-teal bg-teal text-white"
                              : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 hover:border-teal/40"
                          }`}
                        >
                          {isSelected && <Check size={11} />}
                          <span>{opt}</span>
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
                        className={`text-xs font-bold px-3 py-1.5 rounded-pill-md border-2 transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? "border-teal bg-teal text-white"
                            : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 hover:border-teal/40"
                        }`}
                      >
                        {isSelected && <Check size={11} />}
                        <span>{opt}</span>
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
            <div className="flex flex-col gap-2 border-2 border-dashed border-navy/20 dark:border-slate-700 rounded-pill-md bg-bg-lavender/40 dark:bg-slate-800/60 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm"></span>
                <span className="text-xs font-extrabold text-navy dark:text-slate-200">شرط نمایش</span>
                {conditions ? (
                  <span className="text-xs font-bold text-teal bg-teal/10 border border-teal/30 rounded-pill-sm px-2 py-0.5">
                    فعال
                  </span>
                ) : (
                  <span className="text-xs font-bold text-ink-subtle dark:text-slate-400 bg-ink/5 dark:bg-slate-700/60 border border-ink/10 dark:border-slate-700 rounded-pill-sm px-2 py-0.5">
                    بدون شرط
                  </span>
                )}
                {conditions && (
                  <button
                    onClick={toggleConditionGroup}
                    className="text-xs font-bold text-magenta-text hover:underline mr-auto cursor-pointer"
                  >
                    حذف شرط
                  </button>
                )}
              </div>

              {conditions ? (
                <div className="flex flex-col gap-2">
                  {/* سوییچ AND/OR */}
                  {conditions.conditions?.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">ترکیب:</span>
                      <select
                        value={conditions.group_operator}
                        onChange={(e) => updateConditionGroup({ group_operator: e.target.value })}
                        className={`${inputCls} !py-1 !text-xs !w-auto`}
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
                          <span className="text-xs font-black text-navy dark:text-slate-200 mt-3 shrink-0 px-1.5 py-0.5 bg-bg-lavender dark:bg-slate-700 rounded-pill-sm">
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
                    className="self-start text-xs font-extrabold text-teal hover:text-teal-text transition-colors"
                  >
                    + افزودن شرط
                  </button>
                </div>
              ) : (
                <button
                  onClick={toggleConditionGroup}
                  className="self-start text-xs font-extrabold text-teal hover:text-teal-text transition-colors
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
                  <span className="text-xs font-bold text-magenta-text bg-magenta/10 border border-magenta/30 rounded-pill-sm px-2 py-0.5">
                    {faNum(jumpActions.length)} اکشن
                  </span>
                )}
              </div>

              <span className="text-xs font-medium text-ink-subtle leading-5">
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
                      <span className="text-xs font-extrabold text-magenta-text shrink-0">
                        {jaLabel}:
                      </span>
                      <select
                        value={ja.action_type}
                        onChange={(e) => updateJumpAction(i, { action_type: e.target.value, target_id: null, target_url: null })}
                        className={`${inputCls} !py-1 !text-xs !w-auto flex-1`}
                      >
                        {JUMP_ACTION_TYPE_ORDER.map((t) => (
                          <option key={t} value={t}>
                            {JUMP_ACTION_TYPES[t].icon} {JUMP_ACTION_TYPES[t].label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeJumpAction(i)}
                        className="text-magenta-text hover:opacity-80 shrink-0 p-1"
                        title="حذف اکشن"
                      >
                        <X size={13} />
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
                        className="text-xs font-extrabold text-magenta-text hover:text-magenta transition-colors
                          border border-dashed border-magenta/30 rounded-pill-sm px-2 py-1 hover:border-magenta
                          disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <span>{opt.slice(0, 15)}</span>
                        {hasAction ? <Check size={10} /> : <ArrowRight size={10} />}
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
                        className="text-xs font-extrabold text-magenta-text hover:text-magenta transition-colors
                          border border-dashed border-magenta/30 rounded-pill-sm px-2 py-1 hover:border-magenta
                          disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <span>{opt}</span>
                        {hasAction ? <Check size={10} /> : <ArrowRight size={10} />}
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
      setQuestions((qs ?? []).map((q) => {
        let rows = q.validation?.rows || ["کیفیت خدمات", "سرعت پاسخگویی", "سهولت استفاده"];
        let columns = q.validation?.columns || ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"];
        let min_label = q.validation?.min_label || "اصلاً احتمال ندارد";
        let max_label = q.validation?.max_label || "بسیار زیاد";
        let allowed_file_types = q.validation?.allowed_file_types || "all";
        let max_file_size_mb = q.validation?.max_file_size_mb || 10;
        let amount = q.validation?.amount || 100000;
        let currency = q.validation?.currency || "تومان";

        return {
          ...q,
          localId: q.id,
          placeholder: q.placeholder ?? "",
          validation: q.validation ?? null,
          correct_answer: q.correct_answer ?? null,
          points: q.points ?? undefined,
          max_selections: q.max_selections ?? 1,
          rows,
          columns,
          min_label,
          max_label,
          allowed_file_types,
          max_file_size_mb,
          amount,
          currency,
          // مهاجرت: اگه conditions وجود نداشت از condition قدیمی بساز
          conditions: normalizeConditionGroup(q.conditions ?? (q.condition ? { group_operator: "AND", conditions: [q.condition] } : null)),
          jump_actions: q.jump_actions ?? [],
        };
      }));

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
        welcome_title: form.welcome_title ?? "سلام!",
        welcome_message: form.welcome_message ?? "ممنون که وقت گذاشتی؛ چند سوال کوتاه داریم.",
        exit_title: form.exit_title ?? "تمام شد!",
        exit_message: form.exit_message ?? "از اینکه جواب دادی خیلی ممنونیم. نظراتت برای ما طلاست!",
        published: !!form.published,
        form_type: form.form_type || "step_by_step",
        identifier_mapping: form.identifier_mapping ?? null,
        default_theme: form.default_theme || "light",
      };

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      const pQuestions = questions.map((q, i) => {
        const isRealUuid = typeof q.id === "string" && uuidRegex.test(q.id);
        const parsedPoints = (q.points !== "" && q.points !== null && q.points !== undefined && !isNaN(Number(q.points)))
          ? Number(q.points)
          : null;
        const parsedMaxSelections = (q.max_selections !== "" && q.max_selections !== null && q.max_selections !== undefined && !isNaN(Number(q.max_selections)))
          ? Math.max(1, Number(q.max_selections))
          : 1;

        let optionsToSave = [];
        let validationToSave = q.validation ? { ...q.validation } : {};

        if (q.type === "choice" || q.type === "dropdown" || q.type === "likert" || q.type === "ranking") {
          optionsToSave = (q.options || []).map((o) => (typeof o === "string" ? o.trim() : o));
        } else if (q.type === "picture_choice") {
          optionsToSave = (q.options || []).map((o, idx) => {
            if (typeof o === "object") {
              return { text: o.text || `طرح ${idx + 1}`, image: o.image || "" };
            }
            return { text: String(o), image: "" };
          });
        } else if (q.type === "yes_no") {
          optionsToSave = ["بله", "خیر"];
        } else if (q.type === "matrix") {
          optionsToSave = q.options || [];
          validationToSave.rows = q.rows || q.validation?.rows || ["کیفیت خدمات", "سرعت پاسخگویی", "سهولت استفاده"];
          validationToSave.columns = q.columns || q.validation?.columns || ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"];
        }

        if (q.type === "nps") {
          validationToSave.min_label = q.min_label || q.validation?.min_label || "اصلاً احتمال ندارد";
          validationToSave.max_label = q.max_label || q.validation?.max_label || "بسیار زیاد";
        }

        if (q.type === "file_upload") {
          validationToSave.allowed_file_types = q.allowed_file_types || q.validation?.allowed_file_types || "all";
          validationToSave.max_file_size_mb = q.max_file_size_mb || q.validation?.max_file_size_mb || 10;
        }

        if (q.type === "payment") {
          validationToSave.amount = q.amount || q.validation?.amount || 100000;
          validationToSave.currency = q.currency || q.validation?.currency || "تومان";
        }

        return {
          id: isRealUuid ? q.id : null,
          type: q.type,
          title: (q.title || "").trim(),
          description: q.description ?? "",
          placeholder: q.placeholder ?? "",
          validation: Object.keys(validationToSave).length > 0 ? validationToSave : null,
          required: (q.type === "statement" || q.type === "group") ? false : !!q.required,
          options: optionsToSave,
          position: i,
          conditions: q.conditions ?? null,
          jump_actions: Array.isArray(q.jump_actions) ? q.jump_actions : [],
          correct_answer: q.correct_answer ?? null,
          points: parsedPoints,
          display_mode: q.display_mode ?? null,
          max_selections: parsedMaxSelections,
        };
      });

      let freshQuestionsData = null;
      let rpcSuccess = false;

      try {
        const { data: freshQs, error: rpcErr } = await supabase.rpc("save_form", {
          p_form_id: id,
          p_form: pForm,
          p_questions: pQuestions,
        });

        if (rpcErr) {
          if (
            rpcErr.code === "23505" ||
            (rpcErr.message ?? "").includes("forms_slug_key") ||
            (rpcErr.message ?? "").includes("duplicate key")
          ) {
            setSlugError("این اسلاگ قبلاً استفاده شده.");
            throw rpcErr;
          }
          console.warn("RPC save_form returned error, attempting direct fallback:", rpcErr);
        } else {
          freshQuestionsData = freshQs;
          rpcSuccess = true;
        }
      } catch (err) {
        if ((err.message ?? "").includes("forms_slug_key") || (err.message ?? "").includes("duplicate key") || err.code === "23505") {
          setSlugError("این اسلاگ قبلاً استفاده شده.");
          throw err;
        }
        console.warn("RPC save_form call failed, attempting direct fallback:", err);
      }

      // به‌روزرسانی مستقیم جدول forms برای تضمین ذخیره default_theme و سایر فیلدها در هر شرایطی
      let { error: formUpdateErr } = await supabase
        .from("forms")
        .update(pForm)
        .eq("id", id);

      if (formUpdateErr && formUpdateErr.message?.includes("default_theme")) {
        const copyPForm = { ...pForm };
        delete copyPForm.default_theme;
        const retry = await supabase.from("forms").update(copyPForm).eq("id", id);
        formUpdateErr = retry.error;
      }

      if (formUpdateErr) {
        if (
          formUpdateErr.code === "23505" ||
          (formUpdateErr.message ?? "").includes("forms_slug_key") ||
          (formUpdateErr.message ?? "").includes("duplicate key")
        ) {
          setSlugError("این اسلاگ قبلاً استفاده شده.");
        }
        throw formUpdateErr;
      }

      // فالبک ذخیره سوالات در صورت عدم موفقیت RPC
      if (!rpcSuccess) {
        // حذف سوالات حذف شده
        const validIds = pQuestions.filter((q) => q.id).map((q) => q.id);
        if (validIds.length > 0) {
          const formattedIds = `(${validIds.join(",")})`;
          await supabase.from("questions").delete().eq("form_id", id).not("id", "in", formattedIds);
        } else {
          await supabase.from("questions").delete().eq("form_id", id);
        }

        // درج و به‌روزرسانی تک‌تک سوالات
        const savedList = [];
        for (let idx = 0; idx < pQuestions.length; idx++) {
          const q = pQuestions[idx];
          const qPayload = {
            form_id: id,
            type: q.type,
            title: q.title,
            description: q.description,
            required: q.required,
            placeholder: q.placeholder,
            validation: q.validation,
            options: q.options,
            position: idx,
            conditions: q.conditions,
            jump_actions: q.jump_actions,
            correct_answer: q.correct_answer,
            points: q.points,
            display_mode: q.display_mode,
            max_selections: q.max_selections,
          };

          if (q.id) {
            const { data: updatedQ } = await supabase
              .from("questions")
              .update(qPayload)
              .eq("id", q.id)
              .select()
              .single();
            savedList.push(updatedQ || { ...qPayload, id: q.id });
          } else {
            const { data: insertedQ, error: insertErr } = await supabase
              .from("questions")
              .insert(qPayload)
              .select()
              .single();
            if (insertErr) {
              console.error("Error inserting question fallback:", insertErr);
              savedList.push({ ...qPayload, id: null });
            } else {
              savedList.push(insertedQ);
            }
          }
        }
        freshQuestionsData = savedList;
      }

      logActivity("edit_form", "form", id, { title: form.title, slug: cleanSlug, questions: pQuestions.length });

      if (Array.isArray(freshQuestionsData) && freshQuestionsData.length > 0) {
        setQuestions((prev) =>
          prev.map((pq, idx) => {
            const saved =
              freshQuestionsData.find((fq) => fq.id === pq.id) ||
              freshQuestionsData[idx];
            if (saved && saved.id) {
              return {
                ...pq,
                ...saved,
                id: saved.id,
                localId: saved.id,
              };
            }
            return pq;
          })
        );
      }

      setForm((f) => ({ ...f, ...pForm }));
      setDirty(false);
      push("همه‌چیز ذخیره شد", "success");
    } catch (err) {
      console.error("Save form error:", err);
      push("ذخیره ناموفق بود: " + (err.message || "خطای ناشناخته"), "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FormBuilderSkeleton />;

  if (notFound) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <StickerCard theme="magenta">
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <span className="text-5xl">-</span>
            <h2 className="text-lg sm:text-xl font-black text-navy">این فرم پیدا نشد!</h2>
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
          <Button as={Link} to="/admin/forms" variant="ghost" size="sm"><ArrowRight size={14} className="ml-1" /> فرم‌ها</Button>
          <h1 className="text-xl sm:text-2xl font-black text-navy">فرم‌ساز</h1>
          {dirty && <Badge color="orange" rotate="rotate-[2deg]">• تغییرات</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {form.published && (
            <>
              <Button variant="white" size="sm" onClick={async () => {
                const ok = await copyToClipboard(publicUrl);
                push(ok ? "لینک کپی شد!" : publicUrl, ok ? "success" : "info");
              }}><Link2 size={14} /> کپی لینک</Button>
              <Button as="a" href={`/f/${form.slug}`} target="_blank" variant="white" size="sm">
                <Eye size={14} /> پیش‌نمایش
              </Button>
            </>
          )}
          <Button as={Link} to={`/admin/forms/${id}/responses`} variant="white" size="sm">
            <BarChart3 size={14} /> پاسخ‌ها
          </Button>
          <Button as={Link} to={`/admin/forms/${id}/share`} variant="white" size="sm">
            <Share2 size={14} /> اشتراک
          </Button>
        </div>
      </div>

      {/* تنظیمات فرم */}
      <div className="-rotate-[0.4deg]">
        <StickerCard theme="navy" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-base sm:text-lg font-black text-navy flex items-center gap-2">
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
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  {[
                    { key: "step_by_step", label: "مرحله به مرحله", desc: "هر سوال یک صفحه جداگانه" },
                    { key: "registration", label: "ثبت‌نامی", desc: "همه فیلدها یکجا در یک صفحه" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setFormField({ form_type: t.key })}
                      className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        form.form_type === t.key
                          ? "border-teal bg-teal/10 dark:bg-teal-500/15 shadow-sm"
                          : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-teal/40"
                      }`}
                    >
                      <span className="text-navy dark:text-white">{t.key === "step_by_step" ? <FileText size={24} /> : <AlignLeft size={24} />}</span>
                      <div className="text-right">
                        <span className={`text-sm font-black block ${form.form_type === t.key ? "text-teal-text dark:text-teal" : "text-navy dark:text-white"}`}>
                          {t.label}
                        </span>
                        <span className="text-xs text-ink/50 dark:text-slate-400">{t.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* ─── تم ظاهری پیش‌فرض فرم ─── */}
            <div className="border-t-2 border-dashed border-navy/15 dark:border-slate-700/60 pt-4">
              <Field
                label={<><Sun size={14} className="text-teal" /> تم ظاهری پیش‌فرض فرم (برای پاسخ‌دهندگان)</>}
                hint="این تم در لینک عمومی و کد امبد فرم به عنوان تم اولیه اعمال خواهد شد."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { key: "light", label: "تم روشن", icon: Sun, desc: "سفید و شاداب رکاد" },
                    { key: "dark", label: "تم دارک", icon: Moon, desc: "تیره اوبسیدین نئونی" },
                    { key: "system", label: "هماهنگ با سیستم", icon: Monitor, desc: "تشخیص خودکار دستگاه" },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = (form.default_theme || "light") === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setFormField({ default_theme: t.key })}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer text-center ${
                          isSelected
                            ? "border-teal bg-teal/15 text-teal shadow-xs font-black scale-[1.02]"
                            : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-ink/70 dark:text-slate-300 hover:border-teal/40"
                        }`}
                      >
                        <Icon size={20} className={isSelected ? "text-teal" : "text-ink/60 dark:text-slate-400"} />
                        <span className="text-xs font-black mt-1.5">{t.label}</span>
                        <span className="text-[10px] opacity-70 mt-0.5">{t.desc}</span>
                      </button>
                    );
                  })}
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
      <div className="flex flex-col gap-4 pb-20 lg:pb-6">
        {/* افزودن سوال جدید — دسته‌بندی شده و شیک */}
        <div className="rotate-[0.3deg]">
          <StickerCard theme="orange" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <span className="text-sm font-black text-orange flex items-center gap-2">
                افزودن سوال جدید — نوع سوال را انتخاب کنید:
              </span>

              <div className="flex flex-col gap-3.5">
                {QUESTION_CATEGORIES.map((cat) => (
                  <div key={cat.key} className="flex flex-col gap-1.5">
                    <span className="text-xs font-black text-navy dark:text-slate-200">
                      {cat.title}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {cat.types.map((key) => {
                        const t = QUESTION_TYPES[key];
                        if (!t) return null;
                        const Icon = QUESTION_TYPE_ICONS[key];
                        return (
                          <button
                            key={key}
                            onClick={() => addQuestion(key)}
                            title={t.hint}
                            className="flex items-center justify-start gap-2 bg-white dark:bg-slate-800 border-2 border-orange/40 hover:border-orange rounded-pill-md px-2.5 py-2 text-xs font-extrabold text-ink dark:text-slate-100 hover:-translate-y-0.5 hover:shadow-xs transition-all cursor-pointer w-full text-right"
                          >
                            {Icon && <Icon size={14} className="text-orange shrink-0" />}
                            <span className="truncate">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </StickerCard>
        </div>

        <div className="flex items-center justify-between mt-2">
          <h2 className="text-base sm:text-lg font-black text-navy">
            سوال‌های فرم ({faNum(questions.length)})
          </h2>
        </div>

        {questions.length === 0 ? (
          <div className="p-6 text-center bg-white/70 border-2 border-dashed border-ink/15 rounded-2xl text-xs sm:text-sm font-bold text-ink-subtle">
            هنوز سوالی به این فرم اضافه نشده است. با انتخاب یکی از انواع بالا، اولین سوال در این بخش قرار می‌گیرد.
          </div>
        ) : (
          questions.map((q, i) => (
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
          ))
        )}

        {/* دکمه ذخیره انتهای فرم مخصوص موبایل */}
        <div className="lg:hidden mt-3">
          <Button
            variant="teal"
            size="lg"
            onClick={save}
            disabled={saving || !dirty}
            className="w-full justify-center text-base font-black shadow-md py-3"
          >
            {saving ? "در حال ذخیره..." : "ذخیره‌ی فرم"}
          </Button>
        </div>
      </div>
      </div>

      {/* ─── ستون پیش‌نمایش و دکمه ذخیره دسکتاپ (سمت چپ) ─── */}
      <div className="hidden lg:flex flex-col gap-3.5 w-[330px] shrink-0 sticky top-20 self-start">
        <div className="rounded-2xl border-2 border-navy/20 bg-white overflow-hidden shadow-lg">
          <FormPreview form={form} questions={questions} />
        </div>
        <Button
          variant="teal"
          size="lg"
          onClick={save}
          disabled={saving || !dirty}
          className="w-full justify-center shadow-md text-base font-black py-3.5 hover:scale-[1.01] transition-all"
        >
          {saving ? "در حال ذخیره..." : "ذخیره‌ی فرم"}
        </Button>
      </div>
    </div>
  );
}
