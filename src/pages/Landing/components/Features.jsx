import React from "react";
import {
  Layers,
  ListOrdered,
  GitFork,
  BarChart3,
  FileSpreadsheet,
  Share2,
  Sparkles,
  CheckCircle,
  Zap
} from "lucide-react";
import Badge from "../../../components/ui/Badge";
import StickerCard from "../../../components/ui/StickerCard";

export default function Features() {
  const features = [
    {
      id: 1,
      icon: Layers,
      title: "رندر اسلایدی؛ مثل یک گفت‌وگوی روان",
      desc: "سوالات یکی‌یکی، شیک و بدون استرس جلوی مخاطب باز می‌شوند. دکمه‌های بزرگ لمسی، انیمیشن نرم و فوکوس کامل روی هر سوال.",
      badge: "تجربه کاربری",
      badgeColor: "teal",
      theme: "ecosystem",
      iconColor: "text-primary",
    },
    {
      id: 2,
      icon: GitFork,
      title: "منطق شرطی هوشمند (فرمی که فکر می‌کند)",
      desc: "با تعریف شروط ساده، مسیر فرم بر اساس انتخاب کاربر تغییر می‌کند. کاربر هیچ سوال نامربوط یا تکراری نخواهد دید.",
      badge: "شخصی‌سازی",
      badgeColor: "purple",
      theme: "club",
      iconColor: "text-club-normal dark:text-purple-400",
    },
    {
      id: 3,
      icon: FileSpreadsheet,
      title: "خروجی اکسل سالم؛ خیالتان کاملاً تخت!",
      desc: "دانلود فوری فایل اکسل و CSV استاندارد با حروف فارسی کاملاً خوانا، بدون علامت سوال و بدون نیاز به تبدیل فرمت.",
      badge: "گزارش‌گیری",
      badgeColor: "teal",
      theme: "male",
      iconColor: "text-sec dark:text-teal",
    },
    {
      id: 4,
      icon: ListOrdered,
      title: "فیلدهای متنوع برای هر سناریو",
      desc: "متن کوتاه، توضیحات بلند، چندگزینه‌ای، امتیاز ستاره‌ای رضایت‌سنجی، بله/خیر، ایمیل و دریافت شماره موبایل معتبر.",
      badge: "انعطاف‌پذیری",
      badgeColor: "navy",
      theme: "navy",
      iconColor: "text-sec dark:text-white",
    },
    {
      id: 5,
      icon: Zap,
      title: "ذخیره خودکار پیش‌نویس (Auto-Save)",
      desc: "اگر اینترنت کاربر قطع شود یا دستش بخورد و صفحه بسته شود، پاسخ‌های قبلی حفظ می‌شوند و بعداً فرم از همان‌جا ادامه می‌یابد.",
      badge: "نجات پاسخ‌ها",
      badgeColor: "orange",
      theme: "college",
      iconColor: "text-third",
    },
    {
      id: 6,
      icon: Share2,
      title: "انتشار چندکاناله در کمتر از ۳ ثانیه",
      desc: "تولید لینک کوتاه برای پیامک و شبکه‌های اجتماعی، کد QR باکیفیت برای چاپ، و کد Embed برای قرار دادن مستقیم داخل سایت.",
      badge: "انتشار آسان",
      badgeColor: "teal",
      theme: "ecosystem",
      iconColor: "text-primary",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-24 bg-[#F8F9FA] dark:bg-[#0B0F17] relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge color="teal">
              <Sparkles size={13} />
              <span>امکاناتی که کسب‌وکار شما را متمایز می‌کند</span>
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-sec dark:text-white leading-tight mb-4 whitespace-normal lg:whitespace-nowrap">
            هر آنچه برای ساخت یک پرسشنامه حرفه‌ای نیاز دارید
          </h2>
          <p className="text-xs sm:text-sm text-ink-subtle dark:text-gray-300 max-w-2xl mx-auto">
            ابزاری ساده برای شما، تجربه‌ای فوق‌العاده لذت‌بخش برای کاربر؛ همه چیز بر اساس نیاز واقعی طراحی شده است.
          </p>
        </div>

        {/* گرید ویژگی‌ها با استیکرکارت رُکاد */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <StickerCard
                key={item.id}
                theme="white"
                className="p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 flex items-center justify-center ${item.iconColor} shadow-[1.5px_1.5px_0_#202A5A] dark:shadow-[1.5px_1.5px_0_#59BBAF]`}>
                      <Icon size={20} />
                    </div>
                    <Badge color={item.badgeColor}>
                      {item.badge}
                    </Badge>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-sec dark:text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-ink-subtle dark:text-gray-400 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t-[1.5px] border-gray-100 dark:border-[#242F42] flex items-center gap-1 text-xs font-bold text-primary">
                  <CheckCircle size={14} />
                  <span>فعال و در دسترس</span>
                </div>
              </StickerCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
