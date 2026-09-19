import React from "react";
import { BarChart3, Download, Filter, Sparkles, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

export default function AnalyticsHighlight() {
  const chartData = [
    { label: "شبکه‌های اجتماعی (اینستاگرام / تلگرام)", count: "۶۸۰", percentDisplay: "۴۸٪", pct: 48, barGradient: "from-teal-500 to-teal-400" },
    { label: "معرفی دوستان و همکاران", count: "۴۲۰", percentDisplay: "۳۰٪", pct: 30, barGradient: "from-sky-500 to-sky-400" },
    { label: "جستجوی گوگل", count: "۲۱۰", percentDisplay: "۱۵٪", pct: 15, barGradient: "from-purple-500 to-purple-400" },
    { label: "سایر کانال‌ها", count: "۱۱۰", percentDisplay: "۷٪", pct: 7, barGradient: "from-amber-500 to-amber-400" },
  ];

  return (
    <section id="analytics" className="py-20 md:py-28 bg-slate-50 dark:bg-[#0B0F19] relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#131B2E] border border-teal-500/30 text-xs font-bold text-teal-600 dark:text-[#2DD4BF] mb-4 shadow-sm">
            <BarChart3 size={14} />
            تحلیل عمیق و گزارش‌گیری
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-4 whitespace-normal lg:whitespace-nowrap">
            از داده خام تا تصمیم، در یک نگاه
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] max-w-2xl mx-auto">
            نمودارهای میله‌ای و درصدی، فهرست پاسخ‌های متنی با قابلیت فیلتر و مشاهده لحظه‌ای بازخوردها بدون پیچیدگی
          </p>
        </div>

        {/* کارت داشبورد تحلیل و نمودارها */}
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-lg dark:shadow-2xl">
          {/* هدر بالایی کارت */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E293B]">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1">
                توزیع پاسخ‌ها به سوال: «از چه طریقی با ما آشنا شدید؟»
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">مجموع کل پاسخ‌های ثبت‌شده: ۱,۴۲۰ پاسخ</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0B0F19] text-xs text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1E293B] flex items-center gap-1.5">
                <Filter size={14} /> فیلتر تاریخ: ۳۰ روز اخیر
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-teal-500/15 text-teal-700 dark:text-[#2DD4BF] text-xs font-bold border border-teal-500/30 flex items-center gap-1.5">
                <Download size={14} /> خروجی اکسل سالم
              </span>
            </div>
          </div>

          {/* خلاصه شاخص‌های عملکردی کلیدی (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 pb-6 border-b border-slate-100 dark:border-[#1E293B]/60">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] block">نرخ تکمیل فرم</span>
                <span className="text-base font-black text-slate-900 dark:text-white">۸۷.۴٪ <span className="text-[11px] text-teal-600 font-bold mr-1">(+۱۴٪ نسبت به میانگین)</span></span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] block">میانگین زمان پاسخگویی</span>
                <span className="text-base font-black text-slate-900 dark:text-white">۱ دقیقه و ۲۴ ثانیه</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-[#10B981] flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] block">پاسخ‌های معتبر و سالم</span>
                <span className="text-base font-black text-slate-900 dark:text-white">۱,۴۲۰ از ۱,۴۲۰ <span className="text-[11px] text-emerald-600 font-bold mr-1">(۱۰۰٪)</span></span>
              </div>
            </div>
          </div>

          {/* نمودار میله‌ای بصری کاملاً رندر شده و فعال */}
          <div className="pt-6 space-y-6">
            {chartData.map((bar, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span className="text-slate-800 dark:text-white">{bar.label}</span>
                  <span className="text-slate-500 dark:text-[#94A3B8]">
                    {bar.count} پاسخ <strong className="text-slate-900 dark:text-white mr-2">({bar.percentDisplay})</strong>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-[#0B0F19] h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-[#1E293B]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${bar.barGradient} transition-all duration-1000 shadow-sm`}
                    style={{ width: `${bar.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
