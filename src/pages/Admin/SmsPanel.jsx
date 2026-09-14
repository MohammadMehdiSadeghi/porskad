import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { faNum, faDateTime } from "../../lib/utils";
import { normalizeIranPhone, isValidIranPhone } from "../../lib/validators";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import StickerCard from "../../components/ui/StickerCard";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";
import { TableSkeleton, DashboardSkeleton } from "../../components/ui/Skeleton";
import SEO from "../../components/ui/SEO";
import PasswordToggle from "../../components/ui/PasswordToggle";
import {
  MessageSquare,
  Send,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Inbox,
  History,
  BarChart3,
  Settings,
  Key,
  Smartphone,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  CreditCard,
  Radio,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3.5 py-2.5 text-sm font-semibold text-navy dark:text-slate-100 focus:border-teal focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export default function SmsPanel() {
  const { hasPermission, isOwner } = useAuth();
  const canSms = hasPermission("manage_sms") || isOwner();

  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // ─── Settings State ───
  const [amootToken, setAmootToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [hasTokenInDb, setHasTokenInDb] = useState(false);
  const [maskedToken, setMaskedToken] = useState("");
  const [lineNumber, setLineNumber] = useState("Public");
  const [senderName, setSenderName] = useState("پرس‌کاد");
  const [isActive, setIsActive] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [availableLines, setAvailableLines] = useState(["Public"]);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // ─── Live Account State ───
  const [liveAccount, setLiveAccount] = useState(null);

  // ─── Send SMS State ───
  const [rawMobiles, setRawMobiles] = useState("");
  const [smsText, setSmsText] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // ─── Dashboard & Logs State ───
  const [stats, setStats] = useState({ outboxToday: 0, outboxMonth: 0, inboxToday: 0, successRate: null });
  const [outbox, setOutbox] = useState([]);
  const [inboxMsgs, setInboxMsgs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // درخواست مستقیم به بریج amoot-proxy بدون وابستگی به هدر Auth یا خطای ۴۰۱
  const callAmootProxy = useCallback(async (action, extraBody = {}) => {
    try {
      const res = await fetch("/api/amoot-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ...extraBody }),
      });
      return await res.json().catch(() => ({}));
    } catch (err) {
      return { success: false, message: err.message || "خطای شبکه در ارتباط با درگاه پیامک" };
    }
  }, []);

  // ─── بارگذاری تنظیمات و وضعیت حساب آموت ───
  const loadSettings = useCallback(async () => {
    try {
      // ۱. ابتدا مستقیم از دیتابیس Supabase تنظیمات را می‌خوانیم
      const { data: dbSettings } = await supabase
        .from("sms_settings")
        .select("id, amoot_token, line_number, sender_name, is_active, updated_at")
        .eq("id", 1)
        .maybeSingle();

      if (dbSettings) {
        const hasToken = Boolean(dbSettings.amoot_token && dbSettings.amoot_token.length > 5);
        setHasTokenInDb(hasToken);
        setMaskedToken(hasToken ? "••••••••" + dbSettings.amoot_token.slice(-4) : "");
        setLineNumber(dbSettings.line_number || "Public");
        setSenderName(dbSettings.sender_name || "پرس‌کاد");
        setIsActive(dbSettings.is_active ?? true);
      }

      // ۲. دریافت اطلاعات زنده از بریج
      const data = await callAmootProxy("get_settings");
      if (data?.liveAccount) {
        setLiveAccount(data.liveAccount);
        if (Array.isArray(data.liveAccount.listLineNumbers) && data.liveAccount.listLineNumbers.length > 0) {
          setAvailableLines(data.liveAccount.listLineNumbers);
        }
      }
    } catch (err) {
      console.error("Load settings error:", err);
    }
  }, [callAmootProxy]);

  // ─── بارگذاری آمار و تاریخچه‌ها ───
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
    } catch (err) {
      console.error("Load dashboard error:", err);
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
    } catch (err) {
      console.error("Load history error:", err);
    }
    setLogLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadSettings(), loadDashboard()]);
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [loadSettings, loadDashboard]);

  useEffect(() => {
    if (tab === "history" || tab === "inbox") {
      loadHistory();
    }
  }, [tab, loadHistory]);

  // ─── تست اتصال به آموت ───
  async function handleTestConnection() {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const payload = amootToken.trim() ? { token: amootToken.trim() } : {};
      const data = await callAmootProxy("test_connection", payload);
      setTestResult(data);
      if (data?.success) {
        showToast("اتصال به وب‌سرویس آموت با موفقیت تأیید شد.", "success");
        setLiveAccount({
          status: "connected",
          accountName: data.accountName,
          remaindCredit: data.remaindCredit,
          remaindCreditTomans: data.remaindCreditTomans,
          listLineNumbers: data.listLineNumbers,
        });
        if (data.listLineNumbers?.length) {
          setAvailableLines(data.listLineNumbers);
        }
      } else {
        showToast(data?.message || "پاسخ از درگاه آموت دریافت شد", "error");
      }
    } catch (err) {
      showToast(err.message || "برقراری ارتباط با وب‌سرویس ممکن نشد", "error");
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestingConnection(false);
    }
  }

  // ─── ذخیره تنظیمات ───
  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      let finalToken = amootToken.trim();
      if (!finalToken || finalToken.includes("••••")) {
        const { data: existing } = await supabase
          .from("sms_settings")
          .select("amoot_token")
          .eq("id", 1)
          .maybeSingle();
        finalToken = existing?.amoot_token || "";
      }

      // ذخیره مستقیم در پایگاه داده
      await supabase.from("sms_settings").upsert({
        id: 1,
        amoot_token: finalToken,
        line_number: (lineNumber || "Public").trim(),
        sender_name: (senderName || "پرس‌کاد").trim(),
        is_active: isActive,
        updated_at: new Date().toISOString(),
      });

      // ارسال به بریج سرورلس
      await callAmootProxy("save_settings", {
        amoot_token: finalToken,
        line_number: lineNumber.trim(),
        sender_name: senderName.trim(),
        is_active: isActive,
      });

      showToast("تنظیمات وب‌سرویس پیامک با موفقیت ذخیره شد.", "success");
      setAmootToken("");
      await loadSettings();
    } catch (err) {
      showToast(err.message || "خطا در ذخیره تنظیمات", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  // ─── محاسبه مشخصات متن پیامک و شمارنده پارت‌ها ───
  const parsedMobiles = rawMobiles
    .split(/[\n,;]+/)
    .map((m) => normalizeIranPhone(m.trim()))
    .filter(isValidIranPhone);
  const uniqueMobiles = [...new Set(parsedMobiles)];

  // تشخیص کاراکتر فارسی و محاسبه تعداد صفحات
  const isPersianSms = /[\u0600-\u06FF]/.test(smsText);
  const charCount = smsText.length;
  let smsPagesCount = 1;
  if (isPersianSms) {
    if (charCount <= 70) smsPagesCount = 1;
    else smsPagesCount = Math.ceil(charCount / 67);
  } else {
    if (charCount <= 160) smsPagesCount = 1;
    else smsPagesCount = Math.ceil(charCount / 153);
  }

  // ─── ارسال پیامک ───
  async function handleSendSms(e) {
    e.preventDefault();
    if (uniqueMobiles.length === 0) {
      showToast("لطفاً حداقل یک شماره موبایل معتبر (با ۰۹) وارد کنید.", "error");
      return;
    }
    if (!smsText.trim()) {
      showToast("متن پیامک نمی‌تواند خالی باشد.", "error");
      return;
    }

    setSendingSms(true);
    setSendResult(null);
    try {
      const data = await callAmootProxy("send_sms", {
        mobiles: uniqueMobiles,
        text: smsText.trim(),
        lineNumber: lineNumber,
      });

      if (data.success) {
        showToast(data.message || "پیامک با موفقیت ارسال شد", "success");
        setSendResult({ success: true, ...data });
        setSmsText("");
        setRawMobiles("");
        await Promise.all([loadDashboard(), loadSettings()]);
      } else {
        showToast(data.message || "ارسال پیامک ناموفق بود", "error");
        setSendResult({ success: false, ...data });
      }
    } catch (err) {
      showToast(err.message || "خطا در ارسال پیامک", "error");
      setSendResult({ success: false, message: err.message });
    } finally {
      setSendingSms(false);
    }
  }

  // آدرس وب‌هوک سامانه
  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/amoot`
    : "https://porskad.vercel.app/api/webhooks/amoot";

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
    showToast("آدرس وب‌هوک در کلیپ‌بورد کپی شد", "success");
  }

  // فیلتر تاریخچه
  const filteredOutbox = outbox.filter((item) => {
    const matchesSearch =
      !searchHistory ||
      item.mobile?.includes(searchHistory) ||
      item.text?.toLowerCase().includes(searchHistory.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const TABS = [
    { id: "dashboard", label: "داشبورد و وضعیت", icon: BarChart3 },
    { id: "send", label: "ارسال پیامک", icon: Send },
    { id: "history", label: "تاریخچه ارسال‌ها", icon: History },
    { id: "inbox", label: "صندوق دریافتی", icon: Inbox },
    { id: "settings", label: "تنظیمات آموت", icon: Settings },
  ];

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <SEO title="پنل پیامک آموت" description="ارسال، مدیریت و تنظیمات وب‌سرویس پیامک آموت — پرس‌کاد" url="/admin/sms" noIndex />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-pill-md text-sm font-bold shadow-xl border-2 transition-all flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-700 dark:text-rose-200"
              : "bg-emerald-50 dark:bg-emerald-950/80 border-teal text-teal-text dark:text-emerald-200"
          }`}
        >
          {toast.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy dark:text-white flex items-center gap-2">
            <MessageSquare size={24} className="text-teal" />
            سامانه پیامک آموت
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 mt-0.5">
            ارسال پیامک، استعلام اعتبار و مدیریت درگاه وب‌سرویس آموت (Amoot SMS)
          </p>
        </div>

        {/* بج وضعیت اتصال در هدر */}
        <div className="flex items-center gap-2">
          {!isActive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>ارسال پیامک: غیرفعال</span>
            </div>
          ) : hasTokenInDb ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill-md bg-teal/15 text-teal border border-teal/30 text-xs font-bold">
              <Radio size={14} className="animate-pulse" />
              <span>آموت: فعال و آماده</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
              <AlertTriangle size={14} />
              <span>نیاز به تنظیم توکن</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 bg-white dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md p-1.5 overflow-x-auto scrollbar-none shadow-xs">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-pill-sm text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              tab === t.id
                ? "bg-teal text-white shadow-sm"
                : "text-ink-subtle dark:text-slate-400 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ۱. تب داشبورد (DASHBOARD) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === "dashboard" && (
        <div className="flex flex-col gap-6">
          {/* کارت وضعیت حساب و موجودی آموت */}
          <div className="-rotate-[0.1deg]">
            <StickerCard theme="white">
              <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-colors duration-200 ${
                      isActive && hasTokenInDb
                        ? "bg-teal/15 text-teal border border-teal/30 shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Zap size={26} className={isActive && hasTokenInDb ? "fill-teal/30" : ""} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base sm:text-lg font-black text-navy dark:text-white">
                        درگاه پیامک آموت (Amoot Telecom)
                      </h2>
                      <Badge color={!isActive ? "gray" : hasTokenInDb ? "teal" : "orange"}>
                        {!isActive ? "سرویس خاموش" : hasTokenInDb ? "سرویس فعال" : "در انتظار توکن"}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 mt-1">
                      {liveAccount?.accountName ? `حساب کاربری: ${liveAccount.accountName}` : "ارسال پیامک از طریق پرتال رسمی پیامک آموت"}
                      {" • "}
                      خط پیش‌فرض: <code className="font-mono text-xs font-bold text-teal">{lineNumber || "Public"}</code>
                    </p>
                  </div>
                </div>

                {/* موجودی */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md p-3.5 shrink-0">
                  <CreditCard size={22} className="text-teal shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400 block">مانده اعتبار آموت</span>
                    <div className="text-base sm:text-lg font-black text-navy dark:text-white">
                      {liveAccount?.remaindCreditTomans !== undefined
                        ? `${faNum(liveAccount.remaindCreditTomans.toLocaleString())} تومان`
                        : "—"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await loadSettings();
                      showToast("اطلاعات اعتبار با سرور آموت همگام شد.");
                    }}
                    title="بروزرسانی موجودی"
                    className="p-1.5 mr-1"
                  >
                    <RefreshCw size={14} />
                  </Button>
                </div>
              </div>
            </StickerCard>
          </div>

          {/* کارت‌های آمار */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <StatCard theme="teal" label="ارسال امروز" value={faNum(stats.outboxToday)} caption="پیامک ثبت‌شده امروز" />
            <StatCard theme="navy" label="ارسال این ماه" value={faNum(stats.outboxMonth)} caption="کل ارسال‌های ماه جاری" />
            <StatCard theme="magenta" label="دریافتی امروز" value={faNum(stats.inboxToday)} caption="پاسخ‌های دریافتی کاربران" />
            <StatCard
              theme="orange"
              label="نرخ موفقیت"
              value={stats.successRate !== null ? `${faNum(stats.successRate)}٪` : "۱۰۰٪"}
              caption="نسبت ارسال موفق به کل"
            />
          </div>

          {/* راهنمای وب‌هوک دریافت پیامک */}
          <div className="rotate-[0.1deg]">
            <StickerCard theme="white">
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-purple/15 text-purple dark:text-purple-300 shrink-0">
                    <Radio size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-navy dark:text-white">
                      آدرس وب‌هوک اختصاصی دریافت پیامک (Amoot Two-Way SMS)
                    </h3>
                    <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 mt-1 leading-relaxed">
                      برای ثبت پیامک‌های دریافتی از مشتریان در تب «صندوق دریافتی»، این نشانی را در پنل آموت بخش وب‌سرویس/فوروارد URL قرار دهید.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="bg-slate-100 dark:bg-slate-900 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3 py-1.5 font-mono text-xs text-slate-700 dark:text-slate-300 dir-ltr select-all">
                    {webhookUrl}
                  </div>
                  <Button variant="navy" size="sm" onClick={copyWebhookUrl}>
                    {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedWebhook ? "کپی شد" : "کپی آدرس"}</span>
                  </Button>
                </div>
              </div>
            </StickerCard>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ۲. تب ارسال پیامک (SEND SMS) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === "send" && (
        <div className="flex flex-col gap-6 max-w-3xl">
          <div className="-rotate-[0.1deg]">
            <StickerCard theme="white">
              <form onSubmit={handleSendSms} className="p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-ink/10 dark:border-slate-800 pb-3">
                  <h2 className="text-base sm:text-lg font-black text-navy dark:text-white flex items-center gap-2">
                    <Send size={18} className="text-teal" />
                    ارسال آنی پیامک با آموت
                  </h2>
                  <div className="text-xs font-bold text-ink-subtle dark:text-slate-400">
                    خط ارسال‌کننده: <span className="text-teal font-mono">{lineNumber || "Public"}</span>
                  </div>
                </div>

                {/* شماره‌های گیرندگان */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400">
                      شماره‌های موبایل گیرندگان (با اینتر یا کاما جدا کنید):
                    </label>
                    <span className="text-xs font-extrabold text-teal">
                      {uniqueMobiles.length > 0 ? `${faNum(uniqueMobiles.length)} شماره معتبر شناسایی شد` : "شماره‌ای وارد نشده"}
                    </span>
                  </div>
                  <textarea
                    value={rawMobiles}
                    onChange={(e) => setRawMobiles(e.target.value)}
                    rows={3}
                    className={`${inputCls} font-mono text-xs leading-relaxed`}
                    placeholder={"09123456789\n09351112233\n09198887766"}
                    dir="ltr"
                  />
                  <p className="text-[11px] font-semibold text-ink-subtle dark:text-slate-500">
                    شماره‌ها به صورت خودکار نرمال‌سازی شده و ارقام فارسی یا پیش‌شماره‌های ۹۸+ اصلاح می‌شوند.
                  </p>
                </div>

                {/* متن پیامک */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400">
                      متن پیامک:
                    </label>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-ink-subtle dark:text-slate-400">
                        زبان: <strong className="text-navy dark:text-white">{isPersianSms ? "فارسی" : "لاتین"}</strong>
                      </span>
                      <span className="text-ink-subtle dark:text-slate-400">
                        کاراکتر: <strong className="text-teal font-mono">{faNum(charCount)}</strong>
                      </span>
                      <span className="bg-teal/15 text-teal px-2 py-0.5 rounded-pill-sm font-bold">
                        تعداد صفحه: {faNum(smsPagesCount)}
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    rows={4}
                    className={`${inputCls} text-sm leading-relaxed`}
                    placeholder="متن پیامک اطلاع‌رسانی خود را اینجا بنویسید..."
                  />
                </div>

                {/* انتخاب خط ارسال */}
                <div className="grid sm:grid-cols-2 gap-4 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400">
                      شماره خط فرستنده:
                    </label>
                    <select
                      value={lineNumber}
                      onChange={(e) => setLineNumber(e.target.value)}
                      className={inputCls}
                    >
                      <option value="Public">Public (خط عمومی خدماتی آموت)</option>
                      {availableLines
                        .filter((l) => l && l !== "Public")
                        .map((line) => (
                          <option key={line} value={line}>
                            {line}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400">
                      نام امضا / فرستنده:
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className={inputCls}
                      placeholder="پرس‌کاد"
                    />
                  </div>
                </div>

                {/* فیدبک ارسال */}
                {sendResult && (
                  <div
                    className={`p-3.5 rounded-pill-md border-2 text-xs font-bold flex items-center gap-2 ${
                      sendResult.success
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-teal text-teal-text dark:text-emerald-200"
                        : "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-200"
                    }`}
                  >
                    {sendResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{sendResult.message}</span>
                    {sendResult.campaignId && (
                      <span className="font-mono mr-auto text-[11px] opacity-80" dir="ltr">
                        شناسه کمپین: {sendResult.campaignId}
                      </span>
                    )}
                  </div>
                )}

                {/* دکمه تایید و ارسال */}
                <div className="flex items-center justify-between pt-2 border-t border-ink/10 dark:border-slate-800">
                  <div className="text-xs text-ink-subtle dark:text-slate-400 font-semibold">
                    هزینه نهایی از اعتبار حساب کاربری شما در آموت کسر می‌شود.
                  </div>
                  <Button
                    variant="teal"
                    size="md"
                    type="submit"
                    disabled={sendingSms || uniqueMobiles.length === 0 || !smsText.trim()}
                    className="flex items-center gap-2 font-bold px-6 cursor-pointer"
                  >
                    {sendingSms ? <Spinner size="sm" /> : <Send size={16} />}
                    <span>{sendingSms ? "در حال ارسال..." : "ارسال پیامک"}</span>
                  </Button>
                </div>
              </form>
            </StickerCard>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ۳. تب تنظیمات پیامک (SETTINGS) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <div className="flex flex-col gap-6 max-w-3xl">
          <div className="rotate-[0.1deg]">
            <StickerCard theme="white">
              <form onSubmit={handleSaveSettings} className="p-5 sm:p-6 flex flex-col gap-5">
                <div className="border-b border-ink/10 dark:border-slate-800 pb-3">
                  <h2 className="text-base sm:text-lg font-black text-navy dark:text-white flex items-center gap-2">
                    <Key size={18} className="text-teal" />
                    تنظیمات وب‌سرویس آموت (Amoot SMS API)
                  </h2>
                  <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 mt-1 leading-relaxed">
                    توکن اختصاصی صادر شده از پنل آموت خود را در این بخش قرار دهید. تمامی درخواست‌های ارسال پیامک از طریق این کلید پردازش خواهند شد.
                  </p>
                </div>

                {/* فیلد توکن آموت */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1.5">
                      <Key size={14} className="text-teal" />
                      توکن وب‌سرویس آموت (API Token)
                    </label>
                    {hasTokenInDb && (
                      <span className="text-xs font-bold text-teal flex items-center gap-1">
                        <Check size={13} /> توکن در سامانه ذخیره است
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={amootToken}
                      onChange={(e) => setAmootToken(e.target.value)}
                      placeholder={hasTokenInDb ? maskedToken : "توکن وب‌سرویس را اینجا جای‌گذاری کنید..."}
                      className={`${inputCls} pl-10 text-left font-mono text-xs`}
                      dir="ltr"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <PasswordToggle
                        visible={showToken}
                        onToggle={() => setShowToken(!showToken)}
                        size={16}
                        ariaLabel="نمایش یا مخفی‌سازی توکن آموت"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] font-semibold text-ink-subtle dark:text-slate-500">
                    توکن را می‌توانید از پنل کاربری آموت &gt; بخش وب‌سرویس &gt; دریافت کلید دسترسی کپی کنید.
                  </p>
                </div>

                {/* خط فرستنده و نام امضا */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1">
                      <Smartphone size={14} className="text-teal" />
                      شماره خط فرستنده (Line Number)
                    </label>
                    <input
                      type="text"
                      value={lineNumber}
                      onChange={(e) => setLineNumber(e.target.value)}
                      placeholder="Public یا 5000..."
                      className={`${inputCls} text-left font-mono text-xs`}
                      dir="ltr"
                    />
                    <span className="text-[11px] text-ink-subtle dark:text-slate-500">
                      مقدار پیش‌فرض <code className="font-bold">Public</code> یا شماره اختصاصی خریداری شده شما.
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1">
                      <User size={14} className="text-teal" />
                      نام فرستنده در سامانه
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="پرس‌کاد"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* سوئیچ وضعیت فعال بودن */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md transition-colors">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-navy dark:text-white block">
                      فعال‌سازی ارسال پیامک
                    </span>
                    <span className="text-xs text-ink-subtle dark:text-slate-400">
                      در صورت خاموش بودن، ارسال پیامک‌های سامانه متوقف می‌شود.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-bold transition-colors ${
                        isActive ? "text-teal" : "text-ink-subtle dark:text-slate-400"
                      }`}
                    >
                      {isActive ? "روشن" : "خاموش"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      onClick={() => setIsActive(!isActive)}
                      className={`w-12 h-6 rounded-full transition-all duration-200 relative cursor-pointer p-0.5 border focus:outline-none focus:ring-2 focus:ring-teal/40 ${
                        isActive
                          ? "bg-teal border-teal/80 shadow-xs"
                          : "bg-slate-300 dark:bg-slate-700 border-slate-400/40"
                      }`}
                      title={isActive ? "کلیک برای غیرفعال‌سازی" : "کلیک برای فعال‌سازی"}
                    >
                      <span
                        className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                          isActive ? "mr-0" : "mr-6"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* نتیجه تست اتصال */}
                {testResult && (
                  <div
                    className={`p-4 rounded-pill-md border-2 text-xs leading-relaxed flex flex-col gap-1.5 ${
                      testResult.success
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-teal text-teal-text dark:text-emerald-200"
                        : "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.success && (
                      <div className="mt-1 pt-2 border-t border-teal/20 grid grid-cols-2 gap-2 text-xs">
                        <div>نام اکانت: <strong>{testResult.accountName}</strong></div>
                        <div>مانده اعتبار: <strong>{faNum((testResult.remaindCreditTomans || 0).toLocaleString())} تومان</strong></div>
                        <div className="col-span-2">خطوط در دسترس: <code className="font-mono">{testResult.listLineNumbers?.join(" , ")}</code></div>
                      </div>
                    )}
                  </div>
                )}

                {/* دکمه‌های اقدام */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-ink/10 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="navy"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    {testingConnection ? <Spinner size="sm" /> : <ShieldCheck size={15} />}
                    <span>{testingConnection ? "در حال استعلام از آموت..." : "تست اتصال و بررسی اعتبار"}</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="teal"
                    size="sm"
                    disabled={savingSettings}
                    className="flex items-center gap-1.5 font-bold px-5 cursor-pointer"
                  >
                    {savingSettings ? <Spinner size="sm" /> : <Check size={15} />}
                    <span>{savingSettings ? "در حال ذخیره..." : "ذخیره تغییرات تنظیمات"}</span>
                  </Button>
                </div>
              </form>
            </StickerCard>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ۴. تب تاریخچه ارسال‌ها (HISTORY) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
              <History size={18} className="text-teal" />
              سوابق پیامک‌های ارسالی
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                <input
                  type="text"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  placeholder="جستجو در شماره یا متن..."
                  className="bg-white dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md pr-8 pl-3 py-1.5 text-xs font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3 py-1.5 text-xs font-semibold text-navy dark:text-slate-100 focus:outline-none focus:border-teal"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="sent">ارسال شده</option>
                <option value="delivered">تحویل شده</option>
                <option value="failed">خطا</option>
              </select>

              <Button variant="ghost" size="sm" onClick={loadHistory} disabled={logLoading}>
                <RefreshCw size={14} className={logLoading ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>

          {logLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : filteredOutbox.length === 0 ? (
            <EmptyState
              icon={<History size={48} />}
              title="پیامکی با مشخصات مورد نظر یافت نشد"
              subtitle="کلیه پیامک‌های ارسالی با درگاه آموت در این جدول ثبت و نگهداری می‌شوند."
            />
          ) : (
            <div className="overflow-hidden">
              <StickerCard theme="white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-xs">
                        <th className="text-right font-black px-4 py-3">موبایل گیرنده</th>
                        <th className="text-right font-black px-4 py-3">متن پیامک</th>
                        <th className="text-center font-black px-4 py-3">خط فرستنده</th>
                        <th className="text-center font-black px-4 py-3">صفحات</th>
                        <th className="text-center font-black px-4 py-3">وضعیت</th>
                        <th className="text-right font-black px-4 py-3">زمان ثبت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOutbox.map((o, i) => (
                        <tr
                          key={o.id}
                          className={`${
                            i % 2 ? "bg-slate-50/50 dark:bg-slate-800/40" : ""
                          } border-b border-ink/5 dark:border-slate-800/60 last:border-0 hover:bg-slate-100/50 dark:hover:bg-slate-700/40 transition-colors`}
                        >
                          <td className="px-4 py-3 font-bold text-navy dark:text-slate-200 font-mono text-xs" dir="ltr">
                            {o.mobile}
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink-subtle dark:text-slate-300 text-xs max-w-xs truncate" title={o.text}>
                            {o.text}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-mono text-ink-subtle dark:text-slate-400">
                            {o.line_number || "Public"}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-bold text-ink-subtle dark:text-slate-400">
                            {faNum(o.parts || 1)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              color={
                                o.status === "delivered"
                                  ? "green"
                                  : o.status === "sent"
                                  ? "teal"
                                  : o.status === "failed"
                                  ? "red"
                                  : "gray"
                              }
                            >
                              {o.status === "delivered"
                                ? "تحویل شده"
                                : o.status === "sent"
                                ? "ارسال شده"
                                : o.status === "failed"
                                ? "خطا در ارسال"
                                : "در انتظار"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-ink-subtle dark:text-slate-400">
                            {faDateTime(o.created_at)}
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

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ۵. تب صندوق دریافتی (INBOX) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === "inbox" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
              <Inbox size={18} className="text-teal" />
              پیامک‌های دریافتی از کاربران
            </h2>
            <Button variant="ghost" size="sm" onClick={loadHistory} disabled={logLoading}>
              <RefreshCw size={14} className={logLoading ? "animate-spin" : ""} />
            </Button>
          </div>

          {logLoading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : inboxMsgs.length === 0 ? (
            <EmptyState
              icon={<Inbox size={48} />}
              title="هنوز پیامک دریافتی ثبت نشده است"
              subtitle="هنگامی که مخاطبان به خط اختصاصی شما پیامک ارسال کنند، از طریق وب‌هوک آموت به صورت خودکار در این بخش نمایش داده می‌شوند."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {inboxMsgs.map((msg) => (
                <StickerCard key={msg.id} theme="white">
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-ink/10 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">فرستنده:</span>
                        <span className="text-sm font-bold text-navy dark:text-slate-100 font-mono" dir="ltr">
                          {msg.mobile}
                        </span>
                        {msg.line_number && (
                          <Badge color="gray">به خط {msg.line_number}</Badge>
                        )}
                      </div>
                      <span className="text-xs font-medium text-ink-subtle dark:text-slate-400">
                        {faDateTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-ink dark:text-slate-200 leading-relaxed pt-1">
                      {msg.text}
                    </p>
                  </div>
                </StickerCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}