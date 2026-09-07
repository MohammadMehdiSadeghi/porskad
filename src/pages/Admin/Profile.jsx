import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone, isValidEmail } from "../../lib/validators";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";
import SEO from "../../components/ui/SEO";
import { faNum } from "../../lib/utils";
import { Crown, Lock, Key, Mail, Eye, EyeOff } from "lucide-react";

export default function Profile() {
  const { user, profile, changePassword, updateProfile } = useAuth();
  const { push } = useToast();

  const currentEmail = user?.email || profile?.email || "";
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
    if (user?.email || profile?.email) {
      setEmail(user?.email || profile?.email || "");
    }
  }, [profile, user]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  async function handleSaveProfile() {
    if (!fullName.trim()) {
      push("نام نمی‌تواند خالی باشد", "error");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      push("ایمیل نمی‌تواند خالی باشد", "error");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      push("فرمت ایمیل نامعتبر است", "error");
      return;
    }

    const cleanPhone = phone ? normalizeIranPhone(phone) : "";
    if (phone && !isValidIranPhone(cleanPhone)) {
      push("شماره موبایل نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹)", "error");
      return;
    }

    setSavingProfile(true);
    try {
      const emailChanged = trimmedEmail.toLowerCase() !== currentEmail.toLowerCase();

      if (emailChanged) {
        // تغییر ایمیل در Supabase Auth
        const { error: authError } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (authError) {
          throw authError;
        }
      }

      // به‌روزرسانی پروفایل در دیتابیس
      await updateProfile({
        full_name: fullName.trim(),
        phone: cleanPhone || null,
        email: trimmedEmail,
      });

      if (emailChanged) {
        push("پروفایل به‌روزرسانی شد. در صورت نیاز لینک تایید به ایمیل جدید ارسال می‌شود.");
      } else {
        push("پروفایل با موفقیت به‌روزرسانی شد");
      }
    } catch (err) {
      push("خطا در ذخیره تغییرات: " + (err.message || "مشکلی رخ داد"), "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("رمز فعلی را وارد کنید.");
      return;
    }
    if (!newPassword) {
      setPasswordError("رمز جدید را وارد کنید.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("رمز جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("رمز جدید و تکرار آن یکسان نیستند.");
      return;
    }

    setSavingPassword(true);
    try {
      // ابتدا با رمز فعلی لاگین مجدد کن
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user?.email || profile?.email,
        password: currentPassword,
      });
      if (loginError) {
        setPasswordError("رمز فعلی اشتباه است.");
        return;
      }

      await changePassword(newPassword);
      push("رمز عبور تغییر کرد");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "تغییر رمز ناموفق بود.");
    } finally {
      setSavingPassword(false);
    }
  }

  const isProfileUnchanged =
    fullName === (profile?.full_name ?? "") &&
    phone === (profile?.phone ?? "") &&
    email.trim().toLowerCase() === currentEmail.toLowerCase();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {profile?.is_owner && (
        <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
          <Crown size={24} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">حساب صاحب اصلی سایت</p>
            <p className="text-xs text-amber-600">این حساب غیرقابل حذف و غیرفعال شدن است و به تمام بخش‌های سایت دسترسی کامل دارد.</p>
          </div>
        </div>
      )}
      <SEO
        title="پروفایل من"
        description="اطلاعات حساب کاربری و تنظیمات امنیتی — پرس‌کاد"
        url="/admin/profile"
        noIndex
      />
      <div>
        <h1 className="text-xl sm:text-3xl font-black text-navy">پروفایل من</h1>
        <p className="text-sm text-ink/50 mt-0.5">
          اطلاعات حساب کاربری و تنظیمات امنیتی
        </p>
      </div>

      {/* اطلاعات حساب */}
      <div className="-rotate-[0.3deg]">
        <StickerCard theme="navy" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-lg font-extrabold text-navy flex items-center gap-2">
              اطلاعات حساب
            </h2>

            {/* آواتار + ایمیل */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-teal rounded-full flex items-center justify-center text-white font-extrabold text-base rotate-[3deg]">
                {fullName?.[0]?.toUpperCase() ?? currentEmail?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div>
                <p className="font-bold text-navy">{fullName || "—"}</p>
                <p className="text-sm text-ink-subtle" dir="ltr">{currentEmail}</p>
              </div>
            </div>

            {/* شماره موبایل */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink-subtle">شماره موبایل:</span>
              <span className="text-sm font-mono font-bold text-navy" dir="ltr">
                {profile?.phone || "ثبت نشده"}
              </span>
            </div>

            {/* سهمیه و وضعیت امکانات */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-white/80 border border-ink/10 rounded-xl p-3 text-center">
                <span className="text-xs font-semibold text-ink-subtle block">سقف فرم‌های فعال</span>
                <span className="text-base font-black text-navy mt-1 block">
                  {profile?.is_owner ? "نامحدود" : `${faNum(profile?.max_forms ?? 5)} فرم`}
                </span>
              </div>
              <div className="bg-white/80 border border-ink/10 rounded-xl p-3 text-center">
                <span className="text-xs font-semibold text-ink-subtle block">سقف پاسخ در ماه</span>
                <span className="text-base font-black text-navy mt-1 block">
                  {profile?.is_owner ? "نامحدود" : `${faNum(profile?.max_responses_per_month ?? 100)} پاسخ`}
                </span>
              </div>
              <div className="bg-white/80 border border-ink/10 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                <span className="text-xs font-semibold text-ink-subtle block">ارسال به تلگرام</span>
                <span className="text-base font-black text-teal mt-1 block">
                  {profile?.is_owner || profile?.can_use_telegram === true ? "فعال" : "غیرفعال"}
                </span>
              </div>
            </div>

            {!profile?.is_owner && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-ink/10">
                <span className="text-xs font-semibold text-ink-subtle">نیاز به ظرفیت بیشتر دارید؟</span>
                <Button as={Link} to="/admin/support" variant="teal" size="sm">
                  درخواست افزایش سهمیه
                </Button>
              </div>
            )}
          </div>
        </StickerCard>
      </div>

      {/* ویرایش نام، ایمیل و شماره موبایل */}
      <div className="rotate-[0.3deg]">
        <StickerCard theme="white" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-lg font-extrabold text-navy flex items-center gap-2">
              ویرایش اطلاعات حساب
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-sm font-extrabold text-navy">نام و نام خانوادگی</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all"
                  placeholder="نام و نام خانوادگی"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-navy flex items-center gap-1.5">
                    <Mail size={14} className="text-teal" />
                    ایمیل / جیمیل
                  </span>
                </div>
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink text-left focus:outline-none transition-all"
                  placeholder="name@example.com"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-navy">شماره موبایل</span>
                  <span className="text-xs font-bold text-teal">ایران</span>
                </div>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink text-left focus:outline-none transition-all"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <Button
                variant="teal"
                size="sm"
                onClick={handleSaveProfile}
                disabled={savingProfile || isProfileUnchanged}
              >
                {savingProfile ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </div>
          </div>
        </StickerCard>
      </div>

      {/* تغییر رمز */}
      <div className="-rotate-[0.3deg]">
        <StickerCard theme="magenta" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-sm font-extrabold text-navy flex items-center gap-2">
              <Lock size={15} /> تغییر رمز عبور
            </h2>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-extrabold text-navy">رمز فعلی</span>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  dir="ltr"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink focus:outline-none transition-all text-left"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showCurrentPass ? "مخفی کردن رمز فعلی" : "نمایش رمز فعلی"}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-extrabold text-navy">رمز جدید</span>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink focus:outline-none transition-all text-left"
                    placeholder="حداقل ۶ کاراکتر"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    aria-label={showNewPass ? "مخفی کردن رمز جدید" : "نمایش رمز جدید"}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-extrabold text-navy">تکرار رمز جدید</span>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink focus:outline-none transition-all text-left"
                    placeholder="تکرار رمز جدید"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    aria-label={showConfirmPass ? "مخفی کردن تکرار رمز جدید" : "نمایش تکرار رمز جدید"}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 bg-magenta/10 border-2 border-magenta rounded-pill-md px-3.5 py-2 text-sm font-bold text-magenta-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {passwordError}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="navy"
                size="sm"
                onClick={handleChangePassword}
                disabled={savingPassword}
              >
                <Key size={13} className="ml-1" />
                {savingPassword ? "در حال تغییر..." : "تغییر رمز"}
              </Button>
            </div>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
