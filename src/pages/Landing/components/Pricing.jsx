import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, ArrowLeft, Zap } from "lucide-react";
import StickerCard from "../../../components/ui/StickerCard";
import Badge from "../../../components/ui/Badge";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' | 'yearly'

  const plans = [
    {
      id: "free",
      name: "رایگان",
      badge: "شروع سریع",
      badgeTheme: "gray",
      tagline: "مناسب برای تست، پروژه‌های شخصی و دانشجویی",
      priceMonthly: "۰",
      priceYearly: "۰",
      unit: "تومان / همیشه رایگان",
      isPopular: false,
      cardTheme: "white",
      ctaText: "شروع رایگان",
      ctaLink: "/register",
      ctaClass: "bg-slate-100 dark:bg-[#131B2E] text-slate-900 dark:text-white border-2 border-[#202A5A]/20 dark:border-white/10 hover:border-[#59BBAF] shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]",
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
      badge: "پیشنهاد پرس‌کاد",
      badgeTheme: "magenta",
      tagline: "مناسب برای استارتاپ‌ها، کسب‌وکارها و تیم‌های مارکتینگ",
      priceMonthly: "۱۸۹,۰۰۰",
      priceYearly: "۱۴۹,۰۰۰",
      unit: "تومان / ماهانه",
      isPopular: true,
      cardTheme: "teal",
      ctaText: "ارتقا به حرفه‌ای",
      ctaLink: "/register",
      ctaClass: "rokad-btn-sec w-full",
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
      badgeTheme: "club",
      tagline: "سازمان‌های بزرگ، دانشگاه‌ها و پژوهشگاه‌های کشور",
      priceMonthly: "تماس بگیرید",
      priceYearly: "تماس بگیرید",
      unit: "پلن سفارشی",
      isPopular: false,
      cardTheme: "white",
      ctaText: "ارسال تیکت و مشاوره",
      ctaLink: "/admin/support",
      ctaClass: "bg-slate-100 dark:bg-[#131B2E] text-slate-900 dark:text-white border-2 border-[#202A5A]/20 dark:border-white/10 hover:border-[#59BBAF] shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]",
      features: [
        { title: "تعداد فرم فعال", value: "نامحدود", included: true },
        { title: "سقف پاسخ ماهانه", value: "نامحدود و سفارشی", included: true },
        { title: "منطق شرطی پیشرفته", value: "نامحدود", included: true },
        { title: "خروجی اکسل سالم فارسی", value: "نامحدود با UTF-8 BOM", included: true },
        { title: "پنل پیامک اختصاصی", value: "ارسال اختصاصی با خط سازمانی", included: true },
        { title: "دسترسی به وب‌سرویس و API", value: "کلید وب‌سرویس اختصاصی", included: true },
        { title: "پشتیبانی اولویت‌دار", value: "پشتیبانی تیکتینگ VIP", included: true },
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#F8F9FA] dark:bg-[#0B0F17] dot-pattern relative overflow-hidden border-t-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="flex justify-center mb-4">
            <Badge theme="club" size="md" dot>
              <Crown size={14} className="ml-1.5" />
              پلن‌های شفاف و منعطف
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#202A5A] dark:text-white leading-tight mb-4 whitespace-normal lg:whitespace-nowrap">
            پلن مناسب سازمان و کسب‌وکارتان را انتخاب کنید
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300">
            بدون هزینه‌های پنهان؛ از ساخت فرم رایگان شروع کنید و با رشد کسب‌وکارتان ارتقا دهید.
          </p>

          {/* سوئیچ ماهانه / سالانه - Neo-brutalist Switch */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-xs font-black ${billingCycle === "monthly" ? "text-[#202A5A] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              پرداخت ماهانه
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className="w-14 h-8 bg-white dark:bg-[#131B2E] border-2 border-[#202A5A] dark:border-[#59BBAF] rounded-full p-0.5 relative transition-colors shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]"
              aria-label="تغییر دوره پرداخت"
            >
              <div
                className={`w-6 h-6 rounded-full bg-[#59BBAF] border border-[#202A5A] transition-transform duration-300 ${
                  billingCycle === "yearly" ? "translate-x-[-22px]" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs font-black flex items-center gap-1.5 ${billingCycle === "yearly" ? "text-[#202A5A] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              <span>پرداخت سالانه</span>
              <Badge theme="teal" size="sm">
                ۲۰٪ تخفیف
              </Badge>
            </span>
          </div>
        </div>

        {/* کارت‌های پلن‌ها */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 items-stretch">
          {plans.map((plan) => {
            const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
            return (
              <StickerCard
                key={plan.id}
                theme={plan.cardTheme}
                borderWidth="border-2"
                shadow={plan.isPopular ? "shadow-[6px_6px_0_#202A5A] dark:shadow-[6px_6px_0_#59BBAF]" : "shadow-[3px_3px_0_#202A5A] dark:shadow-[3px_3px_0_#59BBAF]"}
                className={`p-7 sm:p-8 flex flex-col justify-between relative transition-all duration-300 ${
                  plan.isPopular ? "scale-105 z-20 ring-2 ring-[#59BBAF]" : ""
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge theme="magenta" size="md">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-black text-[#202A5A] dark:text-white">{plan.name}</h3>
                    {!plan.isPopular && (
                      <Badge theme={plan.badgeTheme} size="sm">
                        {plan.badge}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                    {plan.tagline}
                  </p>

                  <div className="mb-6 pb-6 border-b-2 border-[#202A5A]/10 dark:border-white/10">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-[#202A5A] dark:text-white tracking-tight">
                        {price}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{plan.unit}</span>
                    </div>
                  </div>

                  {/* لیست ویژگی‌ها */}
                  <div className="space-y-3.5 mb-8">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Check
                            size={16}
                            className={f.included ? "text-[#59BBAF] font-black" : "text-slate-400 dark:text-slate-600 opacity-30"}
                          />
                          <span className={f.included ? "font-bold text-[#202A5A] dark:text-white" : "text-slate-400 dark:text-slate-500 line-through"}>
                            {f.title}
                          </span>
                        </span>
                        <span className={`text-[11px] font-black ${f.included ? "text-[#202A5A] dark:text-[#59BBAF]" : "text-slate-400 dark:text-slate-600"}`}>
                          {f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={plan.ctaLink}
                  className={`py-3.5 rounded-xl text-sm text-center font-black flex items-center justify-center gap-2 transition-all ${plan.ctaClass}`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowLeft size={16} />
                </Link>
              </StickerCard>
            );
          })}
        </div>

        {/* ریزمتن زیر جدول پلن‌ها */}
        <div className="text-center text-xs font-bold text-slate-500 dark:text-slate-400">
          <p>امکان تغییر پلن یا لغو اشتراک در هر زمان — بدون قرارداد بلندمدت و بدون جریمه</p>
        </div>
      </div>
    </section>
  );
}
