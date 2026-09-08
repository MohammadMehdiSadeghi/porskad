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
function MiniTextInput({ q, isDark }) {
  return (
    <input
      type="text"
      dir="rtl"
      readOnly
      placeholder={getPlaceholder(q)}
      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-right placeholder:text-right ${
        isDark
          ? "bg-slate-800/90 border-slate-700 text-slate-300 placeholder:text-slate-500"
          : "bg-white border-ink/20 text-ink/50 placeholder:text-ink/30"
      }`}
    />
  );
}

function MiniLongTextInput({ q, isDark }) {
  return (
    <textarea
      dir="rtl"
      readOnly
      rows={2}
      placeholder={getPlaceholder(q)}
      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold resize-none text-right placeholder:text-right ${
        isDark
          ? "bg-slate-800/90 border-slate-700 text-slate-300 placeholder:text-slate-500"
          : "bg-white border-ink/20 text-ink/50 placeholder:text-ink/30"
      }`}
    />
  );
}

function MiniChoiceOptions({ options, displayMode, maxSelections = 1, isDark }) {
  const isMulti = maxSelections > 1;
  if (displayMode === "dropdown" && !isMulti) {
    return (
      <div className={`w-full border rounded-lg px-2 py-1.5 flex items-center justify-between ${
        isDark ? "border-slate-700 bg-slate-800 text-slate-400" : "border-ink/15 bg-white text-ink/40"
      }`}>
        <span className="text-xs font-semibold">یک گزینه انتخاب کنید...</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isDark ? "text-slate-500" : "text-ink/30"}><path d="m6 9 6 6 6-6"/></svg>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {(options || []).map((opt, i) => (
        <div key={i} className={`flex items-center gap-1.5 border rounded-lg px-2 py-1 ${
          isDark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-ink/15 bg-white text-ink"
        }`}>
          <span className={`w-4 h-4 shrink-0 flex items-center justify-center border text-xs font-bold ${
            isDark ? "border-slate-600 text-teal-400 bg-slate-900" : "border-ink/20 text-navy bg-white"
          } ${isMulti ? "rounded" : "rounded-full"}`}>
            {faNum(i + 1)}
          </span>
          <span className="text-xs font-semibold">{opt}</span>
        </div>
      ))}
    </div>
  );
}

