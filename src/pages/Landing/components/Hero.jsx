import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Zap,
  CornerDownLeft,
  Star,
  Check,
  Activity,
  FileSpreadsheet
} from "lucide-react";

export default function Hero({ onOpenDemo }) {
  // شبیه‌ساز زنده فرم اسلایدی در Hero - بدون مقدار پیش‌فرض اولیه
  const [activeStep, setActiveStep] = useState(0);
  const [nameVal, setNameVal] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const steps = [
    {
      id: 1,
      title: "نام و نام خانوادگی خود را وارد کنید",
      type: "text",
      placeholder: "مثال: علی رضایی",
      hint: "کلید Enter برای مرحله بعد ↵",
    },
    {
      id: 2,
      title: "نقش شما در سازمان یا تیم چیست؟",
      type: "choice",
      options: ["مدیر محصول", "مارکتینگ و فروش", "منابع انسانی", "برنامه‌نویس و فنی"],
    },
    {
      id: 3,
      title: "تجربه ساخت فرم در پرسکاد را چگونه ارزیابی می‌کنید؟",
      type: "rating",
      hint: "امتیاز از ۱ تا ۵ ستاره",
    },
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setActiveStep(0);
        setNameVal("");
        setSelectedRole("");
        setRating(0);
      }, 4000);
    }
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-[#F8FAFC] transition-colors duration-200">
      {/* الگو و جلوه‌های نوری گرادیان پس‌زمینه */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-teal-500/15 via-sky-500/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-sky-500/10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* الگو نقطه توری مهندسی‌شده (Dot Grid) */}
      <div
        className="absolute inset-0 opacity-[0.12] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#2DD4BF 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
          {/* نشان وضعیت / Eyebrow Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white dark:bg-[#131B2E] border border-teal-500/30 shadow-md shadow-teal-500/10 mb-6 backdrop-blur-md animate-fadeIn">
            <span className="flex h-2 w-2 rounded-full bg-[#2DD4BF] animate-ping" />
            <span className="text-xs sm:text-sm font-bold bg-gradient-to-l from-teal-600 to-sky-600 dark:from-[#2DD4BF] dark:to-[#38BDF8] bg-clip-text text-transparent">
              فرمساز حرفه‌ای فارسی | نسخه تولیدی
            </span>
          </div>

          {/* عنوان اصلی H1 */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.25] text-slate-900 dark:text-white mb-6">
            فرم بساز، پاسخ بگیر، تصمیم درست بگیر —
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-600 via-sky-600 to-teal-500 dark:from-[#2DD4BF] dark:via-[#38BDF8] dark:to-[#2DD4BF] bg-clip-text text-transparent inline-block mt-2">
              در کمتر از ۲ دقیقه
            </span>
          </h1>

          {/* زیرعنوان توضیحی */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-[#94A3B8] font-normal leading-relaxed max-w-3xl mx-auto mb-10">
            پرسکاد پلتفرمی برای ساخت فرم و پرسشنامه‌های حرفه‌ای، سریع و کاملاً فارسی است؛ با منطق شرطی هوشمند، تحلیل زنده پاسخ‌ها و خروجی اکسل بدون به‌هم‌ریختگی حروف فارسی.
          </p>

          {/* دکمه‌های اقدام (CTAs) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 text-base font-black text-slate-950 bg-gradient-to-r from-[#2DD4BF] via-[#2DD4BF] to-[#38BDF8] rounded-2xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              <span>ساخت رایگان اولین فرم</span>
              <ArrowLeft size={20} />
            </Link>

            <button
              onClick={onOpenDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-4 text-base font-bold text-slate-800 dark:text-[#F8FAFC] bg-white dark:bg-[#131B2E] hover:bg-slate-100 dark:hover:bg-[#1B253D] border border-slate-200 dark:border-[#1E293B] hover:border-teal-500/50 rounded-2xl shadow-sm transition-all duration-200 group"
            >
              <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-[#2DD4BF] group-hover:scale-110 transition-transform">
                <Play size={12} className="fill-teal-600 dark:fill-[#2DD4BF] translate-x-[-0.5px]" />
              </div>
              <span>مشاهده دمو تعاملی</span>
            </button>
          </div>

          {/* خط اعتماد زیر دکمه‌ها */}
          <div className="flex items-center justify-center gap-6 text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-teal-600 dark:text-[#2DD4BF]" />
              بدون نیاز به کارت بانکی
            </span>
            <span className="text-slate-300 dark:text-[#1E293B]">•</span>
            <span className="flex items-center gap-1.5">
              <Zap size={16} className="text-sky-600 dark:text-[#38BDF8]" />
              راه‌اندازی سریع در ۲ دقیقه
            </span>
          </div>
        </div>

        {/* ماک‌آپ بصری تعاملی Hero (اسلایدر فرم ریسپانسیو اتوماتیک) */}
        <div className="max-w-4xl mx-auto relative">
          {/* نشان شناور ثبت Realtime */}
          <div className="hidden sm:flex absolute -top-4 left-2 sm:-left-4 z-20 bg-white/90 dark:bg-[#131B2E]/90 backdrop-blur-xl border border-teal-500/40 rounded-2xl p-3 shadow-lg dark:shadow-2xl flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-[#2DD4BF]">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-white">ثبت آنی پاسخ</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">بدون تاخیر و لگ</span>
            </div>
          </div>

          {/* نشان شناور خروجی اکسل سالم */}
          <div className="hidden md:flex absolute -bottom-4 right-2 sm:-right-4 z-20 bg-white/90 dark:bg-[#131B2E]/90 backdrop-blur-xl border border-sky-500/40 rounded-2xl p-3 shadow-lg dark:shadow-2xl items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-600 dark:text-[#38BDF8]">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white block">خروجی اکسل سالم</span>
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">استاندارد UTF-8 BOM</span>
            </div>
          </div>

          {/* قاب کارت ماک‌آپ */}
          <div className="bg-white dark:bg-[#131B2E]/90 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-[#1E293B] shadow-xl dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300">
            {/* نوار بالای پنجره سیستم */}
            <div className="bg-slate-100/90 dark:bg-[#0B0F19]/90 px-5 py-3.5 border-b border-slate-200 dark:border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#F43F5E]/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#10B981]/80 inline-block" />
                <span className="text-xs text-slate-500 dark:text-[#64748B] font-mono mr-3 hidden sm:inline">
                  https://porskad.ir/f/product-survey
                </span>
              </div>

              {/* درصد پیشرفت فرم */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-600 dark:text-[#2DD4BF]">
                  {isSubmitted ? "۱۰۰٪" : `${Math.round(((activeStep + 1) / steps.length) * 100)}٪`}
                </span>
              </div>
            </div>

            {/* نوار پروگرس لودینگ زنده */}
            <div className="w-full bg-slate-100 dark:bg-[#1E293B] h-1">
              <div
                className="bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] h-full transition-all duration-500 ease-out"
                style={{
                  width: isSubmitted ? "100%" : `${((activeStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>

            {/* بدنه رندر اسلایدی فرم */}
            <div className="p-6 sm:p-10 transition-all duration-300">
              {!isSubmitted ? (
                <div className="space-y-6 sm:space-y-8 animate-fadeIn" key={activeStep}>
                  {/* شماره سوال و عنوان */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 dark:text-[#2DD4BF] font-black text-sm">
                        {activeStep + 1}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-bold">
                        سوال {activeStep + 1} از {steps.length}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                      {steps[activeStep].title}
                    </h3>
                  </div>

                  {/* نوع فیلد سوال */}
                  {steps[activeStep].type === "text" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={nameVal}
                        onChange={(e) => setNameVal(e.target.value)}
                        placeholder={steps[activeStep].placeholder}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-[#0B0F19] border-2 border-slate-200 dark:border-[#2DD4BF]/40 focus:border-teal-500 dark:focus:border-[#2DD4BF] rounded-2xl text-base sm:text-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#64748B] outline-none transition-all"
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
                        <span className="flex items-center gap-1 text-teal-600 dark:text-[#2DD4BF]">
                          <CornerDownLeft size={14} />
                          {steps[activeStep].hint}
                        </span>
                        <span>اعتبارسنجی خودکار زنده</span>
                      </div>
                    </div>
                  )}

                  {steps[activeStep].type === "choice" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {steps[activeStep].options.map((opt, idx) => {
                        const isSelected = selectedRole === opt;
                        const keyBadge = ["A", "B", "C", "D"][idx];
                        return (
                          <button
                            key={opt}
                            onClick={() => setSelectedRole(opt)}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 text-right transition-all duration-200 ${
                              isSelected
                                ? "bg-teal-500/10 border-teal-500 dark:border-[#2DD4BF] text-slate-900 dark:text-white shadow-md shadow-teal-500/10"
                                : "bg-slate-50 dark:bg-[#0B0F19]/80 border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#94A3B8] hover:border-sky-400 dark:hover:border-[#38BDF8]/50 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <span className="font-bold text-sm sm:text-base">{opt}</span>
                            <span
                              className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black transition-colors ${
                                isSelected ? "bg-[#2DD4BF] text-slate-950" : "bg-slate-200 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8]"
                              }`}
                            >
                              {keyBadge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {steps[activeStep].type === "rating" && (
                    <div className="space-y-4 text-center py-4">
                      <div className="flex items-center justify-center gap-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="p-2 rounded-2xl hover:scale-125 transition-transform"
                            aria-label={`امتیاز ${star}`}
                          >
                            <Star
                              size={36}
                              className={
                                star <= rating
                                  ? "fill-[#F59E0B] text-[#F59E0B] drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                                  : "text-slate-300 dark:text-[#334155]"
                              }
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                        {rating > 0 ? (
                          <>امتیاز انتخاب‌شده: <strong className="text-[#F59E0B]">{rating} از ۵ ستاره</strong></>
                        ) : (
                          <span>برای ثبت امتیاز روی ستاره‌ها کلیک کنید</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* دکمه مرحله بعد / ثبت نهایی */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#1E293B]">
                    <div className="flex items-center gap-2">
                      {activeStep > 0 && (
                        <button
                          onClick={() => setActiveStep((prev) => prev - 1)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E293B]"
                        >
                          قبلی
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleNext}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] text-slate-950 font-black text-sm rounded-xl shadow-md shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <span>{activeStep === steps.length - 1 ? "ثبت پاسخ" : "مرحله بعد"}</span>
                      <ArrowLeft size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                /* وضعیت موفقیت و پایان ثبت */
                <div className="py-12 text-center space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-[#10B981] mx-auto animate-bounce">
                    <Check size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">پاسخ شما با موفقیت ثبت شد!</h3>
                  <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-md mx-auto">
                    داده‌ها به صورت زنده ذخیره و در داشبورد تحلیلی در دسترس قرار گرفت.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
