import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Headphones, Send, ExternalLink } from "lucide-react";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import SEO from "../../components/ui/SEO";
import { logActivity } from "../../lib/activityLogger";

export default function Login() {
  const { login, user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [telegramSupportId, setTelegramSupportId] = useState("porskad_support");

  useEffect(() => {
    async function loadTelegramSupport() {
      try {
        const { data } = await supabase.rpc("get_system_settings");
        if (data?.telegram_support_id) {
          setTelegramSupportId(String(data.telegram_support_id).replace(/^@/, "").trim());
        }
      } catch {
        try {
          const { data } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "telegram_support_id")
            .maybeSingle();
          if (data?.value) {
            const val = typeof data.value === "string" ? data.value : JSON.stringify(data.value);
            setTelegramSupportId(val.replace(/[ "@]/g, "").trim());
          }
        } catch {}
      }
    }
    loadTelegramSupport();
  }, []);

  if (user) {
    return <Navigate to={isOwner() ? "/admin" : "/admin/forms"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      logActivity("login", "user", null, { email: email.trim() });
      navigate("/admin/forms", { replace: true });
    } catch (err) {
      setError(
        err?.message?.includes("Invalid login")
          ? "ایمیل یا رمز عبور درست نیست."
          : "ورود ناموفق بود؛ لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen dot-pattern bg-bg-mint flex items-center justify-center p-4">
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
              <h1 className="text-xl sm:text-2xl font-black text-navy">ورود به حساب</h1>
              <p className="text-sm font-semibold text-ink-subtle">
                ایمیل و رمز عبور خود را برای ورود وارد کنید.
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-extrabold text-navy">ایمیل</span>
              <input
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20
                  rounded-pill-md px-4 py-2.5 font-semibold text-ink text-left focus:outline-none transition-all"
                placeholder="Example@gmail.com"
                autoComplete="username"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-navy">رمز عبور</span>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-bold text-teal hover:text-navy hover:underline transition-colors cursor-pointer"
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
                  className="w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20
                    rounded-pill-md px-4 py-3 pl-11 font-semibold text-ink text-left focus:outline-none transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && (
              <div className="flex flex-col gap-2.5">
                <div className="rotate-[-0.5deg] bg-white border-2 border-magenta rounded-pill-md px-3.5 py-2.5 text-sm font-bold text-magenta-text">
                  {error}
                </div>
                <div className="bg-bg-yellow/40 border-2 border-dashed border-ink/25 rounded-pill-md p-3 flex items-center justify-between gap-2 text-xs font-bold text-navy">
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
