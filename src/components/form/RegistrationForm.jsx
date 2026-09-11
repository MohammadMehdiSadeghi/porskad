import { useState, useRef, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StickerCard from "../ui/StickerCard";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Logo from "../ui/Logo";
import { normalizeAnswerValue, validateAnswer, validateUploadedFile, getFileAcceptString, getAllowedExtensions } from "../../lib/validators";
import { faNum, parseUserAgent, generateUuid } from "../../lib/utils";
import { QUESTION_TYPES, resolveQuestion, filterDisabledQuestions } from "../../lib/questionTypes";
import { supabase } from "../../lib/supabaseClient";
import ConfirmDialog from "../ui/ConfirmDialog";
import SEO from "../ui/SEO";
import { calculateScore, hasScoring } from "../../lib/scoring";
import { calculateFlow } from "../../lib/logic/flowEngine";
import ScoreResult from "../ui/ScoreResult";
import { sendToTelegram } from "../../lib/telegram";
import { Star, Check, CheckCircle2, AlertCircle, Image, ArrowUp, ArrowDown, Upload, FileCheck, CreditCard, ChevronDown, Info, Layers } from "lucide-react";

const inputCls = "w-full bg-white dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3 font-semibold text-ink dark:text-white text-sm sm:text-base placeholder:text-ink/40 dark:placeholder:text-slate-500 placeholder:font-medium focus:outline-none transition-all duration-200";

function isFieldEmpty(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && Object.keys(v).length === 0);
}

