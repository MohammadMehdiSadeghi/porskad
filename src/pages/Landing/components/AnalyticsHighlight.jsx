import React from "react";
import { BarChart3, Download, Filter, Sparkles } from "lucide-react";

export default function AnalyticsHighlight() {
  return (
    <section id="analytics" className="py-20 md:py-28 bg-slate-50 dark:bg-[#0B0F19] relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#131B2E] border border-teal-500/30 text-xs font-bold text-teal-600 dark:text-[#2DD4BF] mb-4 shadow-sm">
            <BarChart3 size={14} />
            تحلیل عمیق و گزارش‌گیری
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-4">
            از داده خام تا تصمیم، در یک نگاه
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8]">
            نمودارهای میله‌ای و درصدی، فهرست پاسخ‌های متنی با قابلیت فیلتر و مشاهده لحظه‌ای بازخوردها بدون پیچیدگی
          </p>
        </div>

        {/* نمای شبیه‌ساز چارت تحلیل پاسخ‌ها */}
        <div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-lg dark:shadow-2xl">
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

          {/* نمودار میله‌ای بصری */}
          <div className="pt-8 space-y-5">
            {[
              { label: "شبکه‌های اجتماعی (اینستاگرام / تلگرام)", count: 680, percent: "۴۸٪", color: "bg-teal-500" },
              { label: "معرفی دوستان و همکاران", count: 420, percent: "۳۰٪", color: "bg-sky-500" },
              { label: "جستجوی گوگل", count: 210, percent: "۱۵٪", color: "bg-purple-500" },
              { label: "سایر کانال‌ها", count: 110, percent: "۷٪", color: "bg-amber-500" },
            ].map((bar, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span className="text-slate-800 dark:text-white">{bar.label}</span>
                  <span className="text-slate-500 dark:text-[#94A3B8]">
                    {bar.count} پاسخ <strong className="text-slate-900 dark:text-white mr-2">({bar.percent})</strong>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-[#0B0F19] h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-[#1E293B]">
                  <div
                    className={`h-full rounded-full ${bar.color} transition-all duration-1000`}
                    style={{ width: bar.percent.replace("٪", "%") }}
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
