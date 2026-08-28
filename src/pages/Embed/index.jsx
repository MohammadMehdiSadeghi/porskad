import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import { normalizeAnswerValue, validateAnswer } from "../../lib/validators";
import { calculateFlow, evaluateNextStep } from "../../lib/logic/flowEngine";
import { QUESTION_TYPES } from "../../lib/questionTypes";
import { faNum, faDuration, parseUserAgent } from "../../lib/utils";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { calculateScore, hasScoring } from "../../lib/scoring";
import ScoreResult from "../../components/ui/ScoreResult";
import "../../index.css";

const inputCls = "w-full bg-white border-2 border-ink/10 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3 font-semibold text-ink text-sm sm:text-base placeholder:text-ink/40 placeholder:font-medium focus:outline-none transition-all duration-200";

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

// ─── دکمه بستن embed ───
function handleClose() {
  // اگه در iframe هستیم → پیام به والد بفرست
  if (window.parent && window.parent !== window) {
    try { window.parent.postMessage({ type: "pcode:close" }, "*"); } catch { /* ignore */ }
  }
  // اگه standalone باز شده (تب جدید / مستقیم)
  if (window.history && window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}

function CloseButton() {
  return (
    <button
      onClick={handleClose}
      className="fixed top-2 left-2 z-50 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur border-2 border-ink/15 hover:border-female-normal hover:bg-female-light text-ink/50 hover:text-female-normal transition-all duration-200 cursor-pointer"
      aria-label="بستن"
      title="بستن فرم"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  );
}

// ─── نرمالایزیشن شرط‌ها ───
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
      <div className="w-9 h-9 border-[3px] border-ecosystem-normal/20 border-t-ecosystem-normal rounded-full animate-spin" />
      <p className="text-sm sm:text-base text-ink/50 font-semibold">{label}</p>
    </div>
  );
}

