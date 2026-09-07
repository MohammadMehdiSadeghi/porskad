import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone } from "../../lib/validators";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";
import Badge from "../../components/ui/Badge";
import SEO from "../../components/ui/SEO";
import { faNum } from "../../lib/utils";
import { Crown, Lock, Key } from "lucide-react";

const PERMISSION_LABELS = {
  create_form: "ایجاد فرم",
  edit_form: "ویرایش فرم",
  delete_form: "حذف فرم",
  publish_form: "انتشار فرم",
  view_responses: "مشاهده پاسخ‌ها",
  view_analytics: "مشاهده تحلیل‌ها",
  export_excel: "خروجی اکسل",
  manage_managers: "مدیریت مدیران",
};

const ROLE_LABELS = {
  admin: "ادمین اصلی",
  manager: "مدیر",
};

const OWNER_BADGE = {
  label: "صاحب اصلی سایت",
  color: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function Profile() {
  const { user, profile, role, permissions, changePassword, updateProfile } = useAuth();
  const { push } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  async function handleSaveProfile() {
    if (!fullName.trim()) {
      push("نام نمی‌تواند خالی باشد", "error");
      return;
    }
    const cleanPhone = phone ? normalizeIranPhone(phone) : "";
    if (phone && !isValidIranPhone(cleanPhone)) {
      push("شماره موبایل نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹)", "error");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ full_name: fullName.trim(), phone: cleanPhone || null });
      push("پروفایل به‌روزرسانی شد");
    } catch (err) {
      push("خطا: " + err.message, "error");
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
        email: user.email,
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
      <div>         <h1 className="text-xl sm:text-3xl font-black text-navy">پروفایل من</h1>
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
                {fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div>
                <p className="font-bold text-navy">{fullName || "—"}</p>
                <p className="text-sm text-ink-subtle" dir="ltr">{user?.email}</p>
              </div>
            </div>

            {/* شماره موبایل */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink-subtle">شماره موبایل:</span>
              <span className="text-sm font-mono font-bold text-navy" dir="ltr">
                {profile?.phone || "ثبت نشده"}
              </span>
            </div>

            {/* نقش */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink-subtle">نقش:</span>
              <Badge color={role === "admin" ? "navy" : "teal"}>
                {ROLE_LABELS[role] ?? role}
              </Badge>
              {profile?.is_owner && (
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${OWNER_BADGE.color}`}>
                  {OWNER_BADGE.label}
                </span>
              )}
            </div>

            {/* مجوزها */}
            <div>
              <span className="text-sm font-bold text-ink-subtle block mb-2">مجوزها:</span>
              <div className="flex flex-wrap gap-1.5">
                {profile?.is_owner ? (
                  <Badge color="amber" rotate="0" className="flex items-center gap-1">
                    <Crown size={12} />
                    <span>دسترسی کامل (صاحب اصلی)</span>
                  </Badge>
                ) : permissions && permissions.length > 0 ? (
                  permissions.map((p) => (
                    <span
                      key={p}
                      className="text-xs font-semibold bg-bg-neutral text-ink px-2.5 py-1 rounded-full border border-ink/10"
                    >
                      {PERMISSION_LABELS[p] ?? p}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-ink-subtle">مجوزی ثبت نشده</span>
                )}
              </div>
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

      {/* ویرایش نام و شماره موبایل */}
      <div className="rotate-[0.3deg]">
        <StickerCard theme="white" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-lg font-extrabold text-navy flex items-center gap-2">
              ویرایش اطلاعات حساب
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
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
                  <span className="text-sm font-extrabold text-navy">شماره موبایل</span>
                  <span className="text-[0.65rem] font-bold text-teal">ایران</span>
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
                disabled={savingProfile || (fullName === (profile?.full_name ?? "") && phone === (profile?.phone ?? ""))}
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
              <input
                type="password"
                dir="ltr"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all text-left"
                placeholder="••••••••"
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-extrabold text-navy">رمز جدید</span>
                <input
                  type="password"
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all text-left"
                  placeholder="حداقل ۶ کاراکتر"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-extrabold text-navy">تکرار رمز جدید</span>
                <input
                  type="password"
                  dir="ltr"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all text-left"
                  placeholder="تکرار رمز جدید"
                />
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
