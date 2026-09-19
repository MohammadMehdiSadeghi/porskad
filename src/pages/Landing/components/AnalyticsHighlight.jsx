import React from "react";
import { BarChart3, Download, Filter, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import StickerCard from "../../../components/ui/StickerCard";
import Badge from "../../../components/ui/Badge";

export default function AnalyticsHighlight() {
  const chartData = [
    {
      label: "شبکه‌های اجتماعی (اینستاگرام / تلگرام)",
      count: "۶۸۰",
      percentDisplay: "۴۸٪",
      pct: 48,
      bg: "bg-[#59BBAF]",
      border: "border-[#202A5A] dark:border-[#59BBAF]",
      shadow: "shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]",
    },
    {
      label: "معرفی دوستان و همکاران",
      count: "۴۲۰",
      percentDisplay: "۳۰٪",
      pct: 30,
      bg: "bg-[#38BDF8]",
      border: "border-[#202A5A] dark:border-[#38BDF8]",
      shadow: "shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#38BDF8]",
    },
    {
      label: "جستجوی گوگل",
      count: "۲۱۰",
      percentDisplay: "۱۵٪",
      pct: 15,
      bg: "bg-[#652D90]",
      border: "border-[#202A5A] dark:border-[#652D90]",
      shadow: "shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#652D90]",
    },
    {
      label: "سایر کانال‌ها",
      count: "۱۱۰",
      percentDisplay: "۷٪",
      pct: 7,
      bg: "bg-[#F8A41D]",
      border: "border-[#202A5A] dark:border-[#F8A41D]",
      shadow: "shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#F8A41D]",
    },
  ];

  return (
    <section id="analytics" className="py-20 md:py-28 bg-white dark:bg-[#0B0F17] relative transition-colors duration-200 border-t-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-14">
          <div className="flex justify-center mb-4">
            <Badge theme="orange" size="md" dot>
              <BarChart3 size={14} className="ml-1.5" />
              تحلیل عمیق و گزارش‌گیری
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#202A5A] dark:text-white leading-tight mb-4 whitespace-normal lg:whitespace-nowrap">
            از داده خام تا تصمیم، در یک نگاه
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            نمودارهای میله‌ای و درصدی، فهرست پاسخ‌های متنی با قابلیت فیلتر و مشاهده لحظه‌ای بازخوردها بدون پیچیدگی
          </p>
        </div>

        {/* کارت داشبورد تحلیل و نمودارها - Neo-brutalist StickerCard */}
        <StickerCard
          theme="white"
          borderWidth="border-2"
          shadow="shadow-[5px_5px_0_#202A5A] dark:shadow-[5px_5px_0_#59BBAF]"
          className="p-6 sm:p-8"
        >
          {/* هدر بالایی کارت */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#202A5A] dark:text-white mb-1">
                توزیع پاسخ‌ها به سوال: «از چه طریقی با ما آشنا شدید؟»
              </h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">مجموع کل پاسخ‌های ثبت‌شده: ۱,۴۲۰ پاسخ</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#131B2E] text-xs font-bold text-slate-700 dark:text-slate-300 border-2 border-[#202A5A]/15 dark:border-[#59BBAF]/20 flex items-center gap-1.5 shadow-[2px_2px_0_#202A5A]/10">
                <Filter size={14} /> فیلتر تاریخ: ۳۰ روز اخیر
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-[#59BBAF] text-slate-950 text-xs font-black border-2 border-[#202A5A] flex items-center gap-1.5 shadow-[2.5px_2.5px_0_#202A5A]">
                <Download size={14} /> خروجی اکسل سالم
              </span>
            </div>
          </div>

          {/* خلاصه شاخص‌های عملکردی کلیدی (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 pb-6 border-b-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20">
            <div className="p-4 rounded-2xl bg-[#59BBAF]/10 dark:bg-[#59BBAF]/15 border-2 border-[#59BBAF] shadow-[3px_3px_0_#59BBAF] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#59BBAF] text-slate-950 border-2 border-[#202A5A] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#202A5A]">
                <TrendingUp size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">نرخ تکمیل فرم</span>
                <span className="text-base font-black text-[#202A5A] dark:text-white">۸۷.۴٪ <span className="text-[11px] text-[#59BBAF] font-black mr-1">(+۱۴٪ نسبت به میانگین)</span></span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border-2 border-sky-400 dark:border-sky-500 shadow-[3px_3px_0_#38BDF8] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#38BDF8] text-slate-950 border-2 border-[#202A5A] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#202A5A]">
                <Clock size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">میانگین زمان پاسخگویی</span>
                <span className="text-base font-black text-[#202A5A] dark:text-white">۱ دقیقه و ۲۴ ثانیه</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-400 dark:border-emerald-500 shadow-[3px_3px_0_#10B981] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-400 text-slate-950 border-2 border-[#202A5A] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#202A5A]">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">پاسخ‌های معتبر و سالم</span>
                <span className="text-base font-black text-[#202A5A] dark:text-white">۱,۴۲۰ از ۱,۴۲۰ <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black mr-1">(۱۰۰٪)</span></span>
              </div>
            </div>
          </div>

          {/* نمودار میله‌ای بصری کاملاً رندر شده و فعال */}
          <div className="pt-6 space-y-6">
            {chartData.map((bar, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-black">
                  <span className="text-[#202A5A] dark:text-white">{bar.label}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-bold">
                    {bar.count} پاسخ <strong className="text-[#202A5A] dark:text-white mr-2">({bar.percentDisplay})</strong>
                  </span>
                </div>
                {/* نوار بیرونی با استایل نئوبروتالیسم */}
                <div className="w-full bg-slate-100 dark:bg-[#0B0F17] h-5 rounded-full overflow-hidden p-0.5 border-2 border-[#202A5A]/20 dark:border-[#59BBAF]/30 shadow-inner">
                  {/* میله پر شونده با رنگ اختصاصی */}
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${bar.bg}`}
                    style={{
                      width: `${bar.pct}%`,
                      minWidth: "16px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </StickerCard>
      </div>
    </section>
  );
}
