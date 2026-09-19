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
import Badge from "../../../components/ui/Badge";
import StickerCard from "../../../components/ui/StickerCard";

export default function Hero({ onOpenDemo }) {
  // شبیه‌ساز زنده فرم اسلایدی در Hero
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
      title: "تجربه ساخت فرم در پرس‌کاد را چگونه ارزیابی می‌کنید؟",
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
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden dot-pattern bg-[#F8F9FA] dark:bg-[#0B0F17] text-sec dark:text-[#F1F5F9] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
          {/* نشان وضعیت / Eyebrow Badge به سبک رُکاد */}
          <div className="inline-flex items-center gap-2 mb-5">
            <Badge color="teal">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
              <span>نسل جدید فرم‌ساز آنلاین و مکالمه‌محور</span>
            </Badge>
          </div>

          {/* عنوان اصلی H1 */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-sec dark:text-white leading-[1.35] mb-5 max-w-5xl mx-auto whitespace-normal lg:whitespace-nowrap">
            فرم‌هایی بسازید که مخاطب{" "}
            <span className="text-primary underline decoration-primary/40 underline-offset-8">
              عاشق پاسخ دادن به آن‌هاست
            </span>
          </h1>

          {/* زیرعنوان توضیحی */}
          <p className="text-xs sm:text-sm md:text-base text-ink-subtle dark:text-gray-300 font-medium leading-relaxed max-w-2xl mx-auto mb-8">
            خداحافظی با فرم‌های کسل‌کننده و طوماری؛ پرس‌کاد سوالات شما را به یک گفت‌وگوی اسلایدی و تعاملی تبدیل می‌کند تا بیشترین پاسخ را با کمترین ریزش دریافت کنید.
          </p>

          {/* دکمه‌های اقدام (CTAs) با سایه‌های سخت فیزیکی نئوبروتالیسم */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-6">
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-primary text-white font-black py-3 px-7 rounded-xl border-[1.5px] border-ecosystem-dark shadow-[2.75px_2.75px_0_#1F413D] hover:shadow-[3.5px_3.5px_0_#1F413D] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none text-sm transition-all"
            >
              <span>ساخت رایگان اولین فرم</span>
              <ArrowLeft size={18} />
            </Link>

            <button
              onClick={onOpenDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-[#151C28] text-sec dark:text-white font-bold py-3 px-6 rounded-xl border-[1.5px] border-gray-200 dark:border-[#242F42] shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-sm transition-all"
            >
              <Play size={14} className="fill-primary text-primary" />
              <span>مشاهده دمو تعاملی</span>
            </button>
          </div>

          {/* خط اعتماد زیر دکمه‌ها */}
          <div className="flex items-center justify-center gap-6 text-xs text-ink-subtle dark:text-gray-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-primary" />
              بدون نیاز به کارت بانکی
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="flex items-center gap-1.5">
              <Zap size={15} className="text-third" />
              راه‌اندازی در کمتر از ۲ دقیقه
            </span>
          </div>
        </div>

        {/* ماک‌آپ بصری تعاملی Hero (اسلایدر فرم ریسپانسیو رُکاد) */}
        <div className="max-w-3xl mx-auto relative">
          {/* نشان شناور ثبت Realtime */}
          <div className="hidden sm:flex absolute -top-4 left-2 sm:-left-5 z-20">
            <StickerCard theme="teal" className="p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                <Activity size={16} />
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-sec dark:text-white">ثبت آنی پاسخ</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <span className="text-[10px] text-ink-subtle dark:text-gray-400 font-bold">بدون تاخیر و لگ</span>
              </div>
            </StickerCard>
          </div>

          {/* نشان شناور خروجی اکسل سالم */}
          <div className="hidden md:flex absolute -bottom-4 right-2 sm:-right-5 z-20">
            <StickerCard theme="navy" className="p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sec/10 dark:bg-primary/15 flex items-center justify-center text-sec dark:text-primary">
                <FileSpreadsheet size={16} />
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-sec dark:text-white block">خروجی اکسل سالم</span>
                <span className="text-[10px] text-ink-subtle dark:text-gray-400 font-bold">استاندارد UTF-8 BOM</span>
              </div>
            </StickerCard>
          </div>

          {/* قاب کارت ماک‌آپ فرم با کارت رُکاد */}
          <StickerCard theme="white" className="overflow-hidden">
            {/* نوار بالای پنجره سیستم */}
            <div className="bg-[#F8F9FA] dark:bg-[#1C2536] px-5 py-3 border-b-[1.5px] border-gray-200 dark:border-[#242F42] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E0195B]" />
                <span className="w-3 h-3 rounded-full bg-[#F8A41D]" />
                <span className="w-3 h-3 rounded-full bg-[#59BBAF]" />
                <span className="text-xs text-ink-subtle dark:text-gray-400 font-mono mr-3 hidden sm:inline">
                  https://porskad.ir/f/product-survey
                </span>
              </div>

              {/* درصد پیشرفت فرم */}
              <div className="flex items-center gap-2">
                <Badge color="teal">
                  {isSubmitted ? "۱۰۰٪" : `${Math.round(((activeStep + 1) / steps.length) * 100)}٪`}
                </Badge>
              </div>
            </div>

            {/* نوار پروگرس لودینگ زنده */}
            <div className="w-full bg-gray-100 dark:bg-[#1C2536] h-1.5">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{
                  width: isSubmitted ? "100%" : `${((activeStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>

            {/* بدنه رندر اسلایدی فرم */}
            <div className="p-6 sm:p-8">
              {!isSubmitted ? (
                <div className="space-y-6" key={activeStep}>
                  {/* شماره سوال و عنوان */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-ecosystem-light dark:bg-[#1C2536] text-primary font-black text-xs border border-primary/30">
                        {activeStep + 1}
                      </span>
                      <span className="text-xs text-ink-subtle dark:text-gray-400 font-bold">
                        سوال {activeStep + 1} از {steps.length}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-sec dark:text-white leading-snug">
                      {steps[activeStep].title}
                    </h3>
                  </div>

                  {/* نوع فیلد سوال */}
                  {steps[activeStep].type === "text" && (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={nameVal}
                        onChange={(e) => setNameVal(e.target.value)}
                        placeholder={steps[activeStep].placeholder}
                        className="w-full px-4 py-3 bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 focus:border-primary rounded-xl text-sm font-bold text-sec dark:text-white placeholder:text-ink-subtle/40 focus:outline-none transition-all"
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                      />
                      <div className="flex items-center justify-between text-xs text-ink-subtle dark:text-gray-400">
                        <span className="flex items-center gap-1 text-primary font-bold">
                          <CornerDownLeft size={13} />
                          {steps[activeStep].hint}
                        </span>
                        <span>اعتبارسنجی خودکار</span>
                      </div>
                    </div>
                  )}

                  {steps[activeStep].type === "choice" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {steps[activeStep].options.map((opt, idx) => {
                        const isSelected = selectedRole === opt;
                        const keyBadge = ["الف", "ب", "ج", "د"][idx];
                        return (
                          <button
                            key={opt}
                            onClick={() => setSelectedRole(opt)}
                            className={`flex items-center justify-between p-3.5 rounded-xl border-[1.5px] text-right transition-all ${
                              isSelected
                                ? "bg-ecosystem-light dark:bg-[#1C2536] border-primary text-sec dark:text-white shadow-[2px_2px_0_#59BBAF]"
                                : "bg-white dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 text-sec dark:text-gray-300 hover:border-primary shadow-[1.5px_1.5px_0_#202A5A] dark:shadow-[1.5px_1.5px_0_#59BBAF]"
                            }`}
                          >
                            <span className="font-bold text-xs sm:text-sm">{opt}</span>
                            <span
                              className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-black ${
                                isSelected ? "bg-primary text-white" : "bg-gray-100 dark:bg-[#151C28] text-ink-subtle"
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
                    <div className="space-y-3 text-center py-2">
                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="p-1.5 hover:scale-125 transition-transform"
                            aria-label={`امتیاز ${star}`}
                          >
                            <Star
                              size={32}
                              className={
                                star <= rating
                                  ? "fill-third text-third"
                                  : "text-gray-300 dark:text-gray-600"
                              }
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-ink-subtle dark:text-gray-400">
                        {rating > 0 ? (
                          <>امتیاز: <strong className="text-third font-black">{rating} از ۵ ستاره</strong></>
                        ) : (
                          <span>برای ثبت امتیاز روی ستاره‌ها کلیک کنید</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* دکمه مرحله بعد / ثبت نهایی */}
                  <div className="flex items-center justify-between pt-4 border-t-[1.5px] border-gray-200 dark:border-[#242F42]">
                    <div>
                      {activeStep > 0 && (
                        <button
                          onClick={() => setActiveStep((prev) => prev - 1)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-sec dark:text-white bg-gray-100 dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700"
                        >
                          قبلی
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleNext}
                      className="flex items-center gap-2 bg-primary text-white font-bold text-xs sm:text-sm py-2 px-5 rounded-xl border-[1.5px] border-ecosystem-dark shadow-[2.5px_2.5px_0_#1F413D] hover:shadow-[3px_3px_0_#1F413D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                    >
                      <span>{activeStep === steps.length - 1 ? "ثبت پاسخ" : "مرحله بعد"}</span>
                      <ArrowLeft size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                /* وضعیت موفقیت و پایان ثبت */
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-ecosystem-light dark:bg-[#1C2536] border-2 border-primary flex items-center justify-center text-primary mx-auto shadow-[2px_2px_0_#59BBAF]">
                    <Check size={30} className="stroke-[3]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-sec dark:text-white">پاسخ شما با موفقیت ثبت شد!</h3>
                  <p className="text-xs text-ink-subtle dark:text-gray-400 max-w-sm mx-auto">
                    داده‌ها به صورت زنده ذخیره و در داشبورد تحلیلی در دسترس قرار گرفت.
                  </p>
                </div>
              )}
            </div>
          </StickerCard>
        </div>
      </div>
    </section>
  );
}
