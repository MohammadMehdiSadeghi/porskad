import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, CheckCircle2, Zap } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="py-20 md:py-28 bg-[#0B0F19] relative overflow-hidden">
      {/* هاله‌های نورانی */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-[#2DD4BF]/20 via-[#38BDF8]/20 to-[#A855F7]/20 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-gradient-to-br from-[#131B2E] via-[#1A253F] to-[#131B2E] border-2 border-[#2DD4BF]/30 rounded-3xl p-8 sm:p-14 text-center shadow-[0_20px_70px_-15px_rgba(45,212,191,0.2)] relative overflow-hidden">
          {/* تزئینات پس‌زمینه */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2DD4BF]/10 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#38BDF8]/10 blur-3xl pointer-events-none rounded-full" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0F19] border border-[#2DD4BF]/30 text-xs font-bold text-[#2DD4BF]">
              <Sparkles size={14} />
              شروع در کمتر از ۲ دقیقه
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              همین حالا اولین فرم حرفه‌ای‌ات را بساز
            </h2>

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              رایگان شروع کن؛ در کمتر از ۲ دقیقه فرم را بساز، منتشر کن و اولین پاسخ‌ها را در داشبورد زنده دریافت نما.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 text-base font-black text-[#0B0F19] bg-gradient-to-r from-[#2DD4BF] via-[#2DD4BF] to-[#38BDF8] rounded-2xl shadow-xl shadow-[#2DD4BF]/30 hover:shadow-[#2DD4BF]/50 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <span>ساخت رایگان فرم</span>
                <ArrowLeft size={20} />
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-xs text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#2DD4BF]" /> بدون نیاز به کارت بانکی
              </span>
              <span className="flex items-center gap-1.5">
                <Zap size={14} className="text-[#38BDF8]" /> راه اندازی سریع
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#10B981]" /> لغو اشتراک در هر زمان
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
