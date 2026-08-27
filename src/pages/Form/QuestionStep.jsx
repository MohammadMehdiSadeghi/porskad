import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "../../components/ui/clsx";
import { faNum, faDuration } from "../../lib/utils";
import { validateAnswer } from "../../lib/validators";

// ─── آیکون‌های مدرن SVG ───
function CheckIcon({ className }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function FlagIcon({ className }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
}

function TelegramIcon({ className }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 2 11 13"/>
      <path d="m22 2-7 20-4-9-9-4z"/>
    </svg>
  );
}

// ─── رنگ‌بندی交替 سوال‌ها — رنگ‌های سازمانی ───
const STEP_THEMES = [
  { bg: "bg-white", border: "border-ink/15", label: "text-ink" },                     // سفید + مشکی
  { bg: "bg-bg-mint", border: "border-teal/20", label: "text-teal-text" },           // سبز تیلی
  { bg: "bg-bg-lavender", border: "border-navy/15", label: "text-navy" },            // آبی سرمه‌ای
  { bg: "bg-bg-blush", border: "border-magenta/15", label: "text-magenta-text" },    // صورتی
  { bg: "bg-white", border: "border-ink/15", label: "text-ink" },                     // سفید + مشکی
  { bg: "bg-bg-mint", border: "border-teal/20", label: "text-teal-text" },           // سبز تیلی
];

function getStepTheme(index) {
  return STEP_THEMES[index % STEP_THEMES.length];
}

// ورودی متنی مشترک
function TextInput({ type, value, onChange, error, autoFocus = true, inputRef, onEnter, placeholder: customPlaceholder, ...rest }) {
  const shared = clsx(
    "w-full bg-white border-2 rounded-pill-md px-4 py-3.5",
    "font-semibold text-ink placeholder:text-ink-subtle/60 placeholder:font-medium",
    "focus:outline-none focus:ring-4 transition-all",
    error
      ? "border-magenta focus:ring-magenta/20"
      : "border-ink/25 focus:border-teal focus:ring-teal/20",
  );

  const defaultPlaceholders = {
    short_text: "جوابت رو این‌جا بنویس...",
    long_text: "بنویس...",
    email: "name@example.com",
    phone_ir: "09123456789",
    number: "مثلاً 42",
    telegram_id: "@username",
  };
  const ph = (customPlaceholder && customPlaceholder.trim()) || defaultPlaceholders[type] || "";

  if (type === "long_text") {
    return (
      <textarea
        ref={inputRef}
        dir="rtl"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        autoFocus={autoFocus}
        className={clsx(shared, "resize-y min-h-[8rem] leading-8")}
        placeholder={ph}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        {...rest}
      />
    );
  }

  if (type === "telegram_id") {
    return (
      <div className="relative">
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none select-none">
          <TelegramIcon className="text-teal-text" />
        </span>
        <input
          ref={inputRef}
          type="text"
          dir="ltr"
          value={value ?? ""}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          className={clsx(shared, "text-left pr-11")}
          placeholder={ph}
          {...rest}
        />
      </div>
    );
  }

  const isLtr = type === "email" || type === "phone_ir";

  return (
    <div className="relative">
      {type === "phone_ir" && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none select-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-subtle">
            <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
            <path d="M12 18h.01"/>
          </svg>
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode={
          type === "number"
            ? "numeric"
            : type === "phone_ir"
              ? "tel"
              : type === "email"
                ? "email"
                : "text"
        }
        dir={isLtr ? "ltr" : "rtl"}
        value={value ?? ""}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        className={clsx(shared, isLtr && "text-left", type === "phone_ir" && "pr-11")}
        placeholder={ph}
        {...rest}
      />
    </div>
  );
}

// گزینه‌های چندگزینه‌ای — دکمه‌های بزرگ استیکری با سایه انتخاب
function ChoiceOptions({ options = [], value, onChange, onEnter }) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt, i) => {
        const selected = value === opt;
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              onChange(opt);
              setTimeout(onEnter, 300);
            }}
            className={clsx(
              "group flex items-center gap-3.5 text-right w-full",
              "border-2 rounded-pill-md px-4 py-3.5 transition-all duration-150 cursor-pointer",
              "hover:-translate-y-0.5",
              selected
                ? "border-teal bg-teal/10 rotate-[-0.5deg] shadow-[4px_4px_0_0_rgba(88,189,175,0.4)]"
                : "border-ink/20 bg-white hover:border-teal",
            )}
          >
            <span
              className={clsx(
                "w-9 h-9 shrink-0 flex items-center justify-center rounded-full",
                "border-2 font-black text-base transition-colors",
                selected
                  ? "border-teal-text bg-teal text-white"
                  : "border-ink/25 text-navy group-hover:border-teal",
              )}
            >
              {faNum(i + 1)}
            </span>
            <span className="font-bold text-ink">{opt}</span>
            {selected && <CheckIcon className="mr-auto text-teal-text" />}
          </button>
        );
      })}
    </div>
  );
}

