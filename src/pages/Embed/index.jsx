import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import { normalizeAnswerValue, validateAnswer } from "../../lib/validators";
import { calculateFlow, evaluateNextStep } from "../../lib/logic/flowEngine";
import { QUESTION_TYPES } from "../../lib/questionTypes";
import { faNum, faDuration, parseUserAgent } from "../../lib/utils";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import "../../index.css";

// ─── پیام‌های postMessage به سایت میزبان ───
function postToParent(type, data = {}) {
  try {
    window.parent.postMessage({ type, formId: data.formId, ...data }, "*");
  } catch { /* ignore */ }
}

// ─── گزارش ارتفاع به سایت میزبان ───
function useAutoResize() {
  useEffect(() => {
    function reportHeight() {
      const height = document.body.scrollHeight;
      postToParent("pcode:resize", { height });
    }
    reportHeight();
    const observer = new ResizeObserver(reportHeight);
    observer.observe(document.body);
    window.addEventListener("resize", reportHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", reportHeight);
    };
  }, []);
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

// ─── اسپینر ───
function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="w-8 h-8 border-[3px] border-teal/20 border-t-teal rounded-full animate-spin" />
      <p className="text-sm text-ink/50 font-semibold">{label}</p>
    </div>
  );
}

// ─── نوار پیشرفت ───
function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-ink/10 rounded-full overflow-hidden">
      <div className="h-full bg-teal rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── ورودی متنی ───
function TextInput({ type, value, onChange, autoFocus = true, onEnter, placeholder: customPh }) {
  const defaultPh = {
    short_text: "جوابت رو اینجا بنویس...",
    email: "name@example.com",
    phone_ir: "09123456789",
    number: "مثلاً 42",
    long_text: "بنویس...",
  };
  const ph = (customPh && customPh.trim()) || defaultPh[type] || "";
  const isLtr = type === "email" || type === "phone_ir";

  const shared = "w-full border-2 border-ink/20 rounded-pill-md px-4 py-3.5 text-base font-semibold text-ink placeholder:text-ink/40 focus:outline-none focus:ring-4 focus:ring-teal/15 focus:border-teal transition-all";

  if (type === "long_text") {
    return (
      <textarea
        dir="rtl"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        autoFocus={autoFocus}
        className={`${shared} resize-y min-h-[6rem] leading-8`}
        placeholder={ph}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && onEnter) { e.preventDefault(); onEnter(); } }}
      />
    );
  }

  return (
    <input
      type="text"
      inputMode={type === "number" ? "numeric" : type === "phone_ir" ? "tel" : type === "email" ? "email" : "text"}
      dir={isLtr ? "ltr" : "rtl"}
      value={value ?? ""}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } }}
      className={`${shared} ${isLtr ? "text-left" : "text-right"}`}
      placeholder={ph}
    />
  );
}

// ─── گزینه‌ها ───
function ChoiceOptions({ options = [], value, onChange, onEnter }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => { onChange(opt); setTimeout(onEnter, 300); }}
          className={`flex items-center gap-3 text-right w-full border-2 rounded-pill-md px-4 py-3 transition-all cursor-pointer ${
            value === opt
              ? "border-teal bg-teal/10 shadow-sm rotate-[-0.5deg]"
              : "border-ink/20 bg-white hover:border-teal"
          }`}
        >
          <span className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full border-2 text-sm font-bold ${
            value === opt ? "border-teal bg-teal text-white" : "border-ink/25 text-navy"
          }`}>{faNum(i + 1)}</span>
          <span className="font-semibold text-ink">{opt}</span>
        </button>
      ))}
    </div>
  );
}

// ─── بله/خیر ───
function YesNoOptions({ value, onChange, onEnter }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[{ label: "بله", color: "teal" }, { label: "خیر", color: "magenta" }].map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => { onChange(o.label); setTimeout(onEnter, 300); }}
          className={`flex items-center justify-center gap-2 py-4 rounded-pill-md border-2 text-lg font-black transition-all cursor-pointer ${
            value === o.label
              ? o.color === "teal"
                ? "border-teal bg-teal/10 text-teal-text"
                : "border-magenta bg-magenta/10 text-magenta-text"
              : "border-ink/20 bg-white text-ink hover:border-ink/40"
          }`}
        >{o.label}</button>
      ))}
    </div>
  );
}

// ─── ستاره ───
function RatingStars({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const current = hover ?? Number(value ?? 0);
  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-btn text-4xl cursor-pointer ${n <= current ? "" : "opacity-30 grayscale"}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(n)}
        >⭐</button>
      ))}
    </div>
  );
}

// ─── بج برندینگ ───
function BrandingBadge({ formId }) {
  return (
    <div className="text-center py-3 border-t border-ink/10 mt-4">
      <span className="inline-flex items-baseline gap-1 text-xs text-ink/30">
        ساخته‌شده با
        <span className="font-extrabold text-navy">پرس <span className="text-teal">کاد</span></span>
      </span>
    </div>
  );
}

// ─── فرم ثبت‌نامی تک‌صفحه‌ای embed ───
function EmbedRegistrationForm({ schema, questions, formId }) {
  const [answers, setAnswers] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmUnfilled, setConfirmUnfilled] = useState([]);

  function setAnswer(qId, val, q) {
    setAnswers((p) => ({ ...p, [qId]: val }));
    setError(null);
    if (touched[qId]) {
      const err = validateAnswer(q, val);
      setFieldErrors((p) => ({ ...p, [qId]: err }));
    }
  }

  function handleBlur(qId, val, q) {
    setTouched((p) => ({ ...p, [qId]: true }));
    const err = validateAnswer(q, val);
    setFieldErrors((p) => ({ ...p, [qId]: err }));
  }

  function handleShowConfirm(e) {
    e.preventDefault();
    if (submitting) return;
    // ولیدیشن فیلدها
    const errors = {};
    let firstErr = null;
    for (const q of questions) {
      const err = validateAnswer(q, answers[q.id]);
      if (err) { errors[q.id] = err; if (!firstErr) firstErr = q; }
    }
    setFieldErrors(errors);
    setTouched(Object.fromEntries(questions.map((q) => [q.id, true])));
    if (firstErr) { setError(`فیلد «${firstErr.title}» خطا دارد.`); return; }

    // جمع‌آوری فیلدهای خالی اجباری
    const unfilled = [];
    for (const q of questions) {
      if (q.required) {
        const v = answers[q.id];
        const isEmpty = v === null || v === undefined || (typeof v === "string" && v.trim() === "");
        if (isEmpty) {
          unfilled.push({ id: q.id, title: q.title, typeLabel: QUESTION_TYPES[q.type]?.label || q.type });
        }
      }
    }
    setConfirmUnfilled(unfilled);
    setShowConfirm(true);
  }

  async function doSubmit() {
    setShowConfirm(false);
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ua = parseUserAgent();
      const nowIso = new Date().toISOString();
      const meta = {
        device: ua.device, browser: ua.browser, os: ua.os,
        userAgent: navigator.userAgent, referrerUrl: document.referrer || null,
        startedAt: nowIso, completedAt: nowIso,
      };
      const answersObj = {};
      for (const q of questions) {
        const v = answers[q.id];
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          answersObj[q.id] = normalizeAnswerValue(q, v);
        }
      }
      const { data, error: rpcError } = await supabase.rpc("submit_public_response", {
        p_form_public_id: formId, p_answers: answersObj, p_meta: meta,
      });
      if (rpcError) throw rpcError;
      postToParent("pcode:submitted", { formId, responseId: data?.responseId });
      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError("ثبت ناموفق بود؛ دوباره تلاش کن.");
      postToParent("pcode:error", { formId, error: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-transparent" dir="rtl">
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
          className="bg-white border-2 border-navy rounded-[2rem] p-8 sm:p-10 text-center max-w-lg shadow-[6px_6px_0_0_rgba(33,41,90,0.15)]">
          <span className="text-5xl mb-3 block">🎉</span>
          <h1 className="text-2xl font-black text-navy mb-2">{schema.exit_title || "ثبت‌نام با موفقیت انجام شد!"}</h1>
          <p className="text-ink-soft leading-7">{schema.exit_message || "ممنون از ثبت‌نام شما."}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent" dir="rtl">
      <div className="w-full max-w-xl mx-auto px-4 py-3 text-center">
        <span className="inline-flex items-baseline gap-1 text-lg font-black select-none">
          <span className="text-navy">پرس</span>
          <span className="text-teal-text">کاد</span>
        </span>
        <span className="block text-xs font-bold text-ink/30 mt-0.5">{schema.title}</span>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-xl -rotate-[0.3deg]">
          <div className="bg-white border-2 border-navy rounded-[2rem] p-6 sm:p-8 shadow-[6px_6px_0_0_rgba(33,41,90,0.15)]">
            <form onSubmit={handleShowConfirm} className="flex flex-col gap-5">
              <div className="text-center mb-1">
                <h1 className="text-2xl font-black text-navy mb-1">{schema.title}</h1>
                {schema.description && <p className="text-sm text-ink-subtle">{schema.description}</p>}
                <span className="text-xs font-bold text-ink/40 bg-bg-neutral rounded-pill-sm px-2 py-0.5 mt-2 inline-block">{faNum(questions.length)} فیلد</span>
              </div>

              {questions.map((q, i) => {
                const val = answers[q.id] ?? "";
                const fieldErr = touched[q.id] ? fieldErrors[q.id] : null;
                return (
                  <div key={q.id} className="flex flex-col gap-2">
                    <label className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-navy">{q.title}</span>
                      {q.required && <span className="text-magenta-text text-xs">*</span>}
                    </label>
                    {q.description && <span className="text-xs font-medium text-ink-subtle">{q.description}</span>}

                    {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "telegram_id") && (
                      <input type={q.type === "email" ? "email" : "text"} inputMode={q.type === "phone_ir" ? "tel" : "text"}
                        dir={q.type === "email" || q.type === "phone_ir" ? "ltr" : "rtl"}
                        value={val}
                        onChange={(e) => setAnswer(q.id, e.target.value, q)}
                        onBlur={(e) => handleBlur(q.id, e.target.value, q)}
                        placeholder={(q.placeholder && q.placeholder.trim()) || (q.type === "email" ? "name@example.com" : q.type === "phone_ir" ? "09123456789" : q.type === "telegram_id" ? "@username" : "پاسخ خود را بنویسید...")}
                        className={`w-full border-2 border-ink/20 rounded-pill-md px-4 py-3 text-base font-semibold text-ink placeholder:text-ink/40 focus:outline-none focus:ring-4 focus:ring-teal/15 focus:border-teal transition-all ${fieldErr ? "border-magenta" : ""}`}
                      />
                    )}

                    {q.type === "long_text" && (
                      <textarea dir="rtl" rows={3} value={val}
                        onChange={(e) => setAnswer(q.id, e.target.value, q)}
                        onBlur={(e) => handleBlur(q.id, e.target.value, q)}
                        placeholder={q.placeholder?.trim() || "بنویس..."}
                        className={`w-full border-2 border-ink/20 rounded-pill-md px-4 py-3 text-base font-semibold text-ink placeholder:text-ink/40 focus:outline-none focus:ring-4 focus:ring-teal/15 focus:border-teal transition-all resize-y min-h-[6rem] leading-8 ${fieldErr ? "border-magenta" : ""}`}
                      />
                    )}

                    {q.type === "number" && (
                      <input type="text" inputMode="numeric" dir="rtl" value={val}
                        onChange={(e) => setAnswer(q.id, e.target.value, q)}
                        onBlur={(e) => handleBlur(q.id, e.target.value, q)}
                        placeholder={q.placeholder?.trim() || "مثلاً 42"}
                        className={`w-full border-2 border-ink/20 rounded-pill-md px-4 py-3 text-base font-semibold text-ink placeholder:text-ink/40 focus:outline-none focus:ring-4 focus:ring-teal/15 focus:border-teal transition-all ${fieldErr ? "border-magenta" : ""}`}
                      />
                    )}

                    {q.type === "choice" && (
                      <div className="relative">
                        <select value={val}
                          onChange={(e) => { setAnswer(q.id, e.target.value, q); handleBlur(q.id, e.target.value, q); }}
                          className={`w-full border-2 border-ink/20 rounded-pill-md px-4 py-3 text-base font-semibold text-ink focus:outline-none focus:ring-4 focus:ring-teal/15 focus:border-teal transition-all appearance-none cursor-pointer ${fieldErr ? "border-magenta" : ""}`}>
                          <option value="">— انتخاب کنید —</option>
                          {(q.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">▾</span>
                      </div>
                    )}

                    {q.type === "yes_no" && (
                      <div className="grid grid-cols-2 gap-3">
                        {["بله", "خیر"].map((opt) => (
                          <button key={opt} type="button"
                            onClick={() => { setAnswer(q.id, opt, q); handleBlur(q.id, opt, q); }}
                            className={`flex items-center justify-center gap-2 py-3 rounded-pill-md border-2 text-lg font-black transition-all cursor-pointer ${
                              val === opt ? (opt === "بله" ? "border-teal bg-teal/10 text-teal-text" : "border-magenta bg-magenta/10 text-magenta-text") : "border-ink/20 bg-white text-ink hover:border-ink/40"
                            }`}>{opt}</button>
                        ))}
                      </div>
                    )}

                    {q.type === "rating" && (
                      <div className="flex justify-center gap-2" dir="ltr">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button"
                            className={`star-btn text-4xl cursor-pointer ${Number(val) >= n ? "" : "opacity-30 grayscale"}`}
                            onClick={() => { setAnswer(q.id, String(n), q); handleBlur(q.id, String(n), q); }}>⭐</button>
                        ))}
                      </div>
                    )}

                    {fieldErr && (
                      <div className="flex items-center gap-2 bg-magenta/10 border-2 border-magenta rounded-pill-md px-3 py-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-magenta-text shrink-0">
                          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        <span className="text-sm font-bold text-magenta-text">{fieldErr}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {error && (
                <div className="bg-magenta/10 border-2 border-magenta rounded-pill-md px-4 py-2 text-sm font-bold text-magenta-text">{error}</div>
              )}

              <button type="submit" disabled={submitting}
                className="bg-teal text-white px-8 py-3 rounded-pill-md font-extrabold hover:bg-teal-text transition-colors disabled:opacity-50 shadow-[3px_3px_0_0_rgba(0,0,0,0.2)]">
                {submitting ? "در حال ثبت..." : "ارسال ✨"}
              </button>
            </form>
            {schema.showBranding && <BrandingBadge formId={formId} />}
          </div>
        </div>
      </main>

      {/* باکس تایید قبل از ارسال */}
      <ConfirmDialog
        open={showConfirm}
        onConfirm={doSubmit}
        onCancel={() => setShowConfirm(false)}
        unfilledFields={confirmUnfilled}
        totalRequired={questions.filter((q) => q.required).length}
        filledCount={questions.filter((q) => q.required && answers[q.id] != null && String(answers[q.id]).trim() !== "").length}
      />
    </div>
  );
}

// ─── صفحه اصلی Embed ───
export default function EmbedForm() {
  const { formId } = useParams();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(-1);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState({});
  const [times, setTimes] = useState({});
  const [startedAt, setStartedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [requiredError, setRequiredError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmUnfilled, setConfirmUnfilled] = useState([]);
  const stepEnteredAt = useRef(Date.now());

  useAutoResize();

  useEffect(() => {
    async function load() {
      try {
        const { data, error: rpcError } = await supabase.rpc("get_public_form", {
          p_form_id: formId,
        });
        if (rpcError) throw rpcError;
        if (!data) {
          setError("فرم یافت نشد یا منتشر نشده.");
          setLoading(false);
          return;
        }
        setSchema(data);
        postToParent("pcode:view", { formId });
      } catch (err) {
        console.error("Embed load error:", err);
        setError("خطا در بارگذاری فرم.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [formId]);

  const questions = useMemo(() =>
    (schema?.questions ?? []).map((q) => ({
      ...q,
      conditions: normalizeConditionGroup(q.conditions ?? null),
    })),
    [schema]
  );
  const logicRules = useMemo(() => {
    return (schema?.logicRules ?? []).map((r) => ({
      ...r,
      conditions: r.conditions_json ?? [],
      action: { type: r.action_type, target_id: r.action_target_id },
    }));
  }, [schema]);

  const total = questions.length;

  const flow = useMemo(
    () => calculateFlow(questions, logicRules, answers),
    [questions, logicRules, answers]
  );
  const visibleQuestions = flow.visibleQuestions;
  const visibleIds = flow.visibleIds;
  const visibleTotal = visibleQuestions.length;
  const formEnded = flow.ended;

  const currentQuestion = questions[step];

  const accrueTime = useCallback(() => {
    if (!currentQuestion) return;
    const spent = (Date.now() - stepEnteredAt.current) / 1000;
    setTimes((t) => ({ ...t, [currentQuestion.id]: (t[currentQuestion.id] ?? 0) + spent }));
  }, [currentQuestion]);

  const setAnswer = useCallback((val) => {
    if (!currentQuestion) return;
    setAnswers((a) => ({ ...a, [currentQuestion.id]: val }));
    setRequiredError(null);
    // اعتبارسنجی آنی
    setTouchedFields((t) => ({ ...t, [currentQuestion.id]: true }));
    const err = validateAnswer(currentQuestion, val);
    setFieldErrors((e) => ({ ...e, [currentQuestion.id]: err }));
  }, [currentQuestion]);

  useEffect(() => { stepEnteredAt.current = Date.now(); }, [step]);

  const jumpQueueRef = useRef([]);

  const findNextVisibleStep = useCallback((fromStep) => {
    for (let i = fromStep + 1; i < total; i++) {
      if (visibleIds.has(questions[i]?.id)) return i;
    }
    return total;
  }, [questions, total, visibleIds]);

  const findPrevVisibleStep = useCallback((fromStep) => {
    for (let i = fromStep - 1; i >= 0; i--) {
      if (visibleIds.has(questions[i]?.id)) return i;
    }
    return -1;
  }, [questions, visibleIds]);

  const validateCurrent = useCallback(() => {
    if (!currentQuestion) return { valid: true };
    const err = validateAnswer(currentQuestion, answers[currentQuestion.id]);
    if (err) return { valid: false, error: err };
    return { valid: true };
  }, [currentQuestion, answers]);

  const goNext = useCallback(() => {
    if (step === -1) {
      setStartedAt((prev) => prev ?? Date.now());
      setDir(1);
      postToParent("pcode:started", { formId });
      const first = findNextVisibleStep(-1);
      setStep(first);
      setRequiredError(null);
      return;
    }
    const result = validateCurrent();
    if (!result.valid) {
      setRequiredError(result.error);
      return;
    }
    setRequiredError(null);
    accrueTime();
    setDir(1);

    if (currentQuestion) {
      const answer = answers[currentQuestion.id];
      const jumpResult = evaluateNextStep(
        currentQuestion, answer, questions, visibleQuestions, jumpQueueRef.current
      );

      if (jumpResult.type === "end") { setStep(total); return; }
      if (jumpResult.type === "redirect" && jumpResult.url) {
        window.open(jumpResult.url, "_blank");
        setStep(total);
        return;
      }
      if (jumpResult.type === "jump" && jumpResult.targetId) {
        const targetIdx = questions.findIndex((q) => q.id === jumpResult.targetId);
        if (targetIdx >= 0) { setStep(targetIdx); return; }
      }
    }

    setStep((s) => findNextVisibleStep(s));
  }, [step, accrueTime, validateCurrent, findNextVisibleStep, currentQuestion, answers, questions, visibleQuestions, total, formId]);

  const goBack = useCallback(() => {
    if (step <= -1) return;
    accrueTime();
    setDir(-1);
    setStep((s) => findPrevVisibleStep(s));
  }, [step, accrueTime, findPrevVisibleStep]);

  const openConfirm = useCallback(() => {
    const unfilled = [];
    for (const q of visibleQuestions) {
      if (q.required) {
        const v = answers[q.id];
        const isEmpty = v === null || v === undefined || (typeof v === "string" && v.trim() === "");
        if (isEmpty) {
          unfilled.push({ id: q.id, title: q.title, typeLabel: QUESTION_TYPES[q.type]?.label || q.type });
        }
      }
    }
    setConfirmUnfilled(unfilled);
    setShowConfirm(true);
  }, [visibleQuestions, answers]);

  const doSubmit = useCallback(async () => {
    setShowConfirm(false);
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ua = parseUserAgent();
      const nowIso = new Date().toISOString();
      const duration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;

      const answersObj = {};
      for (const q of visibleQuestions) {
        const v = answers[q.id];
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          answersObj[q.id] = normalizeAnswerValue(q, v);
        }
      }

      const meta = {
        device: ua.device, browser: ua.browser, os: ua.os,
        userAgent: navigator.userAgent, referrerUrl: document.referrer || null,
        startedAt: new Date(startedAt ?? Date.now()).toISOString(), completedAt: nowIso,
      };

      const { data, error: rpcError } = await supabase.rpc("submit_public_response", {
        p_form_public_id: formId, p_answers: answersObj, p_meta: meta,
      });

      if (rpcError) throw rpcError;

      postToParent("pcode:submitted", { formId, responseId: data?.responseId });
      setDir(1);
      setStep(total);
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitError("ثبت ناموفق بود؛ دوباره تلاش کن.");
      postToParent("pcode:error", { formId, error: err.message });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, visibleQuestions, questions, answers, times, startedAt, formId, total]);

  useEffect(() => {
    if (formEnded && step >= 0 && step < total) {
      accrueTime();
      setDir(1);
      setStep(total);
    }
  }, [formEnded]);

  const currentVisibleIndex = useMemo(() => {
    if (step < 0 || !currentQuestion) return 0;
    return visibleQuestions.findIndex((q) => q.id === currentQuestion.id) + 1;
  }, [step, currentQuestion, visibleQuestions]);

  const isRegistration = schema?.form_type === "registration";

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-transparent"><Spinner label="فرم داره لود می‌شه..." /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-4 bg-transparent">
    <div className="bg-white border-2 border-navy rounded-pill-md p-8 text-center max-w-md">
      <p className="text-lg font-black text-navy">{error}</p>
    </div>
  </div>;
  if (!schema) return null;

  // ─── فرم ثبت‌نامی: تک‌صفحه‌ای ───
  if (isRegistration) {
    return <EmbedRegistrationForm schema={schema} questions={questions} formId={formId} />;
  }

  return (
    <div className="min-h-screen font-sans bg-transparent" dir="rtl">
      {/* هدر باریک */}
      <div className="w-full max-w-xl mx-auto px-4 py-3 text-center">
        <span className="inline-flex items-baseline gap-1 text-lg font-black select-none">
          <span className="text-navy">پرس</span>
          <span className="text-teal-text">کاد</span>
        </span>
        <span className="block text-xs font-bold text-ink/30 mt-0.5">{schema.title}</span>
      </div>

      {/* نوار پیشرفت */}
      {step >= 0 && step < total && (
        <div className="w-full max-w-xl mx-auto px-4 pb-2">
          <ProgressBar value={currentVisibleIndex} max={visibleTotal} />
        </div>
      )}

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-xl -rotate-[0.6deg]">
          <div className="bg-white border-2 border-navy rounded-[2rem] p-6 sm:p-8 shadow-[6px_6px_0_0_rgba(33,41,90,0.15)]">
            <AnimatePresence mode="wait" custom={dir}>
              {/* صفحه خوش‌آمد */}
              {step === -1 && (
                <motion.div
                  key="welcome" custom={dir}
                  initial={{ opacity: 0, x: dir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -40 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center text-center gap-4 py-8"
                >
                  <h1 className="text-2xl font-black text-navy">{schema.welcome_title}</h1>
                  <p className="text-ink-soft leading-8">{schema.welcome_message}</p>
                  {visibleTotal > 0 && <span className="text-xs text-ink/30 font-bold">{faNum(visibleTotal)} سوال</span>}
                  <button onClick={goNext} disabled={visibleTotal === 0}
                    className="mt-4 bg-teal text-white px-8 py-3 rounded-pill-md font-extrabold hover:bg-teal-text transition-colors disabled:opacity-50 shadow-[3px_3px_0_0_rgba(0,0,0,0.2)]">
                    شروع کنید 🚀
                  </button>
                </motion.div>
              )}

              {/* سوالات */}
              {step >= 0 && step < total && currentQuestion && (
                <motion.div
                  key={currentQuestion.id} custom={dir}
                  initial={{ opacity: 0, x: dir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -40 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-navy">سوال {faNum(currentVisibleIndex)} از {faNum(visibleTotal)}</span>
                    {currentQuestion.required && <span className="text-xs font-bold text-magenta-text">اجباری *</span>}
                  </div>
                  <h2 className="text-lg font-black text-navy">{currentQuestion.title}</h2>
                  {currentQuestion.description && <p className="text-sm text-ink-subtle -mt-2">{currentQuestion.description}</p>}

                  {(currentQuestion.type === "short_text" || currentQuestion.type === "long_text" || currentQuestion.type === "email" || currentQuestion.type === "number" || currentQuestion.type === "phone_ir" || currentQuestion.type === "telegram_id") && (
                    <TextInput type={currentQuestion.type} value={answers[currentQuestion.id]} onChange={setAnswer} onEnter={goNext} placeholder={currentQuestion.placeholder} />
                  )}
                  {currentQuestion.type === "choice" && (
                    <ChoiceOptions options={currentQuestion.options} value={answers[currentQuestion.id]} onChange={setAnswer} onEnter={goNext} />
                  )}
                  {currentQuestion.type === "yes_no" && (
                    <YesNoOptions value={answers[currentQuestion.id]} onChange={setAnswer} onEnter={goNext} />
                  )}
                  {currentQuestion.type === "rating" && (
                    <RatingStars value={answers[currentQuestion.id]} onChange={setAnswer} />
                  )}

                  {touchedFields[currentQuestion.id] && fieldErrors[currentQuestion.id] && (
                    <div className="flex items-center gap-2 bg-magenta/10 border-2 border-magenta rounded-pill-md px-3 py-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-magenta-text shrink-0">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      <span className="text-sm font-bold text-magenta-text">{fieldErrors[currentQuestion.id]}</span>
                    </div>
                  )}
                  {requiredError && !fieldErrors[currentQuestion.id] && (
                    <div className="bg-magenta/10 border-2 border-magenta rounded-pill-md px-4 py-2 text-sm font-bold text-magenta-text">{requiredError}</div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <button onClick={goBack} className="text-sm font-bold text-ink-subtle hover:text-ink transition-colors">برگشت</button>
                    {step < total - 1 ? (
                      <button onClick={goNext} className="bg-navy text-white px-6 py-2.5 rounded-pill-md font-bold hover:bg-navy/90 transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]">بعدی ←</button>
                    ) : (
                      <button onClick={openConfirm} disabled={submitting}
                        className="bg-teal text-white px-6 py-2.5 rounded-pill-md font-bold hover:bg-teal-text transition-colors disabled:opacity-50 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]">
                        {submitting ? "در حال ثبت..." : "ثبت ✨"}
                      </button>
                    )}
                  </div>
                  {submitError && (
                    <div className="bg-magenta/10 border-2 border-magenta rounded-pill-md px-4 py-2 text-sm font-bold text-magenta-text self-end">{submitError}</div>
                  )}
                </motion.div>
              )}

              {/* صفحه خروج */}
              {step >= total && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center gap-4 py-8"
                >
                  <span className="text-5xl">🎉</span>
                  <h1 className="text-2xl font-black text-navy">{schema.exit_title}</h1>
                  <p className="text-ink-soft leading-7">{schema.exit_message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* بج برندینگ */}
            {schema.showBranding && <BrandingBadge formId={formId} />}
          </div>
        </div>
      </main>

      {/* باکس تایید قبل از ارسال */}
      <ConfirmDialog
        open={showConfirm}
        onConfirm={doSubmit}
        onCancel={() => setShowConfirm(false)}
        unfilledFields={confirmUnfilled}
        totalRequired={visibleQuestions.filter((q) => q.required).length}
        filledCount={visibleQuestions.filter((q) => q.required && answers[q.id] != null && String(answers[q.id]).trim() !== "").length}
      />
    </div>
  );
}
