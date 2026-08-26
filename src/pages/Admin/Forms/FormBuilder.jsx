import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import StickerCard from "../../../components/ui/StickerCard";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import { useToast } from "../../../components/ui/Toast";
import { QUESTION_TYPES, QUESTION_TYPE_ORDER, makeQuestion, CONDITION_OPERATORS, CONDITION_OPERATOR_ORDER } from "../../../lib/questionTypes";
import LogicEditor from "../../../components/logic/LogicEditor";
import LogicDebug from "../../../components/logic/LogicDebug";
import { faNum, slugify, copyToClipboard } from "../../../lib/utils";
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

// ─── کارت ویرایش یک سوال ───
function QuestionEditor({ q, index, total, allQuestions, onChange, onMove, onDelete }) {
  const meta = QUESTION_TYPES[q.type];
  const rots = index % 2 ? "rotate-[0.4deg]" : "-rotate-[0.4deg]";

  function setOpt(i, val) {
    const opts = [...q.options];
    opts[i] = val;
    onChange({ options: opts });
  }

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
              {meta.icon} {meta.label}
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
                🗑
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

          {/* گزینه‌ها فقط برای چندگزینه‌ای */}
          {meta.hasOptions && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-orange/50 rounded-pill-md bg-[#FEF7EC]/60 p-3">
              <span className="text-xs font-extrabold text-orange">
                گزینه‌ها ({faNum(q.options.length)} — بین ۲ تا ۶)
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
                disabled={q.options.length >= 6}
                className="self-start text-xs font-extrabold text-orange hover:text-orange-alt disabled:opacity-40 transition-opacity"
              >
                + افزودن گزینه
              </button>
            </div>
          )}

          {/* ─── شرطی‌سازی (Conditional Logic) ─── */}
          {index > 0 && (
            <div className="flex flex-col gap-2 border-2 border-dashed border-navy/20 rounded-pill-md bg-bg-lavender/40 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-navy">
                  🔀 شرط نمایش (اختیاری)
                </span>
                {q.condition && (
                  <button
                    onClick={() => onChange({ condition: null })}
                    className="text-[0.65rem] font-bold text-magenta-text hover:underline mr-auto"
                  >
                    حذف شرط
                  </button>
                )}
              </div>

              {/* دکمه افزودن شرط */}
              {!q.condition && (
                <button
                  onClick={() =>
                    onChange({
                      condition: {
                        source_question_id: allQuestions[index - 1]?.id ?? null,
                        operator: "equals",
                        value: "",
                      },
                    })
                  }
                  className="self-start text-[0.7rem] font-extrabold text-navy hover:text-teal-text transition-colors"
                >
                  + افزودن شرط
                </button>
              )}

              {/* فرم تنظیم شرط */}
              {q.condition && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.65rem] font-bold text-ink-subtle">سوال مرجع:</span>
                    <select
                      value={q.condition.source_question_id ?? ""}
                      onChange={(e) =>
                        onChange({
                          condition: { ...q.condition, source_question_id: e.target.value || null },
                        })
                      }
                      className={`${inputCls} !py-1.5 !text-xs`}
                    >
                      {allQuestions
                        .filter((_, j) => j < index)
                        .map((sq) => (
                          <option key={sq.id} value={sq.id}>
                            {faNum(allQuestions.indexOf(sq) + 1)}. {sq.title?.slice(0, 40) || "—"}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[0.65rem] font-bold text-ink-subtle">شرط:</span>
                    <select
                      value={q.condition.operator}
                      onChange={(e) =>
                        onChange({
                          condition: { ...q.condition, operator: e.target.value },
                        })
                      }
                      className={`${inputCls} !py-1.5 !text-xs`}
                    >
                      {CONDITION_OPERATOR_ORDER.map((op) => (
                        <option key={op} value={op}>
                          {CONDITION_OPERATORS[op].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {CONDITION_OPERATORS[q.condition.operator]?.needsValue && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.65rem] font-bold text-ink-subtle">مقدار:</span>
                      <input
                        value={q.condition.value ?? ""}
                        onChange={(e) =>
                          onChange({
                            condition: { ...q.condition, value: e.target.value },
                          })
                        }
                        placeholder="مقدار مقایسه..."
                        className={`${inputCls} !py-1.5 !text-xs`}
                      />
                    </div>
                  )}
                </div>
              )}
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

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState(null);
  const [logicRules, setLogicRules] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: f, error } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
      if (error || !f) {
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
      setQuestions((qs ?? []).map((q) => ({ ...q, localId: q.id })));

      // بارگذاری Ruleهای منطقی
      const { data: lrs } = await supabase
        .from("logic_rules")
        .select("*")
        .eq("form_id", id)
        .order("priority");
      setLogicRules(
        (lrs ?? []).map((r) => ({
          ...r,
          conditions: r.conditions_json ?? [],
          action: { type: r.action_type, target_id: r.action_target_id },
        }))
      );

      setLoading(false);
    }
    load();
  }, [id]);

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

  const updateLogicRules = useCallback((newRules) => {
    setLogicRules(newRules);
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
      push("سوال چندگزینه‌ای باید ۲ تا ۶ گزینه‌ی غیرخالی داشته باشد", "error");
      return;
    }

    setSaving(true);
    setSlugError(null);
    try {
      // ذخیره‌ی اتمیک فرم و سوالات در یک تراکنش سمت سرور
      const pForm = {
        title: form.title.trim(),
        description: form.description ?? "",
        slug: cleanSlug,
        welcome_title: form.welcome_title,
        welcome_message: form.welcome_message,
        exit_title: form.exit_title,
        exit_message: form.exit_message,
        published: form.published,
      };
      const pQuestions = questions.map((q, i) => ({
        id: q.id ?? null,
        type: q.type,
        title: q.title.trim(),
        description: q.description ?? "",
        required: !!q.required,
        options: q.type === "choice" ? q.options.map((o) => o.trim()) : [],
        position: i,
        condition: q.condition ?? null,
      }));

      const { data: freshQs, error } = await supabase.rpc("save_form", {
        p_form_id: id,
        p_form: pForm,
        p_questions: pQuestions,
      });

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
        setQuestions(freshQs.map((q) => ({ ...q, localId: q.id })));
      }

      // ذخیره Ruleهای منطقی
      const pRules = logicRules.map((r) => ({
        id: r.id,
        name: r.name || '',
        enabled: !!r.enabled,
        priority: r.priority ?? 0,
        source_question_id: r.source_question_id ?? null,
        group_operator: r.group_operator || 'AND',
        conditions_json: r.conditions || [],
        action_type: r.action?.type || 'SHOW_QUESTION',
        action_target_id: r.action?.target_id ?? null,
      }));
      const { error: lrError } = await supabase.rpc('save_logic_rules', {
        p_form_id: id,
        p_rules: pRules,
      });
      if (lrError) throw lrError;

      setForm((f) => ({ ...f, slug: cleanSlug }));
      setDirty(false);
      push("همه‌چیز ذخیره شد ✅");
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
            <span className="text-5xl">🤷</span>
            <h2 className="text-xl font-black text-navy">این فرم پیدا نشد!</h2>
            <Button as={Link} to="/admin/forms" variant="navy">برگشت به لیست فرم‌ها</Button>
          </div>
        </StickerCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 max-w-4xl">
      <SEO
        title={`ویرایش فرم: ${form.title}`}
        description={form.description || `فرم‌ساز — ${form.title}`}
        url={`/admin/forms/${id}`}
        noIndex
      />
      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button as={Link} to="/admin/forms" variant="ghost" size="sm">↩ فرم‌ها</Button>
          <h1 className="text-2xl font-black text-navy">فرم‌ساز</h1>
          {dirty && <Badge color="orange" rotate="rotate-[2deg]">• تغییرات ذخیره‌نشده</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {form.published && (
            <>
              <Button variant="white" size="sm" onClick={async () => {
                const ok = await copyToClipboard(publicUrl);
                push(ok ? "لینک کپی شد!" : publicUrl, ok ? "success" : "info");
              }}>🔗 کپی لینک</Button>
              <Button as="a" href={`/f/${form.slug}`} target="_blank" variant="white" size="sm">
                👁 پیش‌نمایش
              </Button>
            </>
          )}
          <Button as={Link} to={`/admin/forms/${id}/responses`} variant="white" size="sm">
            📊 پاسخ‌ها
          </Button>
          <Button variant="teal" onClick={save} disabled={saving || !dirty}>
            {saving ? "در حال ذخیره..." : "💾 ذخیره"}
          </Button>
        </div>
      </div>

      {/* تنظیمات فرم */}
      <div className="-rotate-[0.4deg]">
        <StickerCard theme="navy" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-lg font-black text-navy flex items-center gap-2">
              ⚙️ تنظیمات فرم
              <label className="mr-auto flex items-center gap-2 text-sm font-extrabold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setFormField({ published: e.target.checked })}
                  className="accent-teal w-5 h-5"
                />
                {form.published ? "منتشرشده ✅" : "پیش‌نویس"}
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

            <div className="border-t-2 border-dashed border-navy/15 pt-4 grid sm:grid-cols-2 gap-4">
              <Field label="👋 عنوان پیام ورود">
                <input value={form.welcome_title} onChange={(e) => setFormField({ welcome_title: e.target.value })} className={inputCls} />
              </Field>
              <Field label="🎉 عنوان پیام خروج">
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
      <div className="flex flex-col gap-5">
        <h2 className="text-lg font-black text-navy">
          🧩 سوال‌ها ({faNum(questions.length)})
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
              <span className="text-sm font-black text-orange">➕ افزودن سوال جدید — نوعش را انتخاب کن:</span>
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
                      <span className="text-base">{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </StickerCard>
        </div>

        {/* ─── قوانین منطقی ─── */}
        <div className="rotate-[-0.3deg]">
          <StickerCard theme="teal" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
            <div className="p-4 sm:p-5">
              <LogicEditor
                rules={logicRules}
                questions={questions}
                onChange={updateLogicRules}
              />
            </div>
          </StickerCard>
        </div>

        {/* پیش‌نمایش مسیر فرم */}
        {logicRules.length > 0 && (
          <LogicDebug questions={questions} rules={logicRules} />
        )}

        {/* نوار ذخیره پایین */}
        <div className="sticky bottom-4 flex justify-end">
          <Button variant="teal" size="lg" onClick={save} disabled={saving || !dirty} rotate="-rotate-[1deg]">
            {saving ? "در حال ذخیره..." : "💾 ذخیره‌ی همه‌ی تغییرات"}
          </Button>
        </div>
      </div>
    </div>
  );
}
