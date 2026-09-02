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
  MessageSquare, Send, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Inbox, History, BarChart3, Settings, Save, Key,
  Phone, User, Smartphone,
} from "lucide-react";

const inputCls = "w-full bg-white border-2 border-ink/15 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all";

function formatRial(amount) {
  if (!amount && amount !== 0) return "—";
  return Number(amount).toLocaleString("fa-IR") + " ریال";
}

export default function SmsPanel() {
  const { hasPermission, isOwner } = useAuth();
  const canSms = hasPermission("manage_sms") || isOwner();

  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // ─── Settings ───
  const [settings, setSettings] = useState({ amoot_token: "", line_number: "", sender_name: "" });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // ─── Send ───
  const [smsNumbers, setSmsNumbers] = useState("");
  const [smsText, setSmsText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // ─── Dashboard ───
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState({ outboxToday: 0, outboxMonth: 0, inboxToday: 0, successRate: null });

  // ─── History ───
  const [outbox, setOutbox] = useState([]);
  const [inboxMsgs, setInboxMsgs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Load Settings ───
  const loadSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from("sms_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setSettings({ amoot_token: "", line_number: data.line_number || "", sender_name: data.sender_name || "" });
      }
    } catch {}
  }, []);

  // ─── Load Dashboard Stats ───
  const loadDashboard = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [outboxData, outboxMonthData, inboxData, accountRes] = await Promise.all([
        supabase.from("sms_outbox").select("id, status").gte("created_at", today.toISOString()),
        supabase.from("sms_outbox").select("id, status").gte("created_at", monthStart.toISOString()),
        supabase.from("sms_inbox").select("id").gte("created_at", today.toISOString()),
        // AccountStatus از آموت
        fetch("/api/amoot-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data?.session?.access_token || ""}` },
          body: JSON.stringify({ endpoint: "AccountStatus" }),
        }).then((r) => r.json()).catch(() => null),
      ]);

      const todaySent = (outboxData.data || []).length;
      const todaySentOk = (outboxData.data || []).filter((o) => o.status === "sent" || o.status === "delivered").length;
      const monthSent = (outboxMonthData.data || []).length;
      const todayInbox = (inboxData.data || []).length;

      setStats({ outboxToday: todaySent, outboxMonth: monthSent, inboxToday: todayInbox, successRate: todaySent > 0 ? Math.round((todaySentOk / todaySent) * 100) : null });
      setAccount(accountRes);
    } catch {}
  }, []);

  // ─── Load History ───
  const loadHistory = useCallback(async () => {
    setLogLoading(true);
    try {
      const [outboxRes, inboxRes] = await Promise.all([
        supabase.from("sms_outbox").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("sms_inbox").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      setOutbox(outboxRes.data || []);
      setInboxMsgs(inboxRes.data || []);
    } catch {}
    setLogLoading(false);
  }, []);

  // ─── Init ───
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadSettings(), loadDashboard()]);
      setLoading(false);
    }
    init();
  }, [loadSettings, loadDashboard]);

  useEffect(() => {
    if (tab === "history" || tab === "inbox") loadHistory();
  }, [tab, loadHistory]);

  // ─── Save Settings ───
  async function handleSaveSettings(e) {
    e.preventDefault();
    if (!canSms) return;
    setSavingSettings(true);
    try {
      // upsert row id=1
      const { error } = await supabase.from("sms_settings").upsert({
        id: 1,
        amoot_token: settings.amoot_token,
        line_number: settings.line_number,
        sender_name: settings.sender_name,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (error) throw error;
      showToast("تنظیمات ذخیره شد ✅");
      setSettingsDirty(false);
    } catch (err) {
      showToast("خطا: " + err.message, "error");
    }
    setSavingSettings(false);
  }

  // ─── Send SMS ───
  async function handleSendSms(e) {
    e.preventDefault();
    if (!smsText.trim() || !smsNumbers.trim() || !canSms || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const mobiles = smsNumbers.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean).join(",");
      const session = await supabase.auth.getSession();
      const token = session.data?.session?.access_token || "";

      const res = await fetch("/api/amoot-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: "SendSimple", params: { Mobile: mobiles, Message: smsText, Sender: settings.line_number || undefined } }),
      });
      const data = await res.json();

      // لاگ در outbox (اگر message_id برگشت)
      if (data.Status === 1 || data.Status === "1" || data.MessageID) {
        const messageId = String(data.MessageID || data.MessageIds || "");
        await supabase.from("sms_outbox").insert({
          message_id: messageId,
          mobile: mobiles,
          text: smsText,
          status: "sent",
          line_number: settings.line_number,
          parts: data.Parts || null,
          cost: data.Cost || null,
        });
        showToast("پیامک با موفقیت ارسال شد ✅");
        setSendResult({ success: true, data });
        setSmsText("");
        setSmsNumbers("");
        loadDashboard();
      } else {
        showToast("ارسال ناموفق: " + (data.Message || JSON.stringify(data)), "error");
        setSendResult({ success: false, error: data.Message || data });
      }
    } catch (err) {
      showToast("خطا: " + err.message, "error");
      setSendResult({ success: false, error: err.message });
    }
    setSending(false);
  }

  const TABS = [
    { id: "dashboard", label: "داشبورد", icon: BarChart3 },
    { id: "send", label: "ارسال پیامک", icon: Send },
    { id: "history", label: "تاریخچه ارسال", icon: History },
    { id: "inbox", label: "دریافتی", icon: Inbox },
    { id: "settings", label: "تنظیمات آموت", icon: Settings },
  ];

  if (loading) return <Spinner label="بارگذاری پنل پیامک..." />;

  return (
    <div className="flex flex-col gap-8">
      <SEO title="پنل پیامک" description="ارسال و مدیریت پیامک — پنل مدیریت پرس‌کاد" url="/admin/sms" noIndex />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-pill-md text-sm font-bold shadow-lg transition-all ${toast.type === "error" ? "bg-female-light border-2 border-female-normal text-female-dark" : "bg-ecosystem-light border-2 border-teal text-teal-text"}`}>
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
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-0.5">ارسال و مدیریت پیامک از طریق آموت</p>
        </div>
      </div>

      {/* Warning */}
      {!canSms && (
        <div className="bg-college-light border-2 border-orange/30 rounded-pill-md px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-orange shrink-0" />
          <p className="text-sm font-bold text-orange">شما مجوز استفاده از پنل پیامک را ندارید. فقط مشاهده امکان‌پذیر است.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border-2 border-ink/10 rounded-pill-md p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-pill-sm text-sm font-bold transition-all whitespace-nowrap ${tab === t.id ? "bg-teal text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]" : "text-ink-subtle hover:text-ink hover:bg-bg-lavender"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Dashboard ═══ */}
      {tab === "dashboard" && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            <StatCard theme="teal" label="ارسال امروز" value={faNum(stats.outboxToday)} caption="پیامک ارسال شده" />
            <StatCard theme="navy" label="ارسال ماه" value={faNum(stats.outboxMonth)} caption="پیامک این ماه" />
            <StatCard theme="magenta" label="دریافتی امروز" value={faNum(stats.inboxToday)} caption="پیامک دریافتی" />
            <StatCard theme="orange" label="موفقیت" value={stats.successRate !== null ? `${faNum(stats.successRate)}٪` : "—"} caption="نرخ تحویل امروز" />
          </div>

          {/* Account Status */}
          <div>
            <h2 className="text-xl font-extrabold text-navy mb-3">وضعیت حساب آموت</h2>
            <div className="rotate-[0.3deg]">
              <StickerCard theme="white">
                <div className="p-6">
                  {account ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center"><Phone size={18} className="text-teal-text" /></div>
                        <div>
                          <p className="text-sm font-bold text-navy">وضعیت: {account.Status === 1 ? "فعال ✅" : "غیرفعال ❌"}</p>
                          {account.Balance !== undefined && <p className="text-xs font-semibold text-ink-subtle">موجودی: {formatRial(account.Balance)}</p>}
                        </div>
                      </div>
                      {account.ExpireDate && <p className="text-xs font-medium text-ink/50">تاریخ انقضا: {account.ExpireDate}</p>}
                    </div>
                  ) : (
                    <div className="text-center">
                      <AlertTriangle size={40} className="mx-auto text-orange/50 mb-3" />
                      <p className="text-sm font-bold text-ink-subtle mb-3">اطلاعات حساب قابل دریافت نیست</p>
                      <p className="text-xs text-ink-subtle">توکن آموت را در تب «تنظیمات آموت» وارد کنید.</p>
                    </div>
                  )}
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
              <form onSubmit={handleSendSms} className="p-4 flex flex-col gap-4">
                <div>
                  <label className="block text-base font-extrabold text-navy mb-1">شماره موبایل‌ها</label>
                  <textarea value={smsNumbers} onChange={(e) => setSmsNumbers(e.target.value)}
                    className={`${inputCls} min-h-[70px] font-mono text-xs`} placeholder={"09121234567\n09351234567\n09191234567"} dir="ltr" />
                  <p className="text-[0.65rem] font-semibold text-ink-subtle mt-0.5">
                    {smsNumbers.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean).length} شماره وارد شده
                  </p>
                </div>
                <div>
                  <label className="block text-base font-extrabold text-navy mb-1">متن پیامک</label>
                  <textarea value={smsText} onChange={(e) => setSmsText(e.target.value)}
                    className={`${inputCls} min-h-[100px] text-xs`} placeholder="متن پیامک خود را اینجا بنویسید..." />
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-sm font-semibold text-ink-subtle">{smsText.length} کاراکتر</span>
                    <span className="text-sm font-semibold text-ink-subtle">{Math.ceil(smsText.length / 70)} صفحه</span>
                  </div>
                </div>
                {sendResult && (
                  <div className={`rounded-pill-md border-2 p-4 ${sendResult.success ? "bg-ecosystem-light border-teal" : "bg-female-light border-magenta"}`}>
                    <div className="flex items-center gap-2">
                      {sendResult.success ? <CheckCircle size={20} className="text-teal-text" /> : <XCircle size={20} className="text-magenta-text" />}
                      <span className={`font-black text-sm ${sendResult.success ? "text-teal-text" : "text-magenta-text"}`}>
                        {sendResult.success ? "ارسال موفق ✅" : "ارسال ناموفق ❌"}
                      </span>
                    </div>
                    {sendResult.error && <p className="text-xs font-medium text-ink-subtle mt-1">{JSON.stringify(sendResult.error)}</p>}
                  </div>
                )}
                <Button variant="teal" size="lg" type="submit" disabled={!canSms || !smsText.trim() || !smsNumbers.trim() || sending}
                  className="self-start" rotate="-rotate-[1deg]">
                  <Send size={16} className="ml-2" /> {sending ? "در حال ارسال..." : "ارسال پیامک"}
                </Button>
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
            <Button variant="ghost" size="sm" onClick={loadHistory}><RefreshCw size={14} /></Button>
          </div>
          {logLoading ? <Spinner label="بارگذاری..." /> : outbox.length === 0 ? (
            <EmptyState icon={<History size={48} />} title="هنوز پیامکی ارسال نشده" subtitle="اولین پیامک خود را ارسال کنید." />
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
            <Button variant="ghost" size="sm" onClick={loadHistory}><RefreshCw size={14} /></Button>
          </div>
          {logLoading ? <Spinner label="بارگذاری..." /> : inboxMsgs.length === 0 ? (
            <EmptyState icon={<Inbox size={48} />} title="هنوز پیامک دریافتی ندارید" subtitle="پیامک‌های دریافتی از وب‌هوک آموت اینجا نمایش داده می‌شوند." />
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
                    {msg.line_number && <span className="text-[0.65rem] font-medium text-ink-subtle">خط: {msg.line_number}</span>}
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
              <form onSubmit={handleSaveSettings} className="p-5 flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-black text-navy mb-1">تنظیمات آموت SMS</h2>
                  <p className="text-xs font-semibold text-ink-subtle">
                    توکن وب‌سرویس آموت را از پنل کاربری آموت کپی کنید. آدرس وب‌هوک برای دریافت پیامک‌های ورودی و گزارش تحویل:
                  </p>
                  <div className="bg-bg-lavender rounded-lg px-3 py-2 mt-2 text-xs font-mono text-navy" dir="ltr">
                    {window.location.origin}/api/webhooks/amoot
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy mb-1">
                      <Key size={12} className="inline ml-1" /> توکن وب‌سرویس آموت
                    </label>
                    <input type="password" value={settings.amoot_token} onChange={(e) => { setSettings((p) => ({ ...p, amoot_token: e.target.value })); setSettingsDirty(true); }}
                      className={inputCls} placeholder="از پنل آموت کپی کنید" dir="ltr" disabled={!canSms} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy mb-1"><Smartphone size={12} className="inline ml-1" /> شماره خط</label>
                      <input type="text" value={settings.line_number} onChange={(e) => { setSettings((p) => ({ ...p, line_number: e.target.value })); setSettingsDirty(true); }}
                        className={inputCls} placeholder="مثلاً 5000xxxx" dir="ltr" disabled={!canSms} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy mb-1"><User size={12} className="inline ml-1" /> نام فرستنده</label>
                      <input type="text" value={settings.sender_name} onChange={(e) => { setSettings((p) => ({ ...p, sender_name: e.target.value })); setSettingsDirty(true); }}
                        className={inputCls} placeholder="پرس‌کاد" disabled={!canSms} />
                    </div>
                  </div>
                </div>

                <div className="bg-college-light border-2 border-orange/30 rounded-pill-md px-4 py-3 flex items-center gap-3">
                  <AlertTriangle size={18} className="text-orange shrink-0" />
                  <p className="text-xs font-semibold text-ink-subtle">
                    توکن آموت به‌صورت رمزنگاری‌شده در دیتابیس ذخیره می‌شود. همچنین می‌توانید آن را در Vercel env با کلید <span className="font-mono font-bold text-navy">AMOOT_TOKEN</span> تنظیم کنید (اولویت با env).
                  </p>
                </div>

                <div className="flex gap-2 justify-end mt-1">
                  <Button variant="teal" size="sm" type="submit" disabled={!canSms || !settingsDirty || savingSettings}>
                    <Save size={14} className="ml-1" /> {savingSettings ? "در حال ذخیره..." : "ذخیره تنظیمات"}
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