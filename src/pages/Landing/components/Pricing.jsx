import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, ArrowLeft } from "lucide-react";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' | 'yearly'

  const plans = [
    {
      id: "free",
      name: "رایگان",
      badge: "شروع سریع",
      tagline: "مناسب برای تست، پروژه‌های شخصی و دانشجویی",
      priceMonthly: "۰",
      priceYearly: "۰",
      unit: "تومان / همیشه رایگان",
      isPopular: false,
      ctaText: "شروع رایگان",
      ctaLink: "/register",
      ctaStyle: "bg-slate-100 dark:bg-[#131B2E] text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-[#1B253D] border border-slate-200 dark:border-[#1E293B]",
      features: [
        { title: "تعداد فرم فعال", value: "تا ۳ فرم فعال", included: true },
        { title: "سقف پاسخ ماهانه", value: "۱۰۰ پاسخ در ماه", included: true },
        { title: "منطق شرطی پیشرفته", value: "کامل و فعال", included: true },
        { title: "خروجی اکسل سالم فارسی", value: "CSV و Excel با BOM", included: true },
        { title: "پنل پیامک اختصاصی", value: "غیرفعال", included: false },
        { title: "پشتیبانی اختصاصی و SLA", value: "غیرفعال", included: false },
      ],
    },
    {
      id: "pro",
      name: "حرفه‌ای (Pro)",
      badge: "پیشنهاد پرسکاد",
      tagline: "مناسب برای استارتاپ‌ها، کسب‌وکارها و تیم‌های مارکتینگ",
      priceMonthly: "۱۸۹,۰۰۰",
      priceYearly: "۱۴۹,۰۰۰",
      unit: "تومان / ماهانه",
      isPopular: true,
      ctaText: "ارتقا به حرفه‌ای",
      ctaLink: "/register",
      ctaStyle: "bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] text-slate-950 font-black shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40",
      features: [
        { title: "تعداد فرم فعال", value: "تا ۲۰ فرم فعال", included: true },
        { title: "سقف پاسخ ماهانه", value: "۲,۵۰۰ پاسخ در ماه", included: true },
        { title: "منطق شرطی پیشرفته", value: "نامحدود", included: true },
        { title: "خروجی اکسل سالم فارسی", value: "تولید لحظه‌ای نامحدود", included: true },
        { title: "پنل پیامک اختصاصی", value: "کاوه نگار / آموت با OTP", included: true },
        { title: "پشتیبانی تیکتینگ", value: "اولویت پاسخ زیر ۲ ساعت", included: true },
      ],
    },
    {
      id: "enterprise",
      name: "سازمانی",
      badge: "نامحدود و اختصاصی",
      tagline: "سازمان‌های بزرگ، دانشگاه‌ها و پژوهشگاه‌های کشور",
      priceMonthly: "تماس بگیرید",
      priceYearly: "تماس بگیرید",
      unit: "پلن سفارشی",
      isPopular: false,
      ctaText: "تماس با واحد فروش",
      ctaLink: "/admin/support",
      ctaStyle: "bg-slate-100 dark:bg-[#131B2E] text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-[#1B253D] border border-slate-200 dark:border-[#1E293B]",
      features: [
        { title: "تعداد فرم فعال", value: "نامحدود", included: true },
        { title: "سقف پاسخ ماهانه", value: "نامحدود و سفارشی", included: true },
        { title: "منطق شرطی پیشرفته", value: "نامحدود", included: true },
        { title: "خروجی اکسل سالم فارسی", value: "یکپارچه با ERP/CRM", included: true },
        { title: "پنل پیامک اختصاصی", value: "ارسال اختصاصی با خط سازمانی", included: true },
        { title: "پشتیبانی اختصاصی و SLA", value: "پشتیبان تلفنی اختصاصی ۲۴/۷", included: true },
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-slate-50 dark:bg-[#0B0F19] relative overflow-hidden border-t border-slate-200 dark:border-[#1E293B]/60 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#131B2E] border border-teal-500/30 text-xs font-bold text-teal-600 dark:text-[#2DD4BF] mb-4 shadow-sm">
            <Crown size={14} />
            پلن‌های شفاف و منعطف
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-4">
            پلن مناسب سازمان و کسب‌وکارتان را انتخاب کنید
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8]">
            بدون هزینه‌های پنهان؛ از ساخت فرم رایگان شروع کنید و با رشد کسب‌وکارتان ارتقا دهید.
          </p>

          {/* سوئیچ ماهانه / سالانه */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-xs font-bold ${billingCycle === "monthly" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-[#94A3B8]"}`}>
              پرداخت ماهانه
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className="w-14 h-8 bg-slate-200 dark:bg-[#131B2E] border border-slate-300 dark:border-[#1E293B] rounded-full p-1 relative transition-colors"
              aria-label="تغییر دوره پرداخت"
            >
              <div
                className={`w-6 h-6 rounded-full bg-[#2DD4BF] transition-transform duration-300 ${
                  billingCycle === "yearly" ? "translate-x-[-24px]" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === "yearly" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-[#94A3B8]"}`}>
              <span>پرداخت سالانه</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-[#2DD4BF] text-[11px] font-black border border-teal-500/30">
                ۲۰٪ تخفیف
              </span>
            </span>
          </div>
        </div>

        {/* کارت‌های پلن‌ها */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 items-stretch">
          {plans.map((plan) => {
            const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-[#131B2E] rounded-3xl p-7 sm:p-8 flex flex-col justify-between relative transition-all duration-300 ${
                  plan.isPopular
                    ? "border-2 border-teal-500 dark:border-[#2DD4BF] shadow-lg dark:shadow-[0_0_40px_rgba(45,212,191,0.15)] scale-105 z-20"
                    : "border border-slate-200 dark:border-[#1E293B] hover:border-sky-400 dark:hover:border-[#38BDF8]/40 shadow-sm dark:shadow-none"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] text-slate-950 text-xs font-black shadow-md">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{plan.name}</h3>
                    {!plan.isPopular && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#0B0F19] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1E293B]">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed mb-6">
                    {plan.tagline}
                  </p>

                  <div className="mb-6 pb-6 border-b border-slate-200 dark:border-[#1E293B]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        {price}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-bold">{plan.unit}</span>
                    </div>
                  </div>

                  {/* لیست ویژگی‌ها */}
                  <div className="space-y-3.5 mb-8">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600 dark:text-[#94A3B8] flex items-center gap-2">
                          <Check
                            size={16}
                            className={f.included ? "text-teal-600 dark:text-[#2DD4BF]" : "text-slate-400 dark:text-[#64748B] opacity-30"}
                          />
                          <span className={f.included ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-[#64748B] line-through"}>
                            {f.title}
                          </span>
                        </span>
                        <span className={`text-[11px] font-bold ${f.included ? "text-teal-700 dark:text-[#2DD4BF]" : "text-slate-400 dark:text-[#64748B]"}`}>
                          {f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={plan.ctaLink}
                  className={`w-full py-3.5 rounded-xl text-sm text-center font-bold flex items-center justify-center gap-2 transition-all ${plan.ctaStyle}`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowLeft size={16} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* ریزمتن زیر جدول پلن‌ها */}
        <div className="text-center text-xs text-slate-500 dark:text-[#94A3B8]">
          <p>امکان تغییر پلن یا لغو اشتراک در هر زمان — بدون قرارداد بلندمدت و بدون جریمه</p>
        </div>
      </div>
    </section>
  );
}
