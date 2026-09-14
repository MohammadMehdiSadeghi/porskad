import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone, isValidEmail } from "../../lib/validators";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";
import SEO from "../../components/ui/SEO";
import {
  Crown,
  Lock,
  Key,
  Mail,
  User,
} from "lucide-react";
import PasswordToggle from "../../components/ui/PasswordToggle";

export default function Profile() {
  const { user, profile, changePassword, updateProfile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // در صورت مراجعه به تب قدیمی دولوپر، خودکار به صفحه اختصاصی مستندات وب‌سرویس هدایت شود
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "developer" || tabParam === "docs") {
      const section = searchParams.get("section");
      navigate(`/admin/web-service${section ? `?section=${section}` : ""}`, { replace: true });
    }
  }, [searchParams, navigate]);

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
        const { error: authError } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (authError) throw authError;
      }

      await updateProfile({
        full_name: fullName.trim(),
        phone: cleanPhone || null,
        email: trimmedEmail,
      });

      if (emailChanged) {
        push("پروفایل به‌روزرسانی شد. در صورت نیاز لینک تایید به ایمیل جدید ارسال می‌شود.");
      } else {
        push("پروفایل با موفقیت به‌روزرسانی شد", "success");
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
      await changePassword(currentPassword, newPassword);
      push("رمز عبور با موفقیت تغییر یافت", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "خطا در تغییر رمز عبور. لطفاً رمز فعلی را بررسی کنید.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <SEO
        title="حساب کاربری"
        description="مدیریت مشخصات فردی و امنیت حساب کاربری در پرس‌کاد"
      />

      {/* سربرگ صفحه */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white">
            حساب کاربری
          </h1>
          <p className="text-xs sm:text-sm text-ink-subtle dark:text-slate-400 mt-1">
            مدیریت مشخصات فردی و امنیت حساب کاربری
          </p>
        </div>

        {profile?.is_owner && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
            <Crown size={14} />
            <span>مالک سامانه</span>
          </div>
        )}
      </div>

      {/* چیدمان دوتایی کارت‌ها در دو ستون (کنار هم بدون خالی ماندن سمت چپ) */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* کارت ۱: ویرایش مشخصات */}
        <div className="-rotate-[0.2deg]">
          <StickerCard
            theme="white"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none"
          >
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                <User size={18} className="text-teal" />
                ویرایش اطلاعات حساب
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1">
                    <User size={14} />
                    نام و نام خانوادگی
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: علی محمدی"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1">
                    <Mail size={14} />
                    ایمیل
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    placeholder="example@domain.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">شماره موبایل (اختیاری)</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
                  />
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="teal"
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? "در حال ذخیره..." : "ذخیره تغییرات مشخصات"}
                </Button>
              </div>
            </div>
          </StickerCard>
        </div>

        {/* کارت ۲: تغییر رمز عبور */}
        <div className="rotate-[0.2deg]">
          <StickerCard
            theme="white"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none"
          >
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                <Lock size={18} className="text-navy dark:text-white" />
                تغییر رمز عبور
              </h2>

              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">رمز فعلی</span>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      dir="ltr"
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md pl-10 pr-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <PasswordToggle
                        visible={showCurrentPass}
                        onToggle={() => setShowCurrentPass(!showCurrentPass)}
                        size={16}
                        ariaLabel="نمایش یا مخفی‌سازی رمز فعلی"
                      />
                    </div>
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">رمز عبور جدید</span>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      dir="ltr"
                      placeholder="حداقل ۶ کاراکتر"
                      className="w-full bg-slate-50 dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md pl-10 pr-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <PasswordToggle
                        visible={showNewPass}
                        onToggle={() => setShowNewPass(!showNewPass)}
                        size={16}
                        ariaLabel="نمایش یا مخفی‌سازی رمز جدید"
                      />
                    </div>
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">تکرار رمز عبور جدید</span>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      dir="ltr"
                      placeholder="تکرار رمز جدید"
                      className="w-full bg-slate-50 dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md pl-10 pr-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <PasswordToggle
                        visible={showConfirmPass}
                        onToggle={() => setShowConfirmPass(!showConfirmPass)}
                        size={16}
                        ariaLabel="نمایش یا مخفی‌سازی تکرار رمز جدید"
                      />
                    </div>
                  </div>
                </label>
              </div>

              {passwordError && (
                <div className="bg-magenta/10 border-2 border-magenta rounded-pill-md px-3.5 py-2 text-sm font-bold text-magenta-text">
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
    </div>
  );
}
