import { useEffect, useRef, useState } from "react";
import clsx from "../../components/ui/clsx";
import { faNum, faDuration } from "../../lib/utils";
import { validateAnswer } from "../../lib/validators";

function TextInput({ type, value, onChange, error, autoFocus = true, inputRef, onEnter, ...rest }) {
  const shared = clsx(
    "w-full bg-white border rounded-lg px-4 py-3",
    "font-medium text-gray-900 placeholder:text-gray-300 placeholder:font-medium",
    "focus:outline-none focus:ring-2 transition-all",
    error
      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
      : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100",
  );

  if (type === "long_text") {
    return (
      <textarea
        ref={inputRef}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        autoFocus={autoFocus}
        className={clsx(shared, "resize-y min-h-[8rem] leading-7")}
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
              "border rounded-lg px-4 py-3.5 transition-all duration-150 cursor-pointer",
              "hover:-translate-y-0.5 hover:shadow-sm",
              selected
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-200 bg-white hover:border-indigo-200",
            )}
          >
            <span
              className={clsx(
                "w-8 h-8 shrink-0 flex items-center justify-center rounded-full",
                "border font-bold text-sm transition-colors",
                selected
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-gray-200 text-gray-500 group-hover:border-indigo-300",
              )}
            >
              {faNum(i + 1)}
            </span>
            <span className="font-medium text-gray-900">{opt}</span>
            {selected && <span className="mr-auto text-indigo-500 text-lg">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function YesNoOptions({ value, onChange, onEnter }) {
  const opts = [
    { label: "بله", icon: "👍", color: "emerald" },
    { label: "خیر", icon: "👎", color: "red" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4">
      {opts.map((o) => {
        const selected = value === o.label;
        const active = selected
          ? o.color === "emerald"
            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
            : "border-red-400 bg-red-50 text-red-700"
          : "border-gray-200 bg-white text-gray-700";
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => {
              onChange(o.label);
              setTimeout(onEnter, 300);
            }}
            className={clsx(
              "flex flex-col items-center gap-2 border rounded-xl py-6",
              "text-xl font-bold transition-all hover:-translate-y-0.5 cursor-pointer",
              active,
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

function RatingStars({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const current = hover ?? Number(value ?? 0);
  return (
    <div className="flex flex-row-reverse justify-center gap-2" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`text-4xl cursor-pointer transition-all duration-150 ${
            n <= current ? "grayscale-0 scale-110" : "grayscale opacity-30 hover:opacity-60"
          }`}
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
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-indigo-600">
          سوال {faNum(index + 1)} از {faNum(total)}
        </span>
        {!question.required && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-md px-2 py-0.5">
            اختیاری
          </span>
        )}
      </div>

      <h2 className="text-xl sm:text-[1.6rem] font-black text-gray-900 leading-[1.4]">
        {question.title}
      </h2>
      {question.description && (
        <p className="text-sm font-medium text-gray-400 leading-7 -mt-1">
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
        <div className="self-start bg-red-50 border border-red-200 rounded-lg px-3.5 py-2 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {timeSpent > 5 && (
        <span className="text-[0.65rem] font-medium text-gray-300 self-start">
          ⏱ {faDuration(timeSpent)} روی این سوال
        </span>
      )}
    </div>
  );
}
