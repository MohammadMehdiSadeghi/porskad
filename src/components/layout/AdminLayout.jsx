import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";
import { DashboardSkeleton } from "../ui/Skeleton";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { useToast } from "../ui/Toast";
import { isValidIranPhone, normalizeIranPhone } from "../../lib/validators";
import { supabase } from "../../lib/supabaseClient";
import PasswordToggle from "../ui/PasswordToggle";
import {
  LayoutDashboard,
  FileText,
  Share2,
  MessageSquare,
  Bot,
  Users,
  User,
  LogOut,
  Shield,
  Headphones,
  Phone,
  Menu,
  X,
  Settings,
  Crown,
  Code2,
  ChevronLeft,
  Plus,
  Calendar,
} from "lucide-react";
import NotificationBell from "../ui/NotificationBell";
import TabGate from "./TabGate";
import ThemeToggle from "../ui/ThemeToggle";
import { faNum, formatToJalali } from "../../lib/utils";
import {
  useUserTabsConfig,
  loadUserTabsConfigFromDb,
  TAB_STATE_DISABLED,
} from "../../lib/userTabs";


export default function AdminLayout() {
  const { user, profile, loading, logout, isOwner, updateProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const location = useLocation();
  const tabsCfg = useUserTabsConfig();

  // تازه‌سازی وضعیت تب‌ها از سرور در ورود به پنل و هر جابه‌جایی مسیر
  useEffect(() => {
    loadUserTabsConfigFromDb().catch(() => {});
  }, [location.pathname]);

  const [promptPhone, setPromptPhone] = useState("");
  const [promptFullName, setPromptFullName] = useState("");
  const [promptPassword, setPromptPassword] = useState("");
  const [promptConfirmPassword, setPromptConfirmPassword] = useState("");
  const [showPromptPassword, setShowPromptPassword] = useState(false);
  const [showPromptConfirmPassword, setShowPromptConfirmPassword] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [savingPhone, setSavingPhone] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name) {
      setPromptFullName(profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "");
    }
  }, [profile, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-neutral dark:bg-[#0B0F19] p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const owner = isOwner();

  // گزینه‌های منو برای ادمین کل در مقابل کاربر عادی
  const navItems = owner
    ? [
        { to: "/admin", label: "داشبورد کل", icon: LayoutDashboard, end: true },
        { to: "/admin/forms", label: "فرم‌ها", icon: FileText, end: false },
        { to: "/admin/embed", label: "اشتراک‌گذاری", icon: Share2, end: false },
        { to: "/admin/sms", label: "پنل پیامک", icon: MessageSquare, end: false },
        { to: "/admin/telegram", label: "بات تلگرام", icon: Bot, end: false },
        { to: "/admin/managers", label: "مدیریت کاربران", icon: Users, end: false },
        { to: "/admin/settings", label: "تنظیمات سامانه", icon: Settings, end: false },
        { to: "/admin/support", label: "تیکت‌های پشتیبانی", icon: Headphones, end: false },
        { to: "/admin/superadmin", label: "سوپرادمین (God)", icon: Shield, end: false },
        { to: "/admin/web-service", label: "مستندات وب سرویس", icon: Code2, end: false },
        { to: "/admin/profile", label: "پروفایل", icon: User, end: false },
      ]
    : [
        { to: "/admin", label: "داشبورد کل", icon: LayoutDashboard, end: true },
        { to: "/admin/forms", label: "فرم‌های من", icon: FileText, end: false, tabId: "forms" },
        { to: "/admin/embed", label: "اشتراک‌گذاری", icon: Share2, end: false, tabId: "embed" },
        { to: "/admin/sms", label: "پنل پیامک", icon: MessageSquare, end: false, tabId: "sms" },
        { to: "/admin/web-service", label: "مستندات وب سرویس", icon: Code2, end: false, tabId: "webservice" },
        { to: "/admin/telegram", label: "اتصال به تلگرام", icon: Bot, end: false, tabId: "telegram" },
        { to: "/admin/support", label: "پشتیبانی", icon: Headphones, end: false, tabId: "support" },
        { to: "/admin/subscriptions", label: "اشتراک‌ها", icon: Crown, end: false, tabId: "subscriptions" },
        { to: "/admin/profile", label: "پروفایل و سهمیه", icon: User, end: false, tabId: "profile" },
      ].filter((item) => !item.tabId || tabsCfg[item.tabId]?.state !== TAB_STATE_DISABLED);


  const isSuperAdmin = owner || profile?.is_owner;
  const needsPhone = Boolean(!isSuperAdmin && profile && !profile.phone);

  // تبِ متناظر با مسیر فعلی (برای گیت «غیرفعال/بروزرسانی»)
  const activeTabId = (() => {
    const path = location.pathname;
    if (path.startsWith("/admin/forms")) return "forms";
    if (path.startsWith("/admin/embed")) return "embed";
    if (path.startsWith("/admin/sms")) return "sms";
    if (path.startsWith("/admin/web-service")) return "webservice";
    if (path.startsWith("/admin/telegram")) return "telegram";
    if (path.startsWith("/admin/support")) return "support";
    if (path.startsWith("/admin/subscriptions")) return "subscriptions";
    if (path.startsWith("/admin/profile")) return "profile";
    return null;
  })();

  async function handleSavePhone(e) {
    e.preventDefault();
    setPhoneError(null);

    if (!promptFullName.trim()) {
      setPhoneError("لطفاً نام و نام خانوادگی خود را وارد کنید.");
      return;
    }

    const cleanPhone = normalizeIranPhone(promptPhone);
    if (!cleanPhone) {
      setPhoneError("لطفاً شماره موبایل خود را وارد کنید.");
      return;
    }
    if (!isValidIranPhone(cleanPhone)) {
      setPhoneError("شماره موبایل نامعتبر است. باید ۱۱ رقم و با ۰۹ شروع شود (مثال: ۰۹۱۲۳۴۵۶۷۸۹).");
      return;
    }

    if (!promptPassword || promptPassword.length < 6) {
      setPhoneError("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (promptPassword !== promptConfirmPassword) {
      setPhoneError("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }

    setSavingPhone(true);
    try {
      // بررسی عدم تکراری بودن شماره موبایل در دیتابیس
      const { data: dup } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", cleanPhone)
        .neq("id", user.id)
        .maybeSingle();

      if (dup) {
        setPhoneError("این شماره موبایل قبلاً برای حساب دیگری ثبت شده است.");
        setSavingPhone(false);
        return;
      }

      // تنظیم رمز عبور و متاداده کاربر در Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({
        password: promptPassword,
        data: {
          full_name: promptFullName.trim(),
          phone: cleanPhone,
        },
      });
      if (authErr) {
        setPhoneError(authErr.message || "خطا در تنظیم رمز عبور.");
        setSavingPhone(false);
        return;
      }

      // ذخیره نام و شماره در جدول profiles
      await updateProfile({
        phone: cleanPhone,
        full_name: promptFullName.trim(),
      });

      toast.success("مشخصات حساب کاربری شما با موفقیت تکمیل شد.");
    } catch (err) {
      setPhoneError(err.message || "خطا در ذخیره اطلاعات. لطفاً دوباره تلاش کنید.");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] text-ink-normal dark:text-[#F1F5F9] flex flex-col md:flex-row overflow-hidden transition-colors duration-200">
      {/* ─── سایدبار دسکتاپ — آبی اصیل پرس‌کاد (سرمه‌ای / ناوی) ─── */}
      <aside className="hidden md:flex bg-navy dark:bg-[#0E1526] text-white w-72 shrink-0 md:h-screen flex-col overflow-y-auto z-20 border-l border-white/10 dark:border-slate-800/80">
        {/* هدر سایدبار */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/10 shrink-0">
          <div className="flex items-baseline gap-1 select-none">
            <span className="text-xl font-black text-white">پرس</span>
            <span className="text-xl font-black text-teal">کاد</span>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal/20 text-teal border border-teal/30 flex items-center gap-1">
            {owner ? (
              <>
                <Crown size={12} className="text-teal" />
                <span>مدیریت کل</span>
              </>
            ) : (
              "پنل کاربری"
            )}
          </span>
        </div>

        {/* سهمیه ساخت فرم برای کاربر عادی */}
        {!owner && profile && (
          <div className="mx-3 mt-3 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
            <div className="flex items-center justify-between text-white/80 font-bold">
              <span>سهمیه فرم:</span>
              <span className="text-teal font-black">
                {(profile.max_forms >= 999999 || profile.plan === "unlimited")
                  ? "نامحدود ✨"
                  : `${faNum(profile.max_forms ?? 5)} فرم مجاز`}
              </span>
            </div>
          </div>
        )}

        {/* منو عمودی دسکتاپ */}
        <nav className="flex flex-col gap-1.5 px-3 py-4 overflow-y-auto flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? "bg-teal text-white shadow-[2px_2px_0_rgba(0,0,0,0.3)] font-black"
                    : "text-white/75 hover:text-white hover:bg-white/10 border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <item.icon size={17} className={isActive ? "text-white shrink-0" : "text-white/60 shrink-0"} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isActive && <ChevronLeft size={15} className="text-white shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* فوتر سایدبار دسکتاپ */}
        <div className="mt-auto p-4 border-t border-white/10 flex flex-col gap-2.5 bg-black/15">
          <div className="text-right w-full min-w-0 px-1">
            <div className="text-xs font-bold text-white truncate">
              {profile?.full_name || user.email?.split("@")[0]}
            </div>
            <div className="text-[11px] font-medium text-white/50 truncate" dir="ltr">
              {user.email}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl border border-white/20 text-white/85 hover:text-white hover:bg-rose-500/20 hover:border-rose-400 transition-all cursor-pointer"
          >
            <LogOut size={13} className="shrink-0" />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      {/* ─── دراور کشویی منوی موبایل (Hamburger Drawer) ─── */}
      <div
        className={`fixed inset-0 z-[9990] bg-black/50 backdrop-blur-xs transition-opacity duration-300 md:hidden ${
          mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileNavOpen(false)}
      />

      <aside
        className={`fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-navy dark:bg-[#0E1526] text-white z-[9991] flex flex-col shadow-2xl transition-transform duration-300 ease-out md:hidden border-l border-white/10 ${
          mobileNavOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* هدر منوی موبایل */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-white">پرس</span>
            <span className="text-lg font-black text-teal">کاد</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal/20 text-teal border border-teal/30">
              {owner ? "مدیر کل" : "کاربر"}
            </span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
            title="بستن منو"
          >
            <X size={18} />
          </button>
        </div>

        {/* سهمیه در موبایل */}
        {!owner && profile && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs shrink-0">
            <div className="flex items-center justify-between text-white/80 font-bold">
              <span>سهمیه فرم:</span>
              <span className="text-teal font-black">
                {(profile.max_forms >= 999999 || profile.plan === "unlimited")
                  ? "نامحدود ✨"
                  : `${faNum(profile.max_forms ?? 5)} فرم مجاز`}
              </span>
            </div>
          </div>
        )}

        {/* لیست لینک‌های منو در موبایل */}
        <nav className="flex flex-col gap-1.5 px-3 py-3 overflow-y-auto flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-teal text-white shadow-[2px_2px_0_rgba(0,0,0,0.3)] font-black"
                    : "text-white/75 hover:text-white hover:bg-white/10 border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5">
                    <item.icon size={18} className={isActive ? "text-white shrink-0" : "text-white/60 shrink-0"} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronLeft size={16} className="text-white shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* فوتر منوی موبایل */}
        <div className="p-4 border-t border-white/10 flex flex-col gap-3 shrink-0 bg-black/15">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-white/70 font-bold">تم پنل:</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileNavOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl border border-white/20 text-white/85 hover:text-white hover:bg-rose-500/20 hover:border-rose-400 transition-all cursor-pointer"
          >
            <LogOut size={14} className="shrink-0" />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      {/* بخش اصلی: تاپ‌بار بالا + محتوا */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* هدر بالای صفحه (ROKAD Standards 7.9) */}
        <header className="h-16 sm:h-20 sticky top-0 z-40 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border-b border-[#EAEAEA] dark:border-gray-800 px-4 sm:px-6 flex items-center justify-between shrink-0 transition-colors duration-200">
          {/* سمت راست: دکمه همبرگر در موبایل + تاریخ زنده شمسی */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-sec dark:text-white border border-gray-200 dark:border-gray-700 transition-all flex items-center justify-center shrink-0"
              title="باز کردن منو"
              aria-label="منوی اصلی"
            >
              <Menu size={20} />
            </button>

            {/* تاریخ زنده شمسی (ROKAD Standards 7.9) */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gray-50 dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 text-xs font-bold text-ink-normal/80 dark:text-gray-300">
              <Calendar size={14} className="text-primary shrink-0" />
              <span>{formatToJalali(new Date(), { showMonthName: true, includeDayName: true })}</span>
            </div>
          </div>

          {/* سمت چپ: دکمه ثبت سریع فرم، انتخابگر تم، زنگوله اعلان و پروفایل */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={() => navigate("/admin/forms")}
              className="rokad-btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">فرم جدید</span>
            </button>

            <ThemeToggle />

            <NotificationBell />

            <NavLink
              to="/admin/profile"
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#151C28] hover:border-primary/40 transition-all"
              title="پروفایل کاربری"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                {profile?.full_name ? profile.full_name.charAt(0) : <User size={14} />}
              </div>
              <div className="hidden lg:block text-right">
                <div className="text-xs font-black text-sec dark:text-white truncate max-w-[110px]">
                  {profile?.full_name || user.email?.split("@")[0]}
                </div>
                <div className="text-[10.5px] text-ink-normal/50 dark:text-gray-400 truncate">
                  {owner ? "مدیر کل" : "کاربر سامانه"}
                </div>
              </div>
            </NavLink>
          </div>
        </header>

        {/* محتوا — قابل اسکرول */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 overflow-y-auto">
          {owner || !activeTabId ? (
            <Outlet />
          ) : (
            <TabGate tabId={activeTabId}>

              <Outlet />
            </TabGate>
          )}
        </main>
      </div>

      {/* مودال تکمیل مشخصات حساب کاربری (شماره، نام، رمز عبور و جیمیل) */}
      <Modal
        open={needsPhone}
        title="تکمیل مشخصات حساب کاربری"
        closable={false}
      >
        <form onSubmit={handleSavePhone} className="space-y-3.5">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 rounded-xl p-3 text-xs leading-relaxed">
            کاربر گرامی، حساب شما با موفقیت شناسایی شد. جهت امنیت و تکمیل ثبت‌نام، لطفاً نام، شماره موبایل و رمز عبور ورود خود را تعیین فرمایید.
          </div>

          {/* نمایش جیمیل تایید شده */}
          <div className="flex flex-col gap-1 text-right">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy dark:text-slate-200">
                ایمیل حساب کاربری
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                تایید شده
              </span>
            </div>
            <input
              type="text"
              dir="ltr"
              disabled
              value={user?.email || profile?.email || ""}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-ink/15 dark:border-slate-700 rounded-pill-md px-3.5 py-2 font-mono text-xs text-ink/70 dark:text-slate-400 text-left cursor-not-allowed"
            />
          </div>

          {/* نام و نام خانوادگی */}
          <label className="flex flex-col gap-1 text-right">
            <span className="text-xs font-bold text-navy dark:text-slate-200">
              نام و نام خانوادگی <span className="text-teal font-black">*</span>
            </span>
            <input
              type="text"
              required
              value={promptFullName}
              onChange={(e) => {
                setPromptFullName(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
              className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink dark:text-white focus:outline-none transition-all"
              placeholder="مثلاً: علی محمدی"
            />
          </label>

          {/* شماره تلفن همراه */}
          <label className="flex flex-col gap-1 text-right">
            <span className="text-xs font-bold text-navy dark:text-slate-200">
              شماره تلفن همراه <span className="text-teal font-black">*</span>
            </span>
            <input
              type="tel"
              dir="ltr"
              required
              value={promptPhone}
              onChange={(e) => {
                setPromptPhone(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
              className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink dark:text-white text-left focus:outline-none transition-all"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            />
          </label>

          {/* تعیین رمز عبور و تکرار آن */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1 text-right">
              <span className="text-xs font-bold text-navy dark:text-slate-200">
                رمز عبور <span className="text-teal font-black">*</span>
              </span>
              <div className="relative">
                <input
                  type={showPromptPassword ? "text" : "password"}
                  dir="ltr"
                  required
                  value={promptPassword}
                  onChange={(e) => {
                    setPromptPassword(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2 pl-9 text-xs sm:text-sm font-semibold text-ink dark:text-white text-left focus:outline-none transition-all"
                  placeholder="حداقل ۶ کاراکتر"
                  autoComplete="new-password"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <PasswordToggle
                    visible={showPromptPassword}
                    onToggle={() => setShowPromptPassword(!showPromptPassword)}
                    size={15}
                    ariaLabel="نمایش رمز"
                  />
                </div>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-right">
              <span className="text-xs font-bold text-navy dark:text-slate-200">
                تکرار رمز عبور <span className="text-teal font-black">*</span>
              </span>
              <div className="relative">
                <input
                  type={showPromptConfirmPassword ? "text" : "password"}
                  dir="ltr"
                  required
                  value={promptConfirmPassword}
                  onChange={(e) => {
                    setPromptConfirmPassword(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2 pl-9 text-xs sm:text-sm font-semibold text-ink dark:text-white text-left focus:outline-none transition-all"
                  placeholder="تکرار رمز"
                  autoComplete="new-password"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <PasswordToggle
                    visible={showPromptConfirmPassword}
                    onToggle={() => setShowPromptConfirmPassword(!showPromptConfirmPassword)}
                    size={15}
                    ariaLabel="نمایش تکرار رمز"
                  />
                </div>
              </div>
            </label>
          </div>

          {phoneError && (
            <div className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-pill-md p-2 text-right">
              {phoneError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full sm:flex-1 justify-center"
              disabled={savingPhone}
            >
              {savingPhone ? "در حال ثبت اطلاعات..." : "تکمیل ثبت‌نام و ورود"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto text-ink/60 hover:text-ink text-xs justify-center"
              onClick={handleLogout}
            >
              خروج از حساب
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
