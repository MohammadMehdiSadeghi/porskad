// ══════════════════════════════════════════════════════════════
// FormPreview — پیش‌نمایش زنده فرم در فرم‌ساز
// نمایش موبایل‌مانند که با هر تغییر آپدیت می‌شود
// ══════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { faNum } from "../../lib/utils";
import { QUESTION_TYPES } from "../../lib/questionTypes";

const PLACEHOLDER_DEFAULTS = {
  short_text: "جوابت رو این‌جا بنویس...",
  long_text: "بنویس...",
  email: "name@example.com",
  phone_ir: "09123456789",
  number: "مثلاً 42",
  telegram_id: "@username",
};

function getPlaceholder(q) {
  return (q.placeholder && q.placeholder.trim()) || PLACEHOLDER_DEFAULTS[q.type] || "";
}

// ─── فیلد متنی کوچک ───
function MiniTextInput({ q }) {
  const isLtr = q.type === "email" || q.type === "phone_ir";
  return (
    <div className="relative">
      <input
        type="text"
        dir={isLtr ? "ltr" : "rtl"}
        readOnly
        placeholder={getPlaceholder(q)}
        className="w-full bg-white border border-ink/20 rounded-lg px-3 py-2 text-xs font-semibold text-ink/40 placeholder:text-ink/30"
      />
      {q.type === "phone_ir" && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/20 text-xs">📱</span>
      )}
    </div>
  );
}

// ─── فیلد متن بلند ───
function MiniLongTextInput({ q }) {
  return (
    <textarea
      readOnly
      rows={2}
      placeholder={getPlaceholder(q)}
      className="w-full bg-white border border-ink/20 rounded-lg px-3 py-2 text-xs font-semibold text-ink/40 placeholder:text-ink/30 resize-none"
    />
  );
}

// ─── گزینه‌ها ───
function MiniChoiceOptions({ options }) {
  return (
    <div className="flex flex-col gap-1.5">
      {(options || []).map((opt, i) => (
        <div
          key={i}
          className="flex items-center gap-2 border border-ink/15 bg-white rounded-lg px-2.5 py-1.5"
        >
          <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full border border-ink/20 text-[0.55rem] font-bold text-navy">
            {faNum(i + 1)}
          </span>
          <span className="text-[0.65rem] font-semibold text-ink">{opt}</span>
        </div>
      ))}
    </div>
  );
}

// ─── بله/خیر ───
function MiniYesNo() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex items-center justify-center py-2 border border-ink/15 bg-white rounded-lg text-[0.65rem] font-bold text-ink">
        بله
      </div>
      <div className="flex items-center justify-center py-2 border border-ink/15 bg-white rounded-lg text-[0.65rem] font-bold text-ink">
        خیر
      </div>
    </div>
  );
}

// ─── ستاره ───
function MiniRating() {
  return (
    <div className="flex justify-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="text-lg text-ink/20">⭐</span>
      ))}
    </div>
  );
}

// ─── یک سوال کوچک ───
function MiniQuestion({ q, index, total }) {
  const meta = QUESTION_TYPES[q.type];
  if (!meta) return null;

  return (
    <div className="flex flex-col gap-2 border border-ink/10 bg-bg-mint/30 rounded-xl p-3">
      {/* شماره + نوع */}
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 flex items-center justify-center bg-navy text-white rounded-full text-[0.5rem] font-black">
          {faNum(index + 1)}
        </span>
        <span className="text-[0.55rem] font-bold text-ink/40">
          {meta.icon} {meta.label}
        </span>
        {q.required && (
          <span className="text-[0.5rem] text-magenta-text font-bold">*</span>
        )}
      </div>

      {/* عنوان */}
      <h3 className="text-xs font-black text-navy leading-5">
        {q.title || "سوال بدون عنوان"}
      </h3>

      {/* توضیح */}
      {q.description && (
        <p className="text-[0.6rem] text-ink/40 -mt-1">{q.description}</p>
      )}

      {/* فیلد پاسخ */}
      {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "number" || q.type === "telegram_id") && (
        <MiniTextInput q={q} />
      )}
      {q.type === "long_text" && <MiniLongTextInput q={q} />}
      {q.type === "choice" && <MiniChoiceOptions options={q.options} />}
      {q.type === "yes_no" && <MiniYesNo />}
      {q.type === "rating" && <MiniRating />}
      {q.type === "checkbox" && <MiniChoiceOptions options={q.options} />}
    </div>
  );
}

