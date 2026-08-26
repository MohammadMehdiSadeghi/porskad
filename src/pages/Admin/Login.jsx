import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Lock, Mail } from "lucide-react";

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
          : "ورود ناموفق بود؛ دوباره تلاش کن."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-mint flex items-center justify-center p-4 relative overflow-hidden">
      {/* واترمارک تزئینی پس‌زمینه */}
      <span
        aria-hidden="true"
        className="absolute -bottom-16 -left-10 select-none pointer-events-none text-navy/[0.04] -rotate-12 leading-none"
        style={{ fontWeight: 950, fontSize: "clamp(9rem, 30vw, 15rem)" }}
      >
        پرسکاد
      </span>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute top-[0.15rem] left-[0.15rem] w-full h-full bg-teal-text rounded-[0_0.625rem_0_0.625rem] [corner-shape:squircle]"
              />
              <div className="relative w-11 h-11 bg-teal border-2 border-ink/10 rounded-[0_0.625rem_0_0.625rem] [corner-shape:squircle] flex items-center justify-center">
                <span className="text-white font-black text-xl">پ</span>
              </div>
            </div>
            <span className="text-2xl font-black text-navy">پرسکاد</span>
          </div>
          <p className="text-navy/60 text-sm font-semibold">پنل مدیریت — ورود امن</p>
        </div>

        {/* Card — استیکری با سایه‌ی افست دولایه */}
        <div className="relative rotate-[0.5deg]">
          <div
            aria-hidden="true"
            className="absolute top-2 left-2 w-full h-full bg-navy rounded-[1.75rem] [corner-shape:squircle]"
          />
          <div className="relative z-10 bg-white border-2 border-navy rounded-[1.75rem] [corner-shape:squircle] p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-navy mb-1.5">
                  ایمیل
                </label>
                <div className="relative">
                  <Mail
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40"
                    size={18}
                  />
                  <input
                    type="email"
                    dir="ltr"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg-neutral border-2 border-transparent focus:border-teal focus:bg-white
                      rounded-[0.75rem] px-4 pr-10 py-2.5 font-medium text-navy text-left focus:outline-none transition-all"
                    placeholder="admin@porskad.ir"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy mb-1.5">
                  رمز عبور
                </label>
                <div className="relative">
                  <Lock
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40"
                    size={18}
                  />
                  <input
                    type="password"
                    dir="ltr"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-neutral border-2 border-transparent focus:border-teal focus:bg-white
                      rounded-[0.75rem] px-4 pr-10 py-2.5 font-medium text-navy text-left focus:outline-none transition-all"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-blush border-2 border-magenta-text/30 rounded-[0.75rem] px-4 py-3 text-sm font-bold text-magenta-text">
                  <span className="shrink-0">⚠</span>
                  {error}
                </div>
              )}

              <div className="relative inline-flex w-full group pt-1">
                <span
                  aria-hidden="true"
                  className="absolute top-[0.15rem] left-[0.15rem] w-full h-full bg-teal-text rounded-[0.75rem] [corner-shape:squircle]"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="relative z-10 w-full bg-teal border-2 border-teal hover:brightness-105 disabled:bg-gray-300 disabled:border-gray-300
                    text-white font-extrabold py-2.5 rounded-[0.75rem] [corner-shape:squircle] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {busy ? "در حال ورود..." : "ورود به پنل"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-navy/40 font-medium mt-6">
          فقط مدیران مجاز به ورود به این بخش هستند.
        </p>
      </div>
    </div>
  );
}