// بله / خیر
function YesNoOptions({ value, onChange, onEnter }) {
  const opts = [
    { label: "بله", color: "teal" },
    { label: "خیر", color: "magenta" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4">
      {opts.map((o) => {
        const selected = value === o.label;
        const active = selected
          ? o.color === "teal"
            ? "border-teal bg-teal/10 text-teal-text"
            : "border-magenta bg-magenta/10 text-magenta-text"
          : "border-ink/20 bg-white text-ink";
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => {
              onChange(o.label);
              setTimeout(onEnter, 300);
            }}
            className={clsx(
              "flex flex-col items-center gap-2 border-2 rounded-pill-md py-6",
              "text-xl font-black transition-all hover:-translate-y-0.5 cursor-pointer",
              active,
              selected && "rotate-[-1deg] shadow-[4px_4px_0_0_rgba(41,40,39,0.15)]",
            )}
          >
            <span className="text-3xl">
              {o.label === "بله" ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 10v12"/>
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 14V2"/>
                  <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
                </svg>
              )}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ستاره امتیاز ۱ تا ۵ — بزرگ‌تر با star-btn
function RatingStars({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const current = hover ?? Number(value ?? 0);
  return (
    <div className="flex flex-row-reverse justify-center gap-2" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={clsx(
            "star-btn text-5xl cursor-pointer",
            n <= current ? "grayscale-0" : "grayscale opacity-40",
          )}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(n)}
          aria-label={`${n} ستاره`}
        >
          ⭐
        </button>
      ))}
    </div>
  );
}

// ─── یک قدم سوال ───
export default function QuestionStep({
  question,
  index,
  total,
  value,
  timeSpent,
  onChange,
  onAdvance,
}) {
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);
  const valueRef = useRef(value);

  // همیشه مقدار لحظه‌ای جواب رو نگه میداره
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    setError(null);
    setTouched(false);
  }, [question.id]);

  // ولیدیشن لحظه‌ای — هر بار مقدار تغییر کنه
  useEffect(() => {
    if (touched && value !== undefined && value !== null && String(value).trim() !== "") {
      const err = validateAnswer(question, value);
      setError(err);
    }
  }, [value, question, touched]);

  // اعتبارسنجی هنگام تایپ
  const handleChange = useCallback((val) => {
    onChange(val);
    setTouched(true);
    const err = validateAnswer(question, val);
    setError(err);
  }, [question, onChange]);

  const handleNext = useCallback(() => {
    setTouched(true);
    const err = validateAnswer(question, valueRef.current);
    setError(err);
    if (!err) onAdvance();
  }, [question, onAdvance]);

  const theme = getStepTheme(index);

  return (
    <div className={clsx("flex flex-col gap-5 rounded-pill-md p-4 sm:p-5 -mx-1 transition-colors", theme.bg, theme.border, "border-2")}>
      {/* شماره سوال + برچسب اختیاری/اجباری */}
      <div className="flex items-center justify-between gap-3">
        <span className={clsx("text-sm font-black flex items-center gap-1.5", theme.label)}>
          <FlagIcon className="opacity-60" />
          سوال {faNum(index + 1)} از {faNum(total)}
        </span>
        <div className="flex items-center gap-1.5 mr-auto">
          {question.condition && (
            <span className="text-[0.65rem] font-bold text-navy bg-bg-lavender rounded-pill-sm px-2 py-0.5 flex items-center gap-1">
              🔀 شرطی
            </span>
          )}
          {question.required ? (
          <span className="text-xs font-bold text-magenta-text bg-bg-blush rounded-pill-sm px-2 py-0.5 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            اجباری
          </span>
        ) : (
          <span className="text-xs font-bold text-ink-subtle bg-bg-neutral rounded-pill-sm px-2 py-0.5">
            اختیاری
          </span>
        )}
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-navy leading-[1.4]">
        {question.title}
        {question.required && <span className="text-magenta-text mr-1">*</span>}
      </h2>
      {question.description && (
        <p className="text-sm font-semibold text-ink-subtle leading-7 -mt-2">
          {question.description}
        </p>
      )}

      {(question.type === "short_text" ||
        question.type === "long_text" ||
        question.type === "email" ||
        question.type === "number" ||
        question.type === "phone_ir" ||
        question.type === "telegram_id") && (
        <TextInput
          type={question.type}
          value={value}
          error={error}
          onChange={handleChange}
          onEnter={handleNext}
          placeholder={question.placeholder}
        />
      )}

      {question.type === "choice" && (
        <ChoiceOptions
          options={question.options}
          value={value}
          onChange={(val) => { handleChange(val); setTimeout(handleNext, 300); }}
          onEnter={handleNext}
        />
      )}

      {question.type === "yes_no" && (
        <YesNoOptions value={value} onChange={(val) => { handleChange(val); setTimeout(handleNext, 300); }} onEnter={handleNext} />
      )}

      {question.type === "rating" && <RatingStars value={value} onChange={(val) => handleChange(val)} />}

      {question.type === "checkbox" && (
        <div className="flex flex-col gap-3">
          {(question.options || []).map((opt, i) => {
            const selected = Array.isArray(value) && value.includes(opt);
            return (
              <button key={i} type="button"
                onClick={() => {
                  const current = Array.isArray(value) ? [...value] : [];
                  const next = selected ? current.filter((v) => v !== opt) : [...current, opt];
                  handleChange(next);
                }}
                className={clsx(
                  "group flex items-center gap-3.5 text-right w-full",
                  "border-2 rounded-pill-md px-4 py-3.5 transition-all duration-150 cursor-pointer",
                  "hover:-translate-y-0.5",
                  selected
                    ? "border-teal bg-teal/10 rotate-[-0.5deg] shadow-[4px_4px_0_0_rgba(88,189,175,0.4)]"
                    : "border-ink/20 bg-white hover:border-teal",
                )}>
                <span className={clsx(
                  "w-9 h-9 shrink-0 flex items-center justify-center rounded-md",
                  "border-2 font-black text-base transition-colors",
                  selected
                    ? "border-teal-text bg-teal text-white"
                    : "border-ink/25 text-navy group-hover:border-teal",
                )}>{selected ? "✓" : ""}</span>
                <span className="font-bold text-ink">{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="self-start rotate-[-1deg] bg-white border-2 border-magenta rounded-pill-md px-3.5 py-2 text-sm font-bold text-magenta-text flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      {timeSpent > 5 && (
        <span className="text-[0.7rem] font-medium text-ink-subtle/70 self-start flex items-center gap-1.5">
          <ClockIcon className="text-ink-subtle/50" />
          {faDuration(timeSpent)} روی این سوال
        </span>
      )}
    </div>
  );
}
