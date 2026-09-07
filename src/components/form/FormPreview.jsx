// ══════════════════════════════════════════════════════════════
// FormPreview — پیش‌نمایش زنده فرم در فرم‌ساز
// مرحله‌ای: هر سوال یک صفحه
// ثبت‌نامی: همه فیلدها یکجا
// ══════════════════════════════════════════════════════════════

import { useState } from "react";
import { faNum } from "../../lib/utils";
import { QUESTION_TYPES } from "../../lib/questionTypes";
import { QUESTION_TYPE_ICONS } from "../../lib/questionIcons";
import { Star, RotateCcw } from "lucide-react";

const PLACEHOLDER_DEFAULTS = {
  short_text: "پاسخ خود را بنویسید...",
  long_text: "پاسخ خود را بنویسید...",
  email: "example@email.com",
  phone_ir: "۰۹۱۲۳۴۵۶۷۸۹",
  number: "مثلاً: ۱۲۳",
  telegram_id: "username@",
};

function getPlaceholder(q) {
  return (q.placeholder && q.placeholder.trim()) || PLACEHOLDER_DEFAULTS[q.type] || "پاسخ خود را بنویسید...";
}

// ─── فیلد متنی کوچک ───
function MiniTextInput({ q }) {
  return (
    <input
      type="text"
      dir="rtl"
      readOnly
      placeholder={getPlaceholder(q)}
      className="w-full bg-white border border-ink/20 rounded-lg px-2.5 py-1.5 text-[0.65rem] font-semibold text-ink/40 placeholder:text-ink/30 text-right placeholder:text-right"
    />
  );
}

function MiniLongTextInput({ q }) {
  return (
    <textarea
      dir="rtl"
      readOnly
      rows={2}
      placeholder={getPlaceholder(q)}
      className="w-full bg-white border border-ink/20 rounded-lg px-2.5 py-1.5 text-[0.65rem] font-semibold text-ink/40 placeholder:text-ink/30 resize-none text-right placeholder:text-right"
    />
  );
}

function MiniChoiceOptions({ options, displayMode, maxSelections = 1 }) {
  const isMulti = maxSelections > 1;
  if (displayMode === "dropdown" && !isMulti) {
    return (
      <div className="w-full border border-ink/15 bg-white rounded-lg px-2 py-1.5 flex items-center justify-between">
        <span className="text-[0.55rem] font-semibold text-ink/40">یک گزینه انتخاب کنید...</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/30"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {(options || []).map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5 border border-ink/15 bg-white rounded-lg px-2 py-1">
          <span className={`w-4 h-4 shrink-0 flex items-center justify-center border border-ink/20 text-[0.45rem] font-bold text-navy ${isMulti ? "rounded" : "rounded-full"}`}>
            {faNum(i + 1)}
          </span>
          <span className="text-[0.55rem] font-semibold text-ink">{opt}</span>
        </div>
      ))}
    </div>
  );
}

function MiniYesNo() {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div className="flex items-center justify-center py-1.5 border border-ink/15 bg-white rounded-lg text-[0.55rem] font-bold text-ink">بله</div>
      <div className="flex items-center justify-center py-1.5 border border-ink/15 bg-white rounded-lg text-[0.55rem] font-bold text-ink">خیر</div>
    </div>
  );
}

function MiniRating() {
  return (
    <div className="flex justify-center gap-1 py-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={12} className="text-amber-400 fill-amber-400" />
      ))}
    </div>
  );
}

// ─── یک سوال کوچک ───
function MiniQuestion({ q, index, total }) {
  const meta = QUESTION_TYPES[q.type];
  if (!meta) return null;

  return (
    <div className="flex flex-col gap-1.5 border border-ink/10 bg-bg-mint/30 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 flex items-center justify-center bg-navy text-white rounded-full text-[0.4rem] font-black">
          {faNum(index + 1)}
        </span>
        <span className="text-[0.5rem] font-bold text-ink/40 flex items-center gap-1">{(() => { const Icon = QUESTION_TYPE_ICONS[q.type]; return Icon ? <Icon size={10} /> : null; })()} {meta.label}</span>
        {q.required && <span className="text-[0.45rem] text-magenta-text font-bold">*</span>}
      </div>
      <h3 className="text-[0.65rem] font-black text-navy leading-4">{q.title || "سوال بدون عنوان"}</h3>
      {q.description && <p className="text-[0.5rem] text-ink/40 -mt-0.5">{q.description}</p>}
      {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "number" || q.type === "telegram_id") && <MiniTextInput q={q} />}
      {q.type === "long_text" && <MiniLongTextInput q={q} />}
      {q.type === "choice" && <MiniChoiceOptions options={q.options} displayMode={(q.max_selections ?? 1) > 1 ? "buttons" : q.display_mode} maxSelections={q.max_selections ?? 1} />}
      {q.type === "choice" && (q.max_selections ?? 1) > 1 && <span className="text-[0.5rem] font-bold text-orange">حداکثر {faNum(q.max_selections)} انتخاب</span>}
      {q.type === "yes_no" && <MiniYesNo />}
      {q.type === "rating" && <MiniRating />}
    </div>
  );
}

