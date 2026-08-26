import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate("/admin", { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
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
      <div className="w-full max-w-md -rotate-[0.7deg]">
        <StickerCard theme="white">
          <form onSubmit={handleSubmit} className="p-7 sm:p-9 flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <Badge color="navy" rotate="rotate-[2deg]">پنل مدیریت پرس‌یار</Badge>
              <h1 className="text-2xl font-black text-navy">ورود ادمین</h1>
              <p className="text-sm font-semibold text-ink-subtle">
                فقط مدیر سرویس به این بخش دسترسی دارد.
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
                  rounded-pill-md px-4 py-3 font-semibold text-ink text-left focus:outline-none transition-all"
                placeholder="admin@porsyar.ir"
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

            <div className="flex items-center justify-between gap-3 mt-1">
              <Button type="submit" variant="teal" size="lg" disabled={busy} rotate="-rotate-[1deg]">
                {busy ? "در حال ورود..." : "ورود 🚪"}
              </Button>
              <Link to="/" className="text-sm font-bold text-ink-subtle hover:text-navy transition-colors">
                برگشت به سایت ↩
              </Link>
            </div>
          </form>
        </StickerCard>
      </div>
    </div>
  );
}
