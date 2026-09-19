import React from "react";
import {
  Layers,
  ListOrdered,
  GitFork,
  BarChart3,
  FileSpreadsheet,
  Share2,
  Sparkles,
  CheckCircle
} from "lucide-react";

export default function Features() {
  const features = [
    {
      id: 1,
      icon: Layers,
      title: "رندر اسلایدی و روان",
      desc: "تجربه‌ای شبیه گفت‌وگو؛ فوکوس خودکار، میانبر Enter، انیمیشن دقیق و روان بین سوالات برای حداکثر تمرکز کاربر.",
      badge: "تجربه کاربری",
      color: "text-teal-600 dark:text-[#2DD4BF]",
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
    },
    {
      id: 2,
      icon: ListOrdered,
      title: "تنوع فیلدهای استاندارد",
      desc: "متن کوتاه و بلند، چندگزینه‌ای، کشویی، ایمیل، موبایل، امتیاز ستاره‌ای، ماتریسی، طیف لیکرت و...",
      badge: "انواع فیلد",
      color: "text-sky-600 dark:text-[#38BDF8]",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
    {
      id: 3,
      icon: GitFork,
      title: "منطق شرطی پیشرفته",
      desc: "پرش هوشمند بین سوالات، نمایش یا پنهان‌سازی فیلدها و هدایت کاربر بر اساس پاسخ‌های انتخابی.",
      badge: "منطق شرطی",
      color: "text-purple-600 dark:text-[#A855F7]",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      id: 4,
      icon: BarChart3,
      title: "داشبورد تحلیلی زنده",
      desc: "مشاهده لحظه‌ای پاسخ‌ها، تفکیک داده‌ها و نمودارهای توزیع پاسخ به صورت Realtime.",
      badge: "گزارش‌گیری",
      color: "text-amber-600 dark:text-[#F59E0B]",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      id: 5,
      icon: FileSpreadsheet,
      title: "خروجی اکسل فارسیِ سالم",
      desc: "تولید مستقیم فایل CSV و Excel استاندارد با انکودینگ UTF-8 BOM بدون هیچ‌گونه به‌هم‌ریختگی یا خرابی حروف فارسی.",
      badge: "خروجی سازمانی",
      color: "text-emerald-600 dark:text-[#10B981]",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      id: 6,
      icon: Share2,
      title: "اشتراک‌گذاری چندکاناله",
      desc: "لینک اختصاصی، QR Code باکیفیت و کد Embed ریسپانسیو (iFrame) برای جاسازی آسان در سایت‌های وردپرس، لاراول و...",
      badge: "انتشار آسان",
      color: "text-indigo-600 dark:text-[#818CF8]",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-slate-50 dark:bg-[#0B0F19] relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#131B2E] border border-teal-500/30 text-xs font-bold text-teal-600 dark:text-[#2DD4BF] mb-4 shadow-sm">
            <Sparkles size={14} />
            امکانات و نوآوری‌های محصول
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-4 whitespace-normal lg:whitespace-nowrap">
            هر آنچه برای ساخت پرسشنامه مدرن نیاز دارید
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8]">
            طراحی شده با الهام از برترین فرم‌سازهای دنیا و بومی‌سازی دقیق برای کاربران فارسی‌زبان
          </p>
        </div>

        {/* گرید ویژگی‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] hover:border-teal-500/40 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-xl dark:shadow-none hover:-translate-y-1 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-2xl ${item.bg} ${item.border} border flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}
                    >
                      <Icon size={24} />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#0B0F19] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1E293B]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2.5 group-hover:text-teal-600 dark:group-hover:text-[#2DD4BF] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100 dark:border-[#1E293B]/60 flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-[#2DD4BF] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>آماده استفاده</span>
                  <CheckCircle size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
