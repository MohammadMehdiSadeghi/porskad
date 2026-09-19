import React from "react";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import Logo from "../../../components/ui/Logo";
import Badge from "../../../components/ui/Badge";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-white dark:bg-[#080C14] border-t-2 border-[#202A5A]/15 dark:border-[#59BBAF]/20 text-slate-600 dark:text-slate-400 pt-16 pb-12 relative z-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b-2 border-[#202A5A]/10 dark:border-white/10">
          {/* ستون برند (۲ ستونه) */}
          <div className="lg:col-span-2 space-y-4">
            <Logo size="lg" linkTo="/" subtitle="سامانه هوشمند فرم‌ساز و آزمون‌ساز" />

            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm pt-2">
              پلتفرم فارسی ساخت فرم، آزمون و پرسشنامه‌های آنلاین؛ با منطق شرطی هوشمند، داشبورد تحلیلی زنده و خروجی استاندارد اکسل بدون به‌هم‌ریختگی فارسی.
            </p>

            <div className="pt-2">
              <Badge theme="teal" size="sm" pulse>
                وضعیت کلیه سرویس‌ها: ۱۰۰٪ آنلاین
              </Badge>
            </div>
          </div>

          {/* ستون امکانات محصول */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#202A5A] dark:text-white uppercase tracking-wider">امکانات محصول</h4>
            <ul className="space-y-2.5 text-xs font-bold">
              <li>
                <a href="#features" className="hover:text-[#59BBAF] transition-colors">
                  ویژگی‌ها و قابلیت‌ها
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-[#59BBAF] transition-colors">
                  پیش‌نمایش سازنده فرم
                </a>
              </li>
              <li>
                <a href="#analytics" className="hover:text-[#59BBAF] transition-colors">
                  تحلیل زنده و خروجی اکسل
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#59BBAF] transition-colors">
                  قیمت‌گذاری و پلن‌ها
                </a>
              </li>
            </ul>
          </div>

          {/* ستون مستندات و توسعه */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#202A5A] dark:text-white uppercase tracking-wider">مستندات و توسعه</h4>
            <ul className="space-y-2.5 text-xs font-bold">
              <li>
                <Link to="/admin/web-service" className="hover:text-[#59BBAF] transition-colors">
                  مستندات API و وب‌سرویس
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#59BBAF] transition-colors">
                  سوالات متداول
                </a>
              </li>
              <li>
                <Link to="/admin/support" className="hover:text-[#59BBAF] transition-colors">
                  پشتیبانی و تیکتینگ
                </Link>
              </li>
            </ul>
          </div>

          {/* ستون دسترسی سریع */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#202A5A] dark:text-white uppercase tracking-wider">دسترسی سریع</h4>
            <ul className="space-y-2.5 text-xs font-bold">
              <li>
                <Link to="/register" className="hover:text-[#59BBAF] transition-colors">
                  ثبت‌نام و شروع رایگان
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-[#59BBAF] transition-colors">
                  ورود به حساب کاربری
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-[#59BBAF] transition-colors">
                  داشبورد مدیریت فرم‌ها
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* نوار کپی‌رایت پایین صفحه */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>© کلیه حقوق مادی و معنوی برای پلتفرم «پرس‌کاد» محفوظ است.</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="hover:text-[#59BBAF] cursor-pointer transition-colors">شرایط استفاده</span>
            <span className="hover:text-[#59BBAF] cursor-pointer transition-colors">حریم خصوصی</span>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#131B2E] hover:bg-[#59BBAF] hover:text-slate-950 text-slate-800 dark:text-white border-2 border-[#202A5A]/20 dark:border-[#59BBAF]/30 transition-colors flex items-center gap-1 shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF] active:translate-x-[1px] active:translate-y-[1px]"
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
