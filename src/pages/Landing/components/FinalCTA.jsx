import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, CheckCircle2, Zap } from "lucide-react";
import StickerCard from "../../../components/ui/StickerCard";
import Badge from "../../../components/ui/Badge";

export default function FinalCTA() {
  return (
    <section className="py-20 md:py-28 bg-[#F8F9FA] dark:bg-[#0B0F17] dot-pattern relative overflow-hidden transition-colors duration-200 border-t-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <StickerCard
          theme="teal"
          borderWidth="border-2"
          shadow="shadow-[6px_6px_0_#202A5A] dark:shadow-[6px_6px_0_#59BBAF]"
          className="p-8 sm:p-14 text-center relative overflow-hidden"
        >
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="flex justify-center">
              <Badge theme="navy" size="md">
                <Sparkles size={14} className="ml-1.5" />
                شروع در کمتر از ۲ دقیقه
              </Badge>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#202A5A] leading-tight whitespace-normal lg:whitespace-nowrap">
              همین حالا اولین فرم حرفه‌ای‌ات را بساز
            </h2>

            <p className="text-sm sm:text-base font-bold text-[#202A5A]/80 leading-relaxed">
              رایگان شروع کن؛ در کمتر از ۲ دقیقه فرم را بساز، منتشر کن و اولین پاسخ‌ها را در داشبورد زنده دریافت نما.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto rokad-btn-sec text-base px-8 py-4 flex items-center justify-center gap-3"
              >
                <span>ساخت رایگان فرم</span>
                <ArrowLeft size={20} />
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-xs font-black text-[#202A5A]">
              <span className="flex items-center gap-1.5 bg-white/70 px-3 py-1 rounded-lg border border-[#202A5A]/20">
                <CheckCircle2 size={14} className="text-[#202A5A]" /> بدون نیاز به کارت بانکی
              </span>
              <span className="flex items-center gap-1.5 bg-white/70 px-3 py-1 rounded-lg border border-[#202A5A]/20">
                <Zap size={14} className="text-[#202A5A]" /> راه‌اندازی سریع و فوری
              </span>
              <span className="flex items-center gap-1.5 bg-white/70 px-3 py-1 rounded-lg border border-[#202A5A]/20">
                <CheckCircle2 size={14} className="text-[#202A5A]" /> لغو اشتراک در هر زمان
              </span>
            </div>
          </div>
        </StickerCard>
      </div>
    </section>
  );
}
