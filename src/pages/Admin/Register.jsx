import { useState, useEffect, useRef } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Headphones,
  Send,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Lock,
  Edit3,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import PasswordToggle from "../../components/ui/PasswordToggle";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone, isValidPassword, toEnDigits } from "../../lib/validators";
import { faNum } from "../../lib/utils";
import SEO from "../../components/ui/SEO";
import ThemeToggle from "../../components/ui/ThemeToggle";

export default function Register() {
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // ─── روش‌های احراز هویت فعال ───
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [smsOtpEnabled, setSmsOtpEnabled] = useState(true);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(true);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // ─── وضعیت مراحل ثبت‌نام (۱: شماره، ۲: تایید کد، ۳: نام و رمز) ───
  const [step, setStep] = useState(1);

  // فرم مرحله ۱
  const [phone, setPhone] = useState("");

  // فرم مرحله ۲
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(90); // ۹۰ ثانیه = ۱:۳۰ دقیقه
  const [canResend, setCanResend] = useState(false);
  const [remainingResends, setRemainingResends] = useState(2); // نهایت ۲ بار ارسال مجدد
  const [verificationToken, setVerificationToken] = useState("");

  // فرم مرحله ۳
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // وضعیت‌های عمومی
  const [error, setError] = useState(null);
  const [isDuplicateUser, setIsDuplicateUser] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [telegramSupportId, setTelegramSupportId] = useState("porskad_support");

  const otpInputRef = useRef(null);

  // تایمر خنک‌سازی ارسال مجدد (۱:۳۰ دقیقه)
  useEffect(() => {
    let timer = null;
    if (step === 2 && cooldown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (cooldown === 0) {
      setCanResend(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, cooldown > 0]);

  // لود شناسه تلگرام پشتیبانی و وضعیت روش‌های ورود
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase.rpc("get_system_settings");
        if (!error && data) {
          if (data.telegram_support_id) {
            setTelegramSupportId(String(data.telegram_support_id).replace(/^@/, "").trim());
          }
          if (typeof data.registration_enabled === "boolean") {
            setRegistrationEnabled(data.registration_enabled);
          }
          if (typeof data.sms_otp_enabled === "boolean") {
            setSmsOtpEnabled(data.sms_otp_enabled);
          }
          if (typeof data.google_auth_enabled === "boolean") {
            setGoogleAuthEnabled(data.google_auth_enabled);
          }
        }
      } catch (err) {
        console.warn("RPC get_system_settings error:", err);
      }

      // کوئری مستقیم جدول system_settings جهت تضمین مقادیر
      try {
        const { data } = await supabase
          .from("system_settings")
          .select("key, value")
          .in("key", ["telegram_support_id", "registration_enabled", "sms_otp_enabled", "google_auth_enabled"]);
        if (Array.isArray(data) && data.length > 0) {
          for (const row of data) {
            if (row.key === "telegram_support_id" && row.value) {
              const val = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
              setTelegramSupportId(val.replace(/[ "@]/g, "").trim());
            }
            if (row.key === "registration_enabled" && row.value !== undefined) {
              setRegistrationEnabled(row.value === true || row.value === "true");
            }
            if (row.key === "sms_otp_enabled" && row.value !== undefined) {
              setSmsOtpEnabled(row.value === true || row.value === "true");
            }
            if (row.key === "google_auth_enabled" && row.value !== undefined) {
              setGoogleAuthEnabled(row.value === true || row.value === "true");
            }
          }
        }
      } catch {}

      setSettingsLoaded(true);
    }
    loadSettings();
  }, []);

  if (user) {
    return <Navigate to="/admin/forms" replace />;
  }

  // تبدیل ثانیه به فرمت mm:ss
  function formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // ══════════════════════════════════════════════════════════════
  // ورود و ثبت نام مستقیم با گوگل
  // ══════════════════════════════════════════════════════════════
  async function handleGoogleAuth() {
    setGoogleBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError("خطا در اتصال به گوگل: " + (err.message || "لطفاً مجدداً تلاش نمایید."));
      setGoogleBusy(false);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // مرحله ۱: ارسال کد تایید به شماره موبایل
  // ══════════════════════════════════════════════════════════════
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setError(null);
    setIsDuplicateUser(false);

    const clean = normalizeIranPhone(toEnDigits(phone));
    if (!isValidIranPhone(clean)) {
      setError("شماره موبایل نامعتبر است. لطفاً شماره صحیح وارد کنید (مثال: ۰۹۱۲۳۴۵۶۷۸۹).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", phone: clean }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.isDuplicate) {
          setIsDuplicateUser(true);
        }
        setError(data.error || "خطا در ارسال پیامک کد تایید.");
        return;
      }

      // موفقیت: انتقال به مرحله ۲
      setStep(2);
      setCooldown(data.cooldown || 90);
      if (typeof data.remainingResends === "number") {
        setRemainingResends(data.remainingResends);
      }
      setTimeout(() => otpInputRef.current?.focus(), 150);
    } catch (err) {
      setError(err.message || "خطا در برقراری ارتباط با سرور.");
    } finally {
      setBusy(false);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // مرحله ۲: ارسال مجدد کد تایید (حداکثر ۲ بار، فاصله ۱:۳۰)
  // ══════════════════════════════════════════════════════════════
  async function handleResendOtp() {
    if (!canResend || remainingResends <= 0 || busy) return;
    setError(null);
    setBusy(true);
    const clean = normalizeIranPhone(phone);

    try {
      const res = await fetch("/api/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", phone: clean }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "خطا در ارسال مجدد کد.");
        return;
      }

      setCooldown(data.cooldown || 90);
      setCanResend(false);
      if (typeof data.remainingResends === "number") {
        setRemainingResends(data.remainingResends);
      }
    } catch (err) {
      setError(err.message || "خطا در ارسال مجدد پیامک.");
    } finally {
      setBusy(false);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // مرحله ۲: تایید کد OTP
  // ══════════════════════════════════════════════════════════════
  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    setError(null);

    const cleanCode = toEnDigits(otpCode).trim().replace(/\D/g, "");
    if (cleanCode.length < 5) {
      setError("لطفاً کد تایید ۵ رقمی را به طور کامل وارد نمایید.");
      return;
    }

    setBusy(true);
    const clean = normalizeIranPhone(toEnDigits(phone));

    try {
      const res = await fetch("/api/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", phone: clean, code: cleanCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "کد تایید وارد شده نادرست است.");
        return;
      }

      // ذخیره توکن تایید و رفتن به مرحله ۳
      setVerificationToken(data.verificationToken);
      setStep(3);
    } catch (err) {
      setError(err.message || "خطا در اعتبارسنجی کد.");
    } finally {
      setBusy(false);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // مرحله ۳: ثبت نام نهایی و ورود خودکار به سامانه
  // ══════════════════════════════════════════════════════════════
  async function handleCompleteRegistration(e) {
    if (e) e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("لطفاً آدرس ایمیل خود را وارد نمایید.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("فرمت آدرس ایمیل نامعتبر است (مثال: name@example.com).");
      return;
    }

    if (!fullName.trim()) {
      setError("لطفاً نام و نام خانوادگی خود را وارد نمایید.");
      return;
    }

    if (!isValidPassword(password)) {
      setError("رمز عبور باید حداقل ۶ کاراکتر و شامل حروف انگلیسی و عدد باشد (مثال: pors1234).");
      return;
    }

    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }

    setBusy(true);
    const clean = normalizeIranPhone(phone);

    try {
      const res = await fetch("/api/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_registration",
          phone: clean,
          verificationToken,
          email: cleanEmail,
          fullName: fullName.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "خطا در ایجاد حساب کاربری.");
        setBusy(false);
        return;
      }

      // ورود خودکار کاربر با مشخصات ثبت‌شده
      const targetEmail = data.email || cleanEmail;
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (loginErr) {
        // در صورت هرگونه تاخیر، کاربر را به لاگین هدایت می‌کنیم
        navigate("/admin/login", { replace: true });
        return;
      }

      if (loginData?.session) {
        navigate("/admin/forms", { replace: true });
      } else {
        navigate("/admin/login", { replace: true });
      }
    } catch (err) {
      setError(err.message || "خطا در ثبت‌نام نهایی.");
      setBusy(false);
    }
  }

  // ─── محاسبه داینامیک عنوان، برچسب و زیرعنوان مرحله جاری بر اساس وضعیت احراز هویت ───
  const headerInfo = (() => {
    // حالت ۱: فقط گوگل فعال است (پیامک غیرفعال)
    if (smsOtpEnabled === false && googleAuthEnabled !== false) {
      return {
        badge: "ثبت‌نام مستقیم",
        title: "ثبت‌نام با حساب گوگل",
        subtitle: "ایجاد سریع حساب کاربری بدون نیاز به رمز یا پیامک",
        showStepper: false,
      };
    }

    // حالت ۲: هر دو روش (موبایل و گوگل) فعال هستند
    if (smsOtpEnabled !== false && googleAuthEnabled !== false) {
      if (step === 1) {
        return {
          badge: "مرحله ۱ از ۳",
          title: "ثبت‌نام با موبایل یا گوگل",
          subtitle: "شماره همراه را وارد کنید یا سریع با گوگل ادامه دهید",
          showStepper: true,
        };
      }
      if (step === 2) {
        return {
          badge: "مرحله ۲ از ۳",
          title: "تایید شماره تلفن همراه",
          subtitle: `کد ۵ رقمی ارسال‌شده به ${phone ? faNum(phone) : "شماره"} را وارد کنید`,
          showStepper: true,
        };
      }
      return {
        badge: "مرحله ۳ از ۳",
        title: "تکمیل مشخصات کاربری",
        subtitle: "ایمیل، نام و رمز عبور ورود خود را تعیین فرمایید",
        showStepper: true,
      };
    }

    // حالت ۳: فقط پیامک موبایل فعال است (گوگل غیرفعال)
    if (smsOtpEnabled !== false && googleAuthEnabled === false) {
      if (step === 1) {
        return {
          badge: "مرحله ۱ از ۳",
          title: "ثبت‌نام با شماره همراه",
          subtitle: "شماره همراه خود را برای دریافت پیامک تایید وارد کنید",
          showStepper: true,
        };
      }
      if (step === 2) {
        return {
          badge: "مرحله ۲ از ۳",
          title: "تایید شماره تلفن همراه",
          subtitle: `کد ۵ رقمی ارسال‌شده به ${phone ? faNum(phone) : "شماره"} را وارد کنید`,
          showStepper: true,
        };
      }
      return {
        badge: "مرحله ۳ از ۳",
        title: "تکمیل مشخصات کاربری",
        subtitle: "ایمیل، نام و رمز عبور ورود خود را تعیین فرمایید",
        showStepper: true,
      };
    }

    return {
      badge: "سامانه فرم‌ساز هوشمند",
      title: "ثبت‌نام حساب کاربری",
      subtitle: "فرم‌های هوشمند و بدون نیاز به کدنویسی",
      showStepper: false,
    };
  })();

  return (
    <div className="min-h-screen dot-pattern bg-bg-mint dark:bg-dark-canvas flex items-center justify-center p-4 relative font-sans" dir="rtl">
      <div className="absolute top-4 left-4 z-20">
        <ThemeToggle />
      </div>
      <SEO
        title="ثبت‌نام کاربر جدید | پرس‌کاد"
        description="ثبت‌نام سریع با تایید شماره موبایل در سامانه فرم‌ساز پرس‌کاد"
        url="/register"
        noIndex
      />

      <div className="w-full max-w-md">
        <StickerCard theme="white">
          <div className="p-7 sm:p-9 flex flex-col gap-5">
            {/* هدر داینامیک با انیمیشن روان تغییر متن و مرحله */}
            <div
              key={`header-${step}-${smsOtpEnabled}-${googleAuthEnabled}`}
              className="flex flex-col items-center gap-1.5 text-center animate-step-fade"
            >
              <Badge color="navy">
                {headerInfo.badge}
              </Badge>
              <h1 className="text-lg sm:text-xl font-black text-sec dark:text-white transition-all tracking-tight leading-snug">
                {headerInfo.title}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 max-w-sm leading-relaxed transition-all">
                {headerInfo.subtitle}
              </p>

              {/* نوار پیشرفت مدرن باریک خطی ۳ مرحله‌ای (فقط در مراحل پیامکی) */}
              {headerInfo.showStepper && (
                <div className="w-full flex items-center gap-1.5 pt-1.5">
                  <div
                    className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                      step >= 1 ? "bg-teal shadow-sm" : "bg-ink/10 dark:bg-slate-700"
                    }`}
                  />
                  <div
                    className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                      step >= 2 ? "bg-teal shadow-sm" : "bg-ink/10 dark:bg-slate-700"
                    }`}
                  />
                  <div
                    className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                      step >= 3 ? "bg-teal shadow-sm" : "bg-ink/10 dark:bg-slate-700"
                    }`}
                  />
                </div>
              )}
            </div>

            {/* ══════════════ حالت ثبت‌نام عمومی غیرفعال ══════════════ */}
            {registrationEnabled === false ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500">
                  <ShieldCheck size={32} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base sm:text-lg font-black text-navy dark:text-white">ثبت‌نام عمومی غیرفعال است</h3>
                  <p className="text-xs sm:text-sm text-ink-subtle dark:text-slate-400 max-w-xs leading-relaxed">
                    در حال حاضر ثبت‌نام مستقیم کاربران موقتاً بسته شده است. کاربران جدید فقط توسط مدیریت سامانه ایجاد می‌شوند.
                  </p>
                </div>

                <div className="w-full flex flex-col gap-2.5 pt-2">
                  <Link
                    to="/admin/login"
                    className="w-full flex items-center justify-center gap-2 bg-teal text-white font-bold py-2.5 px-4 rounded-pill-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-xs sm:text-sm cursor-pointer transition-all"
                  >
                    ورود به حساب کاربری موجود
                  </Link>
                  {telegramSupportId && (
                    <a
                      href={`https://t.me/${telegramSupportId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-ink dark:text-white border-2 border-ink dark:border-slate-600 font-bold py-2.5 px-4 rounded-pill-md text-xs sm:text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Headphones size={15} className="text-teal" />
                      ارتباط با پشتیبانی در تلگرام
                    </a>
                  )}
                </div>
              </div>
            ) : smsOtpEnabled === false && googleAuthEnabled === false ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500">
                  <HelpCircle size={32} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base sm:text-lg font-black text-navy dark:text-white">امکان ثبت‌نام در دسترس نیست</h3>
                  <p className="text-xs sm:text-sm text-ink-subtle dark:text-slate-400 max-w-xs leading-relaxed">
                    روش‌های ثبت‌نام در حال حاضر توسط مدیریت موقتاً غیرفعال شده‌اند.
                  </p>
                </div>
                <Link
                  to="/admin/login"
                  className="w-full flex items-center justify-center gap-2 bg-teal text-white font-bold py-2.5 px-4 rounded-pill-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none text-xs sm:text-sm cursor-pointer"
                >
                  ورود به حساب کاربری
                </Link>
              </div>
            ) : (
              <>
                {/* ══════════════ حالت فقط گوگل (وقتی پیامک غیرفعال است) ══════════════ */}
                {smsOtpEnabled === false && googleAuthEnabled !== false && (
                  <div className="flex flex-col items-center gap-4 py-2 text-center animate-step-fade">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border-2 border-ink dark:border-slate-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-base sm:text-lg font-black text-navy dark:text-white">ورود و ثبت‌نام با گوگل</h3>
                      <p className="text-xs sm:text-sm text-ink-subtle dark:text-slate-400 max-w-xs leading-relaxed">
                        با یک کلیک و از طریق حساب جیمیل خود، به سادگی حساب کاربری ایجاد کنید و وارد شوید.
                      </p>
                    </div>

                    {error && (
                      <div className="w-full bg-female-light dark:bg-pink-950/40 border-[1.5px] border-female-normal/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-female-normal dark:text-pink-300">
                        {error}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={googleBusy}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-teal/10 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink dark:text-white border-2 border-ink dark:border-slate-600 font-black py-3 px-4 rounded-pill-md transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-sm cursor-pointer"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{googleBusy ? "در حال اتصال به گوگل..." : "ادامه با حساب کاربری Google"}</span>
                    </button>
                  </div>
                )}

                {/* ══════════════ مرحله ۱: ورود شماره موبایل ══════════════ */}
                {smsOtpEnabled !== false && step === 1 && (
                  <form onSubmit={handleSendOtp} className="flex flex-col gap-4 animate-step-fade">
                    <label className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-extrabold text-navy dark:text-slate-200">
                          شماره تلفن همراه
                        </span>
                        <span className="text-xs font-bold text-teal flex items-center gap-1">
                          <Sparkles size={13} />
                          پیامک تایید هویت
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="tel"
                          dir="ltr"
                          required
                          autoFocus
                          value={phone}
                          onChange={(e) => {
                            setPhone(toEnDigits(e.target.value));
                            setError(null);
                            setIsDuplicateUser(false);
                          }}
                          className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md pr-11 pl-4 py-2.5 font-bold text-ink dark:text-slate-100 placeholder:text-ink-subtle/40 dark:placeholder:text-slate-500 text-left focus:outline-none transition-all text-sm tracking-wider"
                          placeholder="0912 345 6789"
                          autoComplete="tel"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle/60 dark:text-slate-400 pointer-events-none flex items-center justify-center">
                          <Phone size={18} />
                        </div>
                      </div>
                      <span className="text-[11px] text-ink-subtle dark:text-slate-400">
                        کد فعال‌سازی ۵ رقمی به این شماره ارسال خواهد شد.
                      </span>
                    </label>

                    {error && (
                      <div className="bg-female-light dark:bg-pink-950/40 border-[1.5px] border-female-normal/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-female-normal dark:text-pink-300">
                        {error}
                        {isDuplicateUser && (
                          <div className="mt-2 pt-2 border-t border-female-normal/20">
                            <Link to="/admin/login" className="underline font-black text-teal dark:text-teal inline-flex items-center gap-1">
                              ورود به حساب کاربری ←
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="teal"
                      size="md"
                      disabled={busy || !phone.trim()}
                      className="w-full justify-center text-center mt-1"
                    >
                      <span className="w-full text-center flex items-center justify-center gap-2">
                        {busy ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>در حال ارسال کد...</span>
                          </>
                        ) : (
                          <>
                            <span>دریافت کد تایید پیامکی</span>
                            <ArrowLeft size={16} />
                          </>
                        )}
                      </span>
                    </Button>

                    {/* دکمه ورود با گوگل در مرحله ۱ */}
                    {googleAuthEnabled !== false && (
                      <>
                        <div className="flex items-center gap-3 my-0.5">
                          <div className="flex-1 h-[1px] bg-ink/10 dark:bg-slate-700" />
                          <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400">یا ثبت‌نام سریع با</span>
                          <div className="flex-1 h-[1px] bg-ink/10 dark:bg-slate-700" />
                        </div>

                        <button
                          type="button"
                          onClick={handleGoogleAuth}
                          disabled={googleBusy}
                          className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink dark:text-white border-2 border-ink dark:border-slate-600 font-bold py-2.5 px-4 rounded-pill-md transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-xs sm:text-sm cursor-pointer"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>{googleBusy ? "در حال اتصال به گوگل..." : "ورود یا ثبت‌نام با Google"}</span>
                        </button>
                      </>
                    )}
                  </form>
                )}

                {/* ══════════════ مرحله ۲: تایید کد OTP ══════════════ */}
                {smsOtpEnabled !== false && step === 2 && (
                  <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 animate-step-fade">
                    <div className="bg-bg-mint dark:bg-slate-800/80 border border-teal/30 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold text-navy dark:text-slate-200">
                        <Phone size={15} className="text-teal shrink-0" />
                        <span>کد ارسال شده به:</span>
                        <span dir="ltr" className="font-mono text-teal font-black text-sm">{phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setError(null);
                          setOtpCode("");
                        }}
                        className="inline-flex items-center gap-1 text-xs text-ink-subtle hover:text-teal font-bold transition-colors cursor-pointer bg-white dark:bg-slate-700/60 px-2.5 py-1 rounded-pill-sm border border-ink/10 dark:border-slate-600"
                      >
                        <Edit3 size={12} />
                        <span>تغییر شماره</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs sm:text-sm font-extrabold text-navy dark:text-slate-200 text-center">
                        کد تایید ۵ رقمی را وارد کنید
                      </span>

                      {/* نمایش ۵ باکس بصری زیبا برای ارقام کد */}
                      <div
                        className="relative flex items-center justify-center gap-2 sm:gap-2.5 my-1 cursor-text"
                        onClick={() => otpInputRef.current?.focus()}
                      >
                        <input
                          ref={otpInputRef}
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          maxLength={5}
                          required
                          autoFocus
                          value={otpCode}
                          onChange={(e) => {
                            const val = toEnDigits(e.target.value).replace(/\D/g, "").slice(0, 5);
                            setOtpCode(val);
                            setError(null);
                          }}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-text z-10"
                          autoComplete="one-time-code"
                        />

                        {[0, 1, 2, 3, 4].map((index) => {
                          const digit = otpCode[index];
                          const isCurrent = otpCode.length === index;
                          const isFilled = digit !== undefined;
                          return (
                            <div
                              key={index}
                              className={`w-11 sm:w-12 h-14 rounded-xl border-2 flex items-center justify-center font-mono text-xl sm:text-2xl font-black transition-all duration-200 ${
                                isCurrent
                                  ? "border-teal ring-4 ring-teal/20 bg-white dark:bg-slate-800 text-teal scale-105 shadow-sm"
                                  : isFilled
                                  ? "border-teal/70 bg-teal/5 dark:bg-teal/10 text-navy dark:text-white"
                                  : "border-ink/20 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-ink-subtle/30"
                              }`}
                            >
                              {digit ? (
                                <span>{faNum(digit)}</span>
                              ) : isCurrent ? (
                                <span className="w-1.5 h-6 bg-teal animate-pulse rounded-full" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-ink/15 dark:bg-slate-600" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-center text-ink-subtle dark:text-slate-400">
                        پیامک حاوی کد تایید معمولاً ظرف چند ثانیه دریافت می‌شود.
                      </p>
                    </div>

                    {/* ثانیه‌شمار و دکمه ارسال مجدد */}
                    <div className="flex items-center justify-between text-xs font-bold px-1 py-0.5">
                      <span className="text-ink-subtle dark:text-slate-400">
                        {cooldown > 0 ? "امکان ارسال مجدد:" : "کد قبلی تا زمان ارسال مجدد معتبر است"}
                      </span>
                      {cooldown > 0 ? (
                        <span className="font-mono text-teal font-black bg-teal/10 dark:bg-teal/20 px-2.5 py-1 rounded-md text-xs" dir="ltr">
                          {formatTimer(cooldown)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={remainingResends <= 0 || busy}
                          className="text-teal hover:underline inline-flex items-center gap-1.5 font-black disabled:opacity-50 disabled:no-underline cursor-pointer"
                        >
                          <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
                          <span>ارسال مجدد کد</span>
                          <span className="text-[10px] text-ink-subtle dark:text-slate-400">
                            ({faNum(remainingResends)} بار مجاز)
                          </span>
                        </button>
                      )}
                    </div>

                    {error && (
                      <div className="bg-female-light dark:bg-pink-950/40 border-[1.5px] border-female-normal/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-female-normal dark:text-pink-300">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="teal"
                      size="md"
                      disabled={busy || otpCode.trim().length < 5}
                      className="w-full justify-center text-center mt-1"
                    >
                      <span className="w-full text-center flex items-center justify-center gap-2">
                        {busy ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>در حال اعتبارسنجی...</span>
                          </>
                        ) : (
                          <>
                            <span>تایید کد و ادامه</span>
                            <ArrowLeft size={16} />
                          </>
                        )}
                      </span>
                    </Button>
                  </form>
                )}

                {/* ══════════════ مرحله ۳: نام و رمز عبور ══════════════ */}
                {step === 3 && (
                  <form onSubmit={handleCompleteRegistration} className="flex flex-col gap-3.5 animate-step-fade">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700/60 rounded-xl p-3 flex items-center justify-between gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <span>شماره همراه تایید شد:</span>
                        <span dir="ltr" className="font-mono font-black text-emerald-700 dark:text-emerald-400">{phone}</span>
                      </div>
                      <Badge color="green">
                        تایید شد ✓
                      </Badge>
                    </div>

                    {/* فیلد ایمیل */}
                    <label className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-extrabold text-navy dark:text-slate-200">
                          آدرس ایمیل <span className="text-teal font-black">*</span>
                        </span>
                        <span className="text-[11px] text-ink-subtle dark:text-slate-400">جهت ورود و اطلاعیه‌ها</span>
                      </div>
                      <div className="relative">
                        <input
                          type="email"
                          dir="ltr"
                          required
                          autoFocus
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setError(null); }}
                          className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md pr-11 pl-4 py-2.5 font-bold text-ink dark:text-slate-100 placeholder:text-ink-subtle/40 dark:placeholder:text-slate-500 text-left focus:outline-none transition-all text-sm"
                          placeholder="name@example.com"
                          autoComplete="email"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle/60 dark:text-slate-400 pointer-events-none flex items-center justify-center">
                          <Mail size={17} />
                        </div>
                      </div>
                    </label>

                    {/* فیلد نام و نام خانوادگی */}
                    <label className="flex flex-col gap-1">
                      <span className="text-xs sm:text-sm font-extrabold text-navy dark:text-slate-200">
                        نام و نام خانوادگی <span className="text-teal font-black">*</span>
                      </span>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); setError(null); }}
                          className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md pr-11 pl-4 py-2.5 font-bold text-ink dark:text-slate-100 placeholder:text-ink-subtle/40 dark:placeholder:text-slate-500 focus:outline-none transition-all text-sm"
                          placeholder="مثلاً: سارا رضایی"
                          autoComplete="name"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle/60 dark:text-slate-400 pointer-events-none flex items-center justify-center">
                          <User size={17} />
                        </div>
                      </div>
                    </label>

                    {/* رمز عبور و تکرار */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs sm:text-sm font-extrabold text-navy dark:text-slate-200">
                          رمز عبور <span className="text-teal font-black">*</span>
                        </span>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            dir="ltr"
                            required
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(null); }}
                            className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md pr-11 pl-11 py-2.5 font-bold text-ink dark:text-slate-100 placeholder:text-ink-subtle/40 dark:placeholder:text-slate-500 text-left focus:outline-none transition-all text-sm"
                            placeholder="حداقل ۶ کاراکتر"
                            autoComplete="new-password"
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle/60 dark:text-slate-400 pointer-events-none flex items-center justify-center">
                            <Lock size={17} />
                          </div>
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                            <PasswordToggle
                              visible={showPassword}
                              onToggle={() => setShowPassword(!showPassword)}
                              size={16}
                              ariaLabel="نمایش یا مخفی‌سازی رمز عبور"
                            />
                          </div>
                        </div>
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs sm:text-sm font-extrabold text-navy dark:text-slate-200">
                          تکرار رمز عبور <span className="text-teal font-black">*</span>
                        </span>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            dir="ltr"
                            required
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                            className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md pr-11 pl-11 py-2.5 font-bold text-ink dark:text-slate-100 placeholder:text-ink-subtle/40 dark:placeholder:text-slate-500 text-left focus:outline-none transition-all text-sm"
                            placeholder="تکرار رمز عبور"
                            autoComplete="new-password"
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle/60 dark:text-slate-400 pointer-events-none flex items-center justify-center">
                            <Lock size={17} />
                          </div>
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                            <PasswordToggle
                              visible={showConfirmPassword}
                              onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                              size={16}
                              ariaLabel="نمایش یا مخفی‌سازی تکرار رمز عبور"
                            />
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* راهنمای زنده اعتبارسنجی رمز عبور */}
                    {password && (
                      <div className="bg-bg-mint dark:bg-slate-800/70 border border-ink/10 dark:border-slate-700 rounded-xl p-2.5 flex flex-col gap-1 text-[11px] font-bold">
                        <div className={`flex items-center gap-1.5 ${password.length >= 6 ? "text-emerald-600 dark:text-emerald-400" : "text-ink-subtle dark:text-slate-400"}`}>
                          <Check size={12} className={password.length >= 6 ? "stroke-[3]" : "opacity-40"} />
                          <span>حداقل ۶ نویسه</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${/[A-Za-z]/.test(password) && /\d/.test(password) ? "text-emerald-600 dark:text-emerald-400" : "text-ink-subtle dark:text-slate-400"}`}>
                          <Check size={12} className={/[A-Za-z]/.test(password) && /\d/.test(password) ? "stroke-[3]" : "opacity-40"} />
                          <span>شامل حروف انگلیسی و عدد (مثلاً pors1234)</span>
                        </div>
                        {confirmPassword && (
                          <div className={`flex items-center gap-1.5 ${password === confirmPassword ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            <Check size={12} className={password === confirmPassword ? "stroke-[3]" : "opacity-40"} />
                            <span>{password === confirmPassword ? "تطابق رمز و تکرار آن تایید است" : "رمز و تکرار آن یکسان نیستند"}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {error && (
                      <div className="bg-female-light dark:bg-pink-950/40 border-[1.5px] border-female-normal/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-female-normal dark:text-pink-300">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="teal"
                      size="md"
                      disabled={busy}
                      className="w-full justify-center text-center mt-2"
                    >
                      <span className="w-full text-center flex items-center justify-center gap-2">
                        {busy ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>در حال ایجاد حساب و ورود...</span>
                          </>
                        ) : (
                          <>
                            <span>تکمیل ثبت‌نام و ورود به پنل</span>
                            <ArrowLeft size={16} />
                          </>
                        )}
                      </span>
                    </Button>
                  </form>
                )}
              </>
            )}

            {/* فوتر فرم */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-ink/10 dark:border-slate-800">
              <div className="flex items-center justify-center gap-2 text-[13px] font-bold text-ink-subtle dark:text-slate-400 text-center flex-wrap">
                <span>قبلاً حساب ساخته‌اید؟</span>
                <Link
                  to="/admin/login"
                  className="text-[13px] font-extrabold text-teal hover:underline inline-flex items-center gap-1 bg-teal/10 hover:bg-teal/20 px-3 py-1.5 rounded-pill-sm transition-all"
                >
                  ورود به پنل کاربری
                </Link>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="text-[12px] font-bold text-ink-subtle hover:text-teal hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <HelpCircle size={13} />
                  نیاز به راهنمایی یا پشتیبانی دارید؟
                </button>
              </div>
            </div>
          </div>
        </StickerCard>
      </div>

      {/* مودال پشتیبانی و راهنمایی */}
      <Modal
        open={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        title="راهنمایی و پشتیبانی"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-teal/10 border-2 border-teal flex items-center justify-center text-teal">
            <Headphones size={28} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h4 className="text-base sm:text-lg font-black text-navy">پشتیبانی و ثبت‌نام</h4>
            <p className="text-xs sm:text-sm font-semibold text-ink-subtle leading-6 max-w-md">
              در صورت دریافت نکردن پیامک یا بروز هرگونه مشکل، کارشناسان ما در تلگرام در خدمت شما هستند.
            </p>
          </div>

          <div className="w-full bg-bg-mint border-2 border-ink/20 rounded-pill-md p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-1">
            <div className="flex items-center gap-2 text-navy font-bold text-xs sm:text-sm">
              <Headphones size={18} className="text-teal shrink-0" />
              <span>ارتباط در تلگرام:</span>
              <Badge color="yellow">@{telegramSupportId}</Badge>
            </div>
            <a
              href={`https://t.me/${telegramSupportId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-teal hover:bg-navy text-white px-4 py-2 rounded-pill-md text-xs sm:text-sm font-black transition-all border-2 border-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
            >
              <Send size={14} className="rotate-45" />
              ارسال پیام در تلگرام
              <ExternalLink size={12} />
            </a>
          </div>

          <Button
            variant="neutral"
            size="sm"
            onClick={() => setShowSupportModal(false)}
            className="mt-1"
          >
            بستن پنجره
          </Button>
        </div>
      </Modal>
    </div>
  );
}
