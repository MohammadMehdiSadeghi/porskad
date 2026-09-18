import React from "react";
import {
  Layers,
  ListOrdered,
  GitFork,
  History,
  BarChart3,
  FileSpreadsheet,
  Share2,
  ShieldCheck,
  Trash2,
  Sparkles,
  CheckCircle,
  ArrowLeft
} from "lucide-react";

export default function Features() {
  const features = [
    {
      id: 1,
      icon: Layers,
      title: "رندر اسلایدی و روان",
      desc: "تجربه‌ای شبیه گفت‌وگو؛ فوکوس خودکار، میانبر Enter، انیمیشن دقیق و روان بین سوالات برای حداکثر تمرکز کاربر.",
      badge: "تجربه کاربری",
      color: "text-[#2DD4BF]",
      bg: "bg-[#2DD4BF]/10",
      border: "border-[#2DD4BF]/20",
    },
    {
      id: 2,
      icon: ListOrdered,
      title: "۸ نوع فیلد حرفه‌ای",
      desc: "از متن کوتاه و پاراگراف تا چندگزینه‌ای، ایمیل، امتیاز ستاره‌ای و اعتبارسنجی زنده شماره موبایل ایران.",
      badge: "انواع فیلد",
      color: "text-[#38BDF8]",
      bg: "bg-[#38BDF8]/10",
      border: "border-[#38BDF8]/20",
    },
    {
      id: 3,
      icon: GitFork,
      title: "منطق شرطی پیشرفته",
      desc: "پرش هوشمند بین سوالات، نمایش یا پنهان‌سازی فیلدها و پایان زودهنگام فرم بر اساس پاسخ‌های قبلی کاربر.",
      badge: "منطق شرطی",
      color: "text-[#A855F7]",
      bg: "bg-[#A855F7]/10",
      border: "border-[#A855F7]/20",
    },
    {
      id: 4,
      icon: History,
      title: "پیش‌نویس خودکار ۷ روزه",
      desc: "اگر پاسخ‌دهنده به هر دلیلی صفحه را ببندد، پاسخ‌های ثبت‌شده تا ۷ روز در مرورگر ذخیره می‌ماند و پاک نمی‌شود.",
      badge: "بدون ریزش کاربر",
      color: "text-[#10B981]",
      bg: "bg-[#10B981]/10",
      border: "border-[#10B981]/20",
    },
    {
      id: 5,
      icon: BarChart3,
      title: "داشبورد تحلیلی زنده",
      desc: "مشاهده لحظه‌ای نرخ تکمیل، میانگین زمان پاسخ‌دهی، تفکیک دستگاه‌ها و نمودارهای توزیع پاسخ به صورت Realtime.",
      badge: "گزارش‌گیری",
      color: "text-[#F59E0B]",
      bg: "bg-[#F59E0B]/10",
      border: "border-[#F59E0B]/20",
    },
    {
      id: 6,
      icon: FileSpreadsheet,
      title: "خروجی اکسل فارسیِ سالم",
      desc: "تولید مستقیم فایل CSV و Excel استاندارد با انکودینگ UTF-8 BOM بدون هیچ‌گونه به‌هم‌ریختگی یا خرابی حروف فارسی.",
      badge: "خروجی سازمانی",
      color: "text-[#2DD4BF]",
      bg: "bg-[#2DD4BF]/10",
      border: "border-[#2DD4BF]/20",
    },
    {
      id: 7,
      icon: Share2,
      title: "اشتراک‌گذاری چندکاناله",
      desc: "لینک اختصاصی، QR Code باکیفیت و کد Embed ریسپانسیو (iFrame) برای جاسازی آسان در سایت‌های وردپرس، لاراول و...",
      badge: "انتشار آسان",
      color: "text-[#38BDF8]",
      bg: "bg-[#38BDF8]/10",
      border: "border-[#38BDF8]/20",
    },
    {
      id: 8,
      icon: ShieldCheck,
      title: "امنیت در لایه دیتابیس",
      desc: "پیاده‌سازی کامل Row-Level Security، تله ضد ربات (Honeypot) و اعمال محدودیت Rate Limiting به صورت پیش‌فرض.",
      badge: "امنیت داده",
      color: "text-[#F43F5E]",
      bg: "bg-[#F43F5E]/10",
      border: "border-[#F43F5E]/20",
    },
    {
      id: 9,
      icon: Trash2,
      title: "سطل بازیافت ۳۰ روزه",
      desc: "حذف تصادفی فرم یا داده‌ها دیگر فاجعه نیست؛ امکان بازیابی تضمین‌شده فرم‌ها و پاسخ‌ها تا ۳۰ روز با یک کلیک.",
      badge: "بازیابی امن",
      color: "text-[#A855F7]",
      bg: "bg-[#A855F7]/10",
      border: "border-[#A855F7]/20",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-[#0B0F19] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131B2E] border border-[#2DD4BF]/30 text-xs font-bold text-[#2DD4BF] mb-4">
            <Sparkles size={14} />
            امکانات و نوآوری‌های محصول
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            هر آنچه برای ساخت پرسشنامه مدرن نیاز دارید
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            طراحی شده با الهام از برترین فرم‌سازهای دنیا و بومی‌سازی دقیق برای کاربران فارسی‌زبان
          </p>
        </div>

        {/* گرید ۳×۳ ویژگی‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="bg-[#131B2E] border border-[#1E293B] hover:border-[#2DD4BF]/40 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1.5 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-2xl ${item.bg} ${item.border} border flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}
                    >
                      <Icon size={24} />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#0B0F19] text-[#94A3B8] border border-[#1E293B]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white mb-2.5 group-hover:text-[#2DD4BF] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-[#1E293B]/60 flex items-center gap-1.5 text-xs font-bold text-[#2DD4BF] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>تست شده در پروداکشن</span>
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