function DropdownChoice({ options = [], value, onChange, placeholder = "یک گزینه انتخاب کنید..." }) {
  return (
    <div className="relative w-full">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full appearance-none bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-4 py-3 font-bold text-sm sm:text-base text-ink dark:text-white focus:outline-none transition-all cursor-pointer text-right pr-4 pl-10"
      >
        <option value="">{placeholder}</option>
        {options.map((opt, i) => (
          <option key={i} value={typeof opt === "object" ? opt.text : opt}>
            {typeof opt === "object" ? opt.text : opt}
          </option>
        ))}
      </select>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-subtle dark:text-slate-400">
        <ChevronDown size={18} />
      </div>
    </div>
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
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const formRef = useRef(null);

  const resolvedQuestions = useMemo(() => filterDisabledQuestions((questions || []).map(resolveQuestion)), [questions]);

  // محاسبه سوالات قابل نمایش بر اساس شرط‌ها
  const visibleQuestions = useMemo(() => {
    const flow = calculateFlow(resolvedQuestions, logicRules, answers, hiddenFields);
    return flow.visibleQuestions;
  }, [resolvedQuestions, logicRules, answers, hiddenFields]);

  function setAnswer(qId, val, q) {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
    if (touched[qId]) {
      const err = validateAnswer(q, val);
      setFieldErrors((prev) => ({ ...prev, [qId]: err }));
    }
  }

  function handleBlur(qId, val, q) {
    setTouched((prev) => ({ ...prev, [qId]: true }));
    const err = validateAnswer(q, val);
    setFieldErrors((prev) => ({ ...prev, [qId]: err }));
  }

  function validateAll() {
    const errs = {};
    const unfilled = [];
    for (const q of visibleQuestions) {
      if (q.type === "statement" || q.type === "group") continue;
      const val = answers[q.id];
      const err = validateAnswer(q, val);
      if (err) {
        errs[q.id] = err;
        unfilled.push({ id: q.id, title: q.title });
      }
    }
    setFieldErrors(errs);
    setTouched(visibleQuestions.reduce((acc, q) => ({ ...acc, [q.id]: true }), {}));
    return { isValid: Object.keys(errs).length === 0, unfilled };
  }

  function openConfirm(e) {
    e.preventDefault();
    if (honeypot) return;
    const { isValid, unfilled } = validateAll();
    if (!isValid) {
      setError("لطفاً فیلدهای اجباری مشخص‌شده را پر کنید.");
      return;
    }
    setError(null);
    doSubmit();
  }

  async function doSubmit() {
    setShowConfirm(false);
    setSubmitting(true);
    setError(null);

    try {
      const ua = parseUserAgent();
      const meta = {
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
        userAgent: navigator.userAgent,
        referrerUrl: document.referrer || null,
        hiddenFields,
      };

      // پاسخ‌ها به فرمت آبجکت
      const finalAnswers = {};
      for (const q of visibleQuestions) {
        if (answers[q.id] !== undefined) {
          finalAnswers[q.id] = normalizeAnswerValue(q, answers[q.id]);
        }
      }

      // استفاده از RPC اختصاصی ثبت فرم عمومی جهت بررسی سهمیه‌ها
      const { data, error: rpcError } = await supabase.rpc("submit_public_response", {
        p_form_public_id: form.public_id || form.id,
        p_answers: finalAnswers,
        p_meta: meta,
        p_times: {},
      });

      if (rpcError) {
        throw rpcError;
      }

      const responseId = data?.response_id;

      if (responseId) {
        sendToTelegram(form.id, responseId);
      }

      localStorage.setItem(`porskad_submitted_${form.id}`, new Date().toISOString());

      // ارسال به وب‌هوک
      const webhookUrl = form.webhook_url || form.settings?.webhook_url;
      if (webhookUrl) {
        try {
          fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "registration.submitted",
              form_id: form.id,
              form_title: form.title,
              response_id: responseId,
              submitted_at: new Date().toISOString(),
              answers: finalAnswers,
            }),
            mode: "no-cors",
          }).catch((e) => console.warn("Webhook dispatch error:", e));
        } catch (e) {
          console.warn("Webhook error:", e);
        }
      }

      if (hasScoring(visibleQuestions)) {
        setScoreResult(calculateScore(visibleQuestions, answers));
      }
      setSubmitted(true);

      // انتقال خودکار (Redirect URL)
      const redirectUrl = form.redirect_url || form.settings?.redirect_url;
      if (redirectUrl) {
        setRedirectCountdown(3);
        let count = 3;
        const interval = setInterval(() => {
          count -= 1;
          setRedirectCountdown(count);
          if (count <= 0) {
            clearInterval(interval);
            window.location.href = redirectUrl;
          }
        }, 1000);
      }
    } catch (err) {
      console.error("Registration form submit error:", err);
      setError(err.message || "ثبت ناموفق بود؛ دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(q) {
    const val = answers[q.id] ?? "";
    const fieldErr = touched[q.id] ? fieldErrors[q.id] : null;
    const isLtr = q.type === "email" || q.type === "phone_ir" || q.type === "telegram_id" || q.type === "link" || q.type === "national_id";
    const dir = isLtr ? "ltr" : "rtl";
    const align = isLtr ? "text-left" : "text-right";

    // ۱. متن توضیحی (Statement)
    if (q.type === "statement") {
      return (
        <div key={q.id} className="p-4 rounded-2xl bg-navy/5 dark:bg-slate-800/60 border border-teal/30 flex items-start gap-3">
          <Info size={20} className="text-teal shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-black text-navy dark:text-white">{q.title}</h3>
            {q.description && <p className="text-xs text-ink-subtle dark:text-slate-300 leading-6">{q.description}</p>}
          </div>
        </div>
      );
    }

    // ۲. گروه سوال (Group)
    if (q.type === "group") {
      return (
        <div key={q.id} className="pt-4 pb-2 border-b-2 border-teal/20 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-navy dark:bg-teal text-white dark:text-navy flex items-center justify-center font-bold">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="text-base font-black text-navy dark:text-white">{q.title}</h3>
            {q.description && <p className="text-xs text-ink-subtle dark:text-slate-400">{q.description}</p>}
          </div>
        </div>
      );
    }

    return (
      <div key={q.id} className="flex flex-col gap-2">
        <label className="text-sm sm:text-base font-black text-ink dark:text-white">
          {q.title}{q.required && <span className="text-female-normal mr-0.5">*</span>}
        </label>
        {q.description && <p className="text-xs text-ink-subtle dark:text-slate-400">{q.description}</p>}

        {/* ورودی متنی / ایمیل / تلفن / لینک / تلگرام / کد ملی */}
        {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "link" || q.type === "telegram_id" || q.type === "national_id") && (
          <input
            type={q.type === "email" ? "email" : q.type === "link" ? "url" : "text"}
            inputMode={q.type === "phone_ir" ? "tel" : q.type === "email" ? "email" : q.type === "link" ? "url" : q.type === "national_id" ? "numeric" : "text"}
            dir={dir}
            value={val}
            maxLength={q.type === "short_text" ? 255 : q.type === "national_id" ? 10 : undefined}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={q.placeholder || (q.type === "national_id" ? "کد ملی ۱۰ رقمی (مثلاً: ۰۰۱۲۳۴۵۶۷۸)" : "پاسخ خود را بنویسید...")}
            className={`${inputCls} ${align} ${fieldErr ? "!border-female-normal" : ""}`}
          />
        )}

        {/* عدد */}
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

        {/* بله / خیر */}
        {q.type === "yes_no" && (
          <div className="grid grid-cols-2 gap-3">
            {["بله", "خیر"].map((label) => {
              const selected = val === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setAnswer(q.id, label, q);
                    handleBlur(q.id, label, q);
                  }}
                  className={`flex items-center justify-center gap-2 p-3 border-2 rounded-pill-md font-bold transition-all cursor-pointer ${
                    selected
                      ? "border-teal bg-teal/10 text-teal-text dark:text-teal dark:bg-teal/10"
                      : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 hover:border-teal/50"
                  }`}
                >
                  <div className={`w-5 h-5 flex items-center justify-center rounded-full border-2 ${selected ? "border-teal bg-teal text-white" : "border-ink/20 dark:border-slate-600"}`}>
                    {selected && <Check size={12} className="stroke-[3]" />}
                  </div>
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* متن بلند */}
        {q.type === "long_text" && (
          <textarea
            dir="rtl"
            rows={3}
            value={val}
            maxLength={q.validation?.maxLength || q.max_length || undefined}
            onChange={(e) => setAnswer(q.id, e.target.value, q)}
            onBlur={(e) => handleBlur(q.id, e.target.value, q)}
            placeholder={q.placeholder || "پاسخ خود را بنویسید..."}
            className={`${inputCls} text-right resize-y leading-6 ${fieldErr ? "!border-female-normal" : ""}`}
          />
        )}

        {/* لیست کشویی */}
        {q.type === "dropdown" && (
          <DropdownChoice
            options={q.options || []}
            value={val}
            onChange={(newVal) => {
              setAnswer(q.id, newVal, q);
              handleBlur(q.id, newVal, q);
            }}
            placeholder={q.placeholder}
          />
        )}

        {/* چندگزینه‌ای */}
        {q.type === "choice" && (
          q.display_mode === "dropdown" && (q.max_selections ?? 1) <= 1 ? (
            <DropdownChoice
              options={q.options || []}
              value={val}
              onChange={(newVal) => {
                setAnswer(q.id, newVal, q);
                handleBlur(q.id, newVal, q);
              }}
              placeholder={q.placeholder}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {(q.options || []).map((opt, i) => {
                const optText = typeof opt === "object" ? opt.text : opt;
                const isMulti = (q.max_selections ?? 1) > 1;
                const selected = isMulti ? (Array.isArray(val) && val.includes(optText)) : val === optText;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      let nextVal;
                      if (isMulti) {
                        const arr = Array.isArray(val) ? [...val] : [];
                        const idx = arr.indexOf(optText);
                        idx >= 0 ? arr.splice(idx, 1) : arr.push(optText);
                        nextVal = arr;
                      } else {
                        nextVal = optText;
                      }
                      setAnswer(q.id, nextVal, q);
                      handleBlur(q.id, nextVal, q);
                    }}
                    className={`relative flex items-center gap-3 p-3 border-2 rounded-pill-md font-bold transition-all cursor-pointer ${
                      selected
                        ? "border-teal bg-teal/10 text-teal-text dark:text-teal dark:bg-teal/10"
                        : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 hover:border-teal/50"
                    }`}
                  >
                    <div className={`w-6 h-6 flex items-center justify-center rounded-md border-2 ${selected ? "border-teal bg-teal text-white" : "border-ink/20 dark:border-slate-600"}`}>
                      {selected && <Check size={14} className="stroke-[3]" />}
                    </div>
                    {optText}
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* چندگزینه‌ای تصویری */}
        {q.type === "picture_choice" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(q.options || []).map((item, i) => {
              const optText = typeof item === "object" ? item.text || `تصویر ${i + 1}` : String(item);
              const optImage = typeof item === "object" ? item.image : "";
              const isMulti = (q.max_selections ?? 1) > 1;
              const selected = isMulti ? (Array.isArray(val) && val.includes(optText)) : val === optText;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    let nextVal;
                    if (isMulti) {
                      const arr = Array.isArray(val) ? [...val] : [];
                      const idx = arr.indexOf(optText);
                      idx >= 0 ? arr.splice(idx, 1) : arr.push(optText);
                      nextVal = arr;
                    } else {
                      nextVal = optText;
                    }
                    setAnswer(q.id, nextVal, q);
                    handleBlur(q.id, nextVal, q);
                  }}
                  className={`flex flex-col rounded-xl border-2 overflow-hidden transition-all cursor-pointer text-right ${
                    selected ? "border-teal bg-teal/10 ring-2 ring-teal/30" : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal/50"
                  }`}
                >
                  <div className="w-full aspect-square bg-navy/5 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                    {optImage ? (
                      <img src={optImage} alt={optText} className="w-full h-full object-cover" />
                    ) : (
                      <Image size={28} className="text-ink/30" />
                    )}
                  </div>
                  <span className="p-2 text-xs font-bold truncate block">{optText}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* طیفی (لیکرت) */}
        {q.type === "likert" && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {(q.options?.length ? q.options : ["کاملاً مخالفم", "مخالفم", "نظری ندارم", "موافقم", "کاملاً موافقم"]).map((opt, i) => {
              const optText = typeof opt === "object" ? opt.text : opt;
              const selected = val === optText;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setAnswer(q.id, optText, q); handleBlur(q.id, optText, q); }}
                  className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all text-center cursor-pointer ${
                    selected ? "border-teal bg-teal text-white shadow-xs" : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 hover:border-teal/40"
                  }`}
                >
                  {optText}
                </button>
              );
            })}
          </div>
        )}

        {/* امتیازدهی وفاداری (NPS ۰ تا ۱۰) */}
        {q.type === "nps" && (
          <div className="flex flex-col gap-1.5" dir="ltr">
            <div className="grid grid-cols-11 gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setAnswer(q.id, n, q); handleBlur(q.id, n, q); }}
                  className={`h-9 rounded-lg border-2 font-black text-xs transition-all cursor-pointer ${
                    Number(val) === n
                      ? "border-teal bg-teal text-white scale-105 shadow-xs"
                      : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 hover:border-teal/50"
                  }`}
                >
                  {faNum(n)}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-bold text-ink-subtle dark:text-slate-400 px-1" dir="rtl">
              <span>{q.validation?.min_label || "اصلاً احتمال ندارد"}</span>
              <span>{q.validation?.max_label || "بسیار زیاد"}</span>
            </div>
          </div>
        )}

        {/* ستاره امتیاز */}
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

        {/* ماتریسی */}
        {q.type === "matrix" && (
          <div className="w-full overflow-x-auto rounded-xl border border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ink/10 dark:border-slate-700">
                  <th className="text-right py-2 px-2 font-black text-navy dark:text-white">موضوع</th>
                  {(q.validation?.columns || q.columns || ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"]).map((col, ci) => (
                    <th key={ci} className="text-center py-2 px-1 font-bold text-ink-subtle dark:text-slate-400">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(q.validation?.rows || q.rows || ["کیفیت خدمات", "سرعت پاسخگویی", "سهولت استفاده"]).map((row, ri) => (
                  <tr key={ri} className="border-b border-ink/5 dark:border-slate-700/50 last:border-0">
                    <td className="py-2.5 px-2 font-bold">{row}</td>
                    {(q.validation?.columns || q.columns || ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"]).map((col, ci) => {
                      const isSelected = val && typeof val === "object" && val[row] === col;
                      return (
                        <td key={ci} className="py-2.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = (typeof val === "object" && val) ? val : {};
                              const next = { ...cur, [row]: col };
                              setAnswer(q.id, next, q);
                              handleBlur(q.id, next, q);
                            }}
                            className={`w-4 h-4 rounded-full border-2 mx-auto flex items-center justify-center cursor-pointer ${
                              isSelected ? "border-teal bg-teal text-white" : "border-ink/20 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* اولویت‌دهی / رتبه‌بندی */}
        {q.type === "ranking" && (
          <div className="flex flex-col gap-1.5">
            {((Array.isArray(val) && val.length) ? val : (q.options?.length ? q.options : ["گزینه ۱", "گزینه ۲", "گزینه ۳"])).map((opt, i, arr) => {
              const optText = typeof opt === "object" ? opt.text : opt;
              return (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-navy dark:bg-teal text-white dark:text-navy text-xs font-black flex items-center justify-center">
                      {faNum(i + 1)}
                    </span>
                    <span className="text-xs font-bold text-ink dark:text-slate-200">{optText}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => {
                        const copy = [...arr];
                        const t = copy[i]; copy[i] = copy[i - 1]; copy[i - 1] = t;
                        setAnswer(q.id, copy, q);
                      }}
                      className="w-6 h-6 rounded bg-navy/5 dark:bg-slate-700 flex items-center justify-center disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={i === arr.length - 1}
                      onClick={() => {
                        const copy = [...arr];
                        const t = copy[i]; copy[i] = copy[i + 1]; copy[i + 1] = t;
                        setAnswer(q.id, copy, q);
                      }}
                      className="w-6 h-6 rounded bg-navy/5 dark:bg-slate-700 flex items-center justify-center disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* آپلود فایل */}
        {q.type === "file_upload" && (
          <div className="p-4 rounded-xl border-2 border-dashed border-ink/20 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
            {val ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FileCheck size={18} className="text-teal shrink-0" />
                  <div className="text-right truncate">
                    <span className="text-xs font-bold text-teal block truncate">
                      {typeof val === "object" ? val.name : "فایل انتخاب شد"}
                    </span>
                    {typeof val === "object" && val.size && (
                      <span className="text-[10px] text-ink-subtle dark:text-slate-400">
                        {faNum((val.size / (1024 * 1024)).toFixed(2))} MB
                      </span>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => setAnswer(q.id, null, q)} className="text-xs text-magenta-text font-bold hover:underline cursor-pointer mr-2 shrink-0">حذف</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer gap-1.5 py-2">
                <Upload size={24} className="text-ink/40" />
                <span className="text-xs font-bold text-ink dark:text-slate-200">انتخاب یا بارگذاری فایل</span>
                <span className="text-[10px] text-ink-subtle dark:text-slate-400">
                  سقف حجم: {faNum(q.validation?.max_file_size_mb || q.max_file_size_mb || 10)} مگابایت
                  {getAllowedExtensions(q).length > 0 && ` • فرمت‌ها: ${getAllowedExtensions(q).join("، ")}`}
                </span>
                <input
                  type="file"
                  accept={getFileAcceptString(q)}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const check = validateUploadedFile(file, q);
                      if (!check.isValid) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          [q.id]: check.error,
                        }));
                        e.target.value = "";
                        return;
                      }
                      setAnswer(q.id, {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        ext: file.name.split(".").pop()?.toLowerCase() || "",
                      }, q);
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}


        {/* پرداخت */}
        {q.type === "payment" && (
          <div className="p-4 rounded-xl border-2 border-orange/40 bg-orange/5 dark:bg-amber-950/20 text-center flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-ink-subtle">مبلغ: {faNum((q.validation?.amount || q.amount || 100000).toLocaleString("fa-IR"))} {q.validation?.currency || q.currency || "تومان"}</span>
            <button
              type="button"
              onClick={() => setAnswer(q.id, { paid: true, txId: `mock_${Date.now()}` }, q)}
              className="bg-orange hover:bg-orange-alt text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
            >
              {val?.paid ? "✓ پرداخت شد" : "پرداخت آنلاین"}
            </button>
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
              {redirectCountdown !== null && (
                <div className="mt-2 bg-teal/10 border border-teal/30 rounded-xl p-3 text-xs font-bold text-teal flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal animate-ping" />
                  <span>در حال انتقال به صفحه مقصد در {faNum(redirectCountdown)} ثانیه...</span>
                </div>
              )}
            </div>
          </StickerCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh dot-pattern bg-ecosystem-light dark:bg-[#0B0F19] text-ink dark:text-slate-100 p-4 transition-colors duration-200 relative">
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
