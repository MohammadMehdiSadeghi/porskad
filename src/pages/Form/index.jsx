import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import Spinner from "../../components/ui/Spinner";
import { FormFillSkeleton } from "../../components/ui/Skeleton";
import Logo from "../../components/ui/Logo";
import { supabase } from "../../lib/supabaseClient";
import { normalizeAnswerValue, validateAnswer } from "../../lib/validators";
import { calculateFlow, evaluateNextStep } from "../../lib/logic/flowEngine";
import { faNum, faDuration, parseUserAgent, generateUuid } from "../../lib/utils";
import { QUESTION_TYPES } from "../../lib/questionTypes";
import QuestionStep from "./QuestionStep";
import RegistrationForm from "../../components/form/RegistrationForm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SEO from "../../components/ui/SEO";
import { calculateScore, hasScoring } from "../../lib/scoring";
import ScoreResult from "../../components/ui/ScoreResult";
import { sendToTelegram } from "../../lib/telegram";

const draftKey = (slug) => `porskad_draft_${slug}`;

function normalizeConditionGroup(cg) {
  if (!cg) return null;
  const groupOp = cg.group_operator || cg.operator || "AND";
  const conds = (cg.conditions || []).map((c) => {
    if (c.source) return c;
    return { ...c, source: "answer", questionId: c.source_question_id || c.questionId || null, variableKey: null, optionId: null, rowId: null };
  });
  return { group_operator: groupOp, conditions: conds };
}

