import { useEffect, useRef, useState } from "react";
import clsx from "../../components/ui/clsx";
import { faNum, faDuration } from "../../lib/utils";
import { validateAnswer } from "../../lib/validators";

// ورودی متنی مشترک (متن کوتاه/بلند/ایمیل/عدد/موبایل)
function TextInput({ type, value, onChange, error, autoFocus = true, inputRef, onEnter, ...rest }) {
  const shared = clsx(
    "w-full bg-white border-2 rounded-pill-md px-4 py-3.5",
    "font-semibold text-ink placeholder:text-ink-subtle/60 placeholder:font-medium",
    "focus:outline-none focus:ring-4 transition-all",
    error
      ? "border-magenta focus:ring-magenta/20"
      : "border-ink/25 focus:border-teal focus:ring-teal/20",
  );

  if (type === "long_text") {
    return (
      <textarea
        ref={inputRef}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        autoFocus={autoFocus}
        className={clsx(shared, "resize-y min-h-[8rem] leading-8")}
        placeholder="بنویس..."
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

  const isLtr = type === "email" || type === "phone_ir";
  const placeholders = {
    short_text: "جوابت رو این‌جا بنویس...",
    email: "name@example.com",
    phone_ir: "09123456789",
    number: "مثلاً 42",
  };

  return (
    <div className="relative">
      {type === "phone_ir" && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none select-none">
          🇮🇷
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
        dir={isLtr ? "ltr" : undefined}
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
        placeholder={placeholders[type] ?? ""}
        {...rest}
      />
    </div>
  );
}

// گزینه‌های چندگزینه‌ای — دکمه‌های بزرگ استیکری؛ با انتخاب، خودکار می‌رود مرحله بعد
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
            {selected && <span className="mr-auto text-teal-text text-lg">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

// بله / خیر
function YesNoOptions({ value, onChange, onEnter }) {
  const opts = [
    { label: "بله", icon: "👍", color: "teal" },
    { label: "خیر", icon: "👎", color: "magenta" },
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
            <span className="text-3xl">{o.icon}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ستاره امتیاز ۱ تا ۵
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

  useEffect(() => {
    setError(null);
  }, [question.id]);

  function handleNext() {
    const err = validateAnswer(question, value);
    setError(err);
    if (!err) onAdvance();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* شماره سوال + برچسب اختیاری */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-teal-text">
          سوال {faNum(index + 1)} از {faNum(total)}
        </span>
        {!question.required && (
          <span className="text-xs font-bold text-ink-subtle bg-bg-neutral rounded-pill-sm px-2 py-1">
            اختیاری
          </span>
        )}
      </div>

      <h2 className="text-2xl sm:text-[1.7rem] font-black text-navy leading-[1.4]">
        {question.title}
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
        question.type === "phone_ir") && (
        <TextInput
          type={question.type}
          value={value}
          error={error}
          onChange={onChange}
          onEnter={handleNext}
        />
      )}

      {question.type === "choice" && (
        <ChoiceOptions
          options={question.options}
          value={value}
          onChange={onChange}
          onEnter={handleNext}
        />
      )}

      {question.type === "yes_no" && (
        <YesNoOptions value={value} onChange={onChange} onEnter={handleNext} />
      )}

      {question.type === "rating" && <RatingStars value={value} onChange={onChange} />}

      {error && (
        <div className="self-start rotate-[-1deg] bg-white border-2 border-magenta rounded-pill-md px-3.5 py-2 text-sm font-bold text-magenta-text">
          {error}
        </div>
      )}

      {timeSpent > 5 && (
        <span className="text-[0.7rem] font-medium text-ink-subtle/70 self-start">
          ⏱ {faDuration(timeSpent)} روی این سوال
        </span>
      )}
    </div>
  );
}
