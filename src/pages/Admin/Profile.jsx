import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  Code2,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  FileJson,
  Layers,
  ShieldCheck,
  Globe
} from "lucide-react";

export default function Profile() {
  const { user, profile, changePassword, updateProfile } = useAuth();
  const { push } = useToast();

  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "developer"

  const currentEmail = user?.email || profile?.email || "";
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // توکن و ابزارهای برنامه‌نویسان
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const docsUrl = `${origin}/docs`;
  const openApiUrl = `${origin}/openapi.json`;
  const apiUrl = `${origin}/api/v1`;

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
    async function loadToken() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
        }
      } catch (err) {
        console.error("Failed to load session token:", err);
      }
    }
    loadToken();
  }, []);

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

  function handleCopyText(text, key) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (key === "token") {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedLink(key);
      setTimeout(() => setCopiedLink(null), 2000);
    }
    push("با موفقیت در حافظه کپی شد.");
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
        title="پروفایل و تنظیمات کاربری"
        description="اطلاعات حساب کاربری، امنیت و گزینه‌های برنامه‌نویسان — پرس‌کاد"
        url="/admin/profile"
        noIndex
      />

      <div>
        <h1 className="text-xl sm:text-3xl font-black text-navy dark:text-white">پروفایل من</h1>
        <p className="text-sm text-ink/50 dark:text-slate-400 mt-0.5">
          اطلاعات حساب کاربری، امنیت و ابزارهای توسعه‌دهندگان
        </p>
      </div>

      {/* تب‌های انتخاب بخش */}
      <div className="flex items-center gap-2 border-b border-ink/10 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-extrabold transition-all border-b-2 -mb-1.5 cursor-pointer ${
            activeTab === "profile"
              ? "border-teal text-teal bg-teal/5"
              : "border-transparent text-ink-subtle hover:text-navy dark:hover:text-white"
          }`}
        >
          <User size={16} />
          <span>مشخصات و امنیت حساب</span>
        </button>

        <button
          onClick={() => setActiveTab("developer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-extrabold transition-all border-b-2 -mb-1.5 cursor-pointer ${
            activeTab === "developer"
              ? "border-teal text-teal bg-teal/5"
              : "border-transparent text-ink-subtle hover:text-navy dark:hover:text-white"
          }`}
        >
          <Code2 size={16} />
          <span>گزینه‌های برنامه‌نویسان</span>
          <span className="text-[10px] bg-teal/15 text-teal px-1.5 py-0.5 rounded-full font-mono font-bold">API</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* تب ۲: گزینه‌های برنامه‌نویسان (۳ لینک اصلی همراه با توضیحات) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "developer" ? (
        <div className="flex flex-col gap-5">
          {/* کارت توکن احراز هویت */}
          <div className="-rotate-[0.3deg]">
            <StickerCard theme="teal" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
              <div className="p-5 sm:p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-teal/20 text-teal rounded-xl">
                      <Key size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-navy dark:text-white">توکن اختصاصی شما (Bearer Token)</h2>
                      <p className="text-xs text-ink-subtle dark:text-slate-400">
                        کلید امنیتی جهت احراز هویت حساب شما در درخواست‌های وب‌سرویس
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="p-1.5 text-ink-subtle hover:text-navy dark:hover:text-white rounded-lg bg-white/70 dark:bg-slate-800 transition-colors"
                      title={showToken ? "مخفی کردن" : "نمایش کامل"}
                    >
                      {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      onClick={() => handleCopyText(token, "token")}
                      disabled={!token}
                      className="bg-teal text-white hover:bg-teal-text px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      {copiedToken ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedToken ? "کپی شد" : "کپی توکن"}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white/90 dark:bg-slate-900 border border-teal/30 rounded-xl p-3 font-mono text-xs text-slate-700 dark:text-slate-300 select-all break-all dir-ltr text-left">
                  {token ? (showToken ? token : `${token.substring(0, 18)}••••••••••••••••••••••••••••••••${token.substring(token.length - 8)}`) : "در حال بارگذاری توکن..."}
                </div>

                <div className="text-[11px] text-ink-subtle dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-teal shrink-0" />
                  <span>
                    این توکن را در هدر درخواست‌های خود بفرستید: <code className="bg-teal/10 text-teal px-1 py-0.5 rounded font-mono">Authorization: Bearer &lt;TOKEN&gt;</code>
                  </span>
                </div>
              </div>
            </StickerCard>
          </div>

          {/* ۳ لینک اصلی به همراه توضیحات کامل */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-black text-navy dark:text-slate-200">لینک‌های اصلی و ابزارهای توسعه‌دهندگان</h3>

            {/* لینک ۱: Swagger UI */}
            <div className="bg-white dark:bg-[#0E1526] border-2 border-ink/10 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-teal/50 transition-all flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-navy dark:text-white">۱. کنسول مستندات تعاملی Swagger</h4>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-mono dir-ltr block">{docsUrl}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyText(docsUrl, "docs")}
                    className="p-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-ink-subtle flex items-center gap-1 transition-all"
                    title="کپی لینک"
                  >
                    {copiedLink === "docs" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copiedLink === "docs" ? "کپی شد" : "کپی"}</span>
                  </button>
                  <a
                    href="/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-teal hover:bg-teal-text text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>باز کردن صفحه داکس</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              <p className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed">
                <strong>توضیح:</strong> صفحه گرافیکی رسمی Swagger برای مشاهده تمام اندپوینت‌ها و تست زنده درخواست‌ها (GET, POST, PUT, DELETE). با باز کردن این صفحه، توکن حساب شما به صورت خودکار متصل می‌شود و می‌توانید عملکرد درخواست‌ها را بدون نیاز به کدنویسی در همان لحظه تست کنید.
              </p>
            </div>

            {/* لینک ۲: فایل OpenAPI JSON */}
            <div className="bg-white dark:bg-[#0E1526] border-2 border-ink/10 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-teal/50 transition-all flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                    <FileJson size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-navy dark:text-white">۲. فایل نقشه استاندارد سامانه (OpenAPI 3.0)</h4>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-mono dir-ltr block">{openApiUrl}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyText(openApiUrl, "openapi")}
                    className="p-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-ink-subtle flex items-center gap-1 transition-all"
                    title="کپی لینک"
                  >
                    {copiedLink === "openapi" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copiedLink === "openapi" ? "کپی شد" : "کپی"}</span>
                  </button>
                  <a
                    href="/openapi.json"
                    target="_blank"
                    rel="noopener noreferrer"
                    download="porskad-openapi.json"
                    className="bg-navy hover:bg-navy-light text-white dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <span>دانلود فایل JSON</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              <p className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed">
                <strong>توضیح:</strong> فایل استاندارد بین‌المللی JSON شامل مشخصات فنی تمام اندپوینت‌ها، متدها و الگوهای هر ۲۰ نوع سوال پرس‌کاد. این آدرس را می‌توانید مستقیماً در نرم‌افزارهای کمکی مثل <strong>Postman</strong> یا <strong>Insomnia</strong> وارد (Import) کنید تا تمام درخواست‌ها خودکار برایتان آماده شوند.
              </p>
            </div>

            {/* لینک ۳: آدرس پایه REST API */}
            <div className="bg-white dark:bg-[#0E1526] border-2 border-ink/10 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-teal/50 transition-all flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Terminal size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-navy dark:text-white">۳. آدرس ریشه و پایه وب‌سرویس (Base API URL)</h4>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono dir-ltr block">{apiUrl}</span>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => handleCopyText(apiUrl, "api")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    {copiedLink === "api" ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink === "api" ? "کپی شد" : "کپی آدرس API"}</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed">
                <strong>توضیح:</strong> آدرس پایه سرور است که کدهای برنامه یا پلتفرم شما درخواست‌های واقعی خود (مانند دریافت فرم‌ها با <code className="text-teal">/forms</code> یا ثبت جواب با <code className="text-teal">/forms/:id/responses</code>) را به آن ارسال می‌کنند.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════ */
        /* تب ۱: مشخصات و امنیت حساب (مشخصات، سهمیه‌ها و تغییر رمز)   */
        /* ══════════════════════════════════════════════════════════════ */
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
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">نام و نام خانوادگی</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink dark:text-white focus:outline-none transition-all"
                      placeholder="نام و نام خانوادگی"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">ایمیل</span>
                    <input
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                      placeholder="example@mail.com"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">شماره موبایل</span>
                    <input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
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
                    {savingProfile ? "در حال ذخیره..." : "ذخیره تغییرات"}
                  </Button>
                </div>
              </div>
            </StickerCard>
          </div>

          {/* تغییر رمز عبور */}
          <div className="-rotate-[0.3deg]">
            <StickerCard theme="white" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
              <div className="p-5 sm:p-6 flex flex-col gap-4">
                <h2 className="text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                  تغییر رمز عبور
                </h2>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-extrabold text-navy dark:text-slate-200">رمز عبور فعلی</span>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      dir="ltr"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                      placeholder="رمز عبور فعلی"
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

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">رمز جدید</span>
                    <div className="relative">
                      <input
                        type={showNewPass ? "text" : "password"}
                        dir="ltr"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                        placeholder="حداقل ۶ کاراکتر"
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
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">تکرار رمز جدید</span>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        dir="ltr"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                        placeholder="تکرار رمز جدید"
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
      )}
    </div>
  );
}
