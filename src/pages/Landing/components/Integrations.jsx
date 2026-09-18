import React, { useState } from "react";
import { MessageSquare, Send, CreditCard, Code, Copy, Check, Sparkles, CheckCircle2 } from "lucide-react";

export default function Integrations() {
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe 
  src="https://porskad.ir/embed/YOUR_FORM_ID" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);"
></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const integrationsList = [
    {
      icon: MessageSquare,
      title: "پنل پیامک اختصاصی",
      desc: "ارسال آنی یا زمان‌بندی‌شده با تقویم جلالی برای اطلاع‌رسانی تکمیل فرم و ارسال کد اعتبارسنجی (کاوه‌نگار / آموت).",
      badge: "پیامک و OTP",
      color: "text-[#2DD4BF]",
      bg: "bg-[#2DD4BF]/10",
      border: "border-[#2DD4BF]/20",
    },
    {
      icon: Send,
      title: "بات و کانال تلگرام",
      desc: "دریافت نوتیفیکیشن و خلاصه پاسخ‌های جدید بلافاصله پس از ثبت، مستقیماً در اکانت یا گروه تلگرامی تیم شما.",
      badge: "اطلاع‌رسانی فوری",
      color: "text-[#38BDF8]",
      bg: "bg-[#38BDF8]/10",
      border: "border-[#38BDF8]/20",
    },
    {
      icon: CreditCard,
      title: "درگاه پرداخت زرین‌پال",
      desc: "ارتقای آنی پلن‌های اشتراک و تمدید ظرفیت پاسخ‌ها با پروتکل امن شبکه شتاب و زرین‌پال.",
      badge: "پرداخت شتاب",
      color: "text-[#F59E0B]",
      bg: "bg-[#F59E0B]/10",
      border: "border-[#F59E0B]/20",
    },
    {
      icon: Code,
      title: "کد Embed ریسپانسیو",
      desc: "قرار دادن فرم داخل هر وب‌سایت (وردپرس، المنتور، لاراول، Next.js یا HTML خالص) تنها با کپی کردن ۱ خط کد.",
      badge: "جاسازی آسان",
      color: "text-[#A855F7]",
      bg: "bg-[#A855F7]/10",
      border: "border-[#A855F7]/20",
    },
  ];

  return (
    <section id="integrations" className="py-20 md:py-28 bg-[#0B0F19] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131B2E] border border-[#38BDF8]/30 text-xs font-bold text-[#38BDF8] mb-4">
            <Sparkles size={14} />
            ارتباط یکپارچه با سرویس‌ها
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            متصل به ابزارهایی که همین حالا استفاده می‌کنی
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            بدون پیچیدگی‌های فنی، جریان اطلاعات پرسشنامه را با پنل پیامکی، کانال‌های تلگرام و وب‌سایت خود هماهنگ کنید.
          </p>
        </div>

        {/* ۴ کارت ادغام‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {integrationsList.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-[#131B2E] border border-[#1E293B] hover:border-[#2DD4BF]/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl ${item.bg} ${item.border} border flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}
                    >
                      <Icon size={24} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0B0F19] text-[#94A3B8] border border-[#1E293B]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white mb-2 group-hover:text-[#2DD4BF] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[#94A3B8] leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#1E293B]/60 flex items-center gap-1.5 text-xs text-[#10B981] font-bold">
                  <CheckCircle2 size={14} />
                  <span>اتصال با ۱ کلیک</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ویجت تعاملی کد Embed */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Code size={18} className="text-[#2DD4BF]" />
              <span className="text-sm font-black text-white">کد Embed جهت قرار دادن در وب‌سایت</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2DD4BF] hover:bg-[#20b8a3] text-[#0B0F19] text-xs font-black shadow-md transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>کپی کردن کد</span>
                </>
              )}
            </button>
          </div>

          <pre className="bg-[#0B0F19] p-4 rounded-2xl border border-[#1E293B] text-xs text-[#38BDF8] font-mono overflow-x-auto leading-relaxed text-left" dir="ltr">
            {embedCode}
          </pre>
        </div>
      </div>
    </section>
  );
}
