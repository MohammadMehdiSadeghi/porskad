import React from "react";
import { Zap, Globe, Sparkles, CheckCircle2 } from "lucide-react";
import StickerCard from "../../../components/ui/StickerCard";

export default function SocialProof() {
  const stats = [
    {
      value: "۱۰۰٪",
      label: "فارسی و راست‌چین",
      desc: "طراحی شده برای زبان فارسی و تقویم شمسی",
      icon: Sparkles,
      theme: "ecosystem",
      color: "text-primary",
    },
    {
      value: "UTF-8 BOM",
      label: "خروجی اکسل استاندارد",
      desc: "بدون به‌هم‌ریختگی حروف فارسی در Excel",
      icon: CheckCircle2,
      theme: "male",
      color: "text-sec dark:text-teal",
    },
    {
      value: "< ۳۰۰ms",
      label: "ثبت فوق‌سریع پاسخ‌ها",
      desc: "عملکرد بهینه و سبک بدون سنگینی صفحه",
      icon: Zap,
      theme: "college",
      color: "text-third",
    },
    {
      value: "۹۹.۹٪",
      label: "پایداری زیرساخت",
      desc: "شبکه توزیع محتوای پرسرعت ابری",
      icon: Globe,
      theme: "club",
      color: "text-club-normal dark:text-purple-400",
    },
  ];

  return (
    <section className="py-12 bg-[#F8F9FA] dark:bg-[#0B0F17] border-y-[1.5px] border-gray-200 dark:border-[#242F42] relative z-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-xs font-black uppercase tracking-wider text-ink-subtle dark:text-gray-400">
            مورد اعتماد تیم‌های محصول‌محور، دانشگاه‌ها و کسب‌وکارهای پیشرو
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <StickerCard
                key={i}
                theme={stat.theme}
                className="p-4 sm:p-5 text-center transition-all duration-200 group hover:-translate-y-1"
              >
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-xl bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-700 ${stat.color} mb-3 shadow-[1.5px_1.5px_0_#202A5A] dark:shadow-[1.5px_1.5px_0_#59BBAF]`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-sec dark:text-white mb-1 tracking-tight">
                    {stat.value}
                  </span>
                  <strong className="text-xs sm:text-sm font-black text-sec dark:text-white mb-1 block">
                    {stat.label}
                  </strong>
                  <p className="text-[11px] text-ink-subtle dark:text-gray-400 leading-normal">
                    {stat.desc}
                  </p>
                </div>
              </StickerCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
