import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone, isValidEmail } from "../../lib/validators";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";
import Badge from "../../components/ui/Badge";
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
  Phone,
  ShieldCheck,
  Sparkles,
  FileText,
  BarChart3,
  Send,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Code2,
  Clock,
  Fingerprint,
} from "lucide-react";

export default function Profile() {
  const { user, profile, role, changePassword, updateProfile } = useAuth();
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

  // تعداد فرم‌های فعال کاربر
  const [formsCount, setFormsCount] = useState(0);

  // توکن دسترسی برای بخش وب‌سرویس
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
    if (user?.email || profile?.email) {
      setEmail(user?.email || profile?.email || "");
    }
  }, [profile, user]);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from("forms")
        .select("id", { count: "exact", head: true })
        .or(`manager_id.eq.${user.id},created_by.eq.${user.id}`)
        .is("deleted_at", null)
        .then(({ count }) => {
          if (count !== null && count !== undefined) setFormsCount(count);
        });

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          setToken(session.access_token);
        }
      });
    }
  }, [user?.id]);

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
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user?.email || profile?.email,
        password: currentPassword,
      });
      if (loginError) {
        setPasswordError("رمز فعلی اشتباه است.");
        return;
      }

      await changePassword(newPassword);
      push("رمز عبور با موفقیت تغییر کرد", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "تغییر رمز ناموفق بود.");
    } finally {
      setSavingPassword(false);
    }
  }

  function handleCopyToken() {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    push("توکن با موفقیت کپی شد", "success");
    setTimeout(() => setCopiedToken(false), 2000);
  }

  function handleCopyUserId() {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    push("شناسه کاربری کپی شد", "success");
    setTimeout(() => setCopiedId(false), 2000);
  }

  // محاسبات درصد سهمیه
  const isOwnerOrUnlimited = Boolean(
    profile?.is_owner ||
    profile?.role === "superadmin" ||
    role === "admin" ||
    profile?.role === "admin" ||
    profile?.plan === "unlimited" ||
    profile?.plan === "enterprise" ||
    (profile?.max_forms && Number(profile.max_forms) >= 999999)
  );

  const maxForms = Math.max(1, Number(profile?.max_forms ?? 5));
  const formsPercentage = isOwnerOrUnlimited ? 100 : Math.min(Math.round((formsCount / maxForms) * 100), 100);

  const maxResponses = Math.max(1, Number(profile?.max_responses_per_month ?? 100));
  const responsesUsed = Math.max(0, Number(profile?.monthly_responses_used ?? 0));
  const responsesPercentage = isOwnerOrUnlimited ? 100 : Math.min(Math.round((responsesUsed / maxResponses) * 100), 100);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      <SEO
        title="پروفایل و تنظیمات کاربری — پرس‌کاد"
        description="اطلاعات حساب کاربری، سهمیه‌ها، امنیت رمز عبور و دسترسی به API — پرس‌کاد"
        url="/admin/profile"
        noIndex
      />

      {/* بنر اختصاصی صاحب اصلی سایت (در صورت وجود) */}
      {profile?.is_owner && (
        <div className="-rotate-[0.15deg]">
          <StickerCard
            theme="orange"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            radius="rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none"
          >
            <div className="p-4 sm:p-5 flex items-center gap-3.5">
              <div className="p-2.5 bg-orange/20 text-orange dark:text-amber-400 rounded-xl shrink-0">
                <Crown size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-navy dark:text-white">
                    حساب صاحب اصلی سامانه (Owner / SuperAdmin)
                  </span>
                  <Badge color="amber">دسترسی نامحدود</Badge>
                </div>
                <p className="text-xs text-ink-subtle dark:text-slate-300 mt-0.5 leading-relaxed">
                  این حساب به تمام بخش‌ها، دیتابیس، مدیریت کاربران و سهمیه‌های سراسری دسترسی کامل دارد.
                </p>
              </div>
            </div>
          </StickerCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* هدر اصلی پروفایل (معرفی کاربر، آواتار و دکمه‌های اقدام سریع) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="-rotate-[0.15deg]">
        <StickerCard
          theme="navy"
          offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
          radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none"
        >
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 bg-teal text-white rounded-2xl flex items-center justify-center font-black text-2xl rotate-[2deg] border-2 border-white/40 shadow-sm">
                  {fullName?.[0]?.toUpperCase() ?? currentEmail?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center" title="حساب فعال">
                  <Check size={12} className="text-white stroke-[3]" />
                </div>
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-navy dark:text-white truncate">
                    {fullName || "کاربر پرس‌کاد"}
                  </h1>
                  {profile?.is_owner ? (
                    <Badge color="amber">مالک اصلی</Badge>
                  ) : profile?.role === "superadmin" || role === "admin" || profile?.role === "admin" ? (
                    <Badge color="magenta">ادمین سامانه</Badge>
                  ) : (
                    <Badge color="teal">مدیر فرم</Badge>
                  )}
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal/15 dark:bg-teal/25 text-teal-text dark:text-teal-300 border border-teal/30">
                    {profile?.plan === "unlimited" || isOwnerOrUnlimited ? "پلن نامحدود ✨" : `پلن ${profile?.plan || "پایه"}`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-subtle dark:text-slate-300">
                  <span className="flex items-center gap-1.5" dir="ltr">
                    <Mail size={13} className="text-teal" />
                    <span>{currentEmail}</span>
                  </span>
                  {phone && (
                    <span className="flex items-center gap-1.5" dir="ltr">
                      <Phone size={13} className="text-teal" />
                      <span>{phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-navy/15 dark:border-blue-500/20">
              <Button
                variant="teal"
                size="sm"
                as={Link}
                to="/admin/web-service"
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                <Code2 size={14} />
                <span>مستندات و کلید API</span>
              </Button>

              <Link
                to="/admin/web-service?section=swagger"
                className="text-xs font-bold bg-navy/10 hover:bg-navy/20 dark:bg-white/10 dark:hover:bg-white/20 text-navy dark:text-white px-3.5 py-2 rounded-xl border border-navy/20 dark:border-white/20 transition-all flex items-center gap-1.5"
              >
                <Key size={14} className="text-teal" />
                <span>کنسول وب‌سرویس</span>
              </Link>
            </div>
          </div>
        </StickerCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* گرید ۴ کارته رنگی دیزاین سیستم: سهمیه‌ها و وضعیت حساب */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* کارت ۱ (اکوسیستم / سبز آبی): سقف فرم‌های فعال */}
        <div className="rotate-[0.2deg]">
          <StickerCard
            theme="teal"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            className="h-full"
          >
            <div className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-text dark:text-teal">سقف فرم‌های فعال</span>
                <div className="p-2 bg-teal/20 text-teal-text dark:text-teal rounded-xl">
                  <FileText size={18} />
                </div>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black text-navy dark:text-white">
                  {isOwnerOrUnlimited ? "نامحدود ✨" : `${faNum(formsCount)} از ${faNum(maxForms)} فرم`}
                </span>
                {!isOwnerOrUnlimited && (
                  <div className="w-full bg-teal/15 dark:bg-teal/25 h-2 rounded-full overflow-hidden mt-2.5 border border-teal/30">
                    <div
                      className="bg-teal h-full rounded-full transition-all duration-300"
                      style={{ width: `${formsPercentage}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-300">
                {isOwnerOrUnlimited ? "بدون محدودیت تعداد فرم" : `${faNum(Math.max(0, maxForms - formsCount))} فرم باقیمانده`}
              </span>
            </div>
          </StickerCard>
        </div>

        {/* کارت ۲ (کالج / نارنجی): ورودی‌های ماه جاری */}
        <div className="-rotate-[0.2deg]">
          <StickerCard
            theme="orange"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            className="h-full"
          >
            <div className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-alt dark:text-amber-400">ورودی‌های ماه جاری</span>
                <div className="p-2 bg-orange/20 text-orange dark:text-amber-400 rounded-xl">
                  <BarChart3 size={18} />
                </div>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black text-navy dark:text-white">
                  {isOwnerOrUnlimited ? "نامحدود ✨" : `${faNum(responsesUsed)} از ${faNum(maxResponses)}`}
                </span>
                {!isOwnerOrUnlimited && (
                  <div className="w-full bg-orange/15 dark:bg-orange/25 h-2 rounded-full overflow-hidden mt-2.5 border border-orange/30">
                    <div
                      className="bg-orange h-full rounded-full transition-all duration-300"
                      style={{ width: `${responsesPercentage}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-300 truncate">
                {profile?.quota_reset_at ? `تمدید سهمیه: ${faDate(profile.quota_reset_at)}` : "سهمیه ماهانه دائمی"}
              </span>
            </div>
          </StickerCard>
        </div>

        {/* کارت ۳ (مردانه / سرمه‌ای): ربات تلگرام */}
        <div className="rotate-[0.2deg]">
          <StickerCard
            theme="navy"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            className="h-full"
          >
            <div className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-alt dark:text-sky-300">ارسال به تلگرام</span>
                <div className="p-2 bg-navy/15 dark:bg-blue-500/20 text-navy dark:text-blue-300 rounded-xl">
                  <Send size={18} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xl sm:text-2xl font-black text-navy dark:text-white">
                    {profile?.is_owner || profile?.can_use_telegram !== false ? "فعال و متصل" : "غیرفعال"}
                  </span>
                </div>
              </div>
              <Link
                to="/admin/telegram"
                className="text-[11px] font-bold text-teal hover:underline flex items-center gap-1"
              >
                <span>تنظیم ربات تلگرام</span>
                <ExternalLink size={10} />
              </Link>
            </div>
          </StickerCard>
        </div>

        {/* کارت ۴ (کلوپ / بنفش): شناسه حساب کاربری و امنیت */}
        <div className="-rotate-[0.2deg]">
          <StickerCard
            theme="club"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            className="h-full"
          >
            <div className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple dark:text-purple-300">شناسه حساب کاربری</span>
                <div className="p-2 bg-purple/20 text-purple dark:text-purple-300 rounded-xl">
                  <Fingerprint size={18} />
                </div>
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block truncate" dir="ltr">
                  {user?.id ? `${user.id.substring(0, 18)}...` : "—"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyUserId}
                className="text-[11px] font-bold text-purple dark:text-purple-300 hover:text-navy dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copiedId ? "شناسه کپی شد" : "کپی شناسه کامل UUID"}</span>
              </button>
            </div>
          </StickerCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* گرید متقارن ۲ ستونه: ویرایش مشخصات (راست) + امنیت رمز عبور (چپ) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* ستون راست: ویرایش مشخصات فردی (کارت اکوسیستم / سبز آبی) */}
        <div className="rotate-[0.15deg] flex flex-col">
          <StickerCard
            theme="teal"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            className="h-full"
          >
            <div className="p-5 sm:p-6 flex flex-col justify-between h-full gap-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-teal/20 dark:border-teal/30">
                  <h2 className="text-base sm:text-lg font-black text-navy dark:text-white flex items-center gap-2">
                    <User size={20} className="text-teal" />
                    <span>ویرایش مشخصات حساب کاربری</span>
                  </h2>
                  <span className="text-xs text-ink-subtle dark:text-slate-300 font-bold">
                    اطلاعات پایه و تماس
                  </span>
                </div>

                <div className="flex flex-col gap-3.5">
                  {/* نام و نام خانوادگی */}
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-navy dark:text-slate-200 flex items-center gap-1.5">
                      <User size={14} className="text-teal" />
                      نام و نام خانوادگی
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: علی محمدی"
                      className="w-full bg-white dark:bg-[#071716] border-2 border-teal/25 dark:border-teal/40 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy dark:text-teal-100 placeholder:text-ink-subtle/50 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* ایمیل */}
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-navy dark:text-slate-200 flex items-center gap-1.5">
                        <Mail size={14} className="text-teal" />
                        آدرس ایمیل
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        dir="ltr"
                        placeholder="example@domain.com"
                        className="w-full bg-white dark:bg-[#071716] border-2 border-teal/25 dark:border-teal/40 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy dark:text-teal-100 placeholder:text-ink-subtle/50 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all text-left"
                      />
                    </label>

                    {/* شماره موبایل */}
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-navy dark:text-slate-200 flex items-center gap-1.5">
                        <Phone size={14} className="text-teal" />
                        شماره موبایل
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        dir="ltr"
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        className="w-full bg-white dark:bg-[#071716] border-2 border-teal/25 dark:border-teal/40 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy dark:text-teal-100 placeholder:text-ink-subtle/50 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all text-left"
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-teal/10 dark:bg-teal/15 p-3.5 rounded-xl border border-teal/25 dark:border-teal/30 text-xs text-teal-text dark:text-teal-200 leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-teal shrink-0 mt-0.5" />
                  <div>
                    در صورت تغییر آدرس ایمیل، یک لینک تایید به ایمیل جدید شما ارسال خواهد شد و تا زمان تایید، ایمیل قبلی معتبر باقی می‌ماند.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t-2 border-teal/20 dark:border-teal/30">
                <span className="text-xs text-ink-subtle dark:text-slate-300 font-bold">
                  {user?.created_at && `عضویت از: ${faDate(user.created_at)}`}
                </span>
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

        {/* ستون چپ: امنیت و تغییر رمز عبور (کارت دختر / ماژنتا) */}
        <div className="-rotate-[0.15deg] flex flex-col">
          <StickerCard
            theme="magenta"
            offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
            className="h-full"
          >
            <div className="p-5 sm:p-6 flex flex-col justify-between h-full gap-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-magenta/20 dark:border-magenta/30">
                  <h2 className="text-base sm:text-lg font-black text-navy dark:text-white flex items-center gap-2">
                    <Lock size={20} className="text-magenta" />
                    <span>امنیت و تغییر رمز عبور</span>
                  </h2>
                  <span className="text-xs text-ink-subtle dark:text-slate-300 font-bold">
                    امنیت حساب
                  </span>
                </div>

                <div className="flex flex-col gap-3.5">
                  {/* رمز فعلی */}
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-navy dark:text-slate-200">رمز عبور فعلی</span>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        dir="ltr"
                        placeholder="••••••••"
                        className="w-full bg-white dark:bg-[#1a0811] border-2 border-magenta/25 dark:border-magenta/40 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-navy dark:text-pink-100 placeholder:text-ink-subtle/50 focus:outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20 transition-all text-left"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy dark:hover:text-white transition-colors p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* رمز عبور جدید */}
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-navy dark:text-slate-200">رمز عبور جدید</span>
                      <div className="relative">
                        <input
                          type={showNewPass ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          dir="ltr"
                          placeholder="حداقل ۶ کاراکتر"
                          className="w-full bg-white dark:bg-[#1a0811] border-2 border-magenta/25 dark:border-magenta/40 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-navy dark:text-pink-100 placeholder:text-ink-subtle/50 focus:outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20 transition-all text-left"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy dark:hover:text-white transition-colors p-1 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>

                    {/* تکرار رمز عبور جدید */}
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-navy dark:text-slate-200">تکرار رمز عبور جدید</span>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          dir="ltr"
                          placeholder="تکرار رمز عبور جدید"
                          className="w-full bg-white dark:bg-[#1a0811] border-2 border-magenta/25 dark:border-magenta/40 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-navy dark:text-pink-100 placeholder:text-ink-subtle/50 focus:outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20 transition-all text-left"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy dark:hover:text-white transition-colors p-1 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>
                  </div>
                </div>

                {passwordError ? (
                  <div className="bg-magenta/15 dark:bg-magenta/25 border-2 border-magenta rounded-xl px-3.5 py-2.5 text-xs font-bold text-magenta-text dark:text-pink-300">
                    {passwordError}
                  </div>
                ) : (
                  <div className="bg-magenta/10 dark:bg-magenta/15 p-3 rounded-xl border border-magenta/25 dark:border-magenta/30 text-xs text-magenta-text dark:text-pink-200 leading-relaxed flex items-center gap-2">
                    <ShieldCheck size={16} className="text-magenta shrink-0" />
                    <span>رمز عبور جدید باید حداقل ۶ کاراکتر بوده و ترجیحاً ترکیبی از حروف و اعداد باشد.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t-2 border-magenta/20 dark:border-magenta/30">
                <span className="text-xs text-ink-subtle dark:text-slate-300 font-bold hidden sm:inline">
                  محافظت دوچندان از اطلاعات فرم‌ها
                </span>
                <Button
                  variant="magenta"
                  size="sm"
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="px-5 font-bold flex items-center gap-1.5 mr-auto sm:mr-0"
                >
                  <Key size={14} />
                  <span>{savingPassword ? "در حال تغییر..." : "تغییر رمز عبور"}</span>
                </Button>
              </div>
            </div>
          </StickerCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* کارت دسترسی سریع به API و کلید اختصاصی (کارت کلوپ / بنفش) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="-rotate-[0.15deg]">
        <StickerCard
          theme="club"
          offset="top-[0.25rem] left-[0.25rem] sm:top-[0.35rem] sm:left-[0.35rem]"
          radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none"
        >
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 bg-purple/20 text-purple dark:text-purple-300 rounded-2xl shrink-0 mt-0.5 sm:mt-0">
                <Key size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-navy dark:text-white">
                    کلید امنیتی و دسترسی اختصاصی API شما (Bearer Token)
                  </h2>
                  <Badge color="magenta">REST API v1</Badge>
                </div>
                <p className="text-xs text-ink-subtle dark:text-slate-300 mt-1 leading-relaxed">
                  اتصال از طریق پایتون، جاوااسکریپت و نرم‌افزارهای خارجی • هدر مورد نیاز:{" "}
                  <code className="font-mono bg-purple/10 dark:bg-purple/20 text-purple dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple/30 font-bold" dir="ltr">
                    Authorization: Bearer &lt;TOKEN&gt;
                  </code>
                </p>
              </div>
            </div>

            {/* نوار توکن و دکمه کپی */}
            <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
              <div className="relative flex-1 lg:w-72 xl:w-80 min-w-0 bg-white dark:bg-[#15091c] border-2 border-purple/30 dark:border-purple/40 rounded-pill-md px-3.5 py-2 font-mono text-xs text-slate-700 dark:text-slate-200 dir-ltr text-left flex items-center justify-between">
                <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis block min-w-0 flex-1 select-all">
                  {token
                    ? (showToken ? token : `${token.substring(0, 14)}••••••••••••••••••••${token.substring(token.length - 6)}`)
                    : "در حال بارگذاری توکن..."}
                </span>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="p-1 text-ink-subtle hover:text-navy dark:hover:text-white rounded transition-colors shrink-0 ml-1.5 cursor-pointer"
                  title={showToken ? "مخفی کردن" : "نمایش کامل"}
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <Button
                variant="purple"
                size="sm"
                onClick={handleCopyToken}
                disabled={!token}
                className="shrink-0 flex items-center gap-1.5 font-bold"
              >
                {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedToken ? "کپی شد" : "کپی توکن"}</span>
              </Button>
            </div>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}

