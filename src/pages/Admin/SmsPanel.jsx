import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import SEO from "../../components/ui/SEO";
import {
  MessageSquare,
  Send,
  Settings,
  CreditCard,
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Inbox,
  History,
  BarChart3,
} from "lucide-react";

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all";

// ─── تابع کمکی فراخوانی API آموت از طریق Vercel API ───
async function amootFetch(endpoint, token, params = {}) {
  // گرفتن session برای احراز هویت
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("لاگین نیستید");

  // فراخوانی Vercel API
  const res = await fetch("/api/amoot-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      endpoint,
      params: { Token: token, ...params },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export default function SmsPanel() {
  const { hasPermission } = useAuth();
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard"); // dashboard | send | history | inbox | settings

  // ─── Dashboard ───
  const [stats, setStats] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(false);

  // ─── Send SMS ───
  const [smsNumbers, setSmsNumbers] = useState("");
  const [smsText, setSmsText] = useState("");
  const [lineNumber, setLineNumber] = useState("public");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // ─── History ───
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── Inbox ───
  const [inbox, setInbox] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  // ─── Permission check ───
  const canSms = hasPermission("manage_sms");

  // ─── Load stats ───
  const loadStats = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.rpc("get_sms_stats");
      if (data) setStats(data);
    } catch (err) {
      console.warn("loadStats error:", err);
    }
  }, []);

  // ─── Load account status ───
  const loadAccountStatus = useCallback(async () => {
    setFetchingStatus(true);
    try {
      const data = await amootFetch("AccountStatus");
      if (data.Status === 0 || data.Status === "0") {
        setAccountInfo(data);
      } else {
        push("خطا در دریافت اطلاعات حساب: " + (data.Message || "نامشخص"), "error");
      }
    } catch (err) {
      push("خطا در اتصال به سرور: " + err.message, "error");
    } finally {
      setFetchingStatus(false);
    }
  }, [push]);

  // ─── Load history ───
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
      push("خطا در بارگذاری تاریخچه: " + err.message, "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [push]);

  // ─── Load inbox ───
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
      push("خطا در بارگذاری پیامک‌ها: " + err.message, "error");
    } finally {
      setInboxLoading(false);
    }
  }, [push]);

  useEffect(() => {
    Promise.all([loadStats(), loadAccountStatus()]).then(() => setLoading(false));
  }, [loadStats, loadAccountStatus]);

  useEffect(() => {
    if (tab === "history") loadHistory();
    if (tab === "inbox") loadInbox();
    if (tab === "dashboard") { loadStats(); loadAccountStatus(); }
  }, [tab, loadHistory, loadInbox, loadStats, loadAccountStatus]);

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
    setSending(true);
    setSendResult(null);
    try {
      // جدا کردن شماره‌ها با کاما یا خط جدید
      const numbersArr = smsNumbers
        .split(/[,;\n]+/)
        .map((n) => n.trim().replace(/^0/, ""))
        .filter(Boolean);
      const numbers = numbersArr.join(",");

      const data = await amootFetch("SendSimple", {
        SendDateTime: "0",
        SMSMessageText: smsText,
        LineNumber: lineNumber || "public",
        Mobiles: numbers,
      });

      if (data.Status === 0 || data.Status === "0" || data.Data) {
        setSendResult({ success: true, data });
        push("پیامک با موفقیت ارسال شد! ✅");

        // ذخیره در outbox
        const results = Array.isArray(data.Data) ? data.Data : [data.Data];
        for (const r of results) {
          if (r?.Mobile) {
            await supabase.rpc("log_sms_outbox", {
              p_mobile: r.Mobile,
              p_line_number: lineNumber || "public",
              p_text: smsText,
              p_message_id: r.MessageID ? String(r.MessageID) : null,
              p_status: "sent",
            });
          }
        }

        setSmsText("");
        setSmsNumbers("");
        loadStats();
      } else {
        setSendResult({ success: false, data });
        push("خطا در ارسال: " + (data.explanation || data.Message || "نامشخص"), "error");
      }
    } catch (err) {
      setSendResult({ success: false, error: err.message });
      push("خطا در ارسال: " + err.message, "error");
    } finally {
      setSending(false);
    }
  }

  // ─── Format price ───
  function formatRial(amount) {
    if (!amount && amount !== 0) return "—";
    return Number(amount).toLocaleString("fa-IR") + " ریال";
  }

  if (loading) return <Spinner label="بارگذاری پنل پیامک..." />;

  if (!canSms) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <XCircle size={64} className="text-magenta-text/40" />
        <h2 className="text-xl font-black text-navy">دسترسی غیرمجاز</h2>
        <p className="text-sm text-ink-subtle">
          شما مجوز دسترسی به پنل پیامک را ندارید. با مدیر اصلی تماس بگیرید.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SEO
        title="پنل پیامک"
        description="ارسال و مدیریت پیامک از طریق آموت — پرسکاد"
        url="/admin/sms"
        noIndex
      />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy flex items-center gap-2">
            <MessageSquare size={28} className="text-teal" />
            پنل پیامک
          </h1>
          <p className="text-sm font-semibold text-ink-subtle mt-1">
            ارسال و مدیریت پیامک از طریق وب‌سرویس آموت
          </p>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-2 bg-white/60 backdrop-blur-sm rounded-pill-lg p-1.5 border-2 border-navy/10 overflow-x-auto">
        {[
          { id: "dashboard", label: "داشبورد", icon: BarChart3 },
          { id: "send", label: "ارسال پیامک", icon: Send },
          { id: "history", label: "تاریخچه", icon: History },
          { id: "inbox", label: "دریافتی", icon: Inbox },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-pill-md text-sm font-bold transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-teal text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]"
                : "text-ink-subtle hover:text-ink hover:bg-white"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── تب داشبورد ─── */}
      {tab === "dashboard" && (
        <div className="flex flex-col gap-5">
          {/* آمار */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "ارسال امروز", value: stats.today_sent || 0, icon: Send, color: "teal" },
                { label: "ارسال ماه", value: stats.month_sent || 0, icon: BarChart3, color: "navy" },
                { label: "تحویل شده", value: stats.delivered || 0, icon: CheckCircle, color: "green" },
                { label: "دریافتی امروز", value: stats.inbox_today || 0, icon: Inbox, color: "orange" },
              ].map((s, i) => (
                <StickerCard key={i} theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon size={16} className={`text-${s.color}`} />
                      <span className="text-xs font-bold text-ink-subtle">{s.label}</span>
                    </div>
                    <div className="text-2xl font-black text-navy">{s.value.toLocaleString("fa-IR")}</div>
                  </div>
                </StickerCard>
              ))}
            </div>
          )}

          {/* وضعیت حساب */}
          {fetchingStatus ? (
            <Spinner label="دریافت اطلاعات حساب..." />
          ) : accountInfo ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StickerCard theme="teal" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
                <div className="p-5">
                  <div className="text-xs font-bold text-teal/70 mb-1">موجودی حساب</div>
                  <div className="text-2xl font-black text-teal-text">
                    {formatRial(accountInfo.RemaindCredit)}
                  </div>
                </div>
              </StickerCard>
              <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
                <div className="p-5">
                  <div className="text-xs font-bold text-ink-subtle mb-1">نام حساب</div>
                  <div className="text-lg font-black text-navy">{accountInfo.AccountName || "—"}</div>
                </div>
              </StickerCard>
              <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
                <div className="p-5">
                  <div className="text-xs font-bold text-ink-subtle mb-1">خطوط فعال</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {accountInfo.ListLineNumbers?.length > 0 ? (
                      accountInfo.ListLineNumbers.map((line, i) => (
                        <Badge key={i} color="blue">{line}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-ink-subtle">—</span>
                    )}
                  </div>
                </div>
              </StickerCard>
            </div>
          ) : null}

          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => { loadStats(); loadAccountStatus(); }}>
              <RefreshCw size={14} className="ml-1" /> بروزرسانی
            </Button>
          </div>
        </div>
      )}

      {/* ─── تب ارسال پیامک ─── */}
      {tab === "send" && (
        <div className="flex flex-col gap-5 max-w-2xl">
              {/* شماره موبایل‌ها */}
              <div>
                <label className="block text-sm font-extrabold text-navy mb-1.5">
                  شماره موبایل‌ها (با کاما یا خط جدید جدا کنید)
                </label>
                <textarea
                  value={smsNumbers}
                  onChange={(e) => setSmsNumbers(e.target.value)}
                  className={inputCls + " min-h-[80px] font-mono text-sm"}
                  placeholder={"09121234567\n09351234567\n09191234567"}
                  dir="ltr"
                />
                <p className="text-xs text-ink-subtle mt-1">
                  {smsNumbers
                    .split(/[,;\n]+/)
                    .map((n) => n.trim())
                    .filter(Boolean).length}
                  شماره وارد شده
                </p>
              </div>

              {/* متن پیامک */}
              <div>
                <label className="block text-sm font-extrabold text-navy mb-1.5">
                  متن پیامک
                </label>
                <textarea
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  className={inputCls + " min-h-[120px]"}
                  placeholder="متن پیامک خود را اینجا بنویسید..."
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-ink-subtle">
                    {smsText.length} کاراکتر
                  </span>
                  <span className="text-xs text-ink-subtle">
                    {Math.ceil(smsText.length / 70)} صفحه
                  </span>
                </div>
              </div>



              {/* نتیجه ارسال */}
              {sendResult && (
                <div
                  className={`rounded-pill-lg border-2 p-4 ${
                    sendResult.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {sendResult.success ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : (
                      <XCircle size={20} className="text-red-600" />
                    )}
                    <span className={`font-black text-sm ${
                      sendResult.success ? "text-green-800" : "text-red-800"
                    }`}>
                      {sendResult.success ? "ارسال موفق" : "ارسال ناموفق"}
                    </span>
                  </div>
                  {sendResult.data && (
                    <pre className="text-xs bg-white/50 rounded-pill-md p-2 overflow-auto max-h-32">
                      {JSON.stringify(sendResult.data, null, 2)}
                    </pre>
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
      )}

      {/* ─── تب تاریخچه ارسال ─── */}
      {tab === "history" && (
        <div className="flex flex-col gap-4">
          {historyLoading ? (
            <Spinner label="بارگذاری تاریخچه..." />
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-ink-subtle">
              <History size={48} className="mx-auto mb-3 text-ink/20" />
              <p className="text-sm font-bold">هنوز پیامکی ارسال نشده</p>
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-sm rounded-pill-lg border-2 border-navy/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-navy/10 bg-bg-lavender/30">
                    <th className="px-4 py-3 text-right font-black text-navy">شماره</th>
                    <th className="px-4 py-3 text-right font-black text-navy">متن</th>
                    <th className="px-4 py-3 text-right font-black text-navy">وضعیت</th>
                    <th className="px-4 py-3 text-right font-black text-navy">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-navy/5 hover:bg-bg-lavender/20">
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">{h.mobile}</td>
                      <td className="px-4 py-3 text-xs line-clamp-1 max-w-[200px]">{h.text}</td>
                      <td className="px-4 py-3">
                        <Badge color={
                          h.status === "delivered" ? "green" :
                          h.status === "failed" ? "red" :
                          h.status === "sent" ? "blue" : "gray"
                        }>{h.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-subtle">
                        {new Date(h.created_at).toLocaleDateString("fa-IR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={loadHistory}>
              <RefreshCw size={14} className="ml-1" /> بروزرسانی
            </Button>
          </div>
        </div>
      )}

      {/* ─── تب پیامک‌های دریافتی ─── */}
      {tab === "inbox" && (
        <div className="flex flex-col gap-4">
          {inboxLoading ? (
            <Spinner label="بارگذاری پیامک‌ها..." />
          ) : inbox.length === 0 ? (
            <div className="text-center py-10 text-ink-subtle">
              <Inbox size={48} className="mx-auto mb-3 text-ink/20" />
              <p className="text-sm font-bold">هنوز پیامک دریافتی وجود ندارد</p>
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-sm rounded-pill-lg border-2 border-navy/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-navy/10 bg-bg-lavender/30">
                    <th className="px-4 py-3 text-right font-black text-navy">شماره</th>
                    <th className="px-4 py-3 text-right font-black text-navy">متن</th>
                    <th className="px-4 py-3 text-right font-black text-navy">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {inbox.map((m) => (
                    <tr key={m.id} className="border-b border-navy/5 hover:bg-bg-lavender/20">
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">{m.mobile}</td>
                      <td className="px-4 py-3 text-xs line-clamp-1 max-w-[300px]">{m.text}</td>
                      <td className="px-4 py-3 text-xs text-ink-subtle">
                        {new Date(m.created_at).toLocaleDateString("fa-IR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={loadInbox}>
              <RefreshCw size={14} className="ml-1" /> بروزرسانی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// StickerCard component inline (same pattern as other pages)
function StickerCard({ theme = "white", radius = "", children }) {
  const themeStyles = {
    white: "bg-white border-2 border-navy/10",
    teal: "bg-bg-mint/50 border-2 border-teal/20",
    orange: "bg-orange/5 border-2 border-orange/20",
  };
  return (
    <div
      className={`${themeStyles[theme] || themeStyles.white} ${radius} shadow-[3px_3px_0_0_rgba(0,0,0,0.08)]`}
    >
      {children}
    </div>
  );
}
