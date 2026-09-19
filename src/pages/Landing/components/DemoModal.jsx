import React, { useState } from "react";
import { X, Check, ArrowLeft, CornerDownLeft, CheckCircle2, Star } from "lucide-react";
import { Link } from "react-router-dom";
import StickerCard from "../../../components/ui/StickerCard";
import Badge from "../../../components/ui/Badge";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <StickerCard
        theme="white"
        borderWidth="border-2"
        shadow="shadow-[6px_6px_0_#202A5A] dark:shadow-[6px_6px_0_#59BBAF]"
        className="w-full max-w-2xl p-6 sm:p-10 relative overflow-hidden"
      >
        {/* دکمه بستن */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-slate-100 dark:bg-[#131B2E] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border-2 border-[#202A5A]/20 dark:border-white/10 shadow-[2px_2px_0_#202A5A]/20 transition-all active:translate-x-[1px] active:translate-y-[1px]"
          aria-label="بستن پنجره"
        >
          <X size={18} />
        </button>

        {!submitted ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge theme="teal" size="sm">
                دموی تعاملی
              </Badge>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">گام {step + 1} از {questions.length}</span>
            </div>

            {/* نوار پروگرس */}
            <div className="w-full bg-slate-100 dark:bg-[#0B0F17] h-2.5 rounded-full overflow-hidden border-2 border-[#202A5A]/15 dark:border-[#59BBAF]/30 p-0.5">
              <div
                className="bg-[#59BBAF] h-full rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / questions.length) * 100}%` }}
              />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#202A5A] dark:text-white leading-snug">
              {questions[step].title}
            </h3>

            {questions[step].type === "text" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={answers.name}
                  onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
                  placeholder={questions[step].placeholder}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-[#0B0F17] border-2 border-[#202A5A]/20 dark:border-[#59BBAF]/40 focus:border-[#59BBAF] rounded-2xl text-[#202A5A] dark:text-white text-base font-bold outline-none transition-all shadow-[2px_2px_0_#202A5A]/10"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <CornerDownLeft size={14} className="text-[#59BBAF]" />
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
                    className={`w-full p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between active:translate-x-[1px] active:translate-y-[1px] ${
                      answers.purpose === opt
                        ? "bg-[#59BBAF]/20 border-[#59BBAF] text-[#202A5A] dark:text-white shadow-[2.5px_2.5px_0_#59BBAF]"
                        : "bg-slate-50 dark:bg-[#0B0F17] border-[#202A5A]/20 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-[#59BBAF] shadow-[2px_2px_0_#202A5A]/10"
                    }`}
                  >
                    <span className="text-sm font-black">{opt}</span>
                    {answers.purpose === opt && <Check size={16} className="text-[#59BBAF]" />}
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
                            ? "fill-[#F8A41D] text-[#F8A41D]"
                            : "text-slate-300 dark:text-slate-600"
                        }
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {answers.rating > 0 ? (
                    <>امتیاز انتخاب‌شده: <strong className="text-[#F8A41D]">{answers.rating} از ۵ ستاره</strong></>
                  ) : (
                    <span>روی ستاره‌ها کلیک کنید</span>
                  )}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t-2 border-[#202A5A]/10 dark:border-white/10">
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  گام قبلی
                </button>
              ) : <div />}

              <button
                onClick={handleNext}
                className="rokad-btn-primary text-xs px-6 py-2.5 flex items-center gap-2"
              >
                <span>{step === questions.length - 1 ? "پایان دمو" : "ادامه"}</span>
                <ArrowLeft size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#59BBAF] border-2 border-[#202A5A] text-slate-950 flex items-center justify-center mx-auto shadow-[4px_4px_0_#202A5A]">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-[#202A5A] dark:text-white mb-2">
                تجربه فرم‌سازی حرفه‌ای را لمس کردید!
              </h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                همین حالا حساب کاربری رایگان خود را ایجاد کنید و در کمتر از ۲ دقیقه اولین پرسشنامه اختصاصی‌تان را بسازید.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/register"
                onClick={handleReset}
                className="rokad-btn-primary text-sm px-7 py-3.5"
              >
                ساخت رایگان اولین فرم
              </Link>
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-100 dark:bg-[#131B2E] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-2 border-[#202A5A]/20 dark:border-white/10 text-xs font-black shadow-[2px_2px_0_#202A5A]/20 active:translate-x-[1px] active:translate-y-[1px]"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        )}
      </StickerCard>
    </div>
  );
}
