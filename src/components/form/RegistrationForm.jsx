// ════════════════════════════════════════════════════════════════
// RegistrationForm — فرم ثبت‌نامی تک‌صفحه‌ای
// همه فیلدها یکجا نمایش داده می‌شوند
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StickerCard from "../ui/StickerCard";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Spinner from "../ui/Spinner";
import Logo from "../ui/Logo";
import { normalizeAnswerValue, validateAnswer } from "../../lib/validators";
import { faNum, parseUserAgent } from "../../lib/utils";
import { QUESTION_TYPES } from "../../lib/questionTypes";
import { supabase } from "../../lib/supabaseClient";
import ConfirmDialog from "../ui/ConfirmDialog";
import SEO from "../ui/SEO";

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink placeholder:text-ink/40 placeholder:font-medium focus:outline-none transition-all";

const selectCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all appearance-none cursor-pointer";

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
  const formRef = useRef(null);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [questions]
  );

  function setAnswer(questionId, val, q) {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
    setError(null);
    if (touched[questionId]) {
      const err = validateAnswer(q, val);
      setFieldErrors((prev) => ({ ...prev, [questionId]: err }));
    }
  }

  function handleBlur(questionId, val, q) {
    setTouched((prev) => ({ ...prev, [questionId]: true }));
    const err = validateAnswer(q, val);
    setFieldErrors((prev) => ({ ...prev, [questionId]: err }));
  }

  // ─── باکس تایید ───
  function openConfirm(e) {
    e.preventDefault();
    if (submitting) return;

    // ولیدیشن همه فیلدها
    const errors = {};
    for (const q of sortedQuestions) {
      const err = validateAnswer(q, answers[q.id]);
      if (err) errors[q.id] = err;
    }
    setFieldErrors(errors);
    setTouched(Object.fromEntries(sortedQuestions.map((q) => [q.id, true])));

    // جمع‌آوری فیلدهای مشکل‌دار
    const unfilled = [];
    for (const q of sortedQuestions) {
      if (errors[q.id]) {
        unfilled.push({ id: q.id, title: `${q.title} (${errors[q.id]})` });
      } else if (q.required && isFieldEmpty(answers[q.id])) {
        unfilled.push({ id: q.id, title: q.title });
      }
    }
    setConfirmUnfilled(unfilled);
    setShowConfirm(true);
  }

  // ─── ثبت نهایی ───
  async function doSubmit() {
    setShowConfirm(false);
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const ua = parseUserAgent();
      const nowIso = new Date().toISOString();
      const duration = Math.round((Date.now() - startedAt) / 1000);

      const { data: responseRow, error: respError } = await supabase
        .from("responses")
        .insert({
          form_id: form.id,
          is_complete: true,
          started_at: new Date(startedAt).toISOString(),
          submitted_at: nowIso,
          duration_seconds: duration,
          device: ua.device,
          browser: ua.browser,
          os: ua.os,
          user_agent: navigator.userAgent,
          referer: document.referrer || null,
        })
        .select("id")
        .single();

      if (respError) throw respError;

      const rows = sortedQuestions
        .filter((q) => !isFieldEmpty(answers[q.id]))
        .map((q) => ({
          response_id: responseRow.id,
          question_id: q.id,
          value: normalizeAnswerValue(q, answers[q.id]),
          time_spent_seconds: 0,
        }));

      if (rows.length) {
        const { error: ansError } = await supabase.from("answers").insert(rows);
        if (ansError) throw ansError;
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("ثبت ناموفق بود؛ دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(q) {
    const val = answers[q.id] ?? "";
    const fieldErr = touched[q.id] ? fieldErrors[q.id] : null;

    return (
      <div key={q.id} className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-navy">{q.title}</span>
          {q.required && <span className="text-magenta-text text-xs">*</span>}
        </label>
        {q.description && <span className="text-xs font-medium text-ink-subtle">{q.description}</span>}

        {/* short_text / email / phone_ir / telegram_id */}
        {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "telegram_id") && (
          <input
            type={q.type === "email" ? "email" : "text"}
            inputMode={q.type === "phone_ir" ? "tel" : "text"}
            dir={q.type === "email" || q.type === "phone_ir" ? "ltr" : "rtl"}
            value={val}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={(q.placeholder?.trim()) || (q.type === "email" ? "example@email.com" : q.type === "phone_ir" ? "09xxxxxxxxx" : q.type === "telegram_id" ? "@username" : "پاسخ خود را بنویسید...")}
            className={`${inputCls} ${fieldErr ? "!border-magenta" : ""}`}
          />
        )}

        {/* long_text */}
        {q.type === "long_text" && (
          <textarea
            dir="rtl" rows={3} value={val}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={q.placeholder?.trim() || "بنویس..."}
            className={`${inputCls} resize-y ${fieldErr ? "!border-magenta" : ""}`}
          />
        )}

        {/* number */}
        {q.type === "number" && (
          <input
            type="text" inputMode="numeric" dir="rtl" value={val}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={q.placeholder?.trim() || "عدد را وارد کنید..."}
            className={`${inputCls} ${fieldErr ? "!border-magenta" : ""}`}
          />
        )}

        {/* choice */}
        {q.type === "choice" && (
          <div className="relative">
            <select
              value={val}
              onChange={(e) => { setAnswer(q.id, e.target.value, q); handleBlur(q.id, e.target.value, q); }}
              className={`${selectCls} ${fieldErr ? "!border-magenta" : ""}`}
            >
              <option value="">— انتخاب کنید —</option>
              {(q.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">▾</span>
          </div>
        )}

        {/* checkbox (چندگزینه‌ای) */}
        {q.type === "checkbox" && (
          <div className="flex flex-col gap-2">
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
                  className={`flex items-center gap-3 text-right w-full border-2 rounded-pill-md px-4 py-3 transition-all cursor-pointer ${
                    selected ? "border-teal bg-teal/10" : "border-ink/20 bg-white hover:border-teal"
                  }`}>
                  <span className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-md border-2 text-sm ${
                    selected ? "border-teal bg-teal text-white" : "border-ink/25"
                  }`}>{selected ? "✓" : ""}</span>
                  <span className="font-semibold text-ink">{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* yes_no */}
        {q.type === "yes_no" && (
          <div className="flex gap-3">
            {["بله", "خیر"].map((opt) => (
              <button key={opt} type="button"
                onClick={() => { setAnswer(q.id, opt, q); handleBlur(q.id, opt, q); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-pill-md border-2 cursor-pointer transition-all font-bold text-sm ${
                  val === opt ? "border-teal bg-teal/10 text-teal-text" : "border-ink/15 bg-white text-ink hover:border-teal/40"
                }`}>{opt}</button>
            ))}
          </div>
        )}

        {/* rating */}
        {q.type === "rating" && (
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button"
                onClick={() => { setAnswer(q.id, String(star), q); handleBlur(q.id, String(star), q); }}
                className={`text-2xl transition-transform hover:scale-110 ${Number(val) >= star ? "text-orange" : "text-ink/20"}`}>★</button>
            ))}
          </div>
        )}

        {/* ارور فیلد */}
        {fieldErr && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-magenta/10 border-2 border-magenta rounded-pill-md px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-magenta-text shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span className="text-sm font-bold text-magenta-text">{fieldErr}</span>
          </motion.div>
        )}
      </div>
    );
  }

  // ─── صفحه موفقیت ───
  if (submitted) {
    return (
      <div className="min-h-dvh dot-pattern bg-bg-mint flex flex-col overflow-x-hidden">
        <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between px-4 py-3">
          <Logo linked={false} size="sm" />
        </div>
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="w-full max-w-lg -rotate-[0.6deg]">
            <StickerCard theme="teal" radius="rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none">
              <div className="p-8 sm:p-10 flex flex-col items-center text-center gap-4">
                <motion.span className="text-6xl" animate={{ rotate: [0, -8, 8, -4, 4, 0] }} transition={{ duration: 0.7, delay: 0.2 }}>🎉</motion.span>
                <h1 className="text-2xl font-black text-navy leading-snug">{form.exit_title || "ثبت‌نام با موفقیت انجام شد!"}</h1>
                <p className="font-semibold text-ink-soft leading-7 max-w-md">{form.exit_message || "ممنون از ثبت‌نام شما."}</p>
              </div>
            </StickerCard>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh dot-pattern bg-bg-mint flex flex-col overflow-x-hidden">
      <SEO title={form.title} description={form.description || `فرم ${form.title} — پرسکاد`} url={`/f/${slug}`} />

      <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between px-4 py-3">
        <Logo linked={false} size="sm" />
        <span className="text-xs font-bold text-ink-subtle truncate max-w-[50vw]">{form.title}</span>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-6">
        <div className="w-full max-w-2xl -rotate-[0.3deg]">
          <StickerCard theme="white" radius="rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none">
            <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999rem] w-px h-px opacity-0" />

            <div className="p-6 sm:p-9">
              <form ref={formRef} onSubmit={openConfirm} className="flex flex-col gap-6">
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-black text-navy leading-snug mb-2">{form.title}</h1>
                  {form.description && <p className="text-sm font-semibold text-ink-subtle leading-7">{form.description}</p>}
                  <Badge color="navy" rotate="rotate-[2deg]" className="mt-3">{faNum(sortedQuestions.length)} فیلد</Badge>
                </div>

                {sortedQuestions.map((q, i) => (
                  <div key={q.id} className={i % 2 ? "rotate-[0.3deg]" : "-rotate-[0.3deg]"}>
                    {renderQuestion(q)}
                  </div>
                ))}

                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-magenta/10 border-2 border-magenta rounded-pill-md px-4 py-3">
                    <span className="text-magenta-text text-lg">⚠️</span>
                    <span className="text-sm font-bold text-magenta-text">{error}</span>
                  </motion.div>
                )}

                <Button type="submit" variant="teal" size="lg" rotate="-rotate-[1deg]" disabled={submitting} className="w-full">
                  {submitting ? "در حال ثبت..." : "ارسال و ثبت‌نام ✨"}
                </Button>
              </form>
            </div>
          </StickerCard>
        </div>
      </main>

      <ConfirmDialog
        open={showConfirm}
        onConfirm={doSubmit}
        onCancel={() => setShowConfirm(false)}
        unfilledFields={confirmUnfilled}
        totalRequired={sortedQuestions.filter((q) => q.required).length}
        filledCount={sortedQuestions.filter((q) => q.required && !isFieldEmpty(answers[q.id])).length}
      />
    </div>
  );
}
