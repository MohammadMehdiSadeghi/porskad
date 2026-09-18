import React from "react";
import { BarChart3, Clock, Smartphone, TrendingUp, Download, Filter, CheckCircle2, PieChart, Activity } from "lucide-react";

export default function AnalyticsHighlight() {
  const metrics = [
    {
      title: "نرخ تکمیل فرم",
      value: "۸۷٪",
      change: "+۱۲٪ نسبت به میانگین صنعت",
      icon: TrendingUp,
      color: "text-[#2DD4BF]",
      bg: "bg-[#2DD4BF]/10",
      border: "border-[#2DD4BF]/30",
    },
    {
      title: "میانگین زمان پاسخ‌دهی",
      value: "۴۲ ثانیه",
      change: "بهینه‌سازی شده با رندر اسلایدی",
      icon: Clock,
      color: "text-[#38BDF8]",
      bg: "bg-[#38BDF8]/10",
      border: "border-[#38BDF8]/30",
    },
    {
      title: "تفکیک دستگاه‌ها",
      value: "۶۸٪ موبایل / ۳۲٪ دسکتاپ",
      change: "طراحی کاملاً واکنش‌گرا و لمسی",
      icon: Smartphone,
      color: "text-[#A855F7]",
      bg: "bg-[#A855F7]/10",
      border: "border-[#A855F7]/30",
    },
  ];

  return (
    <section id="analytics" className="py-20 md:py-28 bg-[#0B0F19] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131B2E] border border-[#2DD4BF]/30 text-xs font-bold text-[#2DD4BF] mb-4">
            <BarChart3 size={14} />
            تحلیل عمیق و گزارش‌گیری
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            از داده خام تا تصمیم، در یک نگاه
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            نمودارهای میله‌ای و درصدی، فهرست پاسخ‌های متنی با قابلیت فیلتر و سنجش زمان سپری‌شده روی هر سوال — تا بفهمی دقیقاً کدام سوال باعث ریزش پاسخ‌دهنده می‌شود.
          </p>
        </div>

        {/* سه ستون آماری نمایشی (Metric Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {metrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="bg-[#131B2E] border border-[#1E293B] rounded-3xl p-7 flex flex-col justify-between hover:border-[#2DD4BF]/40 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-[#94A3B8]">{m.title}</span>
                    <div className={`p-2.5 rounded-xl ${m.bg} ${m.color} border ${m.border}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className={`text-3xl sm:text-4xl font-black text-white mb-2`}>
                    {m.value}
                  </div>
                </div>
                <div className="text-xs font-medium text-[#94A3B8] pt-4 border-t border-[#1E293B]/60 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className={m.color} />
                  <span>{m.change}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* نمای شبیه‌ساز چارت تحلیل پاسخ‌ها */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#1E293B]">
            <div>
              <h3 className="text-lg font-black text-white mb-1">
                توزیع پاسخ‌ها به سوال: «از چه طریقی با ما آشنا شدید؟»
              </h3>
              <p className="text-xs text-[#94A3B8]">مجموع کل پاسخ‌های ثبت‌شده: ۱,۴۲۰ پاسخ</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-[#0B0F19] text-xs text-[#94A3B8] border border-[#1E293B] flex items-center gap-1.5">
                <Filter size={14} /> فیلتر تاریخ: ۳۰ روز اخیر
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-[#2DD4BF]/15 text-[#2DD4BF] text-xs font-bold border border-[#2DD4BF]/30 flex items-center gap-1.5">
                <Download size={14} /> خروجی اکسل سالم
              </span>
            </div>
          </div>

          {/* نمودار میله‌ای بصری */}
          <div className="pt-8 space-y-5">
            {[
              { label: "شبکه‌های اجتماعی (اینستاگرام / تلگرام)", count: 680, percent: "۴۸٪", color: "bg-[#2DD4BF]" },
              { label: "معرفی دوستان و همکاران", count: 420, percent: "۳۰٪", color: "bg-[#38BDF8]" },
              { label: "جستجوی گوگل", count: 210, percent: "۱۵٪", color: "bg-[#A855F7]" },
              { label: "سایر کانال‌ها", count: 110, percent: "۷٪", color: "bg-[#F59E0B]" },
            ].map((bar, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span className="text-white">{bar.label}</span>
                  <span className="text-[#94A3B8]">
                    {bar.count} پاسخ <strong className="text-white mr-2">({bar.percent})</strong>
                  </span>
                </div>
                <div className="w-full bg-[#0B0F19] h-3 rounded-full overflow-hidden p-0.5 border border-[#1E293B]">
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
