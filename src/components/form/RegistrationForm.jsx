// ════════════════════════════════════════════════════════════════
// RegistrationForm — فرم ثبت‌نامی تک‌صفحه‌ای
// همه فیلدها یکجا نمایش داده می‌شوند
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StickerCard from "../ui/StickerCard";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Spinner from "../ui/Spinner";
import Logo from "../ui/Logo";
import { normalizeAnswerValue, validateAnswer } from "../../lib/validators";
import { faNum, parseUserAgent } from "../../lib/utils";
import { supabase } from "../../lib/supabaseClient";
import SEO from "../ui/SEO";

const rtlStyle = { direction: "rtl", textAlign: "right", unicodeBidi: "plaintext" };
const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink placeholder:text-ink/40 placeholder:font-medium focus:outline-none transition-all";

const selectCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all appearance-none cursor-pointer";

export default function RegistrationForm({ form, questions, slug }) {
  const [answers, setAnswers] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(Date.now());
  const formRef = useRef(null);

  // ─── سوالات مرتب بر اساس position ───
  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [questions]
  );

  // ─── اعتبارسنجی یک فیلد ───
  function validateField(q, value) {
    return validateAnswer(q, value);
  }

  function setAnswer(questionId, val, q) {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
    setError(null);
    // اعتبارسنجی آنی
    if (touched[questionId]) {
      const err = validateField(q, val);
      setFieldErrors((prev) => ({ ...prev, [questionId]: err }));
    }
  }

  function handleBlur(questionId, val, q) {
    setTouched((prev) => ({ ...prev, [questionId]: true }));
    const err = validateField(q, val);
    setFieldErrors((prev) => ({ ...prev, [questionId]: err }));
  }

  // ─── اعتبارسنجی کل فرم ───
  function validate() {
    const errors = {};
    let firstErrorId = null;
    for (const q of sortedQuestions) {
      const v = answers[q.id];
      const err = validateField(q, v);
      if (err) {
        errors[q.id] = err;
        if (!firstErrorId) firstErrorId = q.id;
      }
    }
    setFieldErrors(errors);
    setTouched(
      Object.fromEntries(sortedQuestions.map((q) => [q.id, true]))
    );
    if (firstErrorId) {
      const q = sortedQuestions.find((qq) => qq.id === firstErrorId);
      return { valid: false, error: `سوال «${q?.title}» خطا دارد.`, firstErrorId };
    }
    return { valid: true };
  }

  // ─── ثبت ───
  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (honeypot.trim() !== "") return;

    const validation = validate();
    if (!validation.valid) {
      setError(validation.error);
      // اسکرول به اولین فیلد خطا
      if (validation.firstErrorId) {
        const idx = sortedQuestions.findIndex((q) => q.id === validation.firstErrorId);
        const errorEl = formRef.current?.querySelectorAll("[data-error]")[0];
        errorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

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
        .filter((q) => {
          const v = answers[q.id];
          return !(v === undefined || v === null || String(v ?? "").trim() === "");
        })
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

  // ─── رندر فیلد سوال ───
  function renderQuestion(q, index) {
    const val = answers[q.id] ?? "";
    const fieldErr = touched[q.id] ? fieldErrors[q.id] : null;

    return (
      <div key={q.id} data-error={fieldErr ? "" : undefined} className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-navy">
            {q.title}
          </span>
          {q.required && (
            <span className="text-magenta-text text-xs">*</span>
          )}
        </label>

        {q.description && (
          <span className="text-xs font-medium text-ink-subtle">{q.description}</span>
        )}

        {/* short_text / email / phone_ir / telegram_id */}
        {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "telegram_id") && (
          <input
            type={q.type === "email" ? "email" : "text"}
            inputMode={q.type === "phone_ir" ? "tel" : "text"}
            dir={q.type === "email" || q.type === "phone_ir" ? "ltr" : "rtl"}
            value={val}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={getPlaceholder(q)}
            style={q.type === "email" || q.type === "phone_ir" ? undefined : rtlStyle}
            className={`${inputCls} ${fieldErr ? "!border-magenta" : ""}`}
          />
        )}

        {/* long_text */}
        {q.type === "long_text" && (
          <textarea
            dir="rtl"
            rows={3}
            value={val}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={getPlaceholder(q)}
            style={rtlStyle}
            className={`${inputCls} resize-y ${fieldErr ? "!border-magenta" : ""}`}
          />
        )}

        {/* number */}
        {q.type === "number" && (
          <input
            type="text"
            inputMode="numeric"
            dir="rtl"
            value={val}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={getPlaceholder(q)}
            style={rtlStyle}
            className={`${inputCls} ${fieldErr ? "!border-magenta" : ""}`}
          />
        )}

        {/* choice */}
        {q.type === "choice" && (
          <div className="relative">
            <select
              value={val}
              onChange={(e) => {
                setAnswer(q.id, e.target.value, q);
                handleBlur(q.id, e.target.value, q);
              }}
              className={`${selectCls} ${fieldErr ? "!border-magenta" : ""}`}
            >
              <option value="">— انتخاب کنید —</option>
              {(q.options || []).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">▾</span>
          </div>
        )}

        {/* yes_no */}
        {q.type === "yes_no" && (
          <div className="flex gap-3">
            {["بله", "خیر"].map((opt) => (
              <label
                key={opt}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-pill-md border-2 cursor-pointer transition-all font-bold text-sm ${
                  val === opt
                    ? "border-teal bg-teal/10 text-teal-text"
                    : "border-ink/15 bg-white text-ink hover:border-teal/40"
                }`}
              >
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  value={opt}
                  checked={val === opt}
                  onChange={(e) => {
                    setAnswer(q.id, e.target.value, q);
                    handleBlur(q.id, e.target.value, q);
                  }}
                  className="accent-teal"
                />
                {opt}
              </label>
            ))}
          </div>
        )}

        {/* rating */}
        {q.type === "rating" && (
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setAnswer(q.id, String(star), q);
                  handleBlur(q.id, String(star), q);
                }}
                className={`text-2xl transition-transform hover:scale-110 ${
                  Number(val) >= star ? "text-orange" : "text-ink/20"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        )}

        {fieldErr && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold text-magenta-text"
          >
            {fieldErr}
          </motion.span>
        )}
      </div>
    );
  }

  const defaultPlaceholders = {
    short_text: "پاسخ خود را بنویسید...",
    long_text: "بنویس...",
    email: "example@email.com",
    phone_ir: "09xxxxxxxxx",
    number: "عدد را وارد کنید...",
    telegram_id: "@username",
  };

  function getPlaceholder(q) {
    return (q.placeholder && q.placeholder.trim()) || defaultPlaceholders[q.type] || "پاسخ خود را بنویسید...";
  }

  // ─── صفحه موفقیت ───
  if (submitted) {
    return (
      <div className="min-h-dvh dot-pattern bg-bg-mint flex flex-col overflow-x-hidden">
        <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between px-4 py-3">
          <Logo linked={false} size="sm" />
        </div>
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg -rotate-[0.6deg]"
          >
            <StickerCard theme="teal" radius="rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none">
              <div className="p-8 sm:p-10 flex flex-col items-center text-center gap-4">
                <motion.span
                  className="text-6xl"
                  animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  
                </motion.span>
                <h1 className="text-2xl font-black text-navy leading-snug">
                  {form.exit_title || "ثبت‌نام با موفقیت انجام شد!"}
                </h1>
                <p className="font-semibold text-ink-soft leading-7 max-w-md">
                  {form.exit_message || "ممنون از ثبت‌نام شما. به زودی با شما تماس خواهیم گرفت."}
                </p>
              </div>
            </StickerCard>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh dot-pattern bg-bg-mint flex flex-col overflow-x-hidden">
      <SEO
        title={form.title}
        description={form.description || `فرم ${form.title} — پرسکاد`}
        url={`/f/${slug}`}
      />

      {/* هدر */}
      <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between px-4 py-3">
        <Logo linked={false} size="sm" />
        <span className="text-xs font-bold text-ink-subtle truncate max-w-[50vw]">
          {form.title}
        </span>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-6">
        <div className="w-full max-w-2xl -rotate-[0.3deg]">
          <StickerCard theme="white" radius="rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none">
            {/* تله ربات */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999rem] w-px h-px opacity-0"
            />

            <div className="p-6 sm:p-9">
              <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* هدر فرم */}
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-black text-navy leading-snug mb-2">
                    {form.title}
                  </h1>
                  {form.description && (
                    <p className="text-sm font-semibold text-ink-subtle leading-7">
                      {form.description}
                    </p>
                  )}
                  <Badge color="navy" rotate="rotate-[2deg]" className="mt-3">
                    {faNum(sortedQuestions.length)} فیلد
                  </Badge>
                </div>

                {/* فیلدها */}
                {sortedQuestions.map((q, i) => (
                  <div key={q.id} className={i % 2 ? "rotate-[0.3deg]" : "-rotate-[0.3deg]"}>
                    {renderQuestion(q, i)}
                  </div>
                ))}

                {/* خطا */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-magenta/10 border-2 border-magenta rounded-pill-md px-4 py-3"
                  >
                    <span className="text-magenta-text text-lg">⚠️</span>
                    <span className="text-sm font-bold text-magenta-text">{error}</span>
                  </motion.div>
                )}

                {/* دکمه ثبت */}
                <Button
                  type="submit"
                  variant="teal"
                  size="lg"
                  rotate="-rotate-[1deg]"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "در حال ثبت..." : "ارسال و ثبت‌نام در چالش"}
                </Button>
              </form>
            </div>
          </StickerCard>
        </div>
      </main>
    </div>
  );
}
