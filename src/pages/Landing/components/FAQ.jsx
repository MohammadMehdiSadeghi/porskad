import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import StickerCard from "../../../components/ui/StickerCard";
import Badge from "../../../components/ui/Badge";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "آیا برای پر کردن فرم، پاسخ‌دهنده نیاز به ثبت‌نام دارد؟",
      a: "خیر، پاسخ‌دهندگان بدون نیاز به هیچ‌گونه ثبت‌نام یا ایجاد حساب کاربری، می‌توانند با کلیک روی لینک مستقیم فرم یا اسکن QR Code در سریع‌ترین زمان ممکن پاسخ خود را ثبت کنند.",
    },
    {
      q: "آیا می‌توانم فرم را داخل وب‌سایت خودم قرار دهم؟",
      a: "بله، با استفاده از کد Embed ریسپانسیو (iFrame استاندارد) می‌توانید هر فرمی را با یک خط کد داخل وب‌سایت‌های وردپرس، المنتور، لاراول، ریکت یا هر سامانه اختصاصی جاسازی کنید.",
    },
    {
      q: "خروجی اکسل مشکل به‌هم‌ریختگی حروف فارسی ندارد؟",
      a: "خیر، فایل‌های خروجی با استاندارد جهانی UTF-8 BOM تولید می‌شوند؛ به همین دلیل در نرم‌افزار Microsoft Excel روی تمام نسخه‌های ویندوز و مک، حروف فارسی کاملاً خوانا، مرتب و بدون خرابی باز می‌شوند.",
    },
    {
      q: "منطق شرطی در پرس‌کاد چگونه کار می‌کند؟",
      a: "شما می‌توانید تعیین کنید که اگر کاربر گزینه خاصی را انتخاب کرد، به سوال مشخصی هدایت شود یا فرم پایان یابد؛ این کار باعث افزایش چشمگیر سرعت پاسخ‌دهی و رضایت کاربران می‌شود.",
    },
  ];

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-white dark:bg-[#0B0F17] relative transition-colors duration-200 border-t-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <Badge theme="navy" size="md" dot>
              <HelpCircle size={14} className="ml-1.5" />
              پاسخ به ابهامات متداول
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#202A5A] dark:text-white leading-tight mb-4 whitespace-normal lg:whitespace-nowrap">
            سوالات متداول
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300">
            پاسخ به رایج‌ترین پرسش‌های کاربران درباره امکانات و نحوه کارکرد پرس‌کاد
          </p>
        </div>

        {/* لیست سوالات آکاردئونی - Neo-brutalist StickerCards */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <StickerCard
                key={idx}
                theme="white"
                borderWidth="border-2"
                shadow={isOpen ? "shadow-[3.5px_3.5px_0_#59BBAF]" : "shadow-[2.5px_2.5px_0_#202A5A] dark:shadow-[2.5px_2.5px_0_#59BBAF]"}
                className={`p-0 overflow-hidden transition-all duration-200 ${
                  isOpen ? "border-[#59BBAF]" : ""
                }`}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-right flex items-center justify-between gap-4 transition-colors"
                >
                  <span className="text-sm sm:text-base font-black text-[#202A5A] dark:text-white leading-snug">
                    {faq.q}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl border-2 border-[#202A5A] dark:border-[#59BBAF] flex items-center justify-center text-slate-900 dark:text-white shrink-0 transition-transform duration-300 shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF] ${
                      isOpen ? "rotate-180 bg-[#59BBAF] text-slate-950" : "bg-slate-100 dark:bg-[#131B2E]"
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed border-t-2 border-[#202A5A]/10 dark:border-white/10 pt-4 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </StickerCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
