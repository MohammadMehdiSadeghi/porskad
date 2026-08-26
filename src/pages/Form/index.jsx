import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import Spinner from "../../components/ui/Spinner";
import Logo from "../../components/ui/Logo";
import { supabase } from "../../lib/supabaseClient";
import { normalizeAnswerValue } from "../../lib/validators";
import { faNum, faDuration, parseUserAgent } from "../../lib/utils";
import QuestionStep from "./QuestionStep";

const draftKey = (slug) => `porskad_draft_${slug}`;

// ─── صفحه‌ی «فرم در دسترس نیست» ───
function NotAvailable({ message }) {
  return (
    <div className="min-h-screen dot-pattern bg-bg-lavender flex items-center justify-center p-4">
      <div className="w-full max-w-md -rotate-[1deg]">
        <StickerCard theme="magenta">
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <span className="text-5xl rotate-[3deg]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-magenta-text">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <h1 className="text-2xl font-black text-navy">این فرم در دسترس نیست</h1>
            <p className="text-sm font-semibold text-ink-subtle leading-8">{message}</p>
            <Button as="a" href="/" variant="navy" size="sm">برگشت به خانه</Button>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}

export default function FormFill() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(null);

  const [step, setStep] = useState(-1);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState({});
  const [times, setTimes] = useState({});
  const [startedAt, setStartedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [honeypot, setHoneypot] = useState("");
  const stepEnteredAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: formData, error: formError } = await supabase
        .from("forms")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (cancelled) return;
      if (formError || !formData) {
        setUnavailable(
          "این فرم حذف شده، منتشرنشده یا لینک اشتباه است."
        );
        setLoading(false);
        return;
      }

      const { data: qData, error: qError } = await supabase
        .from("questions")
        .select("*")
        .eq("form_id", formData.id)
        .order("position", { ascending: true });

      if (cancelled) return;
      if (qError) {
        setUnavailable("خطا در بارگذاری سوال‌ها. دوباره تلاش کن.");
        setLoading(false);
        return;
      }

      setForm(formData);
      setQuestions(qData ?? []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const total = questions.length;

  useEffect(() => {
    if (!form || !total) return;
    try {
      const raw = localStorage.getItem(draftKey(slug));
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.savedAt && Date.now() - draft.savedAt < 7 * 86400_000) {
        if (draft.answers) setAnswers(draft.answers);
        if (draft.times) setTimes(draft.times);
        if (draft.startedAt) setStartedAt(draft.startedAt);
        if (typeof draft.step === "number" && draft.step >= 0 && draft.step < total) {
          setStep(draft.step);
          setDir(1);
        }
      }
    } catch { /* ignore */ }
  }, [form, total, slug]);

  useEffect(() => {
    if (!form || !startedAt || step < 0 || step >= total) return;
    localStorage.setItem(
      draftKey(slug),
      JSON.stringify({ step, answers, times, startedAt, savedAt: Date.now() })
    );
  }, [form, slug, step, answers, times, startedAt, total]);

  useEffect(() => {
    stepEnteredAt.current = Date.now();
  }, [step]);

  const currentQuestion = questions[step];

  const accrueTime = useCallback(() => {
    if (!currentQuestion) return;
    const spent = (Date.now() - stepEnteredAt.current) / 1000;
    setTimes((t) => ({ ...t, [currentQuestion.id]: (t[currentQuestion.id] ?? 0) + spent }));
  }, [currentQuestion]);

  const setAnswer = useCallback(
    (val) => {
      if (!currentQuestion) return;
      setAnswers((a) => ({ ...a, [currentQuestion.id]: val }));
    },
    [currentQuestion]
  );

  const goNext = useCallback(() => {
    if (step === -1) {
      setStartedAt((prev) => prev ?? Date.now());
      setDir(1);
      setStep(0);
      return;
    }
    accrueTime();
    setDir(1);
    setStep((s) => Math.min(s + 1, total));
  }, [step, total, accrueTime]);

  const goBack = useCallback(() => {
    if (step <= -1) return;
    accrueTime();
    setDir(-1);
    setStep((s) => s - 1);
  }, [step, accrueTime]);

  const submit = useCallback(async () => {
    if (submitting) return;
    if (honeypot.trim() !== "") return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const ua = parseUserAgent();
      const nowIso = new Date().toISOString();
      const duration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;

      const { data: responseRow, error: respError } = await supabase
        .from("responses")
        .insert({
          form_id: form.id,
          is_complete: true,
          started_at: new Date(startedAt ?? Date.now()).toISOString(),
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

      const rows = questions
        .filter((q) => {
          const v = answers[q.id];
          return !(v === undefined || v === null || String(v ?? "").trim() === "");
        })
        .map((q) => ({
          response_id: responseRow.id,
          question_id: q.id,
          value: normalizeAnswerValue(q, answers[q.id]),
          time_spent_seconds: Math.round(times[q.id] ?? 0),
        }));

      if (rows.length) {
        const { error: ansError } = await supabase.from("answers").insert(rows);
        if (ansError) throw ansError;
      }

      localStorage.removeItem(draftKey(slug));
      setDir(1);
      setStep(total);
    } catch (err) {
      console.error(err);
      setSubmitError("ثبت جواب ناموفق بود؛ اتصال اینترنت را چک کن و دوباره بزن.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, honeypot, form, questions, answers, times, startedAt, slug, total]);

  const progressValue = step < 0 ? 0 : Math.min(step, total);
  const approxMinutes = useMemo(() => Math.max(1, Math.round(total * 0.4)), [total]);

  if (loading) {
    return (
      <div className="min-h-screen dot-pattern bg-bg-mint">
        <Spinner label="فرم داره لود می‌شه..." />
      </div>
    );
  }

  if (unavailable) return <NotAvailable message={unavailable} />;
  if (!form) return null;

  return (
    <div className="min-h-screen dot-pattern bg-bg-mint flex flex-col">
      {/* هدر باریک */}
      <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between px-4 py-3">
        <Logo linked={false} size="sm" />
        <span className="text-xs font-bold text-ink-subtle truncate max-w-[50vw]">
          {form.title}
        </span>
      </div>

      {/* نوار پیشرفت */}
      {step >= 0 && step < total && (
        <div className="w-full max-w-xl mx-auto px-4 pb-2">
          <ProgressBar value={progressValue} max={total} showLabel />
        </div>
      )}

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-6">
        <div className={`w-full max-w-xl ${step === -1 ? "-rotate-[0.6deg]" : "rotate-[0.4deg]"}`}>
          <StickerCard theme="white" radius="rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none">
            {/* تله‌ی ربات‌ها */}
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

            <div className="p-6 sm:p-9 min-h-[22rem] flex flex-col">
              <AnimatePresence mode="wait" custom={dir}>
                {/* ─── صفحه‌ی خوش‌آمد ─── */}
                {step === -1 && (
                  <motion.div
                    key="welcome"
                    custom={dir}
                    initial={{ opacity: 0, x: dir * 48 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -48 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="flex-1 flex flex-col items-center text-center justify-center gap-4"
                  >
                    {total > 0 && (
                      <Badge color="navy" rotate="rotate-[2deg]">
                        {faNum(total)} سوال · حدود {faNum(approxMinutes)} دقیقه
                      </Badge>
                    )}
                    <span className="text-5xl rotate-[4deg]">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-text">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </span>
                    <h1 className="text-3xl font-black text-navy leading-snug">
                      {form.welcome_title}
                    </h1>
                    <p className="font-semibold text-ink-soft leading-8 max-w-md">
                      {form.welcome_message}
                    </p>
                    <div className="mt-3">
                      <Button
                        variant="teal"
                        size="lg"
                        rotate="-rotate-[1.5deg]"
                        disabled={total === 0}
                        onClick={goNext}
                      >
                        {total === 0 ? "این فرم هنوز سوالی ندارد" : "بزن بریم! 🚀"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ─── سوال‌ها ─── */}
                {step >= 0 && step < total && currentQuestion && (
                  <motion.div
                    key={currentQuestion.id}
                    custom={dir}
                    initial={{ opacity: 0, x: dir * 48 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -48 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex-1 flex flex-col"
                  >
                    <QuestionStep
                      question={currentQuestion}
                      index={step}
                      total={total}
                      value={answers[currentQuestion.id]}
                      timeSpent={times[currentQuestion.id] ?? 0}
                      onChange={setAnswer}
                      onAdvance={goNext}
                    />
                    <div className="mt-6 flex items-center justify-between">
                      <Button variant="ghost" size="sm" onClick={goBack}>
                        ↩ برگشت
                      </Button>
                      {step < total - 1 ? (
                        <Button variant="navy" onClick={goNext}>
                          سوال بعدی ←
                        </Button>
                      ) : (
                        <Button
                          variant="magenta"
                          onClick={submit}
                          disabled={submitting}
                          rotate="rotate-[1deg]"
                        >
                          {submitting ? "در حال ثبت..." : "ثبت نهایی ✨"}
                        </Button>
                      )}
                    </div>
                    {submitError && (
                      <div className="mt-3 self-end rotate-[-1deg] bg-white border-2 border-magenta rounded-pill-md px-3.5 py-2 text-sm font-bold text-magenta-text">
                        {submitError}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ─── صفحه‌ی خروج ─── */}
                {step >= total && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex-1 flex flex-col items-center text-center justify-center gap-4"
                  >
                    <motion.span
                      className="text-6xl"
                      animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                      transition={{ duration: 0.7, delay: 0.15 }}
                    >
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-text">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </motion.span>
                    <h1 className="text-3xl font-black text-navy leading-snug">
                      {form.exit_title}
                    </h1>
                    <p className="font-semibold text-ink-soft leading-8 max-w-md">
                      {form.exit_message}
                    </p>
                    {startedAt && (
                      <span className="text-xs font-medium text-ink-subtle">
                        این پاسخ در {faDuration(Math.round((Date.now() - startedAt) / 1000))} ثبت شد
                      </span>
                    )}
                    <div className="mt-2">
                      <Button as="a" href="/" variant="white" size="sm">
                        رفتن به صفحه‌ی اصلی
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </StickerCard>
        </div>
      </main>
    </div>
  );
}
