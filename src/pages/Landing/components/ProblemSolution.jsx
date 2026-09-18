import React from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, GitBranch, ShieldAlert, Sparkles, Check, X } from "lucide-react";

export default function ProblemSolution() {
  const problems = [
    {
      icon: FileSpreadsheet,
      badge: "مشکل ۱: گزارش‌گیری معیوب",
      title: "به‌هم‌ریختگی حروف فارسی در اکسل",
      desc: "خروجی CSV ابزارهای خارجی حروف فارسی را در نرم‌افزار Excel ناخوانا، علامت سوالی یا وارونه نشان می‌دهد و تحلیل داده را ساعت‌ها به تعویق می‌اندازد.",
      solution: "خروجی بومی با استاندارد UTF-8 BOM و فایل مستقیم Excel بدون نیاز به تبدیل فرمت.",
      accent: "from-[#F43F5E]/20 to-[#F43F5E]/5",
      iconColor: "text-[#F43F5E]",
      tagColor: "bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/20",
    },
    {
      icon: GitBranch,
      badge: "مشکل ۲: تجربه کاربری خسته‌کننده",
      title: "نبود منطق شرطی و پرش هوشمند",
      desc: "فرم‌سازهای سنتی همه سوالات را به همه نشان می‌دهند. پاسخ‌دهنده مجبور است سوالات غیرمرتبط را رد کند که باعث افت شدید نرخ تکمیل فرم می‌شود.",
      solution: "منطق شرطی پیشرفته (IF/THEN)، نمایش هوشمند سوال، پرش به بخش هدف و پایان زودهنگام فرم.",
      accent: "from-[#F59E0B]/20 to-[#F59E0B]/5",
      iconColor: "text-[#F59E0B]",
      tagColor: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
    },
    {
      icon: ShieldAlert,
      badge: "مشکل ۳: آسیب‌پذیری و نشت اطلاعات",
      title: "نگرانی‌های امنیتی داده‌های حساس",
      desc: "فرم‌های استخدامی، مالی و پژوهشی بدون ایزولاسیون داده ممکن است با کوچک‌ترین رخنه یا دسترسی عمومی به خطر بیفتند.",
      solution: "امنیت چندمستأجری RLS در دیتابیس Postgres، هانی‌پات ضد اسپم نامرئی و احراز هویت با سشن JWT.",
      accent: "from-[#38BDF8]/20 to-[#38BDF8]/5",
      iconColor: "text-[#38BDF8]",
      tagColor: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[#0B0F19] relative overflow-hidden">
      {/* هاله پس‌زمینه */}
      <div className="absolute top-1/2 -right-40 w-80 h-80 bg-[#2DD4BF]/5 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 -left-40 w-80 h-80 bg-[#38BDF8]/5 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131B2E] border border-[#1E293B] text-xs font-bold text-[#94A3B8] mb-4">
            <AlertCircle size={14} className="text-[#F59E0B]" />
            چرا ابزارهای قدیمی دیگر کافی نیستند؟
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-4">
            ساخت فرم‌های فارسی همیشه یعنی سازش با ابزارهای خارجی؟
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            ابزارهای خارجی نه تنها هزینه دلاری سنگینی دارند، بلکه برای زبان فارسی، شماره موبایل ایران و استانداردهای بومی بهینه‌سازی نشده‌اند.
          </p>
        </div>

        {/* سه کارت مشکل به راه‌حل */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {problems.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-[#131B2E] border border-[#1E293B] hover:border-[#2DD4BF]/30 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${p.tagColor}`}>
                      {p.badge}
                    </span>
                    <div className={`p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] ${p.iconColor}`}>
                      <Icon size={20} />
                    </div>
                  </div>

                  {/* عنوان مشکل */}
                  <h3 className="text-lg font-black text-white mb-3 group-hover:text-[#2DD4BF] transition-colors">
                    {p.title}
                  </h3>

                  {/* متن مشکل با آیکون منفی */}
                  <div className="bg-[#0B0F19]/60 rounded-2xl p-4 border border-[#1E293B]/60 mb-5">
                    <div className="flex items-start gap-2 text-xs text-[#94A3B8] leading-relaxed">
                      <span className="p-0.5 rounded bg-red-500/20 text-red-400 mt-0.5 shrink-0">
                        <X size={12} />
                      </span>
                      <span>{p.desc}</span>
                    </div>
                  </div>
                </div>

                {/* راه‌حل پرسکاد با آیکون تایید */}
                <div className="bg-gradient-to-br from-[#2DD4BF]/10 to-[#38BDF8]/5 rounded-2xl p-4 border border-[#2DD4BF]/20">
                  <div className="flex items-start gap-2.5 text-xs text-white leading-relaxed">
                    <span className="p-0.5 rounded bg-[#2DD4BF]/20 text-[#2DD4BF] mt-0.5 shrink-0">
                      <Check size={14} className="stroke-[3]" />
                    </span>
                    <div>
                      <strong className="text-[#2DD4BF] font-black block mb-0.5">راه‌حل پرسکاد:</strong>
                      <span className="text-[#E2E8F0] font-medium">{p.solution}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* بنر جمع‌بندی راه‌حل بومی */}
        <div className="bg-gradient-to-r from-[#131B2E] via-[#1B253D] to-[#131B2E] border border-[#2DD4BF]/30 rounded-3xl p-6 sm:p-8 text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#2DD4BF]/10 blur-3xl pointer-events-none rounded-full" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="text-right sm:max-w-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2DD4BF] mb-2">
                <Sparkles size={16} />
                <span>طراحی‌شده برای نیازهای کسب‌وکارهای ایرانی</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                پرسکاد همه این‌ها را از پایه و بومی حل کرده است.
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                بدون نیاز به دور زدن تحریم‌ها یا ابزارهای واسط، با بالاترین کیفیت جهانی فرم بسازید.
              </p>
            </div>
            <a
              href="#features"
              className="px-6 py-3.5 bg-[#2DD4BF] text-[#0B0F19] text-sm font-black rounded-xl hover:shadow-lg hover:shadow-[#2DD4BF]/30 hover:scale-105 transition-all shrink-0"
            >
              مشاهده امکانات کلیدی ↓
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
