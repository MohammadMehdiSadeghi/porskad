import React from "react";
import { Zap, Globe, Sparkles, CheckCircle2 } from "lucide-react";

export default function SocialProof() {
  const stats = [
    {
      value: "۱۰۰٪",
      label: "فارسی و راست‌چین",
      desc: "طراحی شده برای زبان فارسی و تقویم شمسی",
      icon: Sparkles,
      color: "text-teal-600 dark:text-[#2DD4BF]",
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
    },
    {
      value: "UTF-8 BOM",
      label: "خروجی اکسل استاندارد",
      desc: "بدون به‌هم‌ریختگی حروف فارسی در Excel",
      icon: CheckCircle2,
      color: "text-sky-600 dark:text-[#38BDF8]",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
    {
      value: "< ۳۰۰ms",
      label: "ثبت فوق‌سریع پاسخ‌ها",
      desc: "عملکرد بهینه و سبک بدون سنگینی صفحه",
      icon: Zap,
      color: "text-amber-600 dark:text-[#F59E0B]",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      value: "۹۹.۹٪",
      label: "پایداری زیرساخت",
      desc: "شبکه توزیع محتوای پرسرعت ابری",
      icon: Globe,
      color: "text-emerald-600 dark:text-[#10B981]",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
  ];

  return (
    <section className="py-14 bg-slate-50 dark:bg-[#0B0F19] border-y border-slate-200 dark:border-[#1E293B]/60 relative z-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
            مورد اعتماد تیم‌های محصول‌محور، دانشگاه‌ها و سازمان‌های پیشرو
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="bg-white dark:bg-[#131B2E]/60 hover:bg-white dark:hover:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] hover:border-teal-500/40 rounded-2xl p-5 sm:p-6 text-center transition-all duration-300 shadow-sm dark:shadow-none group hover:-translate-y-1"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.border} border flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon size={24} className={stat.color} />
                </div>
                <div className={`text-2xl sm:text-3xl font-black ${stat.color} mb-1 tracking-tight`}>
                  {stat.value}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">{stat.label}</div>
                <div className="text-xs text-slate-500 dark:text-[#94A3B8]">{stat.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
