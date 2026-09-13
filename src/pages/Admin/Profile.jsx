import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone, isValidEmail } from "../../lib/validators";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";
import SEO from "../../components/ui/SEO";
import { faNum, faDate } from "../../lib/utils";
import {
  Crown,
  Lock,
  Key,
  Mail,
  Eye,
  EyeOff,
  User,
} from "lucide-react";

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
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user?.email || profile?.email,
        password: currentPassword,
      });
      if (loginError) {
        setPasswordError("رمز فعلی اشتباه است.");
        return;
      }

      await changePassword(newPassword);
      push("رمز عبور با موفقیت تغییر کرد");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "تغییر رمز ناموفق بود.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
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
        title="پروفایل و تنظیمات کاربری — پرس‌کاد"
        description="اطلاعات حساب کاربری، سهمیه‌ها و امنیت رمز عبور — پرس‌کاد"
        url="/admin/profile"
        noIndex
      />

      <div>
        <h1 className="text-xl sm:text-3xl font-black text-navy dark:text-white">پروفایل من</h1>
        <p className="text-sm text-ink/50 dark:text-slate-400 mt-0.5">
          اطلاعات حساب کاربری، امنیت و تنظیمات سامانه
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* اطلاعات حساب */}
        <div className="-rotate-[0.3deg]">
          <StickerCard theme="navy" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              <h2 className="text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                اطلاعات حساب
              </h2>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 bg-teal rounded-full flex items-center justify-center text-white font-extrabold text-base rotate-[3deg]">
                  {fullName?.[0]?.toUpperCase() ?? currentEmail?.[0]?.toUpperCase() ?? "A"}
                </div>
                <div>
                  <p className="font-bold text-navy dark:text-white">{fullName || "—"}</p>
                  <p className="text-sm text-ink-subtle" dir="ltr">{currentEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-y border-ink/10 dark:border-slate-700/60 py-2.5">
                <span className="text-sm font-bold text-ink-subtle">شماره موبایل:</span>
                <span className="text-sm font-mono font-bold text-navy dark:text-slate-200" dir="ltr">
                  {profile?.phone || "ثبت نشده"}
                </span>
              </div>

              {/* سهمیه و وضعیت امکانات */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-white/80 dark:bg-slate-800/80 border border-ink/10 dark:border-slate-700 rounded-xl p-3 text-center">
                  <span className="text-xs font-semibold text-ink-subtle dark:text-slate-400 block">سقف فرم‌های فعال</span>
                  <span className="text-base font-black text-navy dark:text-slate-100 mt-1 block">
                    {profile?.is_owner || profile?.max_forms >= 999999 || profile?.plan === "unlimited"
                      ? "نامحدود ✨"
                      : `${faNum(profile?.max_forms ?? 5)} فرم`}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 border border-ink/10 dark:border-slate-700 rounded-xl p-3 text-center">
                  <span className="text-xs font-semibold text-ink-subtle dark:text-slate-400 block">ورودی‌های ماه جاری</span>
                  <span className="text-base font-black text-navy dark:text-slate-100 mt-1 block">
                    {profile?.is_owner || profile?.max_responses_per_month >= 999999 || profile?.plan === "unlimited"
                      ? "نامحدود ✨"
                      : `${faNum(profile?.monthly_responses_used ?? 0)} از ${faNum(profile?.max_responses_per_month ?? 100)}`}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 border border-ink/10 dark:border-slate-700 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                  <span className="text-xs font-semibold text-ink-subtle dark:text-slate-400 block">ارسال به تلگرام</span>
                  <span className="text-base font-black text-teal mt-1 block">
                    {profile?.is_owner || profile?.can_use_telegram === true ? "فعال" : "غیرفعال"}
                  </span>
                </div>
              </div>

              {!profile?.is_owner && profile?.quota_reset_at && (
                <div className="text-[11px] font-semibold text-ink-subtle dark:text-slate-400 text-center bg-navy/5 dark:bg-slate-800/50 py-1.5 px-3 rounded-lg">
                  🔄 تاریخ تمدید خودکار سهمیه ماهانه: <span className="font-bold text-navy dark:text-slate-200">{faDate(profile.quota_reset_at)}</span>
                </div>
              )}
            </div>
          </StickerCard>
        </div>

        {/* ویرایش نام، ایمیل و شماره موبایل */}
        <div className="rotate-[0.3deg]">
          <StickerCard theme="white" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              <h2 className="text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                ویرایش اطلاعات حساب
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-bold text-ink-subtle flex items-center gap-1">
                    <User size={14} />
                    نام و نام خانوادگی
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: علی محمدی"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle flex items-center gap-1">
                    <Mail size={14} />
                    ایمیل
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    placeholder="example@domain.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle">شماره موبایل (اختیاری)</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
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

        {/* تغییر رمز عبور */}
        <div className="-rotate-[0.2deg]">
          <StickerCard theme="white" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              <h2 className="text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                <Lock size={18} className="text-navy dark:text-white" />
                تغییر رمز عبور
              </h2>

              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle">رمز فعلی</span>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      dir="ltr"
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md pl-10 pr-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle">رمز عبور جدید</span>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      dir="ltr"
                      placeholder="حداقل ۶ کاراکتر"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md pl-10 pr-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink-subtle">تکرار رمز عبور جدید</span>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      dir="ltr"
                      placeholder="تکرار رمز جدید"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md pl-10 pr-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
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
