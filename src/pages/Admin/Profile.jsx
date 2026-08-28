import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";
import Badge from "../../components/ui/Badge";
import SEO from "../../components/ui/SEO";

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
  label: "👑 صاحب اصلی سایت",
  color: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function Profile() {
  const { user, profile, role, permissions, changePassword, updateProfile } = useAuth();
  const { push } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

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
    setSavingProfile(true);
    try {
      await updateProfile({ full_name: fullName.trim() });
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
          <span className="text-2xl">👑</span>
          <div>
            <p className="text-sm font-bold text-amber-800">حساب صاحب اصلی سایت</p>
            <p className="text-xs text-amber-600">این حساب غیرقابل حذف و غیرفعال شدن است و به تمام بخش‌های سایت دسترسی کامل دارد.</p>
          </div>
        </div>
      )}
      <SEO
        title="پروفایل من"
        description="اطلاعات حساب کاربری و تنظیمات امنیتی — پرسکاد"
        url="/admin/profile"
        noIndex
      />
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-navy">پروفایل من</h1>
        <p className="text-xs text-ink/50 mt-0.5">
          اطلاعات حساب کاربری و تنظیمات امنیتی
        </p>
      </div>

      {/* اطلاعات حساب */}
      <div className="-rotate-[0.3deg]">
        <StickerCard theme="navy" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-sm font-extrabold text-navy flex items-center gap-2">
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
                {permissions.map((p) => (
                  <span
                    key={p}
                    className="text-xs font-bold text-teal-text bg-bg-mint border border-teal/20 rounded-pill-sm px-2 py-0.5"
                  >
                    {PERMISSION_LABELS[p] ?? p}
                  </span>
                ))}
                {permissions.length === 0 && (
                  <span className="text-xs text-ink/40">هیچ مجوزی ندارید</span>
                )}
              </div>
            </div>
          </div>
        </StickerCard>
      </div>

      {/* ویرایش نام */}
      <div className="rotate-[0.3deg]">
        <StickerCard theme="white" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-sm font-extrabold text-navy flex items-center gap-2">
              ویرایش نام نمایشی
            </h2>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-extrabold text-navy">نام نمایشی</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all"
                placeholder="نام و نام خانوادگی"
              />
            </label>

            <div className="flex justify-end">
              <Button
                variant="teal"
                size="sm"
                onClick={handleSaveProfile}
                disabled={savingProfile || fullName === (profile?.full_name ?? "")}
              >
                {savingProfile ? "در حال ذخیره..." : "ذخیره نام"}
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
              🔒 تغییر رمز عبور
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
                {savingPassword ? "در حال تغییر..." : "🔐 تغییر رمز"}
              </Button>
            </div>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
