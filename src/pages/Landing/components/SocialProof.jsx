import React from "react";
import { ShieldCheck, Database, Zap, Globe, Cpu, CheckCircle } from "lucide-react";

export default function SocialProof() {
  const stats = [
    {
      value: "+۸۵",
      label: "به‌روزرسانی امنیتی دیتابیس",
      desc: "مایگریشن‌های تست‌شده و مستند",
      icon: Database,
      color: "text-[#2DD4BF]",
      bg: "bg-[#2DD4BF]/10",
      border: "border-[#2DD4BF]/20",
    },
    {
      value: "۱۰۰٪",
      label: "ایزولاسیون چندمستأجری",
      desc: "کنترل دسترسی با Row-Level Security",
      icon: ShieldCheck,
      color: "text-[#38BDF8]",
      bg: "bg-[#38BDF8]/10",
      border: "border-[#38BDF8]/20",
    },
    {
      value: "< ۳۰۰ms",
      label: "تاخیر پردازش Realtime",
      desc: "اتصال زنده Realtime WebSocket",
      icon: Zap,
      color: "text-[#F59E0B]",
      bg: "bg-[#F59E0B]/10",
      border: "border-[#F59E0B]/20",
    },
    {
      value: "۹۹.۹٪",
      label: "پایداری زیرساخت Edge CDN",
      desc: "شبکه توزیع محتوای پرسرعت ابری",
      icon: Globe,
      color: "text-[#10B981]",
      bg: "bg-[#10B981]/10",
      border: "border-[#10B981]/20",
    },
  ];

  return (
    <section className="py-14 bg-[#0B0F19] border-y border-[#1E293B]/60 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#94A3B8]">
            مورد اعتماد تیم‌های محصول‌محور، دانشگاه‌ها و سازمان‌های پیشرو
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="bg-[#131B2E]/60 hover:bg-[#131B2E] border border-[#1E293B] hover:border-[#2DD4BF]/40 rounded-2xl p-5 sm:p-6 text-center transition-all duration-300 group hover:-translate-y-1"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.border} border flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon size={24} className={stat.color} />
                </div>
                <div className={`text-2xl sm:text-3xl font-black ${stat.color} mb-1 tracking-tight`}>
                  {stat.value}
                </div>
                <div className="text-sm font-bold text-white mb-1">{stat.label}</div>
                <div className="text-xs text-[#94A3B8]">{stat.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
