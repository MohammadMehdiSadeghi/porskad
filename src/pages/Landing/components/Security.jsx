import React from "react";
import { ShieldCheck, Lock, Database, KeyRound, Bot, CheckCircle2, Server } from "lucide-react";

export default function Security() {
  const securityPoints = [
    {
      icon: ShieldCheck,
      title: "ایزولاسیون کامل چندمستأجری",
      desc: "داده هر سازمان در سطح دیتابیس با استاندارد Row-Level Security تفکیک و ایزوله شده و هیچ کاربری به اطلاعات سازمان دیگر دسترسی ندارد.",
      badge: "RLS در PostgreSQL",
      color: "text-[#2DD4BF]",
      bg: "bg-[#2DD4BF]/10",
      border: "border-[#2DD4BF]/20",
    },
    {
      icon: Database,
      title: "توابع تراکنشی امن و اتمیک",
      desc: "ثبت هر پاسخ در قالب تراکنش یکپارچه (Atomic RPC) انجام می‌شود تا از داده‌های ناقص، تکراری یا خرابی دیتابیس جلوگیری شود.",
      badge: "تضمین سلامت داده",
      color: "text-[#38BDF8]",
      bg: "bg-[#38BDF8]/10",
      border: "border-[#38BDF8]/20",
    },
    {
      icon: Bot,
      title: "ضد اسپم نامرئی و Rate Limit",
      desc: "تله هانی‌پات (Honeypot) ضد ربات بدون نیاز به کپچاهای آزاردهنده برای کاربر، ربات‌ها و ارسال‌های هرز را در دم مسدود می‌کند.",
      badge: "حفاظت ضد بات",
      color: "text-[#F59E0B]",
      bg: "bg-[#F59E0B]/10",
      border: "border-[#F59E0B]/20",
    },
    {
      icon: KeyRound,
      title: "احراز هویت منعطف و JWT",
      desc: "ورود امن با ایمیل/رمز یا کد یکبارمصرف پیامکی (OTP) و مدیریت سشن‌های رمزنگاری‌شده مبتنی بر استانداردهای احراز هویت وب.",
      badge: "سشن‌های ایزوله",
      color: "text-[#10B981]",
      bg: "bg-[#10B981]/10",
      border: "border-[#10B981]/20",
    },
  ];

  return (
    <section id="security" className="py-20 md:py-28 bg-[#0B0F19] relative overflow-hidden border-t border-[#1E293B]/60">
      {/* هاله نورانی پس‌زمینه */}
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-[#2DD4BF]/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131B2E] border border-[#10B981]/30 text-xs font-bold text-[#10B981] mb-4">
            <Lock size={14} />
            امنیت و حفظ حریم خصوصی سازمانی
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            امنیتی که در لایه دیتابیس تعریف شده، نه فقط در ظاهر
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            معماری امنیتی پرسکاد از عمیق‌ترین سطوح ذخیره‌سازی داده تا لایه نمایش مرورگر طراحی شده است.
          </p>
        </div>

        {/* ۴ کارت امنیتی */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {securityPoints.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-[#131B2E] border border-[#1E293B] hover:border-[#2DD4BF]/40 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-2xl ${item.bg} ${item.border} border flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}
                    >
                      <Icon size={24} />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#0B0F19] text-[#94A3B8] border border-[#1E293B]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white mb-2.5 group-hover:text-[#2DD4BF] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-[#1E293B]/60 flex items-center gap-2 text-xs font-bold text-[#10B981]">
                  <CheckCircle2 size={16} />
                  <span>استاندارد امنیتی فعال روی تمام فرم‌ها</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ریزمتن زیرساخت فنی برای اعتباردهی */}
        <div className="p-5 rounded-2xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center gap-3 text-center max-w-3xl mx-auto text-xs sm:text-sm text-[#94A3B8]">
          <Server size={18} className="text-[#38BDF8] shrink-0" />
          <span>
            ساخته‌شده روی <strong className="text-white">PostgreSQL</strong> و زیرساخت ابری با شبکه توزیع محتوای جهانی (<strong className="text-white">Edge CDN</strong>) برای سرعت بارگذاری زیر ثانیه
          </span>
        </div>
      </div>
    </section>
  );
}
