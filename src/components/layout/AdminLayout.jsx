import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { useToast } from "../ui/Toast";
import { isValidIranPhone, normalizeIranPhone } from "../../lib/validators";
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
} from "lucide-react";
import NotificationBell from "../ui/NotificationBell";
import { faNum } from "../../lib/utils";

export default function AdminLayout() {
  const { user, profile, loading, logout, isOwner, updateProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [promptPhone, setPromptPhone] = useState("");
  const [phoneError, setPhoneError] = useState(null);
  const [savingPhone, setSavingPhone] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-lavender">
        <Spinner label="چک کردن لاگین..." />
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
        { to: "/admin/support", label: "تیکت‌های پشتیبانی", icon: Headphones, end: false },
        { to: "/admin/superadmin", label: "سوپرادمین (God)", icon: Shield, end: false },
        { to: "/admin/profile", label: "پروفایل", icon: User, end: false },
      ]
    : [
        { to: "/admin/forms", label: "فرم‌های من", icon: FileText, end: false },
        { to: "/admin/embed", label: "اشتراک و امبد", icon: Share2, end: false },
        { to: "/admin/telegram", label: "اتصال به تلگرام", icon: Bot, end: false },
        { to: "/admin/support", label: "پشتیبانی", icon: Headphones, end: false },
        { to: "/admin/profile", label: "پروفایل و سهمیه", icon: User, end: false },
      ];

  const isSuperAdmin = owner || profile?.is_owner;
  const needsPhone = Boolean(!isSuperAdmin && profile && !profile.phone);

  async function handleSavePhone(e) {
    e.preventDefault();
    setPhoneError(null);
    const cleanPhone = normalizeIranPhone(promptPhone);
    if (!cleanPhone) {
      setPhoneError("لطفاً شماره موبایل خود را وارد کنید.");
      return;
    }
    if (!isValidIranPhone(cleanPhone)) {
      setPhoneError("شماره موبایل نامعتبر است. باید ۱۱ رقم و با ۰۹ شروع شود (مثال: ۰۹۱۲۳۴۵۶۷۸۹).");
      return;
    }

    setSavingPhone(true);
    try {
      await updateProfile({ phone: cleanPhone });
      toast.success("شماره موبایل با موفقیت ثبت شد.");
    } catch (err) {
      setPhoneError(err.message || "خطا در ذخیره شماره موبایل. لطفاً دوباره تلاش کنید.");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="h-screen bg-bg-lavender flex flex-col md:flex-row overflow-hidden">
      {/* ─── سایدبار دسکتاپ — ثابت در سمت راست ─── */}
      <aside className="hidden md:flex bg-navy text-white md:w-60 shrink-0 md:h-screen flex-col overflow-y-auto z-20">
        {/* هدر برند */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/10">
          <span className="inline-flex items-baseline gap-0.5 text-base lg:text-lg font-black rotate-[-2deg] select-none">
            <span>پرس</span>
            <span className="text-teal">کاد</span>
          </span>
          <span className="text-[0.65rem] lg:text-[0.7rem] font-bold bg-teal/25 text-teal rounded-pill-sm px-2 py-0.5">
            {owner ? "مدیریت کل 👑" : "پنل کاربری"}
          </span>
        </div>

        {/* سهمیه ساخت فرم برای کاربر عادی */}
        {!owner && profile && (
          <div className="mx-2 mt-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <div className="flex items-center justify-between text-white/70 font-bold">
              <span>سهمیه ساخت فرم:</span>
              <span className="text-teal font-extrabold">{faNum(profile.max_forms ?? 5)} فرم مجاز</span>
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
                 text-[0.78rem] lg:text-sm font-bold transition-colors ${
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
            <div className="text-[0.7rem] font-bold text-white/90 truncate">
              {profile?.full_name || user.email?.split("@")[0]}
            </div>
            <div className="text-[0.6rem] font-medium text-white/40 truncate" dir="ltr">
              {user.email}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="!text-white/80 hover:!text-white !border-white/20 text-[0.75rem] w-full"
            onClick={handleLogout}
          >
            <LogOut size={13} className="ml-1" /> خروج
          </Button>
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
        className={`fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-navy text-white z-[9991] flex flex-col shadow-2xl transition-transform duration-300 ease-out md:hidden ${
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
            <span className="text-[0.65rem] font-bold bg-teal/25 text-teal rounded-pill-sm px-2 py-0.5">
              {owner ? "مدیریت کل 👑" : "پنل کاربری"}
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
              <span>سهمیه ساخت فرم:</span>
              <span className="text-teal font-extrabold">{faNum(profile.max_forms ?? 5)} فرم مجاز</span>
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

        {/* فوتر منوی موبایل */}
        <div className="p-3.5 border-t border-white/10 flex flex-col gap-2 shrink-0 bg-navy">
          <div className="text-center w-full min-w-0">
            <div className="text-xs font-bold text-white/90 truncate">
              {profile?.full_name || user.email?.split("@")[0]}
            </div>
            <div className="text-[0.65rem] font-medium text-white/40 truncate" dir="ltr">
              {user.email}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="!text-white/80 hover:!text-white !border-white/20 text-xs w-full justify-center"
            onClick={() => {
              setMobileNavOpen(false);
              handleLogout();
            }}
          >
            <LogOut size={14} className="ml-1" /> خروج از حساب
          </Button>
        </div>
      </aside>

      {/* بخش اصلی: تاپ‌بار بالا + محتوا */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* هدر بالای صفحه — محل قرارگیری همبرگر منو در موبایل، نوتیفیکیشن‌ها و مشخصات سریع */}
        <header className="bg-white/90 backdrop-blur-md border-b border-navy/10 px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0 z-20 shadow-xs">
          {/* سمت راست: دکمه همبرگر در موبایل + مشخصات یا لوگو */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* دکمه همبرگر اختصاصی در موبایل */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-xl bg-navy/5 hover:bg-navy/10 text-navy border border-navy/10 active:scale-95 transition-all flex items-center justify-center shrink-0"
              title="باز کردن منو"
              aria-label="منوی اصلی"
            >
              <Menu size={20} />
            </button>

            {/* لوگو در موبایل */}
            <div className="md:hidden flex items-center gap-1">
              <span className="text-base font-black text-navy rotate-[-2deg] select-none">
                پرس<span className="text-teal">کاد</span>
              </span>
            </div>

            {/* مشخصات کاربر در دسکتاپ */}
            <div className="hidden md:flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal/10 text-teal flex items-center justify-center font-black text-sm shrink-0 border border-teal/20">
                {profile?.full_name ? profile.full_name.charAt(0) : "👤"}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-navy truncate flex items-center gap-2">
                  <span>{profile?.full_name || user.email?.split("@")[0]}</span>
                  {owner ? (
                    <span className="text-[0.65rem] font-bold bg-teal/20 text-teal px-1.5 py-0.5 rounded-md">
                      مدیریت کل
                    </span>
                  ) : null}
                </div>
                <div className="text-[0.65rem] sm:text-xs text-ink/40 font-medium truncate flex items-center gap-1.5">
                  <span>{user.email}</span>
                  {!owner && profile?.max_forms && (
                    <>
                      <span>•</span>
                      <span className="text-teal font-bold">
                        {faNum(profile.max_forms)} فرم مجاز
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* سمت چپ: دکمه زنگوله نوتیفیکیشن و دسترسی سریع */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* زنگوله اعلان‌ها در بالا */}
            <NotificationBell />

            {/* دسترسی سریع به پشتیبانی در دسکتاپ */}
            <NavLink
              to="/admin/support"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy/5 hover:bg-navy/10 text-navy text-xs font-bold transition-all border border-navy/10"
              title="پشتیبانی و تیکت‌ها"
            >
              <Headphones size={14} className="text-teal" />
              <span>پشتیبانی</span>
            </NavLink>
          </div>
        </header>

        {/* محتوا — قابل اسکرول */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* مودال الزام ثبت شماره موبایل برای کاربران قبلی بدون شماره */}
      <Modal
        open={needsPhone}
        title="📱 تکمیل شماره تلفن همراه"
        closable={false}
      >
        <form onSubmit={handleSavePhone} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed">
            کاربر گرامی، جهت امنیت حساب کاربری و دریافت اعلان‌های مهم، ثبت شماره موبایل برای تمامی کاربران <strong>الزامی</strong> است. لطفاً شماره موبایل خود را وارد و ثبت نمایید.
          </div>

          <label className="flex flex-col gap-1 text-right">
            <span className="text-xs sm:text-sm font-extrabold text-navy">
              شماره تلفن همراه <span className="text-red-500">*</span>
            </span>
            <input
              type="tel"
              dir="ltr"
              required
              autoFocus
              value={promptPhone}
              onChange={(e) => {
                setPromptPhone(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
              className="w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink text-left focus:outline-none transition-all text-sm"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            />
            {phoneError && (
              <span className="text-xs font-bold text-red-600 mt-1">
                {phoneError}
              </span>
            )}
          </label>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full sm:flex-1 justify-center"
              disabled={savingPhone}
            >
              {savingPhone ? "در حال ثبت شماره..." : "ثبت شماره و ادامه"}
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
