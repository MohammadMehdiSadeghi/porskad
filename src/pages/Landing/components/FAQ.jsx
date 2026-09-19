import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

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
      q: "منطق شرطی در پرسکاد چگونه کار می‌کند؟",
      a: "شما می‌توانید تعیین کنید که اگر کاربر گزینه خاصی را انتخاب کرد، به سوال مشخصی هدایت شود یا فرم پایان یابد؛ این کار باعث افزایش چشمگیر سرعت پاسخ‌دهی و رضایت کاربران می‌شود.",
    },
  ];

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-slate-50 dark:bg-[#0B0F19] relative transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#131B2E] border border-teal-500/30 text-xs font-bold text-teal-600 dark:text-[#2DD4BF] mb-4 shadow-sm">
            <HelpCircle size={14} />
            پاسخ به ابهامات متداول
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-4 whitespace-normal lg:whitespace-nowrap">
            سوالات متداول
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8]">
            پاسخ به رایج‌ترین پرسش‌های کاربران درباره امکانات و نحوه کارکرد پرسکاد
          </p>
        </div>

        {/* لیست سوالات آکاردئونی */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] hover:border-teal-500/30 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm dark:shadow-none"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-right flex items-center justify-between gap-4 transition-colors"
                >
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center text-teal-600 dark:text-[#2DD4BF] shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 bg-teal-500/10" : ""
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed border-t border-slate-100 dark:border-[#1E293B]/60 pt-4 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
