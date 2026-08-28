import { useState, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StickerCard from "../ui/StickerCard";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Logo from "../ui/Logo";
import { normalizeAnswerValue, validateAnswer } from "../../lib/validators";
import { faNum, parseUserAgent } from "../../lib/utils";
import { QUESTION_TYPES } from "../../lib/questionTypes";
import { supabase } from "../../lib/supabaseClient";
import ConfirmDialog from "../ui/ConfirmDialog";
import SEO from "../ui/SEO";
import { calculateScore, hasScoring } from "../../lib/scoring";
import ScoreResult from "../ui/ScoreResult";

const inputCls = "w-full bg-white border-2 border-ink/10 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3 py-2 sm:py-2.5 font-semibold text-ink text-xs sm:text-sm placeholder:text-ink/40 placeholder:font-medium focus:outline-none transition-all duration-200";
const selectCls = "w-full bg-white border-2 border-ink/10 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3 py-2 sm:py-2.5 font-semibold text-ink text-xs sm:text-sm focus:outline-none transition-all duration-200 appearance-none cursor-pointer";

function isFieldEmpty(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
}

export default function RegistrationForm({ form, questions, slug }) {
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
  const formRef = useRef(null);

  const sortedQuestions = useMemo(() => [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)), [questions]);

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
    for (const q of sortedQuestions) {
      const err = validateAnswer(q, answers[q.id]);
      if (err) errors[q.id] = err;
    }
    setFieldErrors(errors);
    setTouched(Object.fromEntries(sortedQuestions.map((q) => [q.id, true])));
    const unfilled = [];
    for (const q of sortedQuestions) {
      if (errors[q.id]) unfilled.push({ id: q.id, title: `${q.title} (${errors[q.id]})` });
      else if (q.required && isFieldEmpty(answers[q.id])) unfilled.push({ id: q.id, title: q.title });
    }
    setConfirmUnfilled(unfilled);
    setShowConfirm(true);
  }

  async function doSubmit() {
    setShowConfirm(false);
    if (submitting) return;
    setSubmitting(true); setError(null);
    try {
      const ua = parseUserAgent();
      const nowIso = new Date().toISOString();
      const { data: responseRow, error: respError } = await supabase.from("responses").insert({
        form_id: form.id, is_complete: true, started_at: new Date(startedAt).toISOString(),
        submitted_at: nowIso, duration_seconds: Math.round((Date.now() - startedAt) / 1000),
        device: ua.device, browser: ua.browser, os: ua.os, user_agent: navigator.userAgent, referer: document.referrer || null,
      }).select("id").single();
      if (respError) throw respError;
      const rows = sortedQuestions.filter((q) => !isFieldEmpty(answers[q.id])).map((q) => ({
        response_id: responseRow.id, question_id: q.id, value: normalizeAnswerValue(q, answers[q.id]), time_spent_seconds: 0,
      }));
      if (rows.length) { const { error: ansError } = await supabase.from("answers").insert(rows); if (ansError) throw ansError; }
      if (hasScoring(sortedQuestions)) setScoreResult(calculateScore(sortedQuestions, answers));
      setSubmitted(true);
    } catch (err) { console.error(err); setError("ثبت ناموفق بود؛ دوباره تلاش کنید."); }
    finally { setSubmitting(false); }
  }

  function renderQuestion(q) {
    const val = answers[q.id] ?? "";
    const fieldErr = touched[q.id] ? fieldErrors[q.id] : null;

    return (
      <div key={q.id} className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-extrabold text-male-normal">{q.title}</span>
          {q.required && <span className="text-female-normal text-[0.6rem]">*</span>}
        </label>
        {q.description && <span className="text-[0.55rem] sm:text-[0.6rem] font-medium text-ink-subtle">{q.description}</span>}

        {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "telegram_id") && (
          <input type={q.type === "email" ? "email" : "text"} inputMode={q.type === "phone_ir" ? "tel" : "text"} dir={q.type === "email" || q.type === "phone_ir" ? "ltr" : "rtl"} value={val}
            onChange={(e) => setAnswer(q.id, e.target.value, q)} onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={(q.placeholder?.trim()) || (q.type === "email" ? "example@email.com" : q.type === "phone_ir" ? "09xxxxxxxxx" : q.type === "telegram_id" ? "@username" : "پاسخ خود را بنویسید...")}
            className={`${inputCls} ${fieldErr ? "!border-female-normal" : ""}`} />
        )}
        {q.type === "long_text" && <textarea dir="rtl" rows={2} value={val} onChange={(e) => setAnswer(q.id, e.target.value, q)} onBlur={(e) => handleBlur(q.id, e.target.value, q)} placeholder={q.placeholder?.trim() || "بنویس..."} className={`${inputCls} resize-y leading-6 ${fieldErr ? "!border-female-normal" : ""}`} />}
        {q.type === "number" && <input type="text" inputMode="numeric" dir="rtl" value={val} onChange={(e) => setAnswer(q.id, e.target.value, q)} onBlur={(e) => handleBlur(q.id, e.target.value, q)} placeholder={q.placeholder?.trim() || "عدد را وارد کنید..."} className={`${inputCls} ${fieldErr ? "!border-female-normal" : ""}`} />}

        {q.type === "choice" && (
          <div className="flex flex-col gap-2">
            {(q.options || []).map((opt, i) => {
              const selected = val === opt;
              return (
                <button key={i} type="button" onClick={() => { setAnswer(q.id, opt, q); handleBlur(q.id, opt, q); }}
                  className={`relative flex items-center gap-2.5 text-right w-full border-2 rounded-pill-md [corner-shape:squircle] px-3 py-2 sm:py-2.5 transition-all duration-200 cursor-pointer hover:-translate-y-px ${selected ? "border-ecosystem-normal bg-ecosystem-light rotate-[-0.5deg]" : "border-ink/10 bg-white hover:border-ecosystem-normal/50"}`}>
                  {selected && <div aria-hidden="true" className="absolute top-[2px] left-[2px] w-full h-full bg-ecosystem-dark/15 rounded-pill-md [corner-shape:squircle] pointer-events-none" />}
                  <span className={`relative z-10 w-7 h-7 shrink-0 flex items-center justify-center rounded-full border-2 text-xs font-bold transition-colors duration-200 ${selected ? "border-ecosystem-normal bg-ecosystem-normal text-white" : "border-ink/15 text-male-normal"}`}>{faNum(i + 1)}</span>
                  <span className={`relative z-10 font-bold text-xs sm:text-sm ${selected ? "text-ecosystem-dark" : "text-ink"}`}>{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {q.type === "checkbox" && (
          <div className="flex flex-col gap-2">
            {(q.options || []).map((opt, i) => {
              const selected = Array.isArray(val) && val.includes(opt);
              return (
                <button key={i} type="button" onClick={() => { const cur = Array.isArray(val) ? [...val] : []; const next = selected ? cur.filter((v) => v !== opt) : [...cur, opt]; setAnswer(q.id, next, q); handleBlur(q.id, next, q); }}
                  className={`flex items-center gap-2.5 text-right w-full border-2 rounded-pill-md [corner-shape:squircle] px-3 py-2 transition-all duration-200 cursor-pointer ${selected ? "border-ecosystem-normal bg-ecosystem-light" : "border-ink/10 bg-white hover:border-ecosystem-normal/50"}`}>
                  <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-md border-2 text-[0.6rem] font-bold transition-colors duration-200 ${selected ? "border-ecosystem-normal bg-ecosystem-normal text-white" : "border-ink/15"}`}>{selected ? "✓" : ""}</span>
                  <span className={`font-semibold text-xs sm:text-sm ${selected ? "text-ecosystem-dark" : "text-ink"}`}>{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {q.type === "yes_no" && (
          <div className="grid grid-cols-2 gap-2">
            {["بله", "خیر"].map((opt) => (
              <button key={opt} type="button" onClick={() => { setAnswer(q.id, opt, q); handleBlur(q.id, opt, q); }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-pill-md [corner-shape:squircle] border-2 cursor-pointer transition-all duration-200 font-bold text-xs sm:text-sm ${val === opt ? (opt === "بله" ? "border-ecosystem-normal bg-ecosystem-light text-ecosystem-dark" : "border-female-normal bg-female-light text-female-dark") : "border-ink/10 bg-white text-ink hover:border-ink/25"}`}>{opt}</button>
            ))}
          </div>
        )}

        {q.type === "rating" && (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => { setAnswer(q.id, String(star), q); handleBlur(q.id, String(star), q); }} className={`text-lg sm:text-xl transition-transform duration-150 hover:scale-110 ${Number(val) >= star ? "text-college-normal" : "text-ink/20"}`}>★</button>)}
          </div>
        )}

        {fieldErr && (
          <motion.div initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 bg-female-light border border-female-normal rounded-pill-md px-2.5 py-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-female-normal shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span className="text-[0.6rem] sm:text-[0.65rem] font-bold text-female-normal">{fieldErr}</span>
          </motion.div>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-dvh dot-pattern bg-ecosystem-light flex flex-col overflow-x-hidden">
        <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between px-3 sm:px-4 py-2">
          <Logo linked={false} size="sm" />
        </div>
        <main className="flex-1 flex items-center justify-center px-3 py-4 sm:py-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md -rotate-[0.5deg]">
            <StickerCard theme="teal" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
              <div className="p-5 sm:p-7 flex flex-col items-center text-center gap-3">
                <motion.span className="text-4xl sm:text-5xl" animate={{ rotate: [0, -6, 6, -3, 3, 0] }}>🎉</motion.span>
                <h1 className="text-lg sm:text-xl font-black text-male-normal leading-snug">{form.exit_title || "ثبت‌نام با موفقیت انجام شد!"}</h1>
                <p className="font-semibold text-ink-soft leading-6 text-xs sm:text-sm max-w-md">{form.exit_message || "ممنون از ثبت‌نام شما."}</p>
                {scoreResult && <ScoreResult score={scoreResult.score} total={scoreResult.total} details={scoreResult.details} questions={sortedQuestions} />}
              </div>
            </StickerCard>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh dot-pattern bg-ecosystem-light flex flex-col overflow-x-hidden">
      <SEO title={form.title} description={form.description || `فرم ${form.title}`} url={`/f/${slug}`} />
      <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between px-3 sm:px-4 py-2">
        <Logo linked={false} size="sm" />
        <span className="text-[0.55rem] sm:text-[0.6rem] font-bold text-ink-subtle truncate max-w-[50vw]">{form.title}</span>
      </div>

      <main className="flex-1 flex items-start justify-center px-3 sm:px-4 py-3 sm:py-5 lg:py-6">
        <div className="w-full max-w-lg -rotate-[0.3deg]">
          <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
            <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999rem] w-px h-px opacity-0" />
            <div className="p-4 sm:p-5 lg:p-6">
              <form ref={formRef} onSubmit={openConfirm} className="flex flex-col gap-4 sm:gap-5">
                <div className="text-center mb-0.5">
                  <h1 className="text-base sm:text-lg lg:text-xl font-black text-male-normal leading-snug mb-1">{form.title}</h1>
                  {form.description && <p className="text-[0.6rem] sm:text-xs font-semibold text-ink-subtle leading-6">{form.description}</p>}
                  <Badge color="navy" rotate="rotate-[1.5deg]" className="mt-2">{faNum(sortedQuestions.length)} فیلد</Badge>
                </div>
                {sortedQuestions.map((q, i) => <div key={q.id} className={i % 2 ? "rotate-[0.2deg]" : "-rotate-[0.2deg]"}>{renderQuestion(q)}</div>)}
                {error && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-female-light border-2 border-female-normal rounded-pill-md px-3 py-2"><span className="text-female-normal text-sm">⚠️</span><span className="text-[0.6rem] sm:text-xs font-bold text-female-normal">{error}</span></motion.div>}
                <Button type="submit" variant="teal" size="md" rotate="-rotate-[1deg]" disabled={submitting} className="w-full text-xs sm:text-sm">{submitting ? "در حال ثبت..." : "ارسال و ثبت‌نام ✨"}</Button>
              </form>
            </div>
          </StickerCard>
        </div>
      </main>
      <ConfirmDialog open={showConfirm} onConfirm={doSubmit} onCancel={() => setShowConfirm(false)} unfilledFields={confirmUnfilled} totalRequired={sortedQuestions.filter((q) => q.required).length} filledCount={sortedQuestions.filter((q) => q.required && !isFieldEmpty(answers[q.id])).length} />
    </div>
  );
}