// ─── نوار پیشرفت ───
function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-ink/10 rounded-full overflow-hidden">
      <div className="h-full bg-ecosystem-normal rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── ورودی متنی — توکن‌های رکاد ───
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

  const shared = "w-full border-2 border-ink/10 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ecosystem-normal/15 focus:border-ecosystem-normal transition-all duration-200";

  if (type === "long_text") {
    return (
      <textarea
        dir="rtl"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        autoFocus={autoFocus}
        className={`${shared} resize-y min-h-[7rem] leading-9`}
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

// ─── گزینه‌ها — طراحی رکاد ───
function ChoiceOptions({ options = [], value, onChange, onEnter, displayMode = "buttons" }) {
  if (displayMode === "dropdown") {
    return (
      <select
        value={value || ""}
        onChange={(e) => { const v = e.target.value || null; onChange(v); if (v) setTimeout(onEnter, 250); }}
        className="w-full bg-white border-2 border-ink/15 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:px-4 sm:py-3.5 font-bold text-sm sm:text-base text-ink focus:outline-none transition-all duration-200 cursor-pointer text-right"
      >
        <option value="">یک گزینه انتخاب کنید...</option>
        {options.map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  // حالت دکمه‌ای (پیش‌فرض)
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => { onChange(opt); setTimeout(onEnter, 250); }}
          className={`relative flex items-center gap-2.5 text-right w-full border-2 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3 transition-all duration-200 cursor-pointer hover:-translate-y-px ${
            value === opt
              ? "border-ecosystem-normal bg-ecosystem-light rotate-[-0.5deg]"
              : "border-ink/10 bg-white hover:border-ecosystem-normal/50"
          }`}
        >
          {value === opt && <div aria-hidden="true" className="absolute top-[2px] left-[2px] w-full h-full bg-ecosystem-dark/15 rounded-pill-md [corner-shape:squircle] pointer-events-none" />}
          <span className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-full border-2 text-sm sm:text-base font-bold transition-colors duration-200 ${
            value === opt ? "border-ecosystem-normal bg-ecosystem-normal text-white" : "border-ink/15 text-male-normal"
          }`}>{faNum(i + 1)}</span>
          <span className={`relative z-10 font-bold text-sm sm:text-base ${value === opt ? "text-ecosystem-dark" : "text-ink"}`}>{opt}</span>
        </button>
      ))}
    </div>
  );
}

// ─── بله/خیر — طراحی رکاد ───
function YesNoOptions({ value, onChange, onEnter }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[{ label: "بله", theme: "ecosystem" }, { label: "خیر", theme: "female" }].map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => { onChange(o.label); setTimeout(onEnter, 250); }}
          className={`flex items-center justify-center gap-1.5 py-3.5 sm:py-4 rounded-pill-md [corner-shape:squircle] border-2 text-base sm:text-lg font-black transition-all duration-200 cursor-pointer ${
            value === o.label
              ? o.theme === "ecosystem"
                ? "border-ecosystem-normal bg-ecosystem-light text-ecosystem-dark"
                : "border-female-normal bg-female-light text-female-dark"
              : "border-ink/10 bg-white text-ink hover:border-ink/25"
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
    <div className="flex justify-center gap-2 sm:gap-3" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-btn text-4xl sm:text-5xl cursor-pointer ${n <= current ? "" : "opacity-30 grayscale"}`}
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
      <span className="inline-flex items-baseline gap-0.5 text-[0.6rem] sm:text-xs text-ink/30">
        ساخته‌شده با
        <span className="font-extrabold text-male-normal">پرس <span className="text-ecosystem-dark">کاد</span></span>
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// EmbedRegistrationForm — فرم ثبت‌نامی embed — طراحی رکاد
// ══════════════════════════════════════════════════════════════
function EmbedRegistrationForm({ schema, questions, formId }) {
  const [answers, setAnswers] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmUnfilled, setConfirmUnfilled] = useState([]);
  const [scoreResult, setScoreResult] = useState(null);
  const [startedAt] = useState(() => Date.now());

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
    setError(null);

    const errors = {};
    for (const q of questions) {
      const err = validateAnswer(q, answers[q.id]);
      if (err) { errors[q.id] = err; }
    }
    setFieldErrors(errors);
    setTouched(Object.fromEntries(questions.map((q) => [q.id, true])));

    const unfilled = [];
    for (const q of questions) {
      if (errors[q.id]) {
        unfilled.push({ id: q.id, title: `${q.title} (${errors[q.id]})`, typeLabel: QUESTION_TYPES[q.type]?.label || q.type });
      } else if (q.required) {
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
        startedAt: new Date(startedAt).toISOString(), completedAt: nowIso,
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

      if (hasScoring(questions)) {
        const score = calculateScore(questions, answers);
        setScoreResult(score);
      }

      postToParent("pcode:submitted", { formId, responseId: data?.responseId });
      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      const msg = err?.message || err?.error?.message || String(err);
      setError("ثبت ناموفق بود: " + msg);
      postToParent("pcode:error", { formId, error: msg });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-transparent" dir="rtl">
        <CloseButton />
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
          className="relative max-w-lg w-full">
          <div aria-hidden="true" className="absolute top-[0.1875rem] left-[0.1875rem] w-full h-full bg-male-normal rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]" />
          <div className="relative z-10 bg-white border-2 border-male-normal rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] p-5 sm:p-6 text-center">
            <span className="text-5xl sm:text-6xl mb-3 block">🎉</span>
            <h1 className="text-xl sm:text-2xl font-black text-male-normal mb-2">{schema.exit_title || "ثبت‌نام با موفقیت انجام شد!"}</h1>
            <p className="text-sm sm:text-base text-ink-soft leading-7">{schema.exit_message || "ممنون از ثبت‌نام شما."}</p>
            {scoreResult && (
              <ScoreResult score={scoreResult.score} total={scoreResult.total} details={scoreResult.details} questions={questions} />
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-transparent overflow-y-auto overscroll-contain" dir="rtl">
      <CloseButton />
      <div className="w-full max-w-xl mx-auto px-5 py-3 text-center">
        <span className="inline-flex items-baseline gap-0.5 text-base sm:text-lg font-black select-none">
          <span className="text-male-normal">پرس</span>
          <span className="text-ecosystem-dark">کاد</span>
        </span>
        <span className="block text-[0.6rem] sm:text-xs font-bold text-ink/30 mt-0.5">{schema.title}</span>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 sm:px-5 py-4 sm:py-6">
        <div className="w-full max-w-xl -rotate-[0.3deg]">
          <div className="relative">
            <div aria-hidden="true" className="absolute top-2 left-2 w-full h-full bg-male-normal rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]" />              <div className="relative z-10 bg-white border-2 border-male-normal rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] p-5 sm:p-6 lg:p-7">
              <form onSubmit={handleShowConfirm} className="flex flex-col gap-3.5 sm:gap-4">
                <div className="text-center mb-0.5">
                  <h1 className="text-lg sm:text-xl font-black text-male-normal mb-0.5">{schema.title}</h1>
                  {schema.description && <p className="text-xs sm:text-sm text-ink-subtle">{schema.description}</p>}
                  <span className="text-[0.6rem] sm:text-xs font-bold text-ink/40 bg-bg-neutral rounded-pill-sm px-1.5 py-0.5 mt-1.5 inline-block">{faNum(questions.length)} فیلد</span>
                </div>

                {questions.map((q, i) => {
                  const val = answers[q.id] ?? "";
                  const fieldErr = touched[q.id] ? fieldErrors[q.id] : null;
                  return (
                    <div key={q.id} className="flex flex-col gap-2">
                      <label className="flex items-center gap-1.5">
                        <span className="text-sm sm:text-base font-extrabold text-male-normal">{q.title}</span>
                        {q.required && <span className="text-female-normal text-xs">*</span>}
                      </label>
                      {q.description && <span className="text-xs sm:text-sm font-medium text-ink-subtle">{q.description}</span>}

                      {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "telegram_id") && (
                        <input type={q.type === "email" ? "email" : "text"} inputMode={q.type === "phone_ir" ? "tel" : "text"}
                          dir={q.type === "email" || q.type === "phone_ir" ? "ltr" : "rtl"}
                          value={val}
                          onChange={(e) => setAnswer(q.id, e.target.value, q)}
                          onBlur={(e) => handleBlur(q.id, e.target.value, q)}
                          placeholder={(q.placeholder && q.placeholder.trim()) || (q.type === "email" ? "name@example.com" : q.type === "phone_ir" ? "09123456789" : q.type === "telegram_id" ? "@username" : "پاسخ خود را بنویسید...")}
                          className={`${inputCls} ${fieldErr ? "!border-female-normal" : ""}`}
                        />
                      )}

                      {q.type === "long_text" && (
                        <textarea dir="rtl" rows={3} value={val}
                          onChange={(e) => setAnswer(q.id, e.target.value, q)}
                          onBlur={(e) => handleBlur(q.id, e.target.value, q)}
                          placeholder={q.placeholder?.trim() || "بنویس..."}
                          className={`${inputCls} resize-y min-h-[4rem] leading-6 ${fieldErr ? "!border-female-normal" : ""}`}
                        />
                      )}

                      {q.type === "number" && (
                        <input type="text" inputMode="numeric" dir="rtl" value={val}
                          onChange={(e) => setAnswer(q.id, e.target.value, q)}
                          onBlur={(e) => handleBlur(q.id, e.target.value, q)}
                          placeholder={q.placeholder?.trim() || "مثلاً 42"}
                          className={`${inputCls} ${fieldErr ? "!border-female-normal" : ""}`}
                        />
                      )}

                      {q.type === "choice" && (
                        <ChoiceOptions options={q.options} value={val}
                          onChange={(opt) => { setAnswer(q.id, opt, q); handleBlur(q.id, opt, q); }}
                          onEnter={() => {}} displayMode={q.display_mode || "buttons"} />
                      )}

                      {q.type === "yes_no" && (
                        <div className="grid grid-cols-2 gap-3">
                          {["بله", "خیر"].map((opt) => (
                            <button key={opt} type="button"
                              onClick={() => { setAnswer(q.id, opt, q); handleBlur(q.id, opt, q); }}
                            className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-pill-md [corner-shape:squircle] border-2 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                              val === opt ? (opt === "بله" ? "border-ecosystem-normal bg-ecosystem-light text-ecosystem-dark" : "border-female-normal bg-female-light text-female-dark") : "border-ink/10 bg-white text-ink hover:border-ink/25"
                            }`}>{opt}</button>
                          ))}
                        </div>
                      )}

                      {q.type === "rating" && (
                        <div className="flex justify-center gap-2" dir="ltr">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} type="button"
                              className={`star-btn text-2xl sm:text-3xl cursor-pointer ${Number(val) >= n ? "" : "opacity-30 grayscale"}`}
                              onClick={() => { setAnswer(q.id, String(n), q); handleBlur(q.id, String(n), q); }}>⭐</button>
                          ))}
                        </div>
                      )}

                      {q.type === "checkbox" && (
                        <div className="flex flex-col gap-2.5">
                          {(q.options || []).map((opt, i) => {
                            const selected = Array.isArray(val) && val.includes(opt);
                            return (
                              <button key={i} type="button"
                                onClick={() => {
                                  const current = Array.isArray(val) ? [...val] : [];
                                  const next = selected ? current.filter((v) => v !== opt) : [...current, opt];
                                  setAnswer(q.id, next, q);
                                  handleBlur(q.id, next, q);
                                }}
                                className={`flex items-center gap-3 text-right w-full border-2 rounded-pill-md [corner-shape:squircle] px-4 py-3 sm:py-3.5 transition-all duration-200 cursor-pointer ${
                                  selected ? "border-ecosystem-normal bg-ecosystem-light" : "border-ink/15 bg-white hover:border-ecosystem-normal/60"
                                }`}>
                        <span className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-md border-2 text-xs font-bold transition-colors duration-200 ${
                          selected ? "border-ecosystem-normal bg-ecosystem-normal text-white" : "border-ink/15"
                        }`}>{selected ? "✓" : ""}</span>
                                <span className={`font-semibold text-sm sm:text-base ${selected ? "text-ecosystem-dark" : "text-ink"}`}>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {fieldErr && (
                        <div className="flex items-center gap-1.5 bg-female-light border border-female-normal rounded-pill-md px-2.5 py-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-female-normal shrink-0">
                            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          <span className="text-xs sm:text-sm font-bold text-female-normal">{fieldErr}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {error && (
                  <div className="bg-female-light border border-female-normal rounded-pill-md px-3 py-1.5 text-xs sm:text-sm font-bold text-female-normal">{error}</div>
                )}

                <div className="relative">
                  <div aria-hidden="true" className="absolute top-[0.125rem] left-[0.125rem] w-full h-full bg-ecosystem-dark rounded-pill-md [corner-shape:squircle]" />
                  <button type="submit" disabled={submitting}
                    className="relative z-10 w-full bg-ecosystem-normal border-2 border-ecosystem-dark text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-pill-md [corner-shape:squircle] font-extrabold hover:bg-ecosystem-dark transition-colors duration-200 disabled:opacity-50 text-sm sm:text-base">
                    {submitting ? "در حال ثبت..." : "ارسال ✨"}
                  </button>
                </div>
              </form>
              {schema.showBranding && <BrandingBadge formId={formId} />}
            </div>
          </div>
        </div>
      </main>

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

// ══════════════════════════════════════════════════════════════
// EmbedForm — صفحه اصلی Embed — طراحی رکاد
// ══════════════════════════════════════════════════════════════
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
  const [scoreResult, setScoreResult] = useState(null);
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
        const isEmpty = v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
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

      if (hasScoring(questions)) {
        const score = calculateScore(visibleQuestions, answers);
        setScoreResult(score);
      }

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

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-transparent overflow-y-auto"><CloseButton /><Spinner label="فرم داره لود می‌شه..." /></div>;
  if (error) return <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-transparent overflow-y-auto"><CloseButton />      <div className="relative max-w-sm w-full">
      <div aria-hidden="true" className="absolute top-2 left-2 w-full h-full bg-male-normal rounded-tl-[1rem] rounded-br-[1rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]" />
      <div className="relative z-10 bg-white border-2 border-male-normal rounded-tl-[1rem] rounded-br-[1rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] p-4 sm:p-5 text-center">
        <p className="text-sm sm:text-base font-black text-male-normal">{error}</p>
      </div>
    </div>
  </div>;
  if (!schema) return null;

  if (isRegistration) {
    return <EmbedRegistrationForm schema={schema} questions={questions} formId={formId} />;
  }

  // ─── فرم مرحله‌ای embed — طراحی رکاد ───
  return (
    <div className="min-h-[100dvh] font-sans bg-transparent overflow-y-auto overscroll-contain" dir="rtl">
      <CloseButton />
      {/* هدر باریک */}
      <div className="w-full max-w-xl mx-auto px-5 py-3 text-center">
        <span className="inline-flex items-baseline gap-0.5 text-base sm:text-lg font-black select-none">
          <span className="text-male-normal">پرس</span>
          <span className="text-ecosystem-dark">کاد</span>
        </span>
        <span className="block text-[0.6rem] sm:text-xs font-bold text-ink/30 mt-0.5">{schema.title}</span>
      </div>

      {/* نوار پیشرفت */}
      {step >= 0 && step < total && (
        <div className="w-full max-w-xl mx-auto px-4 pb-2">
          <ProgressBar value={currentVisibleIndex} max={visibleTotal} />
        </div>
      )}

      <main className="flex-1 flex items-start justify-center px-4 sm:px-5 py-4 sm:py-6">
        <div className="w-full max-w-xl -rotate-[0.6deg]">
          <div className="relative">
            <div aria-hidden="true" className="absolute top-2 left-2 w-full h-full bg-male-normal rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]" />              <div className="relative z-10 bg-white border-2 border-male-normal rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] p-5 sm:p-6 lg:p-7">
              <AnimatePresence mode="wait" custom={dir}>
                {/* صفحه خوش‌آمد */}
                {step === -1 && (
                  <motion.div
                    key="welcome" custom={dir}
                    initial={{ opacity: 0, x: dir * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -40 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center text-center gap-3.5 sm:gap-4 py-6 sm:py-8"
                  >
                    <h1 className="text-lg sm:text-xl font-black text-male-normal">{schema.welcome_title}</h1>
                    <p className="text-sm sm:text-base text-ink-soft leading-7">{schema.welcome_message}</p>
                    {visibleTotal > 0 && <span className="text-[0.6rem] sm:text-xs text-ink/30 font-bold">{faNum(visibleTotal)} سوال</span>}                      <div className="relative mt-3 sm:mt-4">
                      <div aria-hidden="true" className="absolute top-[0.125rem] left-[0.125rem] w-full h-full bg-ecosystem-dark rounded-pill-md [corner-shape:squircle]" />
                      <button onClick={goNext} disabled={visibleTotal === 0}
                        className="relative z-10 bg-ecosystem-normal border-2 border-ecosystem-dark text-white px-6 sm:px-7 py-2.5 sm:py-3 rounded-pill-md [corner-shape:squircle] font-extrabold hover:bg-ecosystem-dark transition-colors duration-200 disabled:opacity-50 text-sm sm:text-base">
                        شروع کنید 🚀
                      </button>
                    </div>
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
                    className="flex flex-col gap-3.5 sm:gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-black text-male-normal">سوال {faNum(currentVisibleIndex)} از {faNum(visibleTotal)}</span>
                      {currentQuestion.required && <span className="text-[0.6rem] sm:text-xs font-bold text-female-normal">اجباری *</span>}
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-male-normal">{currentQuestion.title}</h2>
                    {currentQuestion.description && <p className="text-xs sm:text-sm text-ink-subtle -mt-1.5">{currentQuestion.description}</p>}

                    {(currentQuestion.type === "short_text" || currentQuestion.type === "long_text" || currentQuestion.type === "email" || currentQuestion.type === "number" || currentQuestion.type === "phone_ir" || currentQuestion.type === "telegram_id") && (
                      <TextInput type={currentQuestion.type} value={answers[currentQuestion.id]} onChange={setAnswer} onEnter={goNext} placeholder={currentQuestion.placeholder} />
                    )}
                    {currentQuestion.type === "choice" && (
                      <ChoiceOptions options={currentQuestion.options} value={answers[currentQuestion.id]} onChange={setAnswer} onEnter={goNext} displayMode={currentQuestion.display_mode || "buttons"} />
                    )}
                    {currentQuestion.type === "yes_no" && (
                      <YesNoOptions value={answers[currentQuestion.id]} onChange={setAnswer} onEnter={goNext} />
                    )}
                    {currentQuestion.type === "rating" && (
                      <RatingStars value={answers[currentQuestion.id]} onChange={setAnswer} />
                    )}
                    {currentQuestion.type === "checkbox" && (
                      <div className="flex flex-col gap-2.5">
                        {(currentQuestion.options || []).map((opt, i) => {
                          const selected = Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(opt);
                          return (
                            <button key={i} type="button"
                              onClick={() => {
                                const current = Array.isArray(answers[currentQuestion.id]) ? [...answers[currentQuestion.id]] : [];
                                const next = selected ? current.filter((v) => v !== opt) : [...current, opt];
                                setAnswer(next);
                              }}
                              className={`flex items-center gap-2.5 text-right w-full border-2 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3 transition-all duration-200 cursor-pointer ${
                                selected ? "border-ecosystem-normal bg-ecosystem-light" : "border-ink/10 bg-white hover:border-ecosystem-normal/50"
                              }`}>
                              <span className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-md border-2 text-xs font-bold transition-colors duration-200 ${
                                selected ? "border-ecosystem-normal bg-ecosystem-normal text-white" : "border-ink/15"
                              }`}>{selected ? "✓" : ""}</span>
                              <span className={`font-bold text-sm sm:text-base ${selected ? "text-ecosystem-dark" : "text-ink"}`}>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {touchedFields[currentQuestion.id] && fieldErrors[currentQuestion.id] && (
                      <div className="flex items-center gap-2 bg-female-light border-2 border-female-normal rounded-pill-md [corner-shape:squircle] px-3 py-2.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-female-normal shrink-0">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        <span className="text-xs sm:text-sm font-bold text-female-normal">{fieldErrors[currentQuestion.id]}</span>
                      </div>
                    )}
                    {requiredError && !fieldErrors[currentQuestion.id] && (
                      <div className="bg-female-light border-2 border-female-normal rounded-pill-md [corner-shape:squircle] px-4 py-2.5 text-xs sm:text-sm font-bold text-female-normal">{requiredError}</div>
                    )}

                    <div className="flex items-center justify-between mt-1.5 sm:mt-2">                        <button onClick={goBack} className="text-xs sm:text-sm font-bold text-ink-subtle hover:text-ink transition-colors duration-200">برگشت</button>
                      {step < total - 1 ? (
                        <div className="relative">
                          <div aria-hidden="true" className="absolute top-[0.125rem] left-[0.125rem] w-full h-full bg-male-dark rounded-pill-md [corner-shape:squircle]" />
                          <button onClick={goNext} className="relative z-10 bg-male-normal border-2 border-male-dark text-white px-5 sm:px-6 py-2.5 rounded-pill-md [corner-shape:squircle] font-bold hover:bg-male-dark transition-colors duration-200 text-xs sm:text-sm">بعدی ←</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div aria-hidden="true" className="absolute top-[0.125rem] left-[0.125rem] w-full h-full bg-ecosystem-dark rounded-pill-md [corner-shape:squircle]" />
                          <button onClick={openConfirm} disabled={submitting}
                            className="relative z-10 bg-ecosystem-normal border-2 border-ecosystem-dark text-white px-5 sm:px-6 py-2.5 rounded-pill-md [corner-shape:squircle] font-bold hover:bg-ecosystem-dark transition-colors duration-200 disabled:opacity-50 text-xs sm:text-sm">
                            {submitting ? "در حال ثبت..." : "ثبت ✨"}
                          </button>
                        </div>
                      )}
                    </div>
                    {submitError && (
                      <div className="bg-female-light border border-female-normal rounded-pill-md px-3 py-1.5 text-xs sm:text-sm font-bold text-female-normal self-end">{submitError}</div>
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
                    className="flex flex-col items-center text-center gap-3 sm:gap-4 py-6 sm:py-8"
                  >
                  <span className="text-4xl sm:text-5xl">🎉</span>
                  <h1 className="text-lg sm:text-xl font-black text-male-normal">{schema.exit_title}</h1>
                  <p className="text-sm sm:text-base text-ink-soft leading-7">{schema.exit_message}</p>
                    {scoreResult && (
                      <ScoreResult
                        score={scoreResult.score}
                        total={scoreResult.total}
                        details={scoreResult.details}
                        questions={questions}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {schema.showBranding && <BrandingBadge formId={formId} />}
            </div>
          </div>
        </div>
      </main>

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
