import { useState, useRef, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StickerCard from "../ui/StickerCard";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Logo from "../ui/Logo";
import { normalizeAnswerValue, validateAnswer } from "../../lib/validators";
import { faNum, parseUserAgent, generateUuid } from "../../lib/utils";
import { QUESTION_TYPES } from "../../lib/questionTypes";
import { supabase } from "../../lib/supabaseClient";
import ConfirmDialog from "../ui/ConfirmDialog";
import SEO from "../ui/SEO";
import { calculateScore, hasScoring } from "../../lib/scoring";
import { calculateFlow } from "../../lib/logic/flowEngine";
import ScoreResult from "../ui/ScoreResult";
import { sendToTelegram } from "../../lib/telegram";
import { Star, Check, CheckCircle2, AlertCircle } from "lucide-react";

const inputCls = "w-full bg-white dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3 font-semibold text-ink dark:text-white text-sm sm:text-base placeholder:text-ink/40 dark:placeholder:text-slate-500 placeholder:font-medium focus:outline-none transition-all duration-200";
const selectCls = "w-full bg-white dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3 font-semibold text-ink dark:text-white text-sm sm:text-base focus:outline-none transition-all duration-200 appearance-none cursor-pointer";

function isFieldEmpty(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
}

function DropdownChoice({ options = [], value, onChange }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:px-4 sm:py-3.5 font-bold text-sm sm:text-base text-ink dark:text-white focus:outline-none transition-all duration-200 cursor-pointer text-right"
    >
      <option value="">یک گزینه انتخاب کنید...</option>
      {options.map((opt, i) => (
        <option key={i} value={opt}>{faNum(i + 1)}. {opt}</option>
      ))}
    </select>
  );
}

