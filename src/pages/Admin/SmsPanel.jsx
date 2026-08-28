import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { faNum } from "../../lib/utils";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import StickerCard from "../../components/ui/StickerCard";
import EmptyState from "../../components/ui/EmptyState";
import SEO from "../../components/ui/SEO";
import Modal from "../../components/ui/Modal";
import {
  MessageSquare,
  Send,
  CreditCard,
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
// ─── نرمال‌سازی شماره موبایل ایرانی ───
// ═══════════════════════════════════════════════════════════════
function normalizeIranPhone(raw) {
  if (!raw) return null;
  // حذف فاصله، خط تیره، پرانتز
  let n = raw.replace(/[\s\-\(\)\.]/g, "");

  // +98912 → 98912
  if (n.startsWith("+98")) n = n.slice(1);
  // 0098912 → 98912
  else if (n.startsWith("0098")) n = n.slice(2);
  // 98912 → keep
  // 0912 → 98912
  else if (n.startsWith("0") && n.length === 11) n = "98" + n;
  // 912 → 98912 (10 digit without leading 0)
  else if (n.length === 10 && n.startsWith("9")) n = "98" + n;

  // بررسی فرمت نهایی: باید 98 + 10 رقم (9XXXXXXXXX) باشد
  if (!/^98[1-9]\d{9}$/.test(n)) return null;
  return n;
}

// ═══════════════════════════════════════════════════════════════
// ─── نرمال‌سازی پاسخ AccountStatus آموت ───
// ═══════════════════════════════════════════════════════════════
function normalizeAccountInfo(raw) {
  // پاسخ ممکنه آرایه باشه یا آبجکت
  // [ { Status: 0, ListAccount: [ { Credit: 50000, ListLineNumbers: [] } ] } ]
  // یا { Status: 0, ListAccount: [...] }

  if (!raw) return { status: null, credit: 0, lineNumbers: [], raw };

  // اگه آرایه باشه، اولین آیتم رو بگیر
  let data = raw;
  if (Array.isArray(raw)) {
    data = raw[0] || {};
  }

  const status = data.Status ?? data.status ?? null;

  // Credit ممکنه داخل ListAccount باشه یا مستقیم
  let credit = 0;
  let lineNumbers = [];

  if (data.ListAccount && Array.isArray(data.ListAccount) && data.ListAccount.length > 0) {
    const account = data.ListAccount[0];
    credit = account.Credit ?? account.credit ?? 0;
    lineNumbers = account.ListLineNumbers || account.LineNumbers || [];
  } else if (data.RemaindCredit !== undefined) {
    credit = data.RemaindCredit;
  }

  return {
    status,
    credit,
    lineNumbers,
    accountName: data.AccountName || data.Account || "",
    raw,
  };
}

// ═══════════════════════════════════════════════════════════════
// ─── فراخوانی API آموت از طریق Edge Function ───
// ═══════════════════════════════════════════════════════════════
async function amootFetch(endpoint, params = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("لاگین نیستید");

  // استفاده از supabase.functions.invoke به جای fetch مستقیم
  const { data, error } = await supabase.functions.invoke("amoot-proxy", {
    body: { endpoint, params },
  });

  if (error) {
    // اگه Edge Function خطا برگردونده، data ممکنه حاوی پاسخ باشه
    const detail = data?.error || data?.details || error.message;
    throw new Error(detail || "خطا در فراخوانی سرویس پیامک");
  }

  // اگه data خودش حاوی error باشه (Edge Function 200 برگردونده ولی error داخلی داشته)
  if (data?.error) {
    throw new Error(data.error + (data.details ? `: ${data.details}` : ""));
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
// ─── فرمت ریال ───
// ═══════════════════════════════════════════════════════════════
function formatRial(amount) {
  if (!amount && amount !== 0) return "—";
  return Number(amount).toLocaleString("fa-IR") + " ریال";
}

export default function SmsPanel() {
  const { hasPermission } = useAuth();
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");

  // ─── Dashboard ───
  const [stats, setStats] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(false);

  // ─── Send SMS ───
  const [smsNumbers, setSmsNumbers] = useState("");
  const [smsText, setSmsText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // ─── History ───
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── Inbox ───
  const [inbox, setInbox] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  // ─── Settings ───
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [smsSettings, setSmsSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    api_token: "",
    line_number: "public",
    sender_name: "پرسکاد",
    amoot_user_id: "",
    amoot_password: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const canSms = hasPermission("manage_sms");

  // ─── Load functions ───
  const loadStats = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.rpc("get_sms_stats");
      if (data) setStats(data);
    } catch {
      /* ممکنه تابع وجود نداشته باشه */
    }
  }, []);

  const loadAccountStatus = useCallback(async ({ silent = false } = {}) => {
    setFetchingStatus(true);
    try {
      const raw = await amootFetch("AccountStatus");
      if (!raw) return;
      const info = normalizeAccountInfo(raw);

      if (info.status === 0 || info.status === "0") {
        setAccountInfo(info);
      } else {
        const errMsg =
          raw?.explanation || raw?.Message || `Status: ${info.status}`;
        if (!silent) push("خطا در اتصال: " + errMsg, "error");
      }
    } catch (err) {
      // در حالت silent ارور نشون نده (مثلاً هنگام mount اولیه)
      if (!silent) {
        push("خطا در اتصال: " + err.message, "error");
      }
    } finally {
      setFetchingStatus(false);
    }
  }, [push]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("sms_outbox")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      push("خطا: " + err.message, "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [push]);

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    try {
      const { data, error } = await supabase
        .from("sms_inbox")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setInbox(data || []);
    } catch (err) {
      push("خطا: " + err.message, "error");
    } finally {
      setInboxLoading(false);
    }
  }, [push]);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc("get_active_sms_settings")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSmsSettings(data);
        setSettingsForm({
          api_token: data.api_token || "",
          line_number: data.line_number || "public",
          sender_name: data.sender_name || "پرسکاد",
          amoot_user_id: data.amoot_user_id || "",
          amoot_password: data.amoot_password || "",
        });
      }
    } catch {
      /* ممکنه تابع وجود نداشته باشه */
    }
  }, []);

  useEffect(() => {
    Promise.allSettled([
      loadStats(),
      loadAccountStatus({ silent: true }),
      loadSettings(),
    ]).then(() => setLoading(false));
  }, [loadStats, loadAccountStatus, loadSettings]);

  useEffect(() => {
    if (tab === "history") loadHistory();
    if (tab === "inbox") loadInbox();
    if (tab === "dashboard") {
      loadStats();
      loadAccountStatus({ silent: true });
    }
  }, [tab, loadHistory, loadInbox, loadStats, loadAccountStatus]);

  // ─── Save SMS Settings ───
  async function handleSaveSettings() {
    if (!settingsForm.amoot_user_id.trim()) {
      push("شناسه کاربر آموت الزامی است.", "error");
      return;
    }
    if (!settingsForm.amoot_password.trim()) {
      push("رمز عبور آموت الزامی است.", "error");
      return;
    }

    setSavingSettings(true);
    try {
      const { error } = await supabase.rpc("save_sms_settings", {
        p_api_token: settingsForm.api_token.trim(),
        p_line_number: settingsForm.line_number.trim() || "public",
        p_sender_name: settingsForm.sender_name.trim() || "پرسکاد",
        p_amoot_user_id: settingsForm.amoot_user_id.trim(),
        p_amoot_password: settingsForm.amoot_password.trim(),
      });
      if (error) throw error;
      push("تنظیمات پیامک ذخیره شد ✅");
      setSettingsOpen(false);
      loadSettings();
    } catch (err) {
      push("خطا: " + err.message, "error");
    } finally {
      setSavingSettings(false);
    }
  }

  // ─── Send SMS ───
  async function handleSendSms() {
    if (!smsText.trim()) {
      push("متن پیامک الزامی است.", "error");
      return;
    }
    if (!smsNumbers.trim()) {
      push("شماره موبایل الزامی است.", "error");
      return;
    }

    // نرمال‌سازی شماره‌ها
    const rawNumbers = smsNumbers
      .split(/[,;\n]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    const normalized = rawNumbers.map(normalizeIranPhone);
    const invalidNumbers = rawNumbers.filter((_, i) => normalized[i] === null);
    const validNumbers = normalized.filter(Boolean);

    if (validNumbers.length === 0) {
      push("هیچ شماره معتبری وارد نشد.", "error");
      return;
    }

    if (invalidNumbers.length > 0) {
      push(
        `${invalidNumbers.length} شماره نامعتبر رد شد: ${invalidNumbers.slice(0, 3).join(", ")}${invalidNumbers.length > 3 ? "..." : ""}`,
        "warning"
      );
    }

    setSending(true);
    setSendResult(null);
    try {
      const numbers = validNumbers.join(",");

      const data = await amootFetch("SendSimple", {
        SendDateTime: "0",
        SMSMessageText: smsText,
        LineNumber: "public",
        Mobiles: numbers,
      });

      // ─── تشخیص موفقیت ───
      const status = data?.Status ?? data?.status;
      const isStatusZero = status === 0 || status === "0";

      // Data باید آرایه غیرخالی باشد
      const dataArray = Array.isArray(data?.Data)
        ? data.Data
        : data?.Data
          ? [data.Data]
          : [];
      const hasRealData = dataArray.length > 0;
      const mobilesInData = dataArray.filter((r) => r?.Mobile);

      // موفقیت = Status === 0 و حداقل یک پیامک واقعی ارسال شده باشد
      const isTrulySuccess = isStatusZero && (hasRealData || mobilesInData.length > 0);

      if (isTrulySuccess) {
        setSendResult({ success: true, data });
        push(`پیامک با موفقیت ارسال شد! (${mobilesInData.length} شماره) ✅`);

        // ثبت در outbox
        for (const r of mobilesInData) {
          try {
            await supabase.rpc("log_sms_outbox", {
              p_mobile: r.Mobile,
              p_line_number: "public",
              p_text: smsText,
              p_message_id: r.MessageID ? String(r.MessageID) : null,
              p_status: "sent",
            });
          } catch {
            /* outbox logging failed but send succeeded */
          }
        }

        setSmsText("");
        setSmsNumbers("");
        loadStats();
      } else {
        // تشخیص نوع خطا
        let errMsg = "نامشخص";
        if (data?.explanation) errMsg = data.explanation;
        else if (data?.Message) errMsg = data.Message;
        else if (status !== undefined && status !== null) errMsg = `Status: ${status}`;
        else if (dataArray.length === 0 && !isStatusZero) errMsg = "پاسخ خالی از سرور";

        setSendResult({ success: false, data });
        push("خطا در ارسال: " + errMsg, "error");
      }
    } catch (err) {
      setSendResult({ success: false, error: err.message });
      push("خطا: " + err.message, "error");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Spinner label="پنل پیامک در حال بارگذاری..." />;

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
          <h1 className="text-2xl sm:text-3xl font-black text-navy flex items-center gap-2">
            <MessageSquare size={22} className="text-teal" />
            پنل پیامک
          </h1>
          <p className="text-sm font-semibold text-ink-subtle mt-0.5">
            ارسال و مدیریت پیامک
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={14} className="ml-1" /> تنظیمات آموت
        </Button>
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
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
              <StatCard
                theme="teal"
                label="ارسال امروز"
                value={faNum(stats.today_sent || 0)}
                caption="پیامک ارسال شده"
              />
              <StatCard
                theme="navy"
                label="ارسال ماه"
                value={faNum(stats.month_sent || 0)}
                caption="پیامک این ماه"
              />
              <StatCard
                theme="magenta"
                label="تحویل شده"
                value={faNum(stats.delivered || 0)}
                caption="تایید شده توسط گیرنده"
              />
              <StatCard
                theme="orange"
                label="دریافتی امروز"
                value={faNum(stats.inbox_today || 0)}
                caption="پیامک دریافتی"
              />
            </div>
          )}

          {/* وضعیت حساب */}
          <div>
            <h2 className="text-xl font-extrabold text-navy mb-3">
              وضعیت حساب آموت
            </h2>
            {fetchingStatus ? (
              <Spinner label="دریافت اطلاعات حساب..." />
            ) : accountInfo ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
                <div className="-rotate-[0.5deg]">
                  <StickerCard theme="teal">
                    <div className="p-3.5">
                      <div className="text-xs font-bold text-teal-text mb-0.5">
                        موجودی حساب
                      </div>
                      <div className="text-xl font-extrabold text-teal-text">
                        {formatRial(accountInfo.credit)}
                      </div>
                    </div>
                  </StickerCard>
                </div>
                <div className="rotate-[0.5deg]">
                  <StickerCard theme="white">
                    <div className="p-3.5">
                      <div className="text-xs font-bold text-ink-subtle mb-0.5">
                        نام حساب
                      </div>
                      <div className="text-sm font-extrabold text-navy">
                        {accountInfo.accountName || "—"}
                      </div>
                    </div>
                  </StickerCard>
                </div>
                <div className="-rotate-[0.5deg]">
                  <StickerCard theme="white">
                    <div className="p-5">
                      <div className="text-sm font-bold text-ink-subtle mb-1">
                        خطوط فعال
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {accountInfo.lineNumbers?.length > 0 ? (
                          accountInfo.lineNumbers.map((line, i) => (
                            <Badge key={i} color="blue">
                              {line}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-ink-subtle">—</span>
                        )}
                      </div>
                    </div>
                  </StickerCard>
                </div>
              </div>
            ) : (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadAccountStatus}
                    >
                      <RefreshCw size={14} className="ml-1" /> تلاش مجدد
                    </Button>
                  </div>
                </StickerCard>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                loadStats();
                loadAccountStatus();
              }}
            >
              <RefreshCw size={14} className="ml-1" /> بروزرسانی
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ تب ارسال پیامک ═══════ */}
      {tab === "send" && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="-rotate-[0.5deg]">
            <StickerCard theme="white">
              <div className="p-4 flex flex-col gap-4">
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
                    <div className="flex items-center gap-2 mb-2">
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
                    {sendResult.data && (
                      <pre className="text-xs bg-white/50 rounded-pill-md p-2 overflow-auto max-h-32 font-mono">
                        {JSON.stringify(sendResult.data, null, 2)}
                      </pre>
                    )}
                    {sendResult.error && (
                      <p className="text-xs font-semibold text-magenta-text">
                        {sendResult.error}
                      </p>
                    )}
                  </div>
                )}

                {/* دکمه ارسال */}
                <Button
                  variant="teal"
                  size="lg"
                  onClick={handleSendSms}
                  disabled={sending || !smsText.trim() || !smsNumbers.trim()}
                  className="self-start"
                  rotate="-rotate-[1deg]"
                >
                  {sending ? (
                    "در حال ارسال..."
                  ) : (
                    <>
                      <Send size={16} className="ml-2" />
                      ارسال پیامک
                    </>
                  )}
                </Button>
              </div>
            </StickerCard>
          </div>
        </div>
      )}

      {/* ═══════ تب تاریخچه ═══════ */}
      {tab === "history" && (
        <div className="flex flex-col gap-3">
          {historyLoading ? (
            <Spinner label="بارگذاری تاریخچه..." />
          ) : history.length === 0 ? (
            <EmptyState
              icon={<History size={48} />}
              title="هنوز پیامکی ارسال نشده"
              subtitle="اولین پیامک خود را ارسال کنید."
            />
          ) : (
            <div className="rotate-[0.3deg]">
              <StickerCard theme="white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-navy border-b-2 border-ink/10">
                        <th className="text-right font-extrabold px-4 py-2.5">
                          شماره
                        </th>
                        <th className="text-right font-extrabold px-4 py-2.5">
                          متن
                        </th>
                        <th className="text-right font-extrabold px-4 py-2.5">
                          وضعیت
                        </th>
                        <th className="text-right font-extrabold px-4 py-2.5 hidden sm:table-cell">
                          تاریخ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr
                          key={h.id}
                          className={`${i % 2 ? "bg-bg-lavender/60" : ""} border-b border-ink/5 last:border-0`}
                        >
                          <td
                            className="px-4 py-2.5 font-mono text-sm font-bold"
                            dir="ltr"
                          >
                            {h.mobile}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-sm line-clamp-1 max-w-[200px]">
                            {h.text}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              color={
                                h.status === "delivered"
                                  ? "green"
                                  : h.status === "failed"
                                    ? "red"
                                    : h.status === "sent"
                                      ? "blue"
                                      : "gray"
                              }
                            >
                              {h.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-semibold text-ink-subtle hidden sm:table-cell">
                            {new Date(h.created_at).toLocaleDateString("fa-IR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </StickerCard>
            </div>
          )}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={loadHistory}>
              <RefreshCw size={14} className="ml-1" /> بروزرسانی
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ تب پیامک‌های دریافتی ═══════ */}
      {tab === "inbox" && (
        <div className="flex flex-col gap-4">
          {inboxLoading ? (
            <Spinner label="بارگذاری پیامک‌ها..." />
          ) : inbox.length === 0 ? (
            <EmptyState
              icon={<Inbox size={48} />}
              title="هنوز پیامک دریافتی وجود ندارد"
              subtitle="پیامک‌های دریافتی از وب‌هوک اینجا نمایش داده می‌شوند."
            />
          ) : (
            <div className="rotate-[0.3deg]">
              <StickerCard theme="white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-navy border-b-2 border-ink/10">
                        <th className="text-right font-black px-4 py-3">
                          شماره
                        </th>
                        <th className="text-right font-black px-4 py-3">
                          متن
                        </th>
                        <th className="text-right font-black px-4 py-3">
                          تاریخ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inbox.map((m, i) => (
                        <tr
                          key={m.id}
                          className={i % 2 ? "bg-bg-lavender/60" : ""}
                        >
                          <td
                            className="px-4 py-3 font-mono text-sm font-bold"
                            dir="ltr"
                          >
                            {m.mobile}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold line-clamp-1 max-w-[300px]">
                            {m.text}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-ink-subtle">
                            {new Date(m.created_at).toLocaleDateString("fa-IR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </StickerCard>
            </div>
          )}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={loadInbox}>
              <RefreshCw size={14} className="ml-1" /> بروزرسانی
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ مودال تنظیمات آموت ═══════ */}
      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)}>
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-black text-navy">
              تنظیمات پنل پیامک آموت
            </h2>
            <p className="text-xs font-semibold text-ink-subtle">
              اطلاعات زیر از حساب آموت SMS خوانده می‌شود. رمز عبور فقط در سرور
              (Edge Function) استفاده می‌شود و در مرورگر ذخیره نمی‌شود.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-navy mb-1">
                  شناسه کاربر آموت (user_id) *
                </label>
                <input
                  type="text"
                  value={settingsForm.amoot_user_id}
                  onChange={(e) =>
                    setSettingsForm((p) => ({
                      ...p,
                      amoot_user_id: e.target.value,
                    }))
                  }
                  className={inputCls}
                  placeholder="مثال: 12345"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">
                  رمز عبور آموت (password) *
                </label>
                <input
                  type="password"
                  value={settingsForm.amoot_password}
                  onChange={(e) =>
                    setSettingsForm((p) => ({
                      ...p,
                      amoot_password: e.target.value,
                    }))
                  }
                  className={inputCls}
                  placeholder="رمز عبور"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">
                  API Key (اختیاری)
                </label>
                <input
                  type="password"
                  value={settingsForm.api_token}
                  onChange={(e) =>
                    setSettingsForm((p) => ({
                      ...p,
                      api_token: e.target.value,
                    }))
                  }
                  className={inputCls}
                  placeholder="API Key (اگه دارید)"
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

            <div className="flex gap-2 justify-end mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(false)}
              >
                انصراف
              </Button>
              <Button
                variant="teal"
                size="sm"
                onClick={handleSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? "در حال ذخیره..." : "ذخیره تنظیمات"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
