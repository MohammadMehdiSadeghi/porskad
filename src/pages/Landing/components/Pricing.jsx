import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles, Zap, Shield, Crown, HelpCircle, ArrowLeft } from "lucide-react";

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
      ctaStyle: "bg-[#131B2E] text-white hover:bg-[#1B253D] border border-[#1E293B]",
      features: [
        { title: "تعداد فرم فعال", value: "تا ۳ فرم فعال", included: true },
        { title: "سقف پاسخ ماهانه", value: "۱۰۰ پاسخ در ماه", included: true },
        { title: "منطق شرطی پیشرفته", value: "کامل و فعال", included: true },
        { title: "خروجی اکسل سالم فارسی", value: "CSV و Excel با BOM", included: true },
        { title: "سطل بازیافت ۳۰ روزه", value: "بازیابی کامل داده‌ها", included: true },
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
      ctaStyle: "bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] text-[#0B0F19] font-black shadow-lg shadow-[#2DD4BF]/25 hover:shadow-[#2DD4BF]/40",
      features: [
        { title: "تعداد فرم فعال", value: "تا ۲۰ فرم فعال", included: true },
        { title: "سقف پاسخ ماهانه", value: "۲,۵۰۰ پاسخ در ماه", included: true },
        { title: "منطق شرطی پیشرفته", value: "نامحدود", included: true },
        { title: "خروجی اکسل سالم فارسی", value: "تولید لحظه‌ای نامحدود", included: true },
        { title: "سطل بازیافت ۳۰ روزه", value: "با بازیابی لحظه‌ای", included: true },
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
      ctaStyle: "bg-[#131B2E] text-white hover:bg-[#1B253D] border border-[#1E293B]",
      features: [
        { title: "تعداد فرم فعال", value: "نامحدود", included: true },
        { title: "سقف پاسخ ماهانه", value: "نامحدود و سفارشی", included: true },
        { title: "منطق شرطی پیشرفته", value: "نامحدود", included: true },
        { title: "خروجی اکسل سالم فارسی", value: "یکپارچه با ERP/CRM", included: true },
        { title: "سطل بازیافت ۳۰ روزه", value: "گارانتی بازیابی God Trash", included: true },
        { title: "پنل پیامک اختصاصی", value: "ارسال اختصاصی با خط سازمانی", included: true },
        { title: "پشتیبانی اختصاصی و SLA", value: "پشتیبان تلفنی اختصاصی ۲۴/۷", included: true },
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#0B0F19] relative overflow-hidden border-t border-[#1E293B]/60">
      {/* هاله پس‌زمینه */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-[#2DD4BF]/10 via-[#38BDF8]/5 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131B2E] border border-[#2DD4BF]/30 text-xs font-bold text-[#2DD4BF] mb-4">
            <Crown size={14} />
            پلن‌های شفاف و منعطف
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            پلن مناسب سازمان و کسب‌وکارتان را انتخاب کنید
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            بدون هزینه‌های پنهان؛ از ساخت فرم رایگان شروع کنید و با رشد کسب‌وکارتان ارتقا دهید.
          </p>

          {/* سوئیچ ماهانه / سالانه */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-xs font-bold ${billingCycle === "monthly" ? "text-white" : "text-[#94A3B8]"}`}>
              پرداخت ماهانه
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className="w-14 h-8 bg-[#131B2E] border border-[#1E293B] rounded-full p-1 relative transition-colors"
            >
              <div
                className={`w-6 h-6 rounded-full bg-[#2DD4BF] transition-transform duration-300 ${
                  billingCycle === "yearly" ? "translate-x-[-24px]" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === "yearly" ? "text-white" : "text-[#94A3B8]"}`}>
              <span>پرداخت سالانه</span>
              <span className="px-2 py-0.5 rounded-full bg-[#2DD4BF]/15 text-[#2DD4BF] text-[11px] font-black border border-[#2DD4BF]/30">
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
                className={`bg-[#131B2E] rounded-3xl p-7 sm:p-8 flex flex-col justify-between relative transition-all duration-300 ${
                  plan.isPopular
                    ? "border-2 border-[#2DD4BF] shadow-[0_0_40px_rgba(45,212,191,0.15)] scale-105 z-20"
                    : "border border-[#1E293B] hover:border-[#38BDF8]/40"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] text-[#0B0F19] text-xs font-black shadow-lg">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-black text-white">{plan.name}</h3>
                    {!plan.isPopular && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#0B0F19] text-[#94A3B8] border border-[#1E293B]">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#94A3B8] leading-relaxed mb-6">
                    {plan.tagline}
                  </p>

                  <div className="mb-6 pb-6 border-b border-[#1E293B]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {price}
                      </span>
                      <span className="text-xs text-[#94A3B8] font-bold">{plan.unit}</span>
                    </div>
                  </div>

                  {/* لیست ویژگی‌ها */}
                  <div className="space-y-3.5 mb-8">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-[#94A3B8] flex items-center gap-2">
                          <Check
                            size={16}
                            className={f.included ? "text-[#2DD4BF]" : "text-[#64748B] opacity-30"}
                          />
                          <span className={f.included ? "text-white" : "text-[#64748B] line-through"}>
                            {f.title}
                          </span>
                        </span>
                        <span className={`text-[11px] font-bold ${f.included ? "text-[#2DD4BF]" : "text-[#64748B]"}`}>
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
        <div className="text-center text-xs text-[#94A3B8]">
          <p>امکان تغییر پلن یا لغو اشتراک در هر زمان — بدون قرارداد بلندمدت و بدون جریمه</p>
        </div>
      </div>
    </section>
  );
}
