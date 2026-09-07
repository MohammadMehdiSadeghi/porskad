import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "../../components/ui/clsx";
import { faNum, faDuration } from "../../lib/utils";
import { validateAnswer } from "../../lib/validators";
import { Star, GitFork, Check } from "lucide-react";

function CheckIcon({ className }) {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>);
}
function ClockIcon({ className }) {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
}
function FlagIcon({ className }) {
  return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>);
}
function TelegramIcon({ className }) {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/></svg>);
}

const STEP_THEMES = [
  { bg: "bg-white", border: "border-ink/10", label: "text-male-normal", backBg: "bg-ink" },
  { bg: "bg-ecosystem-light", border: "border-ecosystem-normal/20", label: "text-ecosystem-dark", backBg: "bg-ecosystem-dark" },
  { bg: "bg-male-light", border: "border-male-normal/10", label: "text-male-normal", backBg: "bg-male-dark" },
  { bg: "bg-female-light", border: "border-female-normal/10", label: "text-female-dark", backBg: "bg-female-dark" },
  { bg: "bg-white", border: "border-ink/10", label: "text-male-normal", backBg: "bg-ink" },
  { bg: "bg-ecosystem-light", border: "border-ecosystem-normal/20", label: "text-ecosystem-dark", backBg: "bg-ecosystem-dark" },
];
function getStepTheme(i) { return STEP_THEMES[i % STEP_THEMES.length]; }

