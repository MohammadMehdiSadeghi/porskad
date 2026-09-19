import React from "react";
import { AlertCircle, FileSpreadsheet, GitBranch, Smartphone, Sparkles, Check, X, ArrowDown } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import StickerCard from "../../../components/ui/StickerCard";

export default function ProblemSolution() {
  const problems = [
    {
      icon: Smartphone,
      badge: "مشکل ۱: فرم طوماری",
      title: "ریزش ۶۰ درصدی کاربر",
      desc: "وقتی کاربر با ۲۰ تا سوال در یک صفحه دراز مواجه می‌شود، خستگی و استرس به او دست می‌دهد و صفحه را می‌بندد.",
      solution: "نمایش تک‌سواله و اسلایدی؛ کاربر با تمرکز کامل و مثل یک گفت‌وگوی روان در چند ثانیه پاسخ می‌دهد.",
      theme: "female",
      tagColor: "magenta",
      iconColor: "text-girl",
    },
    {
      icon: GitBranch,
      badge: "مشکل ۲: سوالات نامربوط",
      title: "نبود مسیردهی هوشمند",
      desc: "در فرم‌های سنتی همه مخاطبان مجبورند تمام سوالات را ببینند حتی اگر ارتباطی به شغل یا انتخاب آن‌ها نداشته باشد.",
      solution: "منطق شرطی هوشمند (IF/THEN)؛ سوالات بعدی به صورت خودکار بر اساس پاسخ‌های قبلی شخصی‌سازی می‌شوند.",
      theme: "orange",
      tagColor: "orange",
      iconColor: "text-third",
    },
    {
      icon: FileSpreadsheet,
      badge: "مشکل ۳: گزارش معیوب",
      title: "خرابی اکسل در زبان فارسی",
      desc: "خروجی اکسل در ابزارهای خارجی کلمات فارسی را به صورت علامت سوال یا علامت‌های نامفهوم و به‌هم‌ریخته باز می‌کند.",
      solution: "خروجی اکسل ۱۰۰٪ استاندارد با انکودینگ بومی، آماده و تمیز برای گزارش‌گیری و ارسال به مدیریت.",
      theme: "teal",
      tagColor: "teal",
      iconColor: "text-primary",
    },
  ];

  return (
    <section className="py-20 md:py-24 bg-[#F8F9FA] dark:bg-[#0B0F17] relative overflow-hidden transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge color="orange">
              <AlertCircle size={13} className="text-third" />
              <span>چرا فرم‌های قدیمی دیگر جواب نمی‌دهند؟</span>
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-sec dark:text-white leading-tight mb-4 whitespace-normal lg:whitespace-nowrap">
            تفاوت یک فرم معمولی با فرمی که مردم کامل پر می‌کنند
          </h2>
          <p className="text-xs sm:text-sm text-ink-subtle dark:text-gray-300 max-w-2xl mx-auto">
            وقتی فرم شما خسته‌کننده باشد، مشتری درجا صفحه را می‌بندد و هزینه تبلیغات شما هدر می‌رود. پرس‌کاد این بازی را تغییر می‌دهد.
          </p>
        </div>

        {/* سه کارت مشکل به راه‌حل با استیکرکارت رُکاد */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {problems.map((p, idx) => {
            const Icon = p.icon;
            return (
              <StickerCard
                key={idx}
                theme="white"
                className="p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Badge color={p.tagColor}>
                      {p.badge}
                    </Badge>
                    <div className={`p-2 rounded-xl bg-gray-100 dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 ${p.iconColor}`}>
                      <Icon size={18} />
                    </div>
                  </div>

                  {/* عنوان مشکل */}
                  <h3 className="text-base sm:text-lg font-black text-sec dark:text-white mb-2">
                    {p.title}
                  </h3>

                  {/* متن مشکل با علامت منفی */}
                  <div className="bg-red-50 dark:bg-pink-950/30 rounded-xl p-3.5 border-[1.5px] border-red-200 dark:border-pink-900/40 mb-4">
                    <div className="flex items-start gap-2 text-xs text-red-700 dark:text-pink-300 leading-relaxed font-semibold">
                      <span className="p-0.5 rounded bg-red-200 dark:bg-pink-900 text-red-600 dark:text-pink-200 mt-0.5 shrink-0">
                        <X size={11} />
                      </span>
                      <span>{p.desc}</span>
                    </div>
                  </div>
                </div>

                {/* راه‌حل پرسکاد با علامت تایید */}
                <div className="bg-ecosystem-light dark:bg-[#1C2536] rounded-xl p-3.5 border-[1.5px] border-primary/30">
                  <div className="flex items-start gap-2 text-xs text-sec dark:text-white leading-relaxed">
                    <span className="p-0.5 rounded bg-primary/20 text-primary mt-0.5 shrink-0">
                      <Check size={12} className="stroke-[3]" />
                    </span>
                    <div>
                      <strong className="text-primary font-black block mb-0.5">راه‌حل پرس‌کاد:</strong>
                      <span className="text-ink-normal dark:text-gray-200 font-medium">{p.solution}</span>
                    </div>
                  </div>
                </div>
              </StickerCard>
            );
          })}
        </div>

        {/* بنر جمع‌بندی با کارت رُکاد */}
        <StickerCard theme="teal" className="p-6 sm:p-8 max-w-4xl mx-auto text-right">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="sm:max-w-xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-2">
                <Sparkles size={15} />
                <span>طراحی‌شده برای افزایش بازدهی کسب‌وکارهای ایرانی</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-sec dark:text-white mb-1.5">
                پرس‌کاد فرم‌سازی را از یک وظیفه خسته‌کننده به تجربه‌ای لذت‌بخش تبدیل کرده است.
              </h3>
              <p className="text-xs text-ink-subtle dark:text-gray-300 font-medium">
                بدون نیاز به دور زدن فیلترها، بدون نیاز به دانش کدنویسی و در کمتر از ۲ دقیقه.
              </p>
            </div>
            <a
              href="#features"
              className="px-5 py-3 bg-sec text-white text-xs sm:text-sm font-bold rounded-xl border-[1.5px] border-male-dark shadow-[2.5px_2.5px_0_#0B0F1F] hover:shadow-[3px_3px_0_#0B0F1F] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 flex items-center gap-2"
            >
              <span>مشاهده قابلیت‌های کلیدی</span>
              <ArrowDown size={15} />
            </a>
          </div>
        </StickerCard>
      </div>
    </section>
  );
}
