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
} from "lucide-react";
import NotificationBell from "../ui/NotificationBell";
import TabGate from "./TabGate";
import ThemeToggle from "../ui/ThemeToggle";
import { faNum } from "../../lib/utils";
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
    <div className="h-screen bg-bg-lavender dark:bg-[#0B0F19] text-ink dark:text-slate-100 flex flex-col md:flex-row overflow-hidden transition-colors duration-200">
      {/* ─── سایدبار دسکتاپ — ثابت در سمت راست ─── */}
      <aside className="hidden md:flex bg-navy dark:bg-[#0E1526] text-white md:w-60 shrink-0 md:h-screen flex-col overflow-y-auto z-20 border-l border-transparent dark:border-slate-800/80">
        {/* هدر برند */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/10">
          <span className="inline-flex items-baseline gap-0.5 text-base lg:text-lg font-black rotate-[-2deg] select-none">
            <span>پرس</span>
            <span className="text-teal">کاد</span>
          </span>
          <span className="text-xs lg:text-xs font-bold bg-teal/25 text-teal rounded-pill-sm px-2 py-0.5 flex items-center gap-1">
            {owner ? (
              <>
                <Crown size={11} className="text-teal" />
                <span>مدیریت کل</span>
              </>
            ) : (
              "پنل کاربری"
            )}
          </span>
        </div>

        {/* سهمیه ساخت فرم برای کاربر عادی */}
        {!owner && profile && (
          <div className="mx-2 mt-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <div className="flex items-center justify-between text-white/70 font-bold">
              <span>سهمیه فرم:</span>
              <span className="text-teal font-extrabold" style={{ fontFamily: '"IRANSansX", Tahoma, sans-serif' }}>
                {(profile.max_forms >= 999999 || profile.plan === "unlimited")
                  ? "نامحدود ✨"
                  : `${faNum(profile.max_forms ?? 5)} فرم مجاز`}
              </span>
            </div>
          </div>
        )}


        {/* منو عمودی دسکتاپ */}
        <nav className="flex flex-col gap-1 px-1.5 lg:px-2 py-2 overflow-y-auto flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 whitespace-nowrap shrink-0 rounded-pill-sm px-3 py-2.5
                 text-xs lg:text-sm font-bold transition-colors ${
                   isActive
                     ? "bg-teal text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.25)]"
                     : "text-white/70 hover:text-white hover:bg-white/10"
                 }`
              }
            >
              <item.icon size={16} className="shrink-0" />
              <span className="shrink-0">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* فوتر سایدبار دسکتاپ */}
        <div className="mt-auto px-2 py-2.5 border-t border-white/10 flex flex-col items-center gap-2">
          <div className="text-center w-full min-w-0">
            <div className="text-xs font-bold text-white/90 truncate">
              {profile?.full_name || user.email?.split("@")[0]}
            </div>
            <div className="text-xs font-medium text-white/40 truncate" dir="ltr">
              {user.email}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-pill-sm border border-white/15 bg-white/5 hover:bg-rose-500/20 hover:border-rose-400/40 text-white/80 hover:text-rose-200 text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98]"
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
        className={`fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-navy dark:bg-[#0E1526] text-white z-[9991] flex flex-col shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          mobileNavOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* هدر منوی موبایل */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-baseline gap-0.5 text-lg font-black rotate-[-2deg] select-none">
              <span>پرس</span>
              <span className="text-teal">کاد</span>
            </span>
            <span className="text-xs font-bold bg-teal/25 text-teal rounded-pill-sm px-2 py-0.5 flex items-center gap-1">
              {owner ? (
                <>
                  <Crown size={11} className="text-teal" />
                  <span>مدیریت کل</span>
                </>
              ) : (
                "پنل کاربری"
              )}
            </span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
            title="بستن منو"
          >
            <X size={18} />
          </button>
        </div>

        {/* سهمیه کاربر عادی در موبایل */}
        {!owner && profile && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs shrink-0">
            <div className="flex items-center justify-between text-white/70 font-bold">
              <span>سهمیه فرم:</span>
              <span className="text-teal font-extrabold">
                {(profile.max_forms >= 999999 || profile.plan === "unlimited")
                  ? "نامحدود ✨"
                  : `${faNum(profile.max_forms ?? 5)} فرم مجاز`}
              </span>
            </div>
          </div>
        )}

        {/* لیست لینک‌های منو در موبایل */}
        <nav className="flex flex-col gap-1 px-3 py-3 overflow-y-auto flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-teal text-white shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`
              }
            >
              <item.icon size={18} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* فوتر منوی موبایل همراه با تغییر تم */}
        <div className="p-3.5 border-t border-white/10 flex flex-col gap-3 shrink-0 bg-navy dark:bg-[#0E1526]">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-white/70 font-bold">تم پنل:</span>
            <ThemeToggle />
          </div>
          <div className="text-center w-full min-w-0">
            <div className="text-xs font-bold text-white/90 truncate">
              {profile?.full_name || user.email?.split("@")[0]}
            </div>
            <div className="text-xs font-medium text-white/40 truncate" dir="ltr">
              {user.email}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileNavOpen(false);
              handleLogout();
            }}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-pill-sm border border-white/15 bg-white/5 hover:bg-rose-500/20 hover:border-rose-400/40 text-white/80 hover:text-rose-200 text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <LogOut size={14} className="shrink-0" />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      {/* بخش اصلی: تاپ‌بار بالا + محتوا */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* هدر بالای صفحه — محل قرارگیری همبرگر منو در موبایل، نوتیفیکیشن‌ها، تم و مشخصات سریع */}
        <header className="bg-white/90 dark:bg-[#131B2E]/90 backdrop-blur-md border-b border-navy/10 dark:border-slate-800 px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0 z-20 shadow-xs transition-colors duration-200">
          {/* سمت راست: دکمه همبرگر در موبایل + مشخصات یا لوگو */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* دکمه همبرگر اختصاصی در موبایل */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-xl bg-navy/5 dark:bg-white/5 hover:bg-navy/10 dark:hover:bg-white/10 text-navy dark:text-white border border-navy/10 dark:border-white/10 active:scale-95 transition-all flex items-center justify-center shrink-0"
              title="باز کردن منو"
              aria-label="منوی اصلی"
            >
              <Menu size={20} />
            </button>

            {/* لوگو در موبایل */}
            <div className="md:hidden flex items-center gap-1">
              <span className="text-base font-black text-navy dark:text-white rotate-[-2deg] select-none">
                پرس‌<span className="text-teal">کاد</span>
              </span>
            </div>

            {/* مشخصات کاربر در دسکتاپ */}
            <div className="hidden md:flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal/10 dark:bg-teal/20 text-teal flex items-center justify-center font-black text-sm shrink-0 border border-teal/20">
                {profile?.full_name ? profile.full_name.charAt(0) : <User size={15} />}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-navy dark:text-white truncate flex items-center gap-2">
                  <span>{profile?.full_name || user.email?.split("@")[0]}</span>
                  {owner ? (
                    <span className="text-xs font-bold bg-teal/20 text-teal px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Crown size={10} />
                      <span>مدیریت کل</span>
                    </span>
                  ) : null}
                </div>
                <div className="text-xs sm:text-xs text-ink/40 dark:text-slate-400 font-medium truncate flex items-center gap-1.5">
                  <span>{user.email}</span>
                  {!owner && profile?.max_forms && (
                    <>
                      <span>•</span>
                      <span className="text-teal font-bold">
                        {(profile.max_forms >= 999999 || profile.plan === "unlimited")
                          ? "پلن نامحدود ✨"
                          : `${faNum(profile.max_forms)} فرم مجاز`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* سمت چپ: تغییر تم، زنگوله نوتیفیکیشن و دسترسی سریع */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* انتخابگر تم */}
            <ThemeToggle className="hidden sm:inline-flex" />
            <ThemeToggle compact className="sm:hidden" />

            {/* زنگوله اعلان‌ها در بالا */}
            <NotificationBell />

            {/* دسترسی سریع به پشتیبانی در دسکتاپ */}
            <NavLink
              to="/admin/support"
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy/5 dark:bg-white/5 hover:bg-navy/10 dark:hover:bg-white/10 text-navy dark:text-slate-200 text-xs font-bold transition-all border border-navy/10 dark:border-white/10 ${owner || tabsCfg.support?.state !== "disabled" ? "" : "hidden"}`}
              title="پشتیبانی و تیکت‌ها"
            >
              <Headphones size={14} className="text-teal" />
              <span>پشتیبانی</span>
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
