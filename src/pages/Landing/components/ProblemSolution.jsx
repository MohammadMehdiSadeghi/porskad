import React from "react";
import { AlertCircle, FileSpreadsheet, GitBranch, Smartphone, Sparkles, Check, X } from "lucide-react";

export default function ProblemSolution() {
  const problems = [
    {
      icon: FileSpreadsheet,
      badge: "مشکل ۱: گزارش‌گیری معیوب",
      title: "به‌هم‌ریختگی حروف فارسی در اکسل",
      desc: "خروجی CSV ابزارهای متفرقه حروف فارسی را در Excel ناخوانا، علامت سوالی یا وارونه نشان می‌دهد و تحلیل داده را دچار مشکل می‌کند.",
      solution: "خروجی بومی با استاندارد UTF-8 BOM و فایل مستقیم Excel بدون نیاز به تبدیل فرمت یا تنظیم دستی.",
      iconColor: "text-rose-500",
      tagColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
    {
      icon: GitBranch,
      badge: "مشکل ۲: تجربه کاربری خسته‌کننده",
      title: "نبود منطق شرطی و پرش هوشمند",
      desc: "فرم‌سازهای سنتی همه سوالات را به همه نشان می‌دهند. پاسخ‌دهنده مجبور است سوالات غیرمرتبط را رد کند که باعث افت نرخ پاسخ می‌شود.",
      solution: "منطق شرطی هوشمند (IF/THEN)، نمایش سوالات مرتبط و پرش خودکار به بخش‌های هدف بر اساس پاسخ کاربر.",
      iconColor: "text-amber-500",
      tagColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      icon: Smartphone,
      badge: "مشکل ۳: عدم سازگاری با موبایل",
      title: "فرم‌های شلوغ و غیر ریسپانسیو",
      desc: "فرم‌های سنتی با فونت‌های ریز و طراحی نامناسب در موبایل، تجربه بدی برای کاربر ایجاد می‌کنند.",
      solution: "رابط اسلایدی، فونت استاندارد و سازگاری کامل با انواع گوشی‌ها و تبلت‌ها به صورت واکنش‌گرا.",
      iconColor: "text-sky-500",
      tagColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-slate-50 dark:bg-[#0B0F19] relative overflow-hidden transition-colors duration-200">
      {/* هاله پس‌زمینه */}
      <div className="absolute top-1/2 -right-40 w-80 h-80 bg-teal-500/5 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 -left-40 w-80 h-80 bg-sky-500/5 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] text-xs font-bold text-slate-600 dark:text-[#94A3B8] mb-4 shadow-sm">
            <AlertCircle size={14} className="text-[#F59E0B]" />
            چرا ابزارهای قدیمی دیگر کافی نیستند؟
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-4">
            ساخت فرم‌های حرفه‌ای بدون دردسرهای معمول
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8]">
            ابزارهای خارجی هزینه سنگین دارند و برای زبان فارسی بهینه‌سازی نشده‌اند. پرسکاد این چالش‌ها را به طور کامل برطرف کرده است.
          </p>
        </div>

        {/* سه کارت مشکل به راه‌حل */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {problems.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] hover:border-teal-500/30 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-xl dark:shadow-none group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${p.tagColor}`}>
                      {p.badge}
                    </span>
                    <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E293B] ${p.iconColor}`}>
                      <Icon size={20} />
                    </div>
                  </div>

                  {/* عنوان مشکل */}
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3 group-hover:text-teal-600 dark:group-hover:text-[#2DD4BF] transition-colors">
                    {p.title}
                  </h3>

                  {/* متن مشکل با آیکون منفی */}
                  <div className="bg-slate-50 dark:bg-[#0B0F19]/60 rounded-2xl p-4 border border-slate-100 dark:border-[#1E293B]/60 mb-5">
                    <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                      <span className="p-0.5 rounded bg-red-500/20 text-red-500 mt-0.5 shrink-0">
                        <X size={12} />
                      </span>
                      <span>{p.desc}</span>
                    </div>
                  </div>
                </div>

                {/* راه‌حل پرسکاد با آیکون تایید */}
                <div className="bg-teal-50 dark:bg-gradient-to-br dark:from-[#2DD4BF]/10 dark:to-[#38BDF8]/5 rounded-2xl p-4 border border-teal-500/20">
                  <div className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-white leading-relaxed">
                    <span className="p-0.5 rounded bg-teal-500/20 text-teal-600 dark:text-[#2DD4BF] mt-0.5 shrink-0">
                      <Check size={14} className="stroke-[3]" />
                    </span>
                    <div>
                      <strong className="text-teal-700 dark:text-[#2DD4BF] font-black block mb-0.5">راه‌حل پرسکاد:</strong>
                      <span className="text-slate-700 dark:text-[#E2E8F0] font-medium">{p.solution}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* بنر جمع‌بندی راه‌حل بومی */}
        <div className="bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-teal-500/10 dark:from-[#131B2E] dark:via-[#1B253D] dark:to-[#131B2E] border border-teal-500/30 rounded-3xl p-6 sm:p-8 text-center max-w-4xl mx-auto shadow-sm dark:shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="text-right sm:max-w-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-[#2DD4BF] mb-2">
                <Sparkles size={16} />
                <span>طراحی‌شده برای نیازهای کسب‌وکارهای ایرانی</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
                پرسکاد همه این‌ها را از پایه و بومی حل کرده است.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8]">
                بدون نیاز به دور زدن تحریم‌ها یا ابزارهای واسط، با بالاترین سرعت و کیفیت فرم بسازید.
              </p>
            </div>
            <a
              href="#features"
              className="px-6 py-3.5 bg-[#2DD4BF] text-slate-950 text-sm font-black rounded-xl hover:shadow-lg hover:shadow-teal-500/30 hover:scale-105 transition-all shrink-0"
            >
              مشاهده امکانات کلیدی ↓
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
