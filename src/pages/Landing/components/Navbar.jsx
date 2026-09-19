import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowLeft, Play } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import Logo from "../../../components/ui/Logo";
import ThemeToggle from "../../../components/ui/ThemeToggle";

export default function Navbar({ onOpenDemo }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "ویژگی‌ها", href: "#features" },
    { label: "فرمساز ماژولار", href: "#showcase" },
    { label: "تحلیل و آمار", href: "#analytics" },
    { label: "قیمت‌گذاری", href: "#pricing" },
    { label: "سوالات متداول", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-b-[1.5px] border-gray-200 dark:border-[#242F42] shadow-sm py-2.5"
          : "bg-white/80 dark:bg-[#0B0F17]/80 backdrop-blur-sm border-b-[1.5px] border-gray-200/60 dark:border-[#242F42]/60 py-3.5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* لوگو و نام برند */}
          <div className="flex items-center gap-6">
            <Logo size="md" linked={true} />

            {/* منوی ناوبری دسکتاپ */}
            <nav className="hidden lg:flex items-center gap-1.5 mr-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-bold text-ink-subtle dark:text-gray-300 hover:text-sec dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#151C28] rounded-xl transition-all"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* دکمه‌های اکشن سمت چپ */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* دکمه تغییر تم استاندارد */}
            <ThemeToggle />

            {user ? (
              <Link
                to="/admin"
                className="flex items-center gap-2 bg-primary text-white font-bold py-2 px-4 rounded-xl border-[1.5px] border-ecosystem-dark shadow-[2px_2px_0_#1F413D] hover:shadow-[3px_3px_0_#1F413D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs sm:text-sm transition-all"
              >
                <span>ورود به پنل کاربری</span>
                <ArrowLeft size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/admin/login"
                  className="hidden sm:inline-flex items-center gap-1.5 bg-white dark:bg-[#151C28] text-sec dark:text-white border-[1.5px] border-gray-200 dark:border-[#242F42] font-bold py-2 px-3.5 rounded-xl shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-xs sm:text-sm transition-all"
                >
                  <span>ورود</span>
                </Link>

                <Link
                  to="/register"
                  className="flex items-center gap-2 bg-primary text-white font-black py-2 px-4 sm:px-5 rounded-xl border-[1.5px] border-ecosystem-dark shadow-[2.5px_2.5px_0_#1F413D] hover:shadow-[3px_3px_0_#1F413D] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none text-xs sm:text-sm transition-all"
                >
                  <span>شروع رایگان</span>
                  <ArrowLeft size={16} />
                </Link>
              </>
            )}

            {/* دکمه منوی موبایل */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-sec dark:text-white bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-[#242F42] shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF] lg:hidden"
              aria-label="منوی موبایل"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* منوی موبایل بازشونده */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-[#151C28] border-b-[1.5px] border-gray-200 dark:border-[#242F42] px-4 py-5 shadow-hard-lg transition-all animate-fadeIn">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 text-sm font-bold text-sec dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-[#1C2536] rounded-xl transition-colors"
              >
                {link.label}
              </a>
            ))}
            <hr className="border-gray-200 dark:border-[#242F42] my-2" />
            <div className="flex flex-col gap-2 pt-1">
              {!user ? (
                <>
                  <Link
                    to="/admin/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-bold text-sec dark:text-white bg-white dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-xl shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]"
                  >
                    ورود به حساب کاربری
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-black text-white bg-primary rounded-xl border-[1.5px] border-ecosystem-dark shadow-[2.5px_2.5px_0_#1F413D]"
                  >
                    شروع رایگان (ساخت اولین فرم)
                  </Link>
                </>
              ) : (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-bold text-white bg-primary rounded-xl border-[1.5px] border-ecosystem-dark shadow-[2.5px_2.5px_0_#1F413D]"
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
