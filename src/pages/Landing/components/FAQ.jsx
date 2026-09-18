import React, { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "آیا برای پر کردن فرم، پاسخ‌دهنده نیاز به ثبت‌نام دارد؟",
      a: "خیر، پاسخ‌دهندگان بدون نیاز به هیچ‌گونه ثبت‌نام یا ایجاد حساب کاربری، می‌توانند با کلیک روی لینک مستقیم فرم یا اسکن QR Code در سریع‌ترین زمان ممکن پاسخ خود را ثبت کنند.",
    },
    {
      q: "اگر مرورگرم بسته شود یا اینترنتم قطع شود، پاسخ‌هایم از بین می‌رود؟",
      a: "خیر، پرسکاد دارای سیستم ذخیره خودکار پیش‌نویس (Auto-Save Draft) است؛ پاسخ‌های کاربر به صورت محلی تا ۷ روز در مرورگر ذخیره شده و با باز کردن مجدد لینک، فرم از همان گام ادامه می‌یابد.",
    },
    {
      q: "آیا می‌توانم فرم را داخل وب‌سایت خودم قرار دهم؟",
      a: "بله، با استفاده از کد Embed ریسپانسیو (iFrame استاندارد) می‌توانید هر فرمی را با یک خط کد داخل وب‌سایت‌های وردپرس، المنتور، لاراول، ریکت یا هر سامانه اختصاصی جاسازی کنید.",
    },
    {
      q: "اگر فرمی را اشتباهی حذف کنم چه اتفاقی می‌افتد؟",
      a: "فرم‌های حذف‌شده مستقیماً به سطل بازیافت ۳۰ روزه (God Trash) منتقل می‌شوند. در این بازه، شما می‌توانید در هر لحظه فرم و تمام پاسخ‌های ثبت‌شده آن را با یک کلیک به صورت کامل بازیابی کنید.",
    },
    {
      q: "خروجی اکسل مشکل به‌هم‌ریختگی حروف فارسی ندارد؟",
      a: "خیر، فایل‌های خروجی با استاندارد جهانی UTF-8 BOM تولید می‌شوند؛ به همین دلیل در نرم‌افزار Microsoft Excel روی تمام نسخه‌های ویندوز و مک، حروف فارسی کاملاً خوانا، مرتب و بدون خرابی باز می‌شوند.",
    },
    {
      q: "داده‌های سازمان من چقدر امن و ایزوله است؟",
      a: "اطلاعات هر سازمان با قابلیت Row-Level Security در لایه پایگاه داده PostgreSQL کاملاً جداسازی شده است. همچنین از تله نامرئی Honeypot و سیستم جلوگیری از حملات Brute-force برای حفاظت حداکثری استفاده می‌شود.",
    },
  ];

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#0B0F19] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131B2E] border border-[#2DD4BF]/30 text-xs font-bold text-[#2DD4BF] mb-4">
            <HelpCircle size={14} />
            پاسخ به ابهامات متداول
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            سوالات متداول
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            پاسخ به رایج‌ترین پرسش‌های کاربران درباره امکانات، نحوه کارکرد و امنیت پرسکاد
          </p>
        </div>

        {/* لیست سوالات آکاردئونی */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#131B2E] border border-[#1E293B] hover:border-[#2DD4BF]/30 rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-right flex items-center justify-between gap-4 transition-colors"
                >
                  <span className="text-sm sm:text-base font-black text-white leading-snug">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-[#2DD4BF] shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 bg-[#2DD4BF]/10" : ""
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-xs sm:text-sm text-[#94A3B8] leading-relaxed border-t border-[#1E293B]/60 pt-4 animate-fadeIn">
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
