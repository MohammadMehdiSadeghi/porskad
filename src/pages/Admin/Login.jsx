import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import SEO from "../../components/ui/SEO";
import { logActivity } from "../../lib/activityLogger";

export default function Login() {
  const { login, user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to={isOwner() ? "/admin" : "/admin/forms"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await login(email.trim(), password);
      logActivity("login", "user", null, { email: email.trim() });
      navigate("/admin/forms", { replace: true });
    } catch (err) {
      setError(
        err?.message?.includes("Invalid login")
          ? "ایمیل یا رمز عبور درست نیست."
          : "ورود ناموفق بود؛ دوباره تلاش کن.",
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
              <span className="text-sm font-extrabold text-navy">رمز عبور</span>
              <input
                type="password"
                dir="ltr"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20
                  rounded-pill-md px-4 py-3 font-semibold text-ink text-left focus:outline-none transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div className="rotate-[-1deg] bg-white border-2 border-magenta rounded-pill-md px-3.5 py-2.5 text-sm font-bold text-magenta-text">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 mt-1">
              <Button
                type="submit"
                variant="teal"
                size="lg"
                disabled={busy}
                rotate="-rotate-[1deg]"
                className="w-full justify-center"
              >
                {busy ? "در حال ورود..." : "ورود به پنل 🚪"}
              </Button>

              <div className="flex items-center justify-between text-xs font-bold text-ink-subtle pt-3 border-t border-ink/10">
                <span>حساب کاربری ندارید؟</span>
                <Link
                  to="/register"
                  className="text-teal hover:underline"
                >
                  ثبت‌نام رایگان 👈
                </Link>
              </div>
            </div>
          </form>
        </StickerCard>
      </div>
    </div>
  );
}