// ─── کامپوننت اصلی ───
export default function FormPreview({ form, questions }) {
  const [step, setStep] = useState(-1);

  const total = questions.length;

  return (
    <div className="flex flex-col items-center">
      {/* هدر گوشی */}
      <div className="w-full bg-navy text-white text-center py-1.5 rounded-t-2xl">
        <span className="text-[0.6rem] font-bold">پیش‌نمایش زنده</span>
      </div>

      {/* بدنه گوشی */}
      <div className="w-full bg-bg-mint border-x-2 border-b-2 border-navy/20 rounded-b-2xl overflow-hidden">
        <div className="p-3 flex flex-col gap-3 min-h-[300px] max-h-[500px] overflow-y-auto">
          {/* ─── صفحه خوش‌آمد ─── */}
          {step === -1 && (
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <span className="text-2xl">👋</span>
              <h2 className="text-sm font-black text-navy">
                {form?.welcome_title || "سلام!"}
              </h2>
              <p className="text-[0.65rem] text-ink/50 leading-5 max-w-[200px]">
                {form?.welcome_message || "ممنون که وقت گذاشتی."}
              </p>
              <button
                onClick={() => setStep(0)}
                className="mt-2 bg-teal text-white text-[0.6rem] font-bold px-4 py-1.5 rounded-full"
              >
                شروع ←
              </button>
              {total > 0 && (
                <span className="text-[0.5rem] text-ink/30">
                  {faNum(total)} سوال
                </span>
              )}
            </div>
          )}

          {/* ─── سوالات ─── */}
          {step >= 0 && step < total && (
            <div className="flex flex-col gap-2">
              <MiniQuestion
                q={questions[step]}
                index={step}
                total={total}
              />

              {/* ناوبری */}
              <div className="flex items-center justify-between mt-1">
                <button
                  onClick={() => setStep((s) => Math.max(-1, s - 1))}
                  className="text-[0.55rem] font-bold text-ink/40 hover:text-ink/60"
                >
                  ← برگشت
                </button>
                <span className="text-[0.5rem] text-ink/30">
                  {faNum(step + 1)} از {faNum(total)}
                </span>
                {step < total - 1 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    className="text-[0.55rem] font-bold text-teal hover:text-teal-text"
                  >
                    بعدی →
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(total)}
                    className="text-[0.55rem] font-bold text-magenta-text hover:text-magenta"
                  >
                    پایان ✨
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── صفحه خروج ─── */}
          {step >= total && total > 0 && (
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <span className="text-3xl">🎉</span>
              <h2 className="text-sm font-black text-navy">
                {form?.exit_title || "تمام شد!"}
              </h2>
              <p className="text-[0.65rem] text-ink/50 leading-5 max-w-[200px]">
                {form?.exit_message || "ممنون از پاسخ شما."}
              </p>
              <button
                onClick={() => setStep(-1)}
                className="mt-2 text-[0.55rem] font-bold text-ink/30 hover:text-ink/50"
              >
                ↺ شروع مجدد
              </button>
            </div>
          )}

          {/* ─── خالی ─── */}
          {total === 0 && step === -1 && (
            <div className="flex flex-col items-center justify-center py-8 text-ink/30">
              <span className="text-2xl mb-2">📝</span>
              <span className="text-[0.65rem] font-bold">هنوز سوالی اضافه نشده</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
