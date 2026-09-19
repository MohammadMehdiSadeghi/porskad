import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowLeft, Sun, Moon } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";

export default function Navbar({ onOpenDemo }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "ویژگی‌ها", href: "#features" },
    { label: "پیش‌نمایش فرم", href: "#showcase" },
    { label: "تحلیل و آمار", href: "#analytics" },
    { label: "قیمت‌گذاری", href: "#pricing" },
    { label: "سوالات متداول", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/85 dark:bg-[#0B0F19]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-[#1E293B]/80 shadow-md dark:shadow-2xl py-3"
          : "bg-white/50 dark:bg-[#0B0F19]/40 backdrop-blur-md border-b border-slate-200/50 dark:border-[#1E293B]/40 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* لوگو و نام برند */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2DD4BF] via-[#14B8A6] to-[#38BDF8] p-[1.5px] shadow-md shadow-teal-500/20 transition-transform duration-300 group-hover:scale-105">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <span className="text-[#2DD4BF] font-black text-xl tracking-tighter">پ</span>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">پرس‌کاد</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-[#2DD4BF] border border-teal-500/20">
                    SaaS v2
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium hidden sm:block">
                  پلتفرم فرم‌ساز و نظرسنجی آنلاین
                </span>
              </div>
            </Link>

            {/* منوی دسکتاپ */}
            <nav className="hidden lg:flex items-center gap-1 mr-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-[#94A3B8] hover:text-teal-600 dark:hover:text-[#2DD4BF] hover:bg-slate-100 dark:hover:bg-[#131B2E]/80 rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* دکمه‌های اکشن */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* دکمه تم */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#131B2E]/60 hover:bg-slate-200 dark:hover:bg-[#1B253D] border border-slate-200 dark:border-[#1E293B] transition-all"
              title={isDark ? "تغییر به تم روشن" : "تغییر به تم تاریک"}
              aria-label="تغییر تم"
            >
              {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-700" />}
            </button>

            {user ? (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-950 bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-200"
              >
                <span>ورود به پنل کاربری</span>
                <ArrowLeft size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/admin/login"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-[#F8FAFC] hover:text-teal-600 dark:hover:text-[#2DD4BF] bg-slate-100 dark:bg-[#131B2E]/70 hover:bg-slate-200 dark:hover:bg-[#1B253D] border border-slate-200 dark:border-[#1E293B] rounded-xl transition-all"
                >
                  <span>ورود</span>
                </Link>

                <Link
                  to="/register"
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 text-sm font-black text-slate-950 bg-gradient-to-r from-[#2DD4BF] via-[#2dd4bf] to-[#38BDF8] rounded-xl shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <span>شروع رایگان</span>
                  <ArrowLeft size={16} />
                </Link>
              </>
            )}

            {/* دکمه منوی موبایل */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] lg:hidden"
              aria-label="منو"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* منوی موبایل بازشونده */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-2xl border-b border-slate-200 dark:border-[#1E293B] px-4 py-5 shadow-2xl transition-all animate-fadeIn">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-[#94A3B8] hover:text-teal-600 dark:hover:text-[#2DD4BF] hover:bg-slate-100 dark:hover:bg-[#131B2E] rounded-xl transition-colors"
              >
                {link.label}
              </a>
            ))}
            <hr className="border-slate-200 dark:border-[#1E293B] my-2" />
            <div className="flex flex-col gap-2 pt-1">
              {!user ? (
                <>
                  <Link
                    to="/admin/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-800 dark:text-[#F8FAFC] bg-slate-100 dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] rounded-xl"
                  >
                    ورود به حساب کاربری
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-black text-slate-950 bg-[#2DD4BF] rounded-xl shadow-lg shadow-teal-500/20"
                  >
                    شروع رایگان (ساخت اولین فرم)
                  </Link>
                </>
              ) : (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-bold text-slate-950 bg-[#2DD4BF] rounded-xl"
                >
                  ورود به پنل کاربری
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
