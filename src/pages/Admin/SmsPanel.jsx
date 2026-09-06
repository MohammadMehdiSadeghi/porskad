import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { faNum } from "../../lib/utils";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import StickerCard from "../../components/ui/StickerCard";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";
import SEO from "../../components/ui/SEO";
import {
  MessageSquare,
  Send,
  AlertTriangle,
  RefreshCw,
  Inbox,
  History,
  BarChart3,
  Settings,
  Key,
  Smartphone,
  User,
  PauseCircle,
} from "lucide-react";

const inputCls =
  "w-full bg-white border-2 border-ink/15 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all disabled:bg-bg-neutral disabled:text-ink/40 disabled:cursor-not-allowed";

export default function SmsPanel() {
  const { hasPermission, isOwner } = useAuth();
  const canSms = hasPermission("manage_sms") || isOwner();

  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // ─── Settings ───
  const [settings, setSettings] = useState({ line_number: "5000xxxx", sender_name: "پرس‌کاد" });

  // ─── Send ───
  const [smsNumbers, setSmsNumbers] = useState("");
  const [smsText, setSmsText] = useState("");

  // ─── Dashboard ───
  const [stats, setStats] = useState({ outboxToday: 0, outboxMonth: 0, inboxToday: 0, successRate: null });

  // ─── History ───
  const [outbox, setOutbox] = useState([]);
  const [inboxMsgs, setInboxMsgs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Load DB History / Stats (بدون درخواست به آموت) ───
  const loadDashboard = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [outboxData, outboxMonthData, inboxData] = await Promise.all([
        supabase.from("sms_outbox").select("id, status").gte("created_at", today.toISOString()),
        supabase.from("sms_outbox").select("id, status").gte("created_at", monthStart.toISOString()),
        supabase.from("sms_inbox").select("id").gte("created_at", today.toISOString()),
      ]);

      const todaySent = (outboxData.data || []).length;
      const todaySentOk = (outboxData.data || []).filter((o) => o.status === "sent" || o.status === "delivered").length;
      const monthSent = (outboxMonthData.data || []).length;
      const todayInbox = (inboxData.data || []).length;

      setStats({
        outboxToday: todaySent,
        outboxMonth: monthSent,
        inboxToday: todayInbox,
        successRate: todaySent > 0 ? Math.round((todaySentOk / todaySent) * 100) : null,
      });
    } catch {
      // ignore
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLogLoading(true);
    try {
      const [outboxRes, inboxRes] = await Promise.all([
        supabase.from("sms_outbox").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("sms_inbox").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      setOutbox(outboxRes.data || []);
      setInboxMsgs(inboxRes.data || []);
    } catch {
      // ignore
    }
    setLogLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (tab === "history" || tab === "inbox") {
      loadHistory();
    }
  }, [tab, loadHistory]);

  const TABS = [
    { id: "dashboard", label: "داشبورد", icon: BarChart3 },
    { id: "send", label: "ارسال پیامک", icon: Send },
    { id: "history", label: "تاریخچه ارسال", icon: History },
    { id: "inbox", label: "دریافتی", icon: Inbox },
    { id: "settings", label: "تنظیمات پیامک", icon: Settings },
  ];

  if (loading) return <Spinner label="بارگذاری پنل پیامک..." />;

  return (
    <div className="flex flex-col gap-6">
      <SEO title="پنل پیامک" description="ارسال و مدیریت پیامک — پنل مدیریت پرس‌کاد" url="/admin/sms" noIndex />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-pill-md text-sm font-bold shadow-lg transition-all ${
            toast.type === "error"
              ? "bg-female-light border-2 border-female-normal text-female-dark"
              : "bg-ecosystem-light border-2 border-teal text-teal-text"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy flex items-center gap-2">
            <MessageSquare size={22} className="text-teal" />
            پنل پیامک
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-0.5">
            ارسال و مدیریت پیامک‌های اطلاع‌رسانی
          </p>
        </div>
      </div>

      {/* ─── باکس اطلاع‌رسانی غیرفعال بودن پنل پیامک ─── */}
      <div className="-rotate-[0.3deg]">
        <StickerCard theme="orange">
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="w-11 h-11 rounded-full bg-orange text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <PauseCircle size={24} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-navy text-base">سامانه پیامک در حال حاضر غیرفعال است</h3>
                  <Badge color="orange">غیرفعال موقت</Badge>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-1 leading-6">
                  ارسال پیامک و اتصال به وب‌سرویس پیامکی موقتاً غیرفعال شده است. رابط کاربری پنل صرفاً برای مشاهده اطلاعات قبلی و پیش‌نمایش در دسترس می‌باشد.
                </p>
              </div>
            </div>
          </div>
        </StickerCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border-2 border-ink/10 rounded-pill-md p-1 overflow-x-auto scrollbar-none max-w-full">
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
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Dashboard ═══ */}
      {tab === "dashboard" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            <StatCard theme="teal" label="ارسال امروز" value={faNum(stats.outboxToday)} caption="پیامک ارسال شده" />
            <StatCard theme="navy" label="ارسال ماه" value={faNum(stats.outboxMonth)} caption="پیامک این ماه" />
            <StatCard theme="magenta" label="دریافتی امروز" value={faNum(stats.inboxToday)} caption="پیامک دریافتی" />
            <StatCard theme="orange" label="موفقیت" value={stats.successRate !== null ? `${faNum(stats.successRate)}٪` : "—"} caption="نرخ تحویل" />
          </div>

          {/* وضعیت سرویس */}
          <div>
            <h2 className="text-lg font-extrabold text-navy mb-3">وضعیت سرویس پیامک</h2>
            <div className="rotate-[0.3deg]">
              <StickerCard theme="white">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange/10 flex items-center justify-center">
                      <PauseCircle size={20} className="text-orange" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy">وضعیت ارائه‌دهنده: غیرفعال (معلق)</p>
                      <p className="text-xs font-semibold text-ink-subtle">ارسال پیامک تا راه‌اندازی نسخه جدید متوقف است</p>
                    </div>
                  </div>
                  <Badge color="orange">غیرفعال</Badge>
                </div>
              </StickerCard>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Send ═══ */}
      {tab === "send" && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="-rotate-[0.5deg]">
            <StickerCard theme="white">
              <form onSubmit={(e) => { e.preventDefault(); showToast("سامانه پیامک در حال حاضر غیرفعال است", "error"); }} className="p-4 flex flex-col gap-4">
                <div>
                  <label className="block text-base font-extrabold text-navy mb-1">شماره موبایل‌ها</label>
                  <textarea
                    value={smsNumbers}
                    onChange={(e) => setSmsNumbers(e.target.value)}
                    className={`${inputCls} min-h-[70px] font-mono text-xs`}
                    placeholder={"09121234567\n09351234567\n09191234567"}
                    dir="ltr"
                    disabled
                  />
                  <p className="text-[0.65rem] font-semibold text-ink-subtle mt-0.5">
                    ورود شماره‌ها در حال حاضر غیرفعال است.
                  </p>
                </div>
                <div>
                  <label className="block text-base font-extrabold text-navy mb-1">متن پیامک</label>
                  <textarea
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    className={`${inputCls} min-h-[100px] text-xs`}
                    placeholder="سامانه پیامک در حال حاضر غیرفعال است..."
                    disabled
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="teal" size="lg" type="submit" disabled className="self-start opacity-50 cursor-not-allowed">
                    <Send size={16} className="ml-2" /> ارسال پیامک (غیرفعال)
                  </Button>
                </div>
              </form>
            </StickerCard>
          </div>
        </div>
      )}

      {/* ═══ History ═══ */}
      {tab === "history" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-navy">تاریخچه ارسال‌ها</h2>
            <Button variant="ghost" size="sm" onClick={loadHistory}>
              <RefreshCw size={14} />
            </Button>
          </div>
          {logLoading ? (
            <Spinner label="بارگذاری..." />
          ) : outbox.length === 0 ? (
            <EmptyState icon={<History size={48} />} title="هنوز پیامکی ارسال نشده" subtitle="تاریخچه ارسال‌ها پس از فعال‌سازی سیستم ثبت خواهد شد." />
          ) : (
            <div className="rotate-[0.3deg]">
              <StickerCard theme="white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-navy border-b-2 border-ink/10">
                        <th className="text-right font-black px-4 py-3">موبایل</th>
                        <th className="text-right font-black px-4 py-3">متن</th>
                        <th className="text-center font-black px-4 py-3">وضعیت</th>
                        <th className="text-right font-black px-4 py-3">زمان</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outbox.map((o, i) => (
                        <tr key={o.id} className={`${i % 2 ? "bg-bg-lavender/60" : ""} border-b border-ink/5 last:border-0`}>
                          <td className="px-4 py-3 font-bold text-ink font-mono text-xs" dir="ltr">{o.mobile}</td>
                          <td className="px-4 py-3 font-semibold text-ink-subtle text-xs truncate max-w-[200px]">{o.text}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge color={o.status === "sent" || o.status === "delivered" ? "green" : o.status === "failed" ? "red" : "gray"}>
                              {o.status === "sent" ? "ارسال شده" : o.status === "delivered" ? "تحویل شده" : o.status === "failed" ? "خطا" : "در انتظار"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-ink-subtle">
                            {new Date(o.created_at).toLocaleString("fa-IR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </StickerCard>
            </div>
          )}
        </div>
      )}

      {/* ═══ Inbox ═══ */}
      {tab === "inbox" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-navy">پیامک‌های دریافتی</h2>
            <Button variant="ghost" size="sm" onClick={loadHistory}>
              <RefreshCw size={14} />
            </Button>
          </div>
          {logLoading ? (
            <Spinner label="بارگذاری..." />
          ) : inboxMsgs.length === 0 ? (
            <EmptyState icon={<Inbox size={48} />} title="هنوز پیامک دریافتی ندارید" subtitle="پیامک‌های دریافتی اینجا نمایش داده می‌شوند." />
          ) : (
            <div className="flex flex-col gap-3">
              {inboxMsgs.map((msg) => (
                <StickerCard key={msg.id} theme="white">
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-navy" dir="ltr">{msg.mobile}</span>
                      <span className="text-xs font-medium text-ink-subtle">{new Date(msg.created_at).toLocaleString("fa-IR")}</span>
                    </div>
                    <p className="text-sm font-semibold text-ink leading-6">{msg.text}</p>
                  </div>
                </StickerCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Settings ═══ */}
      {tab === "settings" && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="rotate-[0.3deg]">
            <StickerCard theme="white">
              <form onSubmit={(e) => { e.preventDefault(); showToast("تنظیمات پیامک در حال حاضر غیرفعال است", "error"); }} className="p-5 flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-black text-navy mb-1">تنظیمات درگاه پیامک</h2>
                  <p className="text-xs font-semibold text-ink-subtle">
                    تنظیمات وب‌سرویس و خطوط ارسال پیامک در حال حاضر در دست بازطراحی است.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy mb-1"><Smartphone size={12} className="inline ml-1" /> شماره خط</label>
                      <input type="text" value={settings.line_number} readOnly className={inputCls} dir="ltr" disabled />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy mb-1"><User size={12} className="inline ml-1" /> نام فرستنده</label>
                      <input type="text" value={settings.sender_name} readOnly className={inputCls} disabled />
                    </div>
                  </div>
                </div>

                <div className="bg-college-light border-2 border-orange/30 rounded-pill-md px-4 py-3 flex items-center gap-3">
                  <AlertTriangle size={18} className="text-orange shrink-0" />
                  <p className="text-xs font-semibold text-ink-subtle">
                    این ماژول موقتاً غیرفعال شده است. تنظیمات به‌زودی در دسترس قرار می‌گیرد.
                  </p>
                </div>
              </form>
            </StickerCard>
          </div>
        </div>
      )}
    </div>
  );
}