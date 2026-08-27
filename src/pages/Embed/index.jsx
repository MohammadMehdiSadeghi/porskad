import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import { normalizeAnswerValue, validateAnswer } from "../../lib/validators";
import { calculateFlow, evaluateNextStep } from "../../lib/logic/flowEngine";
import { faNum, faDuration, parseUserAgent } from "../../lib/utils";
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
        <span className="font-extrabold text-navy">پرس<span className="text-teal">کاد</span></span>
      </span>
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

  const questions = useMemo(() => schema?.questions ?? [], [schema]);
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

  const submit = useCallback(async () => {
    if (submitting) return;
    for (const q of visibleQuestions) {
      if (q.required) {
        const v = answers[q.id];
        const isEmpty = v === null || v === undefined || (typeof v === "string" && v.trim() === "");
        if (isEmpty) {
          const idx = questions.indexOf(q);
          accrueTime();
          setDir(-1);
          setStep(idx);
          setSubmitError(`سوال «${q.title}» اجباریه!`);
          return;
        }
      }
    }

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

  if (loading) return <div className="min-h-screen bg-bg-mint flex items-center justify-center"><Spinner label="فرم داره لود می‌شه..." /></div>;
  if (error) return <div className="min-h-screen bg-bg-mint flex items-center justify-center p-4">
    <div className="bg-white border-2 border-navy rounded-pill-md p-8 text-center max-w-md">
      <p className="text-lg font-black text-navy">{error}</p>
    </div>
  </div>;
  if (!schema) return null;

  return (
    <div className="min-h-screen bg-bg-mint font-sans" dir="rtl">
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

                  {requiredError && (
                    <div className="bg-magenta/10 border-2 border-magenta rounded-pill-md px-4 py-2 text-sm font-bold text-magenta-text">{requiredError}</div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <button onClick={goBack} className="text-sm font-bold text-ink-subtle hover:text-ink transition-colors">برگشت</button>
                    {step < total - 1 ? (
                      <button onClick={goNext} className="bg-navy text-white px-6 py-2.5 rounded-pill-md font-bold hover:bg-navy/90 transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]">بعدی ←</button>
                    ) : (
                      <button onClick={submit} disabled={submitting}
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
    </div>
  );
}