function NotAvailable({ message }) {
  return (
    <div className="min-h-dvh dot-pattern bg-male-light flex items-center justify-center p-3">
      <div className="w-full max-w-sm -rotate-[0.5deg]">
        <StickerCard theme="magenta">
          <div className="p-5 sm:p-6 flex flex-col items-center text-center gap-3">
            <span className="text-3xl sm:text-4xl rotate-[2deg]"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-female-normal"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
            <h1 className="text-lg sm:text-xl font-black text-male-normal">این فرم در دسترس نیست</h1>
            <p className="text-sm font-semibold text-ink-subtle leading-6">{message}</p>
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
  const [logicRules, setLogicRules] = useState([]);
  const [formType, setFormType] = useState("step_by_step");
  const [step, setStep] = useState(-1);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState({});
  const [times, setTimes] = useState({});
  const [startedAt, setStartedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [requiredError, setRequiredError] = useState(null);
  const [honeypot, setHoneypot] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmUnfilled, setConfirmUnfilled] = useState([]);
  const stepEnteredAt = useRef(Date.now());
  const jumpQueueRef = useRef([]);
  const [variables, setVariables] = useState({});
  const [scoreResult, setScoreResult] = useState(null);
  const appliedSigRef = useRef("");

  const hiddenFields = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const hf = {};
    for (const [key, val] of params.entries()) { if (key.startsWith("hf_")) hf[key.slice(3)] = val; }
    return hf;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: formData, error: formError } = await supabase.from("forms").select("*").eq("slug", slug).eq("published", true).eq("archived", false).maybeSingle();
      if (cancelled) return;
      if (formError || !formData) { setUnavailable("This form has been deleted, unpublished, archived, or the link is incorrect."); setLoading(false); return; }
      const { data: qData, error: qError } = await supabase.from("questions").select("*").eq("form_id", formData.id).order("position", { ascending: true });
      if (cancelled) return;
      if (qError) { setUnavailable("خطا در بارگذاری سوال‌ها."); setLoading(false); return; }
      setForm(formData); setFormType(formData.form_type || "step_by_step");
      setQuestions((qData ?? []).map((q) => ({ ...q, conditions: normalizeConditionGroup(q.conditions ?? null), jump_actions: q.jump_actions ?? [] })));
      try {
        const { data: lrs, error: lrError } = await supabase.from("logic_rules").select("*").eq("form_id", formData.id).order("priority");
        if (lrError) setLogicRules([]);
        else setLogicRules((lrs ?? []).map((r) => ({
          ...r,
          conditions: r.conditions_json ?? [],
          action: {
            type: r.action_type,
            targetId: r.action_target_id,
            endId: r.action_end_id ?? null,
            url: r.action_url ?? null,
            variableKey: r.action_variable_key ?? null,
            amount: r.action_amount ?? 0,
          },
        })));
      } catch { setLogicRules([]); }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  // اعمال تم دارک یا روشن بر اساس URL ?theme= یا form.default_theme یا سیستم
  useEffect(() => {
    if (loading && !form) return;
    const urlTheme = new URLSearchParams(window.location.search).get("theme");
    const targetTheme = urlTheme || form?.default_theme || "light";

    const applyTheme = () => {
      let shouldBeDark = false;
      if (targetTheme === "dark") {
        shouldBeDark = true;
      } else if (targetTheme === "system") {
        shouldBeDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      }

      if (shouldBeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme();

    if (targetTheme === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme();
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handler);
        return () => mediaQuery.removeListener(handler);
      }
    }
  }, [form?.default_theme, loading]);

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
        if (typeof draft.step === "number" && draft.step >= 0 && draft.step < total) { setStep(draft.step); setDir(1); }
      }
    } catch {}
  }, [form, total, slug]);

  useEffect(() => {
    if (!form || !startedAt || step < 0 || step >= total) return;
    localStorage.setItem(draftKey(slug), JSON.stringify({ step, answers, times, startedAt, savedAt: Date.now() }));
  }, [form, slug, step, answers, times, startedAt, total]);

  useEffect(() => { stepEnteredAt.current = Date.now(); }, [step]);

  const flow = useMemo(() => calculateFlow(questions, logicRules, answers, variables, hiddenFields), [questions, logicRules, answers, variables, hiddenFields]);
  const visibleQuestions = flow.visibleQuestions;
  const visibleIds = flow.visibleIds;
  const visibleTotal = visibleQuestions.length;
  const formEnded = flow.ended;

  useEffect(() => {
    if (flow.variableChanges?.length > 0) {
      const sig = JSON.stringify(flow.variableChanges);
      if (appliedSigRef.current === sig) return;
      appliedSigRef.current = sig;
      setVariables((prev) => {
        const next = { ...prev };
        for (const vc of flow.variableChanges) {
          next[vc.variableKey] = (Number(next[vc.variableKey]) || 0) + vc.amount;
        }
        return next;
      });
    } else {
      appliedSigRef.current = "";
    }
  }, [flow.variableChanges]);

  const currentQuestion = questions[step];
  const accrueTime = useCallback(() => { if (!currentQuestion) return; const spent = (Date.now() - stepEnteredAt.current) / 1000; setTimes((t) => ({ ...t, [currentQuestion.id]: (t[currentQuestion.id] ?? 0) + spent })); }, [currentQuestion]);
  const setAnswer = useCallback((val) => { if (!currentQuestion) return; setAnswers((a) => ({ ...a, [currentQuestion.id]: val })); setRequiredError(null); }, [currentQuestion]);

  const currentVisibleIndex = useMemo(() => { if (step < 0 || !currentQuestion) return 0; return visibleQuestions.findIndex((q) => q.id === currentQuestion.id) + 1; }, [step, currentQuestion, visibleQuestions]);
  const findNextVisibleStep = useCallback((fromStep) => { for (let i = fromStep + 1; i < total; i++) { if (visibleIds.has(questions[i]?.id)) return i; } return total; }, [questions, total, visibleIds]);
  const findPrevVisibleStep = useCallback((fromStep) => { for (let i = fromStep - 1; i >= 0; i--) { if (visibleIds.has(questions[i]?.id)) return i; } return -1; }, [questions, visibleIds]);

  useEffect(() => {
    if (step >= 0 && step < total && questions[step]) {
      if (!visibleIds.has(questions[step]?.id)) {
        const nextStep = findNextVisibleStep(step);
        if (nextStep < total) {
          setStep(nextStep);
        } else {
          const prevStep = findPrevVisibleStep(step);
          setStep(prevStep >= 0 ? prevStep : 0);
        }
      }
    }
  }, [step, total, questions, visibleIds, findNextVisibleStep, findPrevVisibleStep]);
  const validateCurrent = useCallback(() => { if (!currentQuestion) return { valid: true }; const err = validateAnswer(currentQuestion, answers[currentQuestion.id]); if (err) return { valid: false, error: err }; return { valid: true }; }, [currentQuestion, answers]);
  const currentValidationError = useMemo(() => { if (!currentQuestion) return null; return validateAnswer(currentQuestion, answers[currentQuestion.id]) || null; }, [currentQuestion, answers]);

  const isLastVisibleStep = useMemo(() => {
    if (step < 0) return false;
    return findNextVisibleStep(step) >= total;
  }, [step, findNextVisibleStep, total]);

  const openConfirm = useCallback(() => {
    if (submitting || honeypot.trim() !== "") return;
    const errors = [];
    for (const q of visibleQuestions) { const err = validateAnswer(q, answers[q.id]); if (err) errors.push({ id: q.id, title: `${q.title} — ${err}`, typeLabel: QUESTION_TYPES[q.type]?.label || q.type }); }
    if (errors.length > 0) { setRequiredError(errors[0].title); setConfirmUnfilled(errors); setShowConfirm(false); return; }
    setRequiredError(null); setConfirmUnfilled([]); setShowConfirm(true);
  }, [submitting, honeypot, visibleQuestions, answers]);

  const goNext = useCallback(() => {
    if (step === -1) { setStartedAt((prev) => prev ?? Date.now()); setDir(1); setStep(findNextVisibleStep(-1)); setRequiredError(null); return; }
    const result = validateCurrent();
    if (!result.valid) { setRequiredError(result.error); return; }
    setRequiredError(null); accrueTime(); setDir(1);
    if (currentQuestion) {
      const jumpResult = evaluateNextStep(currentQuestion, answers[currentQuestion.id], questions, visibleQuestions, jumpQueueRef.current);
      if (jumpResult.type === "end") { openConfirm(); return; }
      if (jumpResult.type === "redirect" && jumpResult.url) { window.open(jumpResult.url, "_blank"); openConfirm(); return; }
      if (jumpResult.type === "jump" && jumpResult.targetId) { const idx = questions.findIndex((q) => q.id === jumpResult.targetId); if (idx >= 0) { setStep(idx); return; } }
    }
    const nextStep = findNextVisibleStep(step);
    if (nextStep >= total) {
      openConfirm();
    } else {
      setStep(nextStep);
    }
  }, [step, accrueTime, validateCurrent, findNextVisibleStep, currentQuestion, answers, questions, visibleQuestions, total, openConfirm]);

  const goBack = useCallback(() => { if (step <= -1) return; accrueTime(); setDir(-1); setStep((s) => findPrevVisibleStep(s)); }, [step, accrueTime, findPrevVisibleStep]);

  const doSubmit = useCallback(async () => {
    setShowConfirm(false);
    if (submitting || honeypot.trim() !== "") return;
    setSubmitting(true); setSubmitError(null);
    try {
      const ua = parseUserAgent(); const nowIso = new Date().toISOString();
      const responseId = generateUuid();
      const { error: respError } = await supabase.from("responses").insert({
        id: responseId,
        form_id: form.id, is_complete: true, started_at: new Date(startedAt ?? Date.now()).toISOString(), submitted_at: nowIso,
        duration_seconds: startedAt ? Math.round((Date.now() - startedAt) / 1000) : null,
        device: ua.device, browser: ua.browser, os: ua.os, user_agent: navigator.userAgent, referer: document.referrer || null,
      });
      if (respError) throw respError;
      const rows = visibleQuestions.filter((q) => { const v = answers[q.id]; return !(v === undefined || v === null || String(v ?? "").trim() === ""); }).map((q) => ({ response_id: responseId, question_id: q.id, value: normalizeAnswerValue(q, answers[q.id]), time_spent_seconds: Math.round(times[q.id] ?? 0) }));
      if (rows.length) { const { error: ansError } = await supabase.from("answers").insert(rows); if (ansError) throw ansError; }
      localStorage.removeItem(draftKey(slug));
      sendToTelegram(form.id, responseId);
      if (hasScoring(questions)) setScoreResult(calculateScore(visibleQuestions, answers));
      setDir(1); setStep(total);
    } catch (err) { console.error(err); setSubmitError("ثبت جواب ناموفق بود؛ دوباره تلاش کن."); }
    finally { setSubmitting(false); }
  }, [submitting, honeypot, form, visibleQuestions, questions, answers, times, startedAt, slug, total]);

  useEffect(() => { if (formEnded && step >= 0 && step < total) { accrueTime(); setDir(1); setStep(total); } }, [formEnded]);

  const progressValue = step < 0 ? 0 : currentVisibleIndex;
  const approxMinutes = useMemo(() => Math.max(1, Math.round(visibleTotal * 0.4)), [visibleTotal]);

  if (loading) return <FormFillSkeleton />;
  if (unavailable) return <NotAvailable message={unavailable} />;
  if (!form) return null;
  if (formType === "registration") return <RegistrationForm form={form} questions={questions} logicRules={logicRules} hiddenFields={hiddenFields} slug={slug} />;

  return (
    <div className="min-h-dvh dot-pattern bg-ecosystem-light dark:bg-[#0B0F19] text-ink dark:text-slate-100 flex flex-col overflow-x-hidden transition-colors duration-200">
      <SEO title={form.title} description={form.description || `فرم ${form.title}`} url={`/f/${slug}`} />
      <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between px-3 sm:px-4 py-2">
        <Logo linked={false} size="sm" />
        <span className="text-xs sm:text-sm font-bold text-ink-subtle dark:text-slate-400 truncate max-w-[50vw]">{form.title}</span>
      </div>
      {step >= 0 && step < total && <div className="w-full max-w-lg mx-auto px-3 pb-1"><ProgressBar value={progressValue} max={visibleTotal} showLabel /></div>}

      <main className="flex-1 flex items-start sm:items-center justify-center px-3 sm:px-4 py-3 sm:py-5 overflow-x-hidden">
        <div className={`w-full max-w-2xl ${step === -1 ? "-rotate-[0.5deg]" : "rotate-[0.3deg]"}`}>
          <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
            <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999rem] w-px h-px opacity-0" />
            <div className="p-4 sm:p-5 lg:p-6 min-h-[18rem] sm:min-h-[20rem] flex flex-col">
              <AnimatePresence mode="wait" custom={dir}>
                {step === -1 && (
                  <motion.div key="welcome" custom={dir} initial={{ opacity: 0, x: dir * 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -32 }} transition={{ duration: 0.22 }} className="flex-1 flex flex-col items-center text-center justify-center gap-2.5 sm:gap-3">
                    {visibleTotal > 0 && <Badge color="navy" rotate="rotate-[1.5deg]">{faNum(visibleTotal)} سوال · حدود {faNum(approxMinutes)} دقیقه</Badge>}
                    <span className="text-3xl sm:text-4xl rotate-[3deg]"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ecosystem-dark dark:text-teal-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-male-normal dark:text-white leading-snug">{form.welcome_title}</h1>
                    <p className="font-semibold text-ink-soft dark:text-slate-300 leading-7 text-sm sm:text-base max-w-sm">{form.welcome_message}</p>
                    <div className="mt-1.5 sm:mt-2"><Button variant="teal" size="md" rotate="-rotate-[1deg]" disabled={visibleTotal === 0} onClick={goNext} className="text-sm sm:text-base">{visibleTotal === 0 ? "این فرم هنوز سوالی ندارد" : "شروع پاسخ‌دهی"}</Button></div>
                  </motion.div>
                )}

                {step >= 0 && step < total && currentQuestion && (
                  <motion.div key={currentQuestion.id} custom={dir} initial={{ opacity: 0, x: dir * 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -32 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col">
                    <QuestionStep question={currentQuestion} index={currentVisibleIndex - 1} total={visibleTotal} value={answers[currentQuestion.id]} timeSpent={times[currentQuestion.id] ?? 0} onChange={setAnswer} onAdvance={goNext} />
                    {requiredError && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-female-light dark:bg-pink-950/40 border-2 border-female-normal rounded-pill-md px-3 py-2 mt-2.5 sm:mt-3">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-female-normal shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span className="text-xs sm:text-sm font-bold text-female-normal dark:text-pink-300">{requiredError}</span>
                      </motion.div>
                    )}
                    <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2">
                      <Button variant="ghost" size="sm" onClick={goBack} className="text-xs sm:text-sm">برگشت</Button>
                      {!isLastVisibleStep ? (
                        <Button variant="navy" onClick={goNext} disabled={!!currentValidationError} className={`text-xs sm:text-sm ${currentValidationError ? "opacity-50 cursor-not-allowed" : ""}`}>سوال بعدی</Button>
                      ) : (
                        <Button variant="magenta" onClick={openConfirm} disabled={submitting || !!currentValidationError} rotate="rotate-[0.5deg]" className={`text-xs sm:text-sm ${currentValidationError && !submitting ? "opacity-50 cursor-not-allowed" : ""}`}>{submitting ? "در حال ثبت..." : "ثبت نهایی"}</Button>
                      )}
                    </div>
                    {submitError && <div className="mt-2 self-end rotate-[-0.5deg] bg-white dark:bg-slate-800 border-2 border-female-normal rounded-pill-md px-2.5 py-1.5 text-xs sm:text-sm font-bold text-female-normal">{submitError}</div>}
                  </motion.div>
                )}

                {step >= total && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center text-center justify-center gap-2.5 sm:gap-3">
                    <motion.span className="text-4xl sm:text-5xl" animate={{ rotate: [0, -6, 6, -3, 3, 0] }} transition={{ duration: 0.6, delay: 0.1 }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ecosystem-normal"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </motion.span>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-male-normal dark:text-white leading-snug">{form.exit_title}</h1>
                    <p className="font-semibold text-ink-soft dark:text-slate-300 leading-7 text-sm sm:text-base max-w-sm">{form.exit_message}</p>
                    {scoreResult && <ScoreResult score={scoreResult.score} total={scoreResult.total} details={scoreResult.details} questions={questions} />}
                    {startedAt && <span className="text-xs sm:text-sm font-medium text-ink-subtle dark:text-slate-400">این پاسخ در {faDuration(Math.round((Date.now() - startedAt) / 1000))} ثبت شد</span>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </StickerCard>
        </div>
      </main>
      <ConfirmDialog open={showConfirm} onConfirm={doSubmit} onCancel={() => setShowConfirm(false)} unfilledFields={confirmUnfilled} totalRequired={visibleQuestions.filter((q) => q.required).length} filledCount={visibleQuestions.filter((q) => q.required && answers[q.id] != null && String(answers[q.id]).trim() !== "").length} />
    </div>
  );
}