function MiniYesNo({ isDark }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div className={`flex items-center justify-center py-1.5 border rounded-lg text-xs font-bold ${
        isDark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-ink/15 bg-white text-ink"
      }`}>بله</div>
      <div className={`flex items-center justify-center py-1.5 border rounded-lg text-xs font-bold ${
        isDark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-ink/15 bg-white text-ink"
      }`}>خیر</div>
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
function MiniQuestion({ q, index, total, isDark }) {
  const meta = QUESTION_TYPES[q.type];
  if (!meta) return null;

  return (
    <div className={`flex flex-col gap-1.5 border rounded-lg p-2.5 transition-colors ${
      isDark ? "border-slate-700/80 bg-slate-800/90 text-slate-100" : "border-ink/10 bg-bg-mint/30 text-ink"
    }`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-4 h-4 flex items-center justify-center rounded-full text-xs font-black ${
          isDark ? "bg-teal text-slate-900" : "bg-navy text-white"
        }`}>
          {faNum(index + 1)}
        </span>
        <span className={`text-xs font-bold flex items-center gap-1 ${isDark ? "text-slate-400" : "text-ink/40"}`}>
          {(() => { const Icon = QUESTION_TYPE_ICONS[q.type]; return Icon ? <Icon size={10} /> : null; })()} {meta.label}
        </span>
        {q.required && <span className="text-xs text-magenta-text font-bold">*</span>}
      </div>
      <h3 className={`text-xs font-black leading-4 ${isDark ? "text-white" : "text-navy"}`}>{q.title || "سوال بدون عنوان"}</h3>
      {q.description && <p className={`text-xs -mt-0.5 ${isDark ? "text-slate-400" : "text-ink/40"}`}>{q.description}</p>}
      {(q.type === "short_text" || q.type === "email" || q.type === "phone_ir" || q.type === "number" || q.type === "telegram_id") && <MiniTextInput q={q} isDark={isDark} />}
      {q.type === "long_text" && <MiniLongTextInput q={q} isDark={isDark} />}
      {q.type === "choice" && <MiniChoiceOptions options={q.options} displayMode={(q.max_selections ?? 1) > 1 ? "buttons" : q.display_mode} maxSelections={q.max_selections ?? 1} isDark={isDark} />}
      {q.type === "choice" && (q.max_selections ?? 1) > 1 && <span className="text-xs font-bold text-orange">حداکثر {faNum(q.max_selections)} انتخاب</span>}
      {q.type === "yes_no" && <MiniYesNo isDark={isDark} />}
      {q.type === "rating" && <MiniRating />}
    </div>
  );
}
// ─── حالت ثبت‌نامی: همه فیلدها یکجا ───
function RegistrationPreview({ form, questions, isDark }) {
  return (
    <div className={`p-3 flex flex-col gap-2.5 min-h-[300px] max-h-[500px] overflow-y-auto transition-colors ${
      isDark ? "bg-[#0F172A] text-slate-100" : "bg-bg-mint/40 text-ink"
    }`}>
      {/* هدر فرم */}
      <div className="text-center mb-1">
        <h2 className={`text-xs font-black ${isDark ? "text-white" : "text-navy"}`}>{form?.title || "فرم ثبت‌نام"}</h2>
        {form?.description && <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-ink/40"}`}>{form.description}</p>}
      </div>

      {/* همه فیلدها */}
      {questions.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-8 ${isDark ? "text-slate-500" : "text-ink/30"}`}>
          <span className="text-xl mb-1"> </span>
          <span className="text-xs font-bold">هنوز فیلدی اضافه نشده</span>
        </div>
      ) : (
        questions.map((q, i) => (
          <MiniQuestion key={q.localId || q.id || i} q={q} index={i} total={questions.length} isDark={isDark} />
        ))
      )}

      {/* دکمه ارسال */}
      {questions.length > 0 && (
        <div className="bg-teal text-white text-xs font-bold text-center py-1.5 rounded-lg mt-1 shadow-xs">
          ارسال پاسخ
        </div>
      )}
    </div>
  );
}

// ─── حالت مرحله‌ای: هر سوال یک صفحه ───
function StepByStepPreview({ form, questions, isDark }) {
  const [step, setStep] = useState(-1);
  const total = questions.length;

  return (
    <div className={`p-3 flex flex-col gap-3 min-h-[300px] max-h-[500px] overflow-y-auto transition-colors ${
      isDark ? "bg-[#0F172A] text-slate-100" : "bg-bg-mint/40 text-ink"
    }`}>
      {/* صفحه خوش‌آمد */}
      {step === -1 && (
        <div className="flex flex-col items-center text-center gap-2 py-4">
          <h2 className={`text-sm font-black ${isDark ? "text-white" : "text-navy"}`}>{form?.welcome_title || "سلام!"}</h2>
          <p className={`text-xs leading-5 max-w-[200px] ${isDark ? "text-slate-400" : "text-ink/50"}`}>
            {form?.welcome_message || "ممنون که وقت گذاشتی."}
          </p>
          <button onClick={() => setStep(0)} className="mt-2 bg-teal text-white text-xs font-bold px-4 py-1.5 rounded-full cursor-pointer hover:bg-teal-alt">
            شروع ←
          </button>
          {total > 0 && <span className={`text-xs ${isDark ? "text-slate-500" : "text-ink/30"}`}>{faNum(total)} سوال</span>}
        </div>
      )}

      {/* سوالات */}
      {step >= 0 && step < total && (
        <div className="flex flex-col gap-2">
          <MiniQuestion q={questions[step]} index={step} total={total} isDark={isDark} />
          <div className="flex items-center justify-between mt-1">
            <button onClick={() => setStep((s) => Math.max(-1, s - 1))} className={`text-xs font-bold ${isDark ? "text-slate-400 hover:text-slate-200" : "text-ink/40 hover:text-ink/60"} cursor-pointer`}>
              ← برگشت
            </button>
            <span className={`text-xs ${isDark ? "text-slate-500" : "text-ink/30"}`}>{faNum(step + 1)} از {faNum(total)}</span>
            {step < total - 1 ? (
              <button onClick={() => setStep((s) => s + 1)} className="text-xs font-bold text-teal hover:text-teal-text cursor-pointer">
                بعدی →
              </button>
            ) : (
              <button onClick={() => setStep(total)} className="text-xs font-bold text-magenta-text hover:text-magenta cursor-pointer">
                ثبت نهایی
              </button>
            )}
          </div>
        </div>
      )}

      {/* صفحه خروج */}
      {step >= total && total > 0 && (
        <div className="flex flex-col items-center text-center gap-2 py-4">
          <h2 className={`text-sm font-black ${isDark ? "text-white" : "text-navy"}`}>{form?.exit_title || "تمام شد!"}</h2>
          <p className={`text-xs leading-5 max-w-[200px] ${isDark ? "text-slate-400" : "text-ink/50"}`}>
            {form?.exit_message || "ممنون از پاسخ شما."}
          </p>
          <button onClick={() => setStep(-1)} className={`mt-2 text-xs font-bold flex items-center gap-1 cursor-pointer ${isDark ? "text-slate-400 hover:text-slate-200" : "text-ink/40 hover:text-ink/60"}`}>
            <RotateCcw size={10} /> شروع مجدد
          </button>
        </div>
      )}

      {/* خالی */}
      {total === 0 && step === -1 && (
        <div className={`flex flex-col items-center justify-center py-8 ${isDark ? "text-slate-500" : "text-ink/30"}`}>
          <span className="text-2xl mb-2"> </span>
          <span className="text-xs font-bold">هنوز سوالی اضافه نشده</span>
        </div>
      )}
    </div>
  );
}

// ─── کامپوننت اصلی ───
export default function FormPreview({ form, questions }) {
  const isRegistration = form?.form_type === "registration";
  const isDark = form?.default_theme === "dark" || (
    form?.default_theme === "system" &&
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  return (
    <div className="flex flex-col items-center">
      {/* هدر */}
      <div className={`w-full text-center py-1.5 rounded-t-2xl transition-colors ${
        isDark ? "bg-slate-900 border-b border-slate-700 text-teal-400" : "bg-navy text-white"
      }`}>
        <span className="text-xs font-bold flex items-center justify-center gap-1.5">
          <span>{isRegistration ? "پیش‌نمایش ثبت‌نامی" : "پیش‌نمایش مرحله‌ای"}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
            isDark ? "bg-teal/20 text-teal" : "bg-white/20 text-white"
          }`}>
            {form?.default_theme === "dark" ? "تم دارک" : form?.default_theme === "system" ? "سیستم" : "تم روشن"}
          </span>
        </span>
      </div>

      {/* بدنه */}
      <div className={`w-full border-x-2 border-b-2 rounded-b-2xl overflow-hidden transition-colors ${
        isDark ? "bg-[#0F172A] border-slate-700" : "bg-bg-mint/40 border-navy/20"
      }`}>
        {isRegistration ? (
          <RegistrationPreview form={form} questions={questions} isDark={isDark} />
        ) : (
          <StepByStepPreview form={form} questions={questions} isDark={isDark} />
        )}
      </div>
    </div>
  );
}
