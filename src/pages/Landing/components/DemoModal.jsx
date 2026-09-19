import React, { useState } from "react";
import { X, Check, ArrowLeft, CornerDownLeft, CheckCircle2, Star } from "lucide-react";
import { Link } from "react-router-dom";

export default function DemoModal({ isOpen, onClose }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    name: "",
    purpose: "",
    experience: "",
    rating: 0,
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const questions = [
    {
      id: "name",
      title: "نام شما یا نام سازمان شما چیست؟",
      type: "text",
      placeholder: "مثال: شرکت نوآوران هوشمند",
    },
    {
      id: "purpose",
      title: "هدف اصلی شما از ساخت پرسشنامه چیست؟",
      type: "choice",
      options: [
        "سنجش رضایت و بازخورد مشتریان",
        "فرم استخدام و منابع انسانی",
        "تحقیقات بازار و پژوهش دانشگاهی",
        "ثبت‌نام همایش و رویداد",
      ],
    },
    {
      id: "rating",
      title: "به سرعت و روانی این فرم چه امتیازی می‌دهید؟",
      type: "rating",
    },
  ];

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setStep(0);
    setAnswers({ name: "", purpose: "", experience: "", rating: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] w-full max-w-2xl rounded-3xl p-6 sm:p-10 relative shadow-2xl overflow-hidden">
        {/* دکمه بستن */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-slate-100 dark:bg-[#0B0F19] text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-[#1E293B] transition-colors"
          aria-label="بستن پنجره"
        >
          <X size={18} />
        </button>

        {!submitted ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-700 dark:text-[#2DD4BF] text-xs font-black">
                دموی تعاملی
              </span>
              <span className="text-xs text-slate-500 dark:text-[#94A3B8]">گام {step + 1} از {questions.length}</span>
            </div>

            {/* نوار پروگرس */}
            <div className="w-full bg-slate-100 dark:bg-[#0B0F19] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] h-full transition-all duration-300"
                style={{ width: `${((step + 1) / questions.length) * 100}%` }}
              />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
              {questions[step].title}
            </h3>

            {questions[step].type === "text" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={answers.name}
                  onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
                  placeholder={questions[step].placeholder}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E293B] focus:border-teal-500 dark:focus:border-[#2DD4BF] rounded-2xl text-slate-900 dark:text-white text-base outline-none transition-all"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />
                <span className="text-xs text-slate-500 dark:text-[#94A3B8] flex items-center gap-1">
                  <CornerDownLeft size={14} className="text-teal-600 dark:text-[#2DD4BF]" />
                  برای رفتن به مرحله بعد کلید Enter را فشار دهید
                </span>
              </div>
            )}

            {questions[step].type === "choice" && (
              <div className="space-y-2.5">
                {questions[step].options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setAnswers({ ...answers, purpose: opt });
                      setTimeout(handleNext, 200);
                    }}
                    className={`w-full p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between ${
                      answers.purpose === opt
                        ? "bg-teal-500/10 border-teal-500 dark:border-[#2DD4BF] text-slate-900 dark:text-white"
                        : "bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-sky-400 dark:hover:border-[#38BDF8]/40"
                    }`}
                  >
                    <span className="text-sm font-bold">{opt}</span>
                    {answers.purpose === opt && <Check size={16} className="text-teal-600 dark:text-[#2DD4BF]" />}
                  </button>
                ))}
              </div>
            )}

            {questions[step].type === "rating" && (
              <div className="py-6 text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setAnswers({ ...answers, rating: star })}
                      className="p-1.5 hover:scale-125 transition-transform"
                      aria-label={`امتیاز ${star}`}
                    >
                      <Star
                        size={36}
                        className={
                          star <= answers.rating
                            ? "fill-[#F59E0B] text-[#F59E0B]"
                            : "text-slate-300 dark:text-[#334155]"
                        }
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  {answers.rating > 0 ? (
                    <>امتیاز انتخاب‌شده: <strong className="text-[#F59E0B]">{answers.rating} از ۵ ستاره</strong></>
                  ) : (
                    <span>روی ستاره‌ها کلیک کنید</span>
                  )}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#1E293B]">
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
                >
                  گام قبلی
                </button>
              ) : <div />}

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] text-slate-950 text-xs font-black shadow-md shadow-teal-500/20"
              >
                <span>{step === questions.length - 1 ? "پایان دمو" : "ادامه"}</span>
                <ArrowLeft size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-600 dark:text-[#10B981] flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                تجربه فرم‌سازی حرفه‌ای را لمس کردید!
              </h3>
              <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                همین حالا حساب کاربری رایگان خود را ایجاد کنید و در کمتر از ۲ دقیقه اولین پرسشنامه اختصاصی‌تان را بسازید.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/register"
                onClick={handleReset}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#2DD4BF] text-slate-950 font-black text-sm shadow-md shadow-teal-500/30"
              >
                ساخت رایگان اولین فرم
              </Link>
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-100 dark:bg-[#0B0F19] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1E293B] text-xs font-bold"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
