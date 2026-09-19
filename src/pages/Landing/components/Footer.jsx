import React from "react";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-slate-100 dark:bg-[#080C14] border-t border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-[#94A3B8] pt-16 pb-12 relative z-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-200 dark:border-[#1E293B]/80">
          {/* ستون برند (۲ ستونه) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2DD4BF] to-[#38BDF8] p-[1.5px]">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <span className="text-[#2DD4BF] font-black text-xl">پ</span>
                </div>
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white">پرس‌کاد</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed max-w-sm">
              پلتفرم فارسی ساخت فرم، آزمون و پرسشنامه‌های آنلاین؛ با منطق شرطی هوشمند، داشبورد تحلیلی زنده و خروجی استاندارد اکسل بدون به‌هم‌ریختگی فارسی.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] text-[11px] font-bold text-emerald-600 dark:text-[#10B981]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                وضعیت کلیه سرویس‌ها: ۱۰۰٪ آنلاین
              </span>
            </div>
          </div>

          {/* ستون محصول */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">محصول</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#features" className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors">
                  ویژگی‌ها و قابلیت‌ها
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors">
                  قیمت‌گذاری و پلن‌ها
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors">
                  پیش‌نمایش سازنده فرم
                </a>
              </li>
              <li>
                <Link to="/admin/web-service" className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors">
                  مستندات API و وب‌سرویس
                </Link>
              </li>
            </ul>
          </div>

          {/* ستون شرکت و ارتباط */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">شرکت</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <span className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors cursor-pointer">
                  درباره پرسکاد
                </span>
              </li>
              <li>
                <span className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors cursor-pointer">
                  وبلاگ آموزشی
                </span>
              </li>
              <li>
                <Link to="/admin/support" className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors">
                  تماس با ما
                </Link>
              </li>
            </ul>
          </div>

          {/* ستون پشتیبانی */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">پشتیبانی</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#faq" className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors">
                  مرکز راهنما و سوالات
                </a>
              </li>
              <li>
                <Link to="/admin/support" className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors">
                  ارسال تیکت پشتیبانی
                </Link>
              </li>
              <li>
                <span className="hover:text-teal-600 dark:hover:text-[#2DD4BF] transition-colors cursor-pointer">
                  بات تلگرام پرسکاد
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* نوار کپی‌رایت پایین صفحه */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span>© کلیه حقوق مادی و معنوی برای پلتفرم «پرس‌کاد» محفوظ است.</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="hover:text-teal-600 dark:hover:text-white cursor-pointer transition-colors">شرایط استفاده</span>
            <span className="hover:text-teal-600 dark:hover:text-white cursor-pointer transition-colors">حریم خصوصی</span>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-xl bg-white dark:bg-[#131B2E] hover:bg-slate-200 dark:hover:bg-[#1B253D] text-slate-800 dark:text-white border border-slate-200 dark:border-[#1E293B] transition-colors flex items-center gap-1 shadow-sm"
              title="بازگشت به بالای صفحه"
              aria-label="بازگشت به بالا"
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
