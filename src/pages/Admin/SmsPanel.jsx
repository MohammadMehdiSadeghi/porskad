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
} from "lucide-react";

const inputCls =
  "w-full bg-white border-2 border-ink/15 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all";

// ─── تابع کمکی فراخوانی API آموت از طریق Vercel API ───
async function amootFetch(endpoint, params = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("لاگین نیستید");

  const res = await fetch("/api/amoot-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ endpoint, params }),
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

  const canSms = hasPermission("manage_sms");

  // ─── Load functions ───
  const loadStats = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.rpc("get_sms_stats");
      if (data) setStats(data);
    } catch { /* ممکنه تابع وجود نداشته باشه */ }
  }, []);

  const loadAccountStatus = useCallback(async () => {
    setFetchingStatus(true);
    try {
      const data = await amootFetch("AccountStatus");
      if (data.Status === 0 || data.Status === "0") {
        setAccountInfo(data);
      } else {
        const errMsg = data.explanation || data.Message || data.Status || "نامشخص";
        push("خطا: " + errMsg, "error");
      }
    } catch (err) {
      push("خطا در اتصال: " + err.message, "error");
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
    if (!smsText.trim()) { push("متن پیامک الزامی است.", "error"); return; }
    if (!smsNumbers.trim()) { push("شماره موبایل الزامی است.", "error"); return; }

    setSending(true);
    setSendResult(null);
    try {
      const numbersArr = smsNumbers
        .split(/[,;\n]+/)
        .map((n) => n.trim().replace(/^0/, ""))
        .filter(Boolean);
      const numbers = numbersArr.join(",");

      const data = await amootFetch("SendSimple", {
        SendDateTime: "0",
        SMSMessageText: smsText,
        LineNumber: "public",
        Mobiles: numbers,
      });

      if (data.Status === 0 || data.Status === "0" || data.Data) {
        setSendResult({ success: true, data });
        push("پیامک با موفقیت ارسال شد! ✅");

        const results = Array.isArray(data.Data) ? data.Data : (data.Data ? [data.Data] : []);
        for (const r of results) {
          if (r?.Mobile) {
            await supabase.rpc("log_sms_outbox", {
              p_mobile: r.Mobile,
              p_line_number: "public",
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
        const errMsg = data.explanation || data.Message || data.Status || "نامشخص";
        setSendResult({ success: false, data });
        push("خطا: " + errMsg, "error");
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

  function formatRial(amount) {
    if (!amount && amount !== 0) return "—";
    return Number(amount).toLocaleString("fa-IR") + " ریال";
  }

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
          <h1 className="text-2xl lg:text-3xl font-extrabold text-navy flex items-center gap-2">
            <MessageSquare size={22} className="text-teal" />
            پنل پیامک
          </h1>
          <p className="text-sm font-semibold text-ink-subtle mt-0.5">
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
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
              <StatCard theme="teal" label="ارسال امروز" value={faNum(stats.today_sent || 0)} caption="پیامک ارسال شده" />
              <StatCard theme="navy" label="ارسال ماه" value={faNum(stats.month_sent || 0)} caption="پیامک این ماه" />
              <StatCard theme="magenta" label="تحویل شده" value={faNum(stats.delivered || 0)} caption="تایید شده توسط گیرنده" />
              <StatCard theme="orange" label="دریافتی امروز" value={faNum(stats.inbox_today || 0)} caption="پیامک دریافتی" />
            </div>
          )}

          {/* وضعیت حساب */}
          <div>
            <h2 className="text-lg font-extrabold text-navy mb-3">وضعیت حساب آموت</h2>
            {fetchingStatus ? (
              <Spinner label="دریافت اطلاعات حساب..." />
            ) : accountInfo ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
                <div className="-rotate-[0.5deg]">
                  <StickerCard theme="teal">
                    <div className="p-3.5">
                      <div className="text-xs font-bold text-teal-text mb-0.5">موجودی حساب</div>
                      <div className="text-xl font-extrabold text-teal-text">
                        {formatRial(accountInfo.RemaindCredit)}
                      </div>
                    </div>
                  </StickerCard>
                </div>
                <div className="rotate-[0.5deg]">
                  <StickerCard theme="white">
                    <div className="p-3.5">
                      <div className="text-xs font-bold text-ink-subtle mb-0.5">نام حساب</div>
                      <div className="text-sm font-extrabold text-navy">
                        {accountInfo.AccountName || "—"}
                      </div>
                    </div>
                  </StickerCard>
                </div>
                <div className="-rotate-[0.5deg]">
                  <StickerCard theme="white">
                    <div className="p-5">
                      <div className="text-sm font-bold text-ink-subtle mb-1">خطوط فعال</div>
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
              </div>
            ) : (
              <div className="rotate-[0.3deg]">
                <StickerCard theme="white">
                  <div className="p-6 text-center">
                    <AlertTriangle size={40} className="mx-auto text-orange/50 mb-3" />
                    <p className="text-sm font-bold text-ink-subtle mb-3">
                      اطلاعات حساب قابل دریافت نیست
                    </p>
                    <Button variant="ghost" size="sm" onClick={loadAccountStatus}>
                      <RefreshCw size={14} className="ml-1" /> تلاش مجدد
                    </Button>
                  </div>
                </StickerCard>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => { loadStats(); loadAccountStatus(); }}>
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
                  <label className="block text-sm font-extrabold text-navy mb-1">
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
                    {smsNumbers.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean).length} شماره وارد شده — با کاما یا خط جدید جدا کنید
                  </p>
                </div>

                {/* متن پیامک */}
                <div>
                  <label className="block text-sm font-extrabold text-navy mb-1">
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
                      <span className={`font-black text-sm ${
                        sendResult.success ? "text-teal-text" : "text-magenta-text"
                      }`}>
                        {sendResult.success ? "ارسال موفق ✅" : "ارسال ناموفق ❌"}
                      </span>
                    </div>
                    {sendResult.data && (
                      <pre className="text-xs bg-white/50 rounded-pill-md p-2 overflow-auto max-h-32 font-mono">
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
                  rotate="-rotate-[1deg]"
                >
                  {sending ? "در حال ارسال..." : (
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
                        <th className="text-right font-extrabold px-4 py-2.5">شماره</th>
                        <th className="text-right font-extrabold px-4 py-2.5">متن</th>
                        <th className="text-right font-extrabold px-4 py-2.5">وضعیت</th>
                        <th className="text-right font-extrabold px-4 py-2.5 hidden sm:table-cell">تاریخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={h.id} className={`${i % 2 ? "bg-bg-lavender/60" : ""} border-b border-ink/5 last:border-0`}>
                          <td className="px-4 py-2.5 font-mono text-sm font-bold" dir="ltr">{h.mobile}</td>
                          <td className="px-4 py-2.5 font-semibold text-sm line-clamp-1 max-w-[200px]">{h.text}</td>
                          <td className="px-3 py-2">
                            <Badge color={
                              h.status === "delivered" ? "green" :
                              h.status === "failed" ? "red" :
                              h.status === "sent" ? "blue" : "gray"
                            }>{h.status}</Badge>
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
                        <th className="text-right font-black px-4 py-3">شماره</th>
                        <th className="text-right font-black px-4 py-3">متن</th>
                        <th className="text-right font-black px-4 py-3">تاریخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inbox.map((m, i) => (
                        <tr key={m.id} className={i % 2 ? "bg-bg-lavender/60" : ""}>
                          <td className="px-4 py-3 font-mono text-sm font-bold" dir="ltr">{m.mobile}</td>
                          <td className="px-4 py-3 text-sm font-semibold line-clamp-1 max-w-[300px]">{m.text}</td>
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
    </div>
  );
}
