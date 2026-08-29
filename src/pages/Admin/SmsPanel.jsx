import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { faNum } from "../../lib/utils";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import StickerCard from "../../components/ui/StickerCard";
import EmptyState from "../../components/ui/EmptyState";
import SEO from "../../components/ui/SEO";
import {
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Inbox,
  History,
  BarChart3,
  Settings,
} from "lucide-react";

const inputCls =
  "w-full bg-white border-2 border-ink/15 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all";

// ═══════════════════════════════════════════════════════════════
// ─── فرمت ریال ───
// ═══════════════════════════════════════════════════════════════
function formatRial(amount) {
  if (!amount && amount !== 0) return "—";
  return Number(amount).toLocaleString("fa-IR") + " ریال";
}

export default function SmsPanel() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState("dashboard");

  // ─── Send SMS ───
  const [smsNumbers, setSmsNumbers] = useState("");
  const [smsText, setSmsText] = useState("");
  const [sendResult, setSendResult] = useState(null);

  // ─── Settings ───
  const [settingsForm, setSettingsForm] = useState({
    amoot_token: "",
    line_number: "public",
    sender_name: "پرسکاد",
  });

  const canSms = hasPermission("manage_sms");

  // ─── Placeholder handlers (UI only — no real logic) ───
  function handleSendSms(e) {
    e.preventDefault();
    if (!smsText.trim() || !smsNumbers.trim()) return;
    setSendResult({ success: true });
    setSmsText("");
    setSmsNumbers("");
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    // UI only — no real save
  }

  if (!canSms) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <XCircle size={64} className="text-magenta/30" />
        <h2 className="text-xl font-black text-navy">دسترسی غیرمجاز</h2>
        <p className="text-sm font-semibold text-ink-subtle">
          شما مجوز دسترسی به پنل پیامک را ندارید.
        </p>
      </div>
    );
  }

  const TABS = [
    { id: "dashboard", label: "داشبورد", icon: BarChart3 },
    { id: "send", label: "ارسال پیامک", icon: Send },
    { id: "history", label: "تاریخچه", icon: History },
    { id: "inbox", label: "دریافتی", icon: Inbox },
    { id: "settings", label: "تنظیمات آموت", icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-8">
      <SEO
        title="پنل پیامک"
        description="ارسال و مدیریت پیامک — پنل مدیریت پرسکاد"
        url="/admin/sms"
        noIndex
      />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy flex items-center gap-2">
            <MessageSquare size={22} className="text-teal" />
            پنل پیامک
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-0.5">
            ارسال و مدیریت پیامک
          </p>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-1 bg-white border-2 border-ink/10 rounded-pill-md p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-pill-sm text-sm font-bold transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-teal text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]"
                : "text-ink-subtle hover:text-ink hover:bg-bg-lavender"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ تب داشبورد ═══════ */}
      {tab === "dashboard" && (
        <div className="flex flex-col gap-8">
          {/* آمار */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            <StatCard
              theme="teal"
              label="ارسال امروز"
              value={faNum(0)}
              caption="پیامک ارسال شده"
            />
            <StatCard
              theme="navy"
              label="ارسال ماه"
              value={faNum(0)}
              caption="پیامک این ماه"
            />
            <StatCard
              theme="magenta"
              label="تحویل شده"
              value={faNum(0)}
              caption="تایید شده توسط گیرنده"
            />
            <StatCard
              theme="orange"
              label="دریافتی امروز"
              value={faNum(0)}
              caption="پیامک دریافتی"
            />
          </div>

          {/* وضعیت حساب */}
          <div>
            <h2 className="text-xl font-extrabold text-navy mb-3">
              وضعیت حساب آموت
            </h2>
            <div className="rotate-[0.3deg]">
              <StickerCard theme="white">
                <div className="p-6 text-center">
                  <AlertTriangle
                    size={40}
                    className="mx-auto text-orange/50 mb-3"
                  />
                  <p className="text-sm font-bold text-ink-subtle mb-3">
                    اطلاعات حساب قابل دریافت نیست
                  </p>
                  <p className="text-xs text-ink-subtle">
                    تنظیمات آموت را در تب «تنظیمات آموت» وارد کنید.
                  </p>
                </div>
              </StickerCard>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ تب ارسال پیامک ═══════ */}
      {tab === "send" && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="-rotate-[0.5deg]">
            <StickerCard theme="white">
              <form onSubmit={handleSendSms} className="p-4 flex flex-col gap-4">
                {/* شماره موبایل‌ها */}
                <div>
                  <label className="block text-base font-extrabold text-navy mb-1">
                    شماره موبایل‌ها
                  </label>
                  <textarea
                    value={smsNumbers}
                    onChange={(e) => setSmsNumbers(e.target.value)}
                    className={inputCls + " min-h-[70px] font-mono text-xs"}
                    placeholder={"09121234567\n09351234567\n09191234567"}
                    dir="ltr"
                  />
                  <p className="text-[0.65rem] font-semibold text-ink-subtle mt-0.5">
                    {
                      smsNumbers
                        .split(/[,;\n]+/)
                        .map((n) => n.trim())
                        .filter(Boolean).length
                    }{" "}
                    شماره وارد شده — فرمت صحیح: 0912XXXXXXXX یا +98912XXXXXXXX
                  </p>
                </div>

                {/* متن پیامک */}
                <div>
                  <label className="block text-base font-extrabold text-navy mb-1">
                    متن پیامک
                  </label>
                  <textarea
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    className={inputCls + " min-h-[100px] text-xs"}
                    placeholder="متن پیامک خود را اینجا بنویسید..."
                  />
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-sm font-semibold text-ink-subtle">
                      {smsText.length} کاراکتر
                    </span>
                    <span className="text-sm font-semibold text-ink-subtle">
                      {Math.ceil(smsText.length / 70)} صفحه
                    </span>
                  </div>
                </div>

                {/* نتیجه ارسال */}
                {sendResult && (
                  <div
                    className={`rounded-pill-md border-2 p-4 ${
                      sendResult.success
                        ? "bg-ecosystem-light border-teal"
                        : "bg-female-light border-magenta"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {sendResult.success ? (
                        <CheckCircle size={20} className="text-teal-text" />
                      ) : (
                        <XCircle size={20} className="text-magenta-text" />
                      )}
                      <span
                        className={`font-black text-sm ${
                          sendResult.success
                            ? "text-teal-text"
                            : "text-magenta-text"
                        }`}
                      >
                        {sendResult.success
                          ? "ارسال موفق ✅"
                          : "ارسال ناموفق ❌"}
                      </span>
                    </div>
                  </div>
                )}

                {/* دکمه ارسال */}
                <Button
                  variant="teal"
                  size="lg"
                  type="submit"
                  disabled={!smsText.trim() || !smsNumbers.trim()}
                  className="self-start"
                  rotate="-rotate-[1deg]"
                >
                  <Send size={16} className="ml-2" />
                  ارسال پیامک
                </Button>
              </form>
            </StickerCard>
          </div>
        </div>
      )}

      {/* ═══════ تب تاریخچه ═══════ */}
      {tab === "history" && (
        <div className="flex flex-col gap-3">
          <EmptyState
            icon={<History size={48} />}
            title="هنوز پیامکی ارسال نشده"
            subtitle="اولین پیامک خود را ارسال کنید."
          />
        </div>
      )}

      {/* ═══════ تب پیامک‌های دریافتی ═══════ */}
      {tab === "inbox" && (
        <div className="flex flex-col gap-4">
          <EmptyState
            icon={<Inbox size={48} />}
            title="هنوز پیامک دریافتی وجود ندارد"
            subtitle="پیامک‌های دریافتی از وب‌هوک اینجا نمایش داده می‌شوند."
          />
        </div>
      )}

      {/* ═══════ تب تنظیمات آموت ═══════ */}
      {tab === "settings" && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="rotate-[0.3deg]">
            <StickerCard theme="white">
              <form
                onSubmit={handleSaveSettings}
                className="p-5 flex flex-col gap-4"
              >
                <div>
                  <h2 className="text-lg font-black text-navy mb-1">
                    تنظیمات آموت SMS
                  </h2>
                  <p className="text-xs font-semibold text-ink-subtle">
                    توکن وب‌سرویس آموت رو از پنل کاربری آموت کپی کنید.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy mb-1">
                      توکن آموت (Token) *
                    </label>
                    <input
                      type="password"
                      value={settingsForm.amoot_token}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          amoot_token: e.target.value,
                        }))
                      }
                      className={inputCls}
                      placeholder="توکن را از پنل آموت کپی کنید"
                      dir="ltr"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy mb-1">
                        شماره خط
                      </label>
                      <input
                        type="text"
                        value={settingsForm.line_number}
                        onChange={(e) =>
                          setSettingsForm((p) => ({
                            ...p,
                            line_number: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="public"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy mb-1">
                        نام فرستنده
                      </label>
                      <input
                        type="text"
                        value={settingsForm.sender_name}
                        onChange={(e) =>
                          setSettingsForm((p) => ({
                            ...p,
                            sender_name: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="پرسکاد"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-1">
                  <Button variant="teal" size="sm" type="submit">
                    ذخیره تنظیمات
                  </Button>
                </div>
              </form>
            </StickerCard>
          </div>
        </div>
      )}
    </div>
  );
}
