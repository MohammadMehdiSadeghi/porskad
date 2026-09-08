import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Headphones, Send, ExternalLink, HelpCircle, KeyRound } from "lucide-react";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone, isValidPassword } from "../../lib/validators";
import SEO from "../../components/ui/SEO";

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
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
    return <Navigate to="/admin/forms" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("لطفاً نام و نام خانوادگی خود را وارد کنید.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("لطفاً یک آدرس ایمیل معتبر وارد کنید.");
      return;
    }

    const normalizedPhone = normalizeIranPhone(phone);
    if (!isValidIranPhone(phone)) {
      setError("شماره موبایل نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹).");
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
    try {
      const data = await register(email.trim(), password, fullName.trim(), normalizedPhone);
      if (data?.session) {
        navigate("/admin/forms", { replace: true });
      } else {
        // سعی برای ورود خودکار در صورتی که ایمیل کانفرمیشن نیاز نباشد
        try {
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (!loginError && loginData?.session) {
            navigate("/admin/forms", { replace: true });
            return;
          }
        } catch {
          // اگر تایید ایمیل الزامی باشد
        }
        setSuccessNotice(true);
      }
    } catch (err) {
      console.error(err);
      if (err?.message?.includes("User already registered")) {
        setError("این ایمیل قبلاً ثبت شده است. لطفاً وارد شوید.");
      } else if (err?.message?.toLowerCase().includes("rate limit")) {
        setError("سقف ارسال ایمیل تایید سپابیس پر شده است. لطفاً در داشبورد Supabase بخش Authentication > Providers > Email گزینه Confirm email را خاموش کنید تا ثبت‌نام‌ها فوری و بدون محدودیت انجام شوند.");
      } else if (err?.message?.toLowerCase().includes("database error")) {
        setError("خطای پایگاه داده در ذخیره کاربر جدید. لطفاً مایگریشن 0055 را در SQL Editor داشبورد Supabase اجرا کنید.");
      } else {
        setError(err?.message || "ثبت‌نام با خطا مواجه شد؛ لطفاً دوباره تلاش کنید.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen dot-pattern bg-bg-mint flex items-center justify-center p-4">
      <SEO
        title="ثبت‌نام کاربر جدید"
        description="ثبت‌نام رایگان در سامانه ساخت فرم و نظرسنجی پرس‌کاد"
        url="/register"
        noIndex
      />
      <div className="w-full max-w-md -rotate-[0.5deg]">
        <StickerCard theme="white">
          {successNotice ? (
            <div className="p-7 sm:p-9 flex flex-col items-center text-center gap-4">
              <Badge color="green" rotate="rotate-[1deg]">
                ثبت‌نام انجام شد
              </Badge>
              <h2 className="text-xl font-black text-navy">خوش آمدید!</h2>
              <p className="text-sm font-semibold text-ink-subtle leading-6">
                حساب کاربری شما با موفقیت ایجاد شد. اکنون می‌توانید وارد حساب خود شوید و اولین فرم خود را بسازید.
              </p>
              <Button
                as={Link}
                to="/admin/login"
                variant="teal"
                size="md"
                className="mt-2"
              >
                ورود به پنل کاربری
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-7 sm:p-9 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Badge color="navy" rotate="rotate-[2deg]">
                  پرس‌کاد — سامانه فرم‌ساز
                </Badge>
                <h1 className="text-xl sm:text-2xl font-black text-navy">ثبت‌نام رایگان</h1>
                <p className="text-xs sm:text-sm font-semibold text-ink-subtle">
                  فرم‌های هوشمند، جذاب و بدون کدنویسی بسازید
                </p>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs sm:text-sm font-extrabold text-navy">نام و نام خانوادگی</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all text-sm"
                  placeholder="مثلاً: علی محمدی"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs sm:text-sm font-extrabold text-navy">ایمیل</span>
                <input
                  type="email"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink text-left focus:outline-none transition-all text-sm"
                  placeholder="name@example.com"
                  autoComplete="username"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-navy">شماره موبایل</span>
                  <span className="text-xs font-bold text-teal">اجباری</span>
                </div>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink text-left focus:outline-none transition-all text-sm"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  autoComplete="tel"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm font-extrabold text-navy">رمز عبور</span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink text-left focus:outline-none transition-all text-sm"
                      placeholder="حداقل ۶ کاراکتر (حروف و عدد)"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm font-extrabold text-navy">تکرار رمز عبور</span>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      dir="ltr"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink text-left focus:outline-none transition-all text-sm"
                      placeholder="تکرار رمز"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "مخفی کردن تکرار رمز عبور" : "نمایش تکرار رمز عبور"}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </div>

              {error && (
                <div className="flex flex-col gap-2.5">
                  <div className="rotate-[-0.5deg] bg-female-light border-2 border-female-normal rounded-pill-md px-3.5 py-2 text-xs sm:text-sm font-bold text-female-normal">
                    {error}
                  </div>
                  <div className="bg-bg-yellow/40 border-2 border-dashed border-ink/25 rounded-pill-md p-3 flex items-center justify-between gap-2 text-xs font-bold text-navy">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Headphones size={15} className="text-teal shrink-0" />
                      <span className="truncate">نیاز به راهنمایی دارید؟ پشتیبانی:</span>
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

              <div className="flex flex-col gap-3 mt-2">
                <Button
                  type="submit"
                  variant="teal"
                  size="md"
                  disabled={busy}
                  rotate="-rotate-[1deg]"
                  className="w-full justify-center text-center"
                >
                  <span className="w-full text-center">{busy ? "در حال ساخت حساب..." : "ساخت حساب کاربری"}</span>
                </Button>

                <div className="flex items-center justify-center gap-2 text-[13px] font-bold text-ink-subtle pt-2 border-t border-ink/10 text-center flex-wrap">
                  <span>قبلاً حساب ساخته‌اید؟</span>
                  <Link
                    to="/admin/login"
                    className="text-[13px] font-extrabold text-teal hover:underline inline-flex items-center gap-1 bg-teal/10 hover:bg-teal/20 px-3 py-1.5 rounded-pill-sm transition-all"
                  >
                    ورود به پنل کاربری
                  </Link>
                </div>

                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSupportModal(true)}
                    className="text-[12px] font-bold text-ink-subtle hover:text-teal hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <HelpCircle size={13} />
                    فراموشی رمز یا نیاز به راهنمایی؟
                  </button>
                </div>
              </div>
            </form>
          )}
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
            <h4 className="text-base sm:text-lg font-black text-navy">پشتیبانی و بازیابی حساب کاربری</h4>
            <p className="text-xs sm:text-sm font-semibold text-ink-subtle leading-6 max-w-md">
              در صورت وجود هرگونه مشکل در ثبت‌نام، ورود، یا فراموشی رمز عبور، همکاران ما در تلگرام پاسخگوی شما هستند.
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
