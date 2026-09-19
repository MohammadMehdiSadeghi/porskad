import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, CheckCircle2, Zap } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="py-20 md:py-28 bg-slate-50 dark:bg-[#0B0F19] relative overflow-hidden transition-colors duration-200">
      {/* هاله‌های نورانی */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-teal-500/20 via-sky-500/20 to-purple-500/20 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#131B2E] dark:via-[#1A253F] dark:to-[#131B2E] border-2 border-teal-500/30 rounded-3xl p-8 sm:p-14 text-center shadow-xl dark:shadow-[0_20px_70px_-15px_rgba(45,212,191,0.2)] relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-[#0B0F19] border border-teal-500/30 text-xs font-bold text-teal-600 dark:text-[#2DD4BF]">
              <Sparkles size={14} />
              شروع در کمتر از ۲ دقیقه
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight whitespace-normal lg:whitespace-nowrap">
              همین حالا اولین فرم حرفه‌ای‌ات را بساز
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] leading-relaxed">
              رایگان شروع کن؛ در کمتر از ۲ دقیقه فرم را بساز، منتشر کن و اولین پاسخ‌ها را در داشبورد زنده دریافت نما.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 text-base font-black text-slate-950 bg-gradient-to-r from-[#2DD4BF] via-[#2DD4BF] to-[#38BDF8] rounded-2xl shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <span>ساخت رایگان فرم</span>
                <ArrowLeft size={20} />
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-xs text-slate-600 dark:text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-teal-600 dark:text-[#2DD4BF]" /> بدون نیاز به کارت بانکی
              </span>
              <span className="flex items-center gap-1.5">
                <Zap size={14} className="text-sky-600 dark:text-[#38BDF8]" /> راه اندازی سریع
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-[#10B981]" /> لغو اشتراک در هر زمان
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