export default function RegistrationForm({ form, questions, logicRules = [], hiddenFields = {}, slug }) {
  const [answers, setAnswers] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(Date.now());
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmUnfilled, setConfirmUnfilled] = useState([]);
  const [scoreResult, setScoreResult] = useState(null);
  const [variables, setVariables] = useState({});
  const formRef = useRef(null);
  const appliedSigRef = useRef("");

  const sortedQuestions = useMemo(() => [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)), [questions]);

  // ─── موتور شرطی: هم conditions سوال، هم logic_rules متمرکز + متغیرها + hiddenFields ───
  const flow = useMemo(
    () => calculateFlow(sortedQuestions, logicRules || [], answers, variables, hiddenFields),
    [sortedQuestions, logicRules, answers, variables, hiddenFields]
  );
  const visibleQuestions = flow.visibleQuestions;

  // اعمال تغییرات متغیرها (ADD_TO_VARIABLE)
  useEffect(() => {
    if (flow.variableChanges?.length > 0) {
      const sig = JSON.stringify(flow.variableChanges);
      if (appliedSigRef.current === sig) return;
      appliedSigRef.current = sig;
      setVariables((prev) => {
        const next = { ...prev };
        for (const vc of flow.variableChanges) next[vc.variableKey] = (Number(next[vc.variableKey]) || 0) + vc.amount;
        return next;
      });
    } else {
      appliedSigRef.current = "";
    }
  }, [flow.variableChanges]);

  function setAnswer(questionId, val, q) {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
    setError(null);
    if (touched[questionId]) {
      setFieldErrors((prev) => ({ ...prev, [questionId]: validateAnswer(q, val) }));
    }
  }

  function handleBlur(questionId, val, q) {
    setTouched((prev) => ({ ...prev, [questionId]: true }));
    setFieldErrors((prev) => ({ ...prev, [questionId]: validateAnswer(q, val) }));
  }

  function openConfirm(e) {
    e.preventDefault();
    if (submitting) return;
    const errors = {};
    for (const q of visibleQuestions) {
      const err = validateAnswer(q, answers[q.id]);
      if (err) errors[q.id] = err;
    }
    setFieldErrors(errors);
    setTouched(Object.fromEntries(visibleQuestions.map((q) => [q.id, true])));
    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      const firstErrKey = Object.keys(errors)[0];
      const firstErrQ = visibleQuestions.find((q) => q.id === firstErrKey);
      setError(firstErrQ ? `${firstErrQ.title}: ${errors[firstErrKey]}` : "لطفاً خطاهای فرم را برطرف کنید.");
      setShowConfirm(false);
      return;
    }
    const unfilled = [];
    for (const q of visibleQuestions) {
      if (q.required && isFieldEmpty(answers[q.id])) unfilled.push({ id: q.id, title: q.title });
    }
    if (unfilled.length > 0) {
      const first = unfilled[0];
      setError(`${first.title}: فیلد اجباری خالی است.`);
      setConfirmUnfilled(unfilled);
      setShowConfirm(false);
      return;
    }
    setError(null);
    setConfirmUnfilled([]);
    setShowConfirm(true);
  }

  async function doSubmit() {
    setShowConfirm(false);
    if (submitting || honeypot) return;
    setSubmitting(true);
    setError(null);
    try {
      const ua = parseUserAgent();
      const responseId = generateUuid();
      const { error: respError } = await supabase.from("responses").insert({
        id: responseId,
        form_id: form.id,
        submitted_at: new Date().toISOString(),
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
        user_agent: navigator.userAgent,
        referer: document.referrer || null,
      });
      if (respError) throw respError;

      const rows = visibleQuestions
        .filter((q) => !isFieldEmpty(answers[q.id]))
        .map((q) => ({
          response_id: responseId,
          question_id: q.id,
          value: normalizeAnswerValue(q, answers[q.id]),
          time_spent_seconds: 0,
        }));

      if (rows.length) {
        const { error: ansError } = await supabase.from("answers").insert(rows);
        if (ansError) throw ansError;
      }

      sendToTelegram(form.id, responseId);
      if (hasScoring(visibleQuestions)) {
        setScoreResult(calculateScore(visibleQuestions, answers));
      }
      setSubmitted(true);
    } catch (err) {
      console.error("Registration form submit error:", err);
      setError("ثبت ناموفق بود؛ دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(q) {
    const val = answers[q.id] ?? "";
    const fieldErr = touched[q.id] ? fieldErrors[q.id] : null;
    const isLtr = q.type === "email" || q.type === "phone_ir" || q.type === "telegram_id";
    const dir = isLtr ? "ltr" : "rtl";
    const align = isLtr ? "text-left" : "text-right";

    return (
      <div key={q.id} className="flex flex-col gap-2">
        <label className="text-sm sm:text-base font-black text-ink dark:text-white">{q.title}</label>
        {q.description && <p className="text-xs text-ink-subtle dark:text-slate-400">{q.description}</p>}
        {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "telegram_id") && (
          <input
            type={q.type === "email" ? "email" : "text"}
            inputMode={q.type === "phone_ir" ? "tel" : "text"}
            dir={dir}
            value={val}
            maxLength={q.type === "short_text" ? 255 : undefined}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={q.placeholder || "پاسخ خود را بنویسید..."}
            className={`${inputCls} ${align} ${fieldErr ? "!border-female-normal" : ""}`}
          />
        )}
        {q.type === "number" && (
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={val}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={q.placeholder || "عدد را وارد کنید..."}
            className={`${inputCls} text-left ${fieldErr ? "!border-female-normal" : ""}`}
          />
        )}
        {q.type === "yes_no" && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "بله", value: "yes" },
              { label: "خیر", value: "no" },
            ].map((opt) => {
              const selected = val === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setAnswer(q.id, opt.value, q);
                    handleBlur(q.id, opt.value, q);
                  }}
                  className={`flex items-center justify-center gap-2 p-3 border-2 rounded-pill-md font-bold transition-all cursor-pointer ${
                    selected
                      ? "border-teal bg-teal/10 text-teal-text dark:text-teal dark:bg-teal-950/40"
                      : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 hover:border-teal/50"
                  }`}
                >
                  <div className={`w-5 h-5 flex items-center justify-center rounded-full border-2 ${selected ? "border-teal bg-teal text-white" : "border-ink/20 dark:border-slate-600"}`}>
                    {selected && <Check size={12} className="stroke-[3]" />}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
        {q.type === "long_text" && (
          <textarea
            dir="rtl"
            rows={2}
            value={val}
            maxLength={q.validation?.maxLength || q.max_length || undefined}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={q.placeholder || "پاسخ خود را بنویسید..."}
            className={`${inputCls} text-right resize-y leading-6 ${fieldErr ? "!border-female-normal" : ""}`}
          />
        )}
        {q.type === "choice" && (
          q.display_mode === "dropdown" ? (
            <DropdownChoice
              options={q.options || []}
              value={val}
              onChange={(newVal) => {
                setAnswer(q.id, newVal, q);
                handleBlur(q.id, newVal, q);
              }}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {(q.options || []).map((opt, i) => {
                const isMulti = q.max_selections > 1;
                const selected = isMulti ? (Array.isArray(val) && val.includes(opt)) : val === opt;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      let nextVal;
                      if (isMulti) {
                        const arr = Array.isArray(val) ? [...val] : [];
                        const idx = arr.indexOf(opt);
                        idx >= 0 ? arr.splice(idx, 1) : arr.push(opt);
                        nextVal = arr;
                      } else {
                        nextVal = opt;
                      }
                      setAnswer(q.id, nextVal, q);
                      handleBlur(q.id, nextVal, q);
                    }}
                    className={`relative flex items-center gap-3 p-3 border-2 rounded-pill-md font-bold transition-all cursor-pointer ${
                      selected
                        ? "border-teal bg-teal/10 text-teal-text dark:text-teal dark:bg-teal-950/40"
                        : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 hover:border-teal/50"
                    }`}
                  >
                    <div className={`w-6 h-6 flex items-center justify-center rounded-md border-2 ${selected ? "border-teal bg-teal text-white" : "border-ink/20 dark:border-slate-600"}`}>
                      {selected && <Check size={14} className="stroke-[3]" />}
                    </div>
                    {opt}
                  </button>
                );
              })}
            </div>
          )
        )}
        {q.type === "rating" && (
          <div className="flex gap-1.5 items-center py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => { setAnswer(q.id, String(star), q); handleBlur(q.id, String(star), q); }}
                className="p-1 transition-transform duration-150 hover:scale-115 cursor-pointer"
              >
                <Star
                  size={24}
                  className={Number(val) >= star ? "text-amber-400 fill-amber-400 drop-shadow-xs" : "text-ink/20 dark:text-slate-600 fill-transparent"}
                />
              </button>
            ))}
          </div>
        )}
        {fieldErr && (
          <div className="flex items-center gap-1.5 text-female-normal text-xs font-bold">
            <AlertCircle size={14} /> {fieldErr}
          </div>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <StickerCard theme="teal" radius="rounded-[1.5rem]">
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <CheckCircle2 size={48} className="text-teal" />
              <h1 className="text-xl font-black text-ink dark:text-white">{form.exit_title || "ثبت‌نام با موفقیت انجام شد!"}</h1>
              <p className="font-semibold text-ink-subtle dark:text-slate-300">{form.exit_message || "ممنون از همراهی شما."}</p>
              {scoreResult && <ScoreResult score={scoreResult.score} total={scoreResult.total} details={scoreResult.details} questions={questions} />}
            </div>
          </StickerCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh dot-pattern bg-ecosystem-light dark:bg-[#0B0F19] text-ink dark:text-slate-100 p-4 transition-colors duration-200">
      <SEO title={form.title} />
      <main className="max-w-xl mx-auto">
        <StickerCard theme="white" radius="rounded-[1.5rem]">
          <div className="p-6">
            <form ref={formRef} onSubmit={openConfirm} className="flex flex-col gap-6">
              <div className="text-center">
                <h1 className="text-xl font-black text-ink dark:text-white">{form.title}</h1>
                {form.description && <p className="text-sm text-ink-subtle dark:text-slate-400 mt-1">{form.description}</p>}
              </div>
              <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} className="hidden" />
              {visibleQuestions.map((q) => renderQuestion(q))}
              {error && <div className="flex items-center gap-2 text-female-normal font-bold bg-female-normal/10 dark:bg-pink-950/40 p-3 rounded-pill-md"><AlertCircle size={16} />{error}</div>}
              <Button type="submit" variant="teal" size="md" disabled={submitting} className="w-full">
                {submitting ? "در حال ثبت..." : "ارسال و ثبت‌نام"}
              </Button>
            </form>
          </div>
        </StickerCard>
      </main>
      <ConfirmDialog open={showConfirm} onConfirm={doSubmit} onCancel={() => setShowConfirm(false)} unfilledFields={confirmUnfilled} />
    </div>
  );
}