// ─── حالت ثبت‌نامی: همه فیلدها یکجا ───
function RegistrationPreview({ form, questions }) {
  return (
    <div className="p-3 flex flex-col gap-2.5 min-h-[300px] max-h-[500px] overflow-y-auto">
      {/* هدر فرم */}
      <div className="text-center mb-1">
        <h2 className="text-xs font-black text-navy">{form?.title || "فرم ثبت‌نام"}</h2>
        {form?.description && <p className="text-[0.5rem] text-ink/40 mt-0.5">{form.description}</p>}
      </div>

      {/* همه فیلدها */}
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-ink/30">
          <span className="text-xl mb-1"> </span>
          <span className="text-[0.55rem] font-bold">هنوز فیلدی اضافه نشده</span>
        </div>
      ) : (
        questions.map((q, i) => (
          <MiniQuestion key={q.localId || q.id || i} q={q} index={i} total={questions.length} />
        ))
      )}

      {/* دکمه ارسال */}
      {questions.length > 0 && (
        <div className="bg-teal text-white text-[0.55rem] font-bold text-center py-1.5 rounded-lg mt-1">
          ارسال پاسخ
        </div>
      )}
    </div>
  );
}

// ─── حالت مرحله‌ای: هر سوال یک صفحه ───
function StepByStepPreview({ form, questions }) {
  const [step, setStep] = useState(-1);
  const total = questions.length;

  return (
    <div className="p-3 flex flex-col gap-3 min-h-[300px] max-h-[500px] overflow-y-auto">
      {/* صفحه خوش‌آمد */}
      {step === -1 && (
        <div className="flex flex-col items-center text-center gap-2 py-4">
          <h2 className="text-sm font-black text-navy">{form?.welcome_title || "سلام!"}</h2>
          <p className="text-[0.65rem] text-ink/50 leading-5 max-w-[200px]">
            {form?.welcome_message || "ممنون که وقت گذاشتی."}
          </p>
          <button onClick={() => setStep(0)} className="mt-2 bg-teal text-white text-[0.6rem] font-bold px-4 py-1.5 rounded-full">
            شروع ←
          </button>
          {total > 0 && <span className="text-[0.5rem] text-ink/30">{faNum(total)} سوال</span>}
        </div>
      )}

      {/* سوالات */}
      {step >= 0 && step < total && (
        <div className="flex flex-col gap-2">
          <MiniQuestion q={questions[step]} index={step} total={total} />
          <div className="flex items-center justify-between mt-1">
            <button onClick={() => setStep((s) => Math.max(-1, s - 1))} className="text-[0.55rem] font-bold text-ink/40 hover:text-ink/60">
              ← برگشت
            </button>
            <span className="text-[0.5rem] text-ink/30">{faNum(step + 1)} از {faNum(total)}</span>
            {step < total - 1 ? (
              <button onClick={() => setStep((s) => s + 1)} className="text-[0.55rem] font-bold text-teal hover:text-teal-text">
                بعدی →
              </button>
            ) : (
              <button onClick={() => setStep(total)} className="text-[0.55rem] font-bold text-magenta-text hover:text-magenta">
                ثبت نهایی
              </button>
            )}
          </div>
        </div>
      )}

      {/* صفحه خروج */}
      {step >= total && total > 0 && (
        <div className="flex flex-col items-center text-center gap-2 py-4">
          <h2 className="text-sm font-black text-navy">{form?.exit_title || "تمام شد!"}</h2>
          <p className="text-[0.65rem] text-ink/50 leading-5 max-w-[200px]">
            {form?.exit_message || "ممنون از پاسخ شما."}
          </p>
          <button onClick={() => setStep(-1)} className="mt-2 text-[0.55rem] font-bold text-ink/40 hover:text-ink/60 flex items-center gap-1">
            <RotateCcw size={10} /> شروع مجدد
          </button>
        </div>
      )}

      {/* خالی */}
      {total === 0 && step === -1 && (
        <div className="flex flex-col items-center justify-center py-8 text-ink/30">
          <span className="text-2xl mb-2"> </span>
          <span className="text-[0.65rem] font-bold">هنوز سوالی اضافه نشده</span>
        </div>
      )}
    </div>
  );
}

// ─── کامپوننت اصلی ───
export default function FormPreview({ form, questions }) {
  const isRegistration = form?.form_type === "registration";

  return (
    <div className="flex flex-col items-center">
      {/* هدر */}
      <div className="w-full bg-navy text-white text-center py-1.5 rounded-t-2xl">
        <span className="text-[0.6rem] font-bold">
          {isRegistration ? "پیش‌نمایش ثبت‌نامی" : "پیش‌نمایش مرحله‌ای"}
        </span>
      </div>

      {/* بدنه */}
      <div className="w-full bg-bg-mint border-x-2 border-b-2 border-navy/20 rounded-b-2xl overflow-hidden">
        {isRegistration ? (
          <RegistrationPreview form={form} questions={questions} />
        ) : (
          <StepByStepPreview form={form} questions={questions} />
        )}
      </div>
    </div>
  );
}
