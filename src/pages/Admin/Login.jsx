import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { KeyRound, Headphones, Send, ExternalLink } from "lucide-react";
import PasswordToggle from "../../components/ui/PasswordToggle";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone } from "../../lib/validators";
import SEO from "../../components/ui/SEO";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { logActivity } from "../../lib/activityLogger";

export default function Login() {
  const { login, loginWithGoogle, user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [telegramSupportId, setTelegramSupportId] = useState("porskad_support");

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase.rpc("get_system_settings");
        if (!error && data) {
          if (data.telegram_support_id) {
            setTelegramSupportId(String(data.telegram_support_id).replace(/^@/, "").trim());
          }
          if (typeof data.google_auth_enabled === "boolean") {
            setGoogleAuthEnabled(data.google_auth_enabled);
          }
        }
      } catch (err) {
        console.warn("RPC get_system_settings error in login:", err);
      }

      try {
        const { data } = await supabase
          .from("system_settings")
          .select("key, value")
          .in("key", ["telegram_support_id", "google_auth_enabled"]);
        if (Array.isArray(data) && data.length > 0) {
          for (const row of data) {
            if (row.key === "telegram_support_id" && row.value) {
              const val = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
              setTelegramSupportId(val.replace(/[ "@]/g, "").trim());
            }
            if (row.key === "google_auth_enabled" && row.value !== undefined) {
              setGoogleAuthEnabled(row.value === true || row.value === "true");
            }
          }
        }
      } catch {}
    }
    loadSettings();
  }, []);

  const hasIncomingToken = typeof window !== "undefined" && (
    window.location.hash.includes("access_token=") ||
    window.location.search.includes("token_hash=") ||
    window.location.search.includes("impersonate_token=") ||
    window.location.search.includes("code=")
  );

  if (hasIncomingToken && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-neutral dark:bg-[#0B0F19]" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-navy dark:text-white">در حال ورود به حساب کاربری...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={isOwner() ? "/admin" : "/admin/forms"} replace />;
  }

  async function handleGoogleLogin() {
    setGoogleBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError("خطا در ورود با حساب گوگل: " + (err?.message || "لطفاً دوباره تلاش کنید."));
      setGoogleBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const rawInput = email.trim();
      let targetEmail = rawInput;

      // اگر کاربر شماره موبایل ایران وارد کرده باشد
      if (isValidIranPhone(rawInput)) {
        const cleanPhone = normalizeIranPhone(rawInput);
        targetEmail = `${cleanPhone}@porskad.local`;

        // ابتدا تلاش با ایمیل ساخته‌شده اختصاصی موبایل
        try {
          await login(targetEmail, password);
          logActivity("login", "user", null, { phone: cleanPhone });
          navigate(isOwner() ? "/admin" : "/admin/forms", { replace: true });
          return;
        } catch (phoneErr) {
          // اگر پیدا نشد، ممکن است با ایمیل عادی ثبت‌نام کرده ولی شماره‌اش در profiles باشد
          try {
            const { data: prof } = await supabase
              .from("profiles")
              .select("email")
              .eq("phone", cleanPhone)
              .maybeSingle();
            if (prof?.email) {
              await login(prof.email, password);
              logActivity("login", "user", null, { email: prof.email, phone: cleanPhone });
              navigate(isOwner() ? "/admin" : "/admin/forms", { replace: true });
              return;
            }
          } catch {}
          throw phoneErr;
        }
      }

      await login(targetEmail, password);
      logActivity("login", "user", null, { email: targetEmail });
      navigate(isOwner() ? "/admin" : "/admin/forms", { replace: true });
    } catch (err) {
      setError(
        err?.message?.includes("Invalid login")
          ? "ایمیل، شماره موبایل یا رمز عبور اشتباه است."
          : "ورود ناموفق بود؛ لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen dot-pattern bg-bg-mint dark:bg-dark-canvas flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4 z-20">
        <ThemeToggle />
      </div>
      <SEO
        title="ورود به حساب کاربری"
        description="ورود به پنل کاربری پرس‌کاد — سیستم فرم و نظرسنجی آنلاین"
        url="/admin/login"
        noIndex
      />
      <div className="w-full max-w-md -rotate-[0.7deg]">
        <StickerCard theme="white">
          <form
            onSubmit={handleSubmit}
            className="p-7 sm:p-9 flex flex-col gap-5"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <Badge color="navy" rotate="rotate-[2deg]">
                پرس‌کاد — فرم‌ساز آنلاین
              </Badge>
              <h1 className="text-xl sm:text-2xl font-black text-navy dark:text-white">ورود به حساب</h1>
              <p className="text-sm font-semibold text-ink-subtle dark:text-slate-400">
                ایمیل و رمز عبور خود را برای ورود وارد کنید.
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-extrabold text-navy dark:text-slate-200">ایمیل یا شماره موبایل</span>
              <input
                type="text"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20
                  rounded-pill-md px-4 py-2.5 font-semibold text-ink dark:text-slate-100 text-left focus:outline-none transition-all"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹ یا name@example.com"
                autoComplete="username"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-navy dark:text-slate-200">رمز عبور</span>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-bold text-teal hover:text-navy dark:hover:text-teal-light transition-colors cursor-pointer"
                >
                  فراموشی رمز عبور؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-ink/25 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/20
                    rounded-pill-md px-4 py-3 pl-11 font-semibold text-ink dark:text-slate-100 text-left focus:outline-none transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <PasswordToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                    size={18}
                  />
                </div>
              </div>
            </label>

            {error && (
              <div className="flex flex-col gap-2.5">
                <div className="rotate-[-0.5deg] bg-white dark:bg-slate-900 border-2 border-magenta rounded-pill-md px-3.5 py-2.5 text-sm font-bold text-magenta-text dark:text-pink-300">
                  {error}
                </div>
                <div className="bg-bg-yellow/40 dark:bg-amber-950/40 border-2 border-dashed border-ink/25 dark:border-amber-700/60 rounded-pill-md p-3 flex items-center justify-between gap-2 text-xs font-bold text-navy dark:text-amber-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Headphones size={15} className="text-teal shrink-0" />
                    <span className="truncate">نیاز به کمک دارید؟ پشتیبانی:</span>
                  </div>
                  <a
                    href={`https://t.me/${telegramSupportId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-teal hover:text-white border-2 border-ink text-navy px-2.5 py-1 rounded-pill-sm text-xs font-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] shrink-0"
                  >
                    <Send size={11} className="rotate-45" />
                    <span>@{telegramSupportId}</span>
                  </a>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-1">
              <Button
                type="submit"
                variant="teal"
                size="lg"
                disabled={busy}
                rotate="-rotate-[1deg]"
                className="w-full justify-center text-center"
              >
                <span className="w-full text-center">{busy ? "در حال ورود..." : "ورود به پنل"}</span>
              </Button>

              {/* ورود مستقیم با گوگل */}
              {googleAuthEnabled !== false && (
                <>
                  <div className="flex items-center gap-3 my-0.5">
                    <div className="flex-1 h-[1px] bg-ink/10 dark:bg-slate-700" />
                    <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400">یا</span>
                    <div className="flex-1 h-[1px] bg-ink/10 dark:bg-slate-700" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleBusy || busy}
                    className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink dark:text-white border-2 border-ink dark:border-slate-600 font-bold py-2.5 px-4 rounded-pill-md transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-xs sm:text-sm cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{googleBusy ? "در حال اتصال به گوگل..." : "ورود مستقیم با حساب Google"}</span>
                  </button>
                </>
              )}

              <div className="flex items-center justify-center gap-2 text-[13px] font-bold text-ink-subtle pt-3 border-t border-ink/10 text-center flex-wrap">
                <span>حساب کاربری ندارید؟</span>
                <Link
                  to="/register"
                  className="text-[13px] font-extrabold text-teal hover:underline inline-flex items-center gap-1 bg-teal/10 hover:bg-teal/20 px-3 py-1.5 rounded-pill-sm transition-all"
                >
                  ثبت‌نام رایگان
                </Link>
              </div>
            </div>
          </form>
        </StickerCard>
      </div>

      {/* مودال فراموشی رمز عبور */}
      <Modal
        open={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="بازیابی رمز عبور"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-teal/10 border-2 border-teal flex items-center justify-center text-teal">
            <KeyRound size={28} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h4 className="text-base sm:text-lg font-black text-navy">فراموشی رمز عبور حساب کاربری</h4>
            <p className="text-xs sm:text-sm font-semibold text-ink-subtle leading-6 max-w-md">
              برای تغییر یا بازیابی سریع رمز عبور، لطفاً ایمیل حساب خود را به آیدی پشتیبانی تلگرام ارسال فرمایید تا در کمترین زمان رمز عبور شما ریست شود.
            </p>
          </div>

          <div className="w-full bg-bg-mint border-2 border-ink/20 rounded-pill-md p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-1">
            <div className="flex items-center gap-2 text-navy font-bold text-xs sm:text-sm">
              <Headphones size={18} className="text-teal shrink-0" />
              <span>پشتیبانی تلگرام:</span>
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
            onClick={() => setShowForgotModal(false)}
            className="mt-1"
          >
            بستن پنجره
          </Button>
        </div>
      </Modal>
    </div>
  );
}
