import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, isPrimaryGodEmail } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone, isValidEmail } from "../../lib/validators";
import { getPlan } from "../../lib/plans";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";
import Badge from "../../components/ui/Badge";
import SEO from "../../components/ui/SEO";
import {
  Crown,
  Lock,
  Key,
  Mail,
  User,
  Phone,
  Sparkles,
  Shield,
  ArrowLeft,
  Calendar,
  CheckCircle2,
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

  const isSuperAdmin = Boolean(
    profile?.is_owner === true ||
    profile?.role === "admin" ||
    (user?.email && isPrimaryGodEmail(user.email))
  );

  const currentPlan = getPlan(profile?.plan);
  const currentEmail = user?.email || profile?.email || "";
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // وضعیت اینکه آیا شماره قبلاً در سیستم ثبت و قفل شده است
  const hasExistingPhone = Boolean(profile?.phone && isValidIranPhone(normalizeIranPhone(profile.phone)));

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
      push("نام و نام خانوادگی نمی‌تواند خالی باشد", "error");
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

    // بررسی شماره تماس
    let cleanPhone = phone ? normalizeIranPhone(phone) : "";

    if (!isSuperAdmin) {
      // برای کاربران عادی شماره تماس اجباری است
      if (!cleanPhone) {
        push("ثبت شماره تماس برای حساب کاربری اجباری است", "error");
        return;
      }
      if (!isValidIranPhone(cleanPhone)) {
        push("شماره موبایل نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹)", "error");
        return;
      }
      // اگر شماره از قبل قفل شده بود، مقدار اصلی حفظ می‌شود
      if (hasExistingPhone && profile?.phone) {
        cleanPhone = normalizeIranPhone(profile.phone);
      }
    } else {
      // برای سوپرادمین شماره اختیاری است
      if (cleanPhone && !isValidIranPhone(cleanPhone)) {
        push("شماره موبایل نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹)", "error");
        return;
      }
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
      setPasswordError("لطفاً ابتدا رمز عبور فعلی خود را وارد کنید.");
      return;
    }
    if (!newPassword) {
      setPasswordError("رمز عبور جدید را وارد کنید.");
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
    if (currentPassword === newPassword) {
      setPasswordError("رمز جدید نمی‌تواند همان رمز قبلی باشد.");
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
        title="حساب کاربری — پرس‌کاد"
        description="مدیریت مشخصات فردی، وضعیت اشتراک و امنیت حساب کاربری در پرس‌کاد"
      />

      {/* سربرگ صفحه با نوع اشتراک و وضعیت کاربر */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white">
            حساب کاربری
          </h1>
          <p className="text-xs sm:text-sm text-ink-subtle dark:text-slate-400 mt-1">
            مدیریت مشخصات فردی، نوع اشتراک و امنیت حساب کاربری
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* کارت نوع اشتراک */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border-2 border-teal/20 dark:border-teal/40 rounded-pill-md px-3.5 py-1.5 shadow-xs">
            {profile?.is_owner ? (
              <Crown size={15} className="text-amber-500" />
            ) : (
              <Sparkles size={15} className="text-teal" />
            )}
            <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">طرح اشتراک:</span>
            <span className="text-xs font-black text-teal">
              {profile?.is_owner ? "مالک سامانه (طرح نامحدود)" : `پلن ${currentPlan?.name || "رایگان"}`}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate("/admin/subscriptions")}
              className="text-[11px] font-extrabold text-navy dark:text-slate-200 hover:text-teal mr-1 cursor-pointer"
            >
              مدیریت اشتراک
            </Button>
          </div>

          {profile?.is_owner && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
              <Crown size={14} />
              <span>مالک سامانه</span>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* چیدمان متقارن دوتایی کارت‌ها با ارتفاع یکسان (items-stretch) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* کارت ۱: ویرایش مشخصات */}
        <div className="-rotate-[0.2deg] flex flex-col h-full">
          <StickerCard
            theme="white"
            className="h-full flex flex-col"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none"
          >
            <div className="p-5 sm:p-6 flex flex-col justify-between h-full gap-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                    <User size={18} className="text-teal" />
                    <span>ویرایش اطلاعات حساب</span>
                  </h2>
                  <Badge color="teal">اطلاعات فردی</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <label className="flex flex-col gap-1.5 sm:col-span-2">
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

                  {/* فیلد شماره موبایل: اجباری و غیرقابل تغییر برای کاربران عادی، اختیاری و قابل تغییر برای سوپرادمین‌ها */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1">
                        <Phone size={14} />
                        <span>شماره تماس</span>
                        {isSuperAdmin ? (
                          <span className="text-slate-400 dark:text-slate-500 font-normal">(اختیاری — مدیر ارشد)</span>
                        ) : (
                          <span className="text-teal font-extrabold">(الزامی)</span>
                        )}
                      </span>

                      {!isSuperAdmin && hasExistingPhone && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock size={11} />
                          <span>ثبت‌شده و قفل</span>
                        </span>
                      )}
                    </div>

                    {!isSuperAdmin && hasExistingPhone ? (
                      /* نمایش قفل‌شده برای کاربر عادی */
                      <div className="relative">
                        <input
                          type="tel"
                          value={phone}
                          readOnly
                          disabled
                          dir="ltr"
                          className="w-full bg-slate-100 dark:bg-slate-800/50 border-2 border-ink/10 dark:border-slate-700/80 rounded-pill-md pl-10 pr-3.5 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed text-left select-all"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" title="شماره ثبت شده و غیرقابل تغییر است">
                          <Lock size={15} />
                        </div>
                      </div>
                    ) : (
                      /* ورودی فعال برای سوپرادمین یا کاربری که هنوز شماره ثبت نکرده */
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        dir="ltr"
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        className={`w-full bg-slate-50 dark:bg-slate-800/90 border-2 rounded-pill-md px-3.5 py-2 text-sm font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal transition-colors text-left ${
                          !isSuperAdmin && !phone.trim() ? "border-teal/40 dark:border-teal/40" : "border-ink/10 dark:border-slate-700"
                        }`}
                      />
                    )}

                    <span className="text-[11px] text-ink-subtle dark:text-slate-400 leading-4">
                      {isSuperAdmin
                        ? "به عنوان سوپرادمین سامانه، ثبت شماره موبایل اختیاری است و هر زمان قابل تغییر می‌باشد."
                        : hasExistingPhone
                        ? "شماره تماس شما در سامانه ثبت گردیده و قفل است؛ جهت تغییر با پشتیبانی یا سوپرادمین در ارتباط باشید."
                        : "ثبت شماره موبایل معتبر جهت استفاده از امکانات سامانه الزامی است و پس از ثبت اولیه قفل خواهد شد."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t-2 border-ink/5 dark:border-slate-800">
                <Button
                  variant="teal"
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-5 font-bold"
                >
                  {savingProfile ? "در حال ذخیره..." : "ذخیره تغییرات مشخصات"}
                </Button>
              </div>
            </div>
          </StickerCard>
        </div>

        {/* کارت ۲: تغییر رمز عبور (بدون درخواست رمز فعلی) */}
        <div className="rotate-[0.2deg] flex flex-col h-full">
          <StickerCard
            theme="white"
            className="h-full flex flex-col"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none"
          >
            <div className="p-5 sm:p-6 flex flex-col justify-between h-full gap-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                    <Lock size={18} className="text-navy dark:text-white" />
                    <span>تغییر رمز عبور</span>
                  </h2>
                  <Badge color="blue">امنیت حساب</Badge>
                </div>

                <p className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed">
                  جهت حفظ امنیت حساب کاربری، برای تغییر رمز عبور ابتدا رمز عبور فعلی خود را وارد نمایید.
                </p>

                <div className="flex flex-col gap-3.5">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">رمز عبور فعلی</span>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        dir="ltr"
                        placeholder="رمز فعلی حساب کاربری"
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
                  <div className="bg-magenta/10 border-2 border-magenta rounded-pill-md px-3.5 py-2 text-xs font-bold text-magenta-text">
                    {passwordError}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t-2 border-ink/5 dark:border-slate-800">
                <Button
                  variant="navy"
                  size="sm"
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="px-5 font-bold"
                >
                  <Key size={13} className="ml-1" />
                  {savingPassword ? "در حال تغییر..." : "ثبت رمز جدید"}
                </Button>
              </div>
            </div>
          </StickerCard>
        </div>
      </div>
    </div>
  );
}