function TextInput({ type, value, onChange, error, autoFocus = true, inputRef, onEnter, placeholder: customPlaceholder, question }) {
  const ph = (customPlaceholder && customPlaceholder.trim()) || {
    short_text: "پاسخ خود را بنویسید...",
    long_text: "پاسخ خود را بنویسید...",
    email: "example@email.com",
    phone_ir: "۰۹۱۲۳۴۵۶۷۸۹",
    number: "مثلاً: ۱۲۳",
    telegram_id: "username@",
  }[type] || "پاسخ خود را بنویسید...";

  const hasValue = Boolean(value != null && String(value).trim().length > 0);
  const isLtrType = type === "email" || type === "phone_ir" || type === "telegram_id";
  // در حالت خالی، همگی راست‌چین و هماهنگ هستند؛ هنگام تایپ مقدار فیلدهای لاتین چپ‌چین می‌شوند
  const activeDir = hasValue && isLtrType ? "ltr" : "rtl";
  const activeAlign = hasValue && isLtrType ? "text-left" : "text-right";

  const maxLen = type === "short_text" ? 255 : (question?.validation?.maxLength || question?.max_length || undefined);
  const currentLength = value ? String(value).length : 0;

  const shared = clsx(
    "w-full bg-white border-2 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3",
    "font-semibold text-ink text-sm sm:text-base placeholder:text-ink-subtle/60 placeholder:font-medium",
    "placeholder:text-right placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-ecosystem-normal/15 transition-all duration-200",
    error ? "border-female-normal" : "border-ink/15 focus:border-ecosystem-normal",
  );

  if (type === "long_text") {
    return (
      <div className="flex flex-col gap-1 w-full">
        <textarea
          ref={inputRef}
          dir="rtl"
          value={value ?? ""}
          maxLength={maxLen}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          autoFocus={autoFocus}
          className={clsx(shared, "resize-y min-h-[6rem] leading-8 text-right")}
          placeholder={ph}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
        />
        {maxLen && (
          <div className="flex justify-end text-xs font-bold text-ink-subtle/70 mt-1" dir="ltr">
            {faNum(currentLength)} / {faNum(maxLen)}
          </div>
        )}
      </div>
    );
  }
  if (type === "telegram_id") {
    return (
      <div className="relative">
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <TelegramIcon className="text-ecosystem-dark" />
        </span>
        <input
          ref={inputRef}
          type="text"
          dir={activeDir}
          value={value ?? ""}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          className={clsx(shared, activeAlign, "pr-9")}
          placeholder={ph}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="relative">
        {type === "phone_ir" && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-subtle">
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
              <path d="M12 18h.01"/>
            </svg>
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          maxLength={maxLen}
          inputMode={type === "number" ? "numeric" : type === "phone_ir" ? "tel" : type === "email" ? "email" : "text"}
          dir={activeDir}
          value={value ?? ""}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          className={clsx(shared, activeAlign, type === "phone_ir" && "pr-9")}
          placeholder={ph}
        />
      </div>
      {type === "short_text" && currentLength > 180 && (
        <div className="flex justify-end text-xs font-bold text-ink-subtle/70 mt-1" dir="ltr">
          {faNum(currentLength)} / {faNum(255)}
        </div>
      )}
    </div>
  );
}

function ChoiceOptions({ options = [], value, onChange, onEnter, displayMode = "buttons", maxSelections = 1 }) {
  const isMulti = maxSelections > 1;
  const selectedArr = isMulti ? (Array.isArray(value) ? value : (value != null ? [value] : [])) : [];
  const atLimit = isMulti && selectedArr.length >= maxSelections;

  function handleMultiToggle(opt) {
    const cur = [...selectedArr];
    const idx = cur.indexOf(opt);
    if (idx >= 0) {
      cur.splice(idx, 1);
    } else if (cur.length < maxSelections) {
      cur.push(opt);
    }
    onChange(cur.length > 0 ? cur : null);
  }

  // حالت دراپ‌داون — فقط تک انتخابی
  if (displayMode === "dropdown" && !isMulti) {
    return (
      <select
        value={value || ""}
        onChange={(e) => { const v = e.target.value || null; onChange(v); }}
        className="w-full bg-white border-2 border-ink/15 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:px-4 sm:py-3.5 font-bold text-sm sm:text-base text-ink focus:outline-none transition-all duration-200 cursor-pointer text-right"
      >
        <option value="">یک گزینه انتخاب کنید...</option>
        {options.map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  // حالت دکمه‌ای — تک یا چند انتخابی
  return (
    <div className="flex flex-col gap-2">
      {isMulti && (
        <span className="text-xs font-bold text-ink-subtle">
          حداکثر {faNum(maxSelections)} گزینه انتخاب کنید {selectedArr.length > 0 && `(${faNum(selectedArr.length)} انتخاب شده)`}
        </span>
      )}
      {options.map((opt, i) => {
        const selected = isMulti ? selectedArr.includes(opt) : value === opt;
        const disabled = !selected && isMulti && atLimit;
        return (
          <button key={i} type="button" onClick={() => isMulti ? handleMultiToggle(opt) : onChange(opt)}
            disabled={disabled}
            className={clsx("relative group flex items-center gap-2.5 text-right w-full border-2 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3 transition-all duration-200 cursor-pointer hover:-translate-y-px",
              disabled ? "opacity-40 cursor-not-allowed hover:translate-y-0" : "",
              selected ? "border-ecosystem-normal bg-ecosystem-light rotate-[-0.5deg]" : "border-ink/10 bg-white hover:border-ecosystem-normal/50",
            )}>
            {selected && <div aria-hidden="true" className="absolute top-[2px] left-[2px] w-full h-full bg-ecosystem-dark/15 rounded-pill-md [corner-shape:squircle] pointer-events-none" />}
            {isMulti ? (
              <span className={clsx("relative z-10 w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-md border-2 font-black text-xs sm:text-sm transition-colors duration-200",
                selected ? "border-ecosystem-normal bg-ecosystem-normal text-white" : "border-ink/15 text-male-normal group-hover:border-ecosystem-normal",
              )}>{selected ? <Check size={14} className="stroke-[3]" /> : null}</span>
            ) : (
              <span className={clsx("relative z-10 w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-full border-2 font-black text-sm sm:text-base transition-colors duration-200",
                selected ? "border-ecosystem-normal bg-ecosystem-normal text-white" : "border-ink/15 text-male-normal group-hover:border-ecosystem-normal",
              )}>{faNum(i + 1)}</span>
            )}
            <span className={clsx("relative z-10 font-bold text-sm sm:text-base", selected ? "text-ecosystem-dark" : "text-ink")}>{opt}</span>
            {selected && <CheckIcon className="mr-auto text-ecosystem-normal shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

function YesNoOptions({ value, onChange, onEnter }) {
  const opts = [{ label: "بله", theme: "ecosystem" }, { label: "خیر", theme: "female" }];
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      {opts.map((o) => {
        const selected = value === o.label;
        const active = selected
          ? o.theme === "ecosystem" ? "border-ecosystem-normal bg-ecosystem-light text-ecosystem-dark" : "border-female-normal bg-female-light text-female-dark"
          : "border-ink/10 bg-white text-ink";
        return (
          <button key={o.label} type="button" onClick={() => { onChange(o.label); }}
            className={clsx("flex flex-col items-center gap-1.5 border-2 rounded-pill-md [corner-shape:squircle] py-4 sm:py-5 text-base sm:text-lg font-black transition-all duration-200 hover:-translate-y-px cursor-pointer",
              active, selected && "rotate-[-0.5deg]",
            )}>
            <span className="text-xl sm:text-2xl">
              {o.label === "بله"
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>
              }
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function RatingStars({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const current = hover ?? Number(value ?? 0);
  return (
    <div className="flex flex-row-reverse justify-center items-center gap-1.5 sm:gap-2.5 w-full py-2" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => {
        const isFilled = n <= current;
        return (
          <button
            key={n}
            type="button"
            className="p-1 cursor-pointer transition-transform duration-150 hover:scale-115"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}
            aria-label={`${n} ستاره`}
          >
            <Star
              size={28}
              className={isFilled ? "text-amber-400 fill-amber-400 drop-shadow-xs" : "text-ink/20 fill-transparent"}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function QuestionStep({ question, index, total, value, timeSpent, onChange, onAdvance }) {
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);
  const valueRef = useRef(value);

  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { setError(null); setTouched(false); }, [question.id]);
  useEffect(() => {
    if (touched && value !== undefined && value !== null && String(value).trim() !== "") {
      setError(validateAnswer(question, value));
    }
  }, [value, question, touched]);

  const handleChange = useCallback((val) => {
    onChange(val); setTouched(true); setError(validateAnswer(question, val));
  }, [question, onChange]);

  const handleNext = useCallback(() => {
    setTouched(true);
    const err = validateAnswer(question, valueRef.current);
    setError(err);
    if (!err) onAdvance();
  }, [question, onAdvance]);

  const theme = getStepTheme(index);

  return (
    <div className="relative">
      <div aria-hidden="true" className={clsx("absolute top-1.5 left-1.5 w-full h-full", theme.backBg, "rounded-tl-[1rem] rounded-br-[1rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]")} />

      <div className={clsx("relative z-10 flex flex-col gap-3.5 sm:gap-4 rounded-tl-[1rem] rounded-br-[1rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] border-2 p-4 sm:p-5 lg:p-6 transition-colors duration-300 overflow-hidden", theme.bg, theme.border)}>
        {/* شماره + برچسب */}
        <div className="flex items-center justify-between gap-2">
          <span className={clsx("text-xs sm:text-sm font-black flex items-center gap-1", theme.label)}>
            <FlagIcon className="opacity-50" /> سوال {faNum(index + 1)} از {faNum(total)}
          </span>
          <div className="flex items-center gap-1 mr-auto">
            {question.conditions && (
              <span className="text-xs font-bold text-male-normal bg-male-light rounded-pill-sm px-2 py-0.5 flex items-center gap-1">
                <GitFork size={12} /> شرطی
              </span>
            )}
            {question.required
              ? <span className="text-xs font-bold text-female-normal bg-female-light rounded-pill-sm px-2 py-0.5 flex items-center gap-0.5">اجباری</span>
              : <span className="text-xs font-bold text-ink-subtle bg-bg-neutral rounded-pill-sm px-2 py-0.5">اختیاری</span>
            }
          </div>
        </div>

        {/* عنوان */}
        <h2 className="text-[17px] leading-[26px] sm:text-[20px] sm:leading-[30px] font-black text-male-normal">
          {question.title}{question.required && <span className="text-female-normal mr-0.5">*</span>}
        </h2>
        {question.description && <p className="text-xs sm:text-sm font-semibold text-ink-subtle leading-6 -mt-1.5">{question.description}</p>}

        {/* فیلد پاسخ */}
        {(question.type === "short_text" || question.type === "long_text" || question.type === "email" || question.type === "number" || question.type === "phone_ir" || question.type === "telegram_id") && (
          <TextInput type={question.type} value={value} error={error} onChange={handleChange} onEnter={handleNext} placeholder={question.placeholder} question={question} />
        )}
        {question.type === "choice" && <ChoiceOptions options={question.options} value={value} onChange={handleChange} onEnter={handleNext} displayMode={question.display_mode || "buttons"} maxSelections={question.max_selections ?? 1} />}
        {question.type === "yes_no" && <YesNoOptions value={value} onChange={handleChange} onEnter={handleNext} />}
        {question.type === "rating" && <RatingStars value={value} onChange={(val) => handleChange(val)} />}

        {/* ارور */}
        {error && (
          <div className="self-start rotate-[-0.5deg] bg-white border-2 border-female-normal rounded-pill-md [corner-shape:squircle] px-2.5 py-1.5 text-xs sm:text-sm font-bold text-female-normal flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {error}
          </div>
        )}

        {timeSpent > 5 && (
          <span className="text-xs font-medium text-ink-subtle/60 self-start flex items-center gap-1">
            <ClockIcon className="text-ink-subtle/40" /> {faDuration(timeSpent)} روی این سوال
          </span>
        )}
      </div>
    </div>
  );
}
