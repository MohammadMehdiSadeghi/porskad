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
} from "lucide-react";

const AMOOT_BASE = "https://portal.amootsms.com/rest";

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all";

// ─── تابع کمکی فراخوانی API آموت ───
async function amootFetch(endpoint, token, params = {}) {
  const url = new URL(`${AMOOT_BASE}/${endpoint}`);
  url.searchParams.set("Token", token);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      url.searchParams.set(key, String(val));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function SmsPanel() {
  const { hasPermission } = useAuth();
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("status"); // status | send | settings

  // ─── Settings ───
  const [apiToken, setApiToken] = useState("");
  const [lineNumber, setLineNumber] = useState("public");
  const [senderName, setSenderName] = useState("پرسکاد");
  const [saving, setSaving] = useState(false);

  // ─── Account Status ───
  const [accountInfo, setAccountInfo] = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(false);

  // ─── Send SMS ───
  const [smsNumbers, setSmsNumbers] = useState("");
  const [smsText, setSmsText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // ─── Permission check ───
  const canSms = hasPermission("manage_sms");

  // ─── Load saved settings ───
  const loadSettings = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.rpc("get_active_sms_settings");
      if (error) {
        // ممکنه تابع وجود نداشته باشه (مایگریشن اجرا نشده)
        console.warn("SMS settings not available:", error.message);
        return;
      }
      if (data && data.length > 0) {
        const s = data[0];
        setApiToken(s.api_token || "");
        setLineNumber(s.line_number || "public");
        setSenderName(s.sender_name || "پرسکاد");
      }
    } catch (err) {
      console.warn("loadSettings error:", err);
    }
  }, []);

  // ─── Load account status ───
  const loadAccountStatus = useCallback(async () => {
    if (!apiToken) return;
    setFetchingStatus(true);
    try {
      const data = await amootFetch("AccountStatus", apiToken);
      if (data.Status === 0 || data.Status === "0") {
        setAccountInfo(data);
      } else {
        push("خطا در دریافت اطلاعات حساب: " + (data.Message || "نامشخص"), "error");
      }
    } catch (err) {
      push("خطا در اتصال به سرور آموت: " + err.message, "error");
    } finally {
      setFetchingStatus(false);
    }
  }, [apiToken, push]);

  useEffect(() => {
    loadSettings().then(() => setLoading(false));
  }, [loadSettings]);

  useEffect(() => {
    if (tab === "status" && apiToken) {
      loadAccountStatus();
    }
  }, [tab, apiToken, loadAccountStatus]);

  // ─── Save settings ───
  async function handleSaveSettings() {
    if (!apiToken.trim()) {
      push("توکن API الزامی است.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("save_sms_settings", {
        p_api_token: apiToken.trim(),
        p_line_number: lineNumber.trim() || "public",
        p_sender_name: senderName.trim() || "پرسکاد",
      });
      if (error) throw error;
      push("تنظیمات با موفقیت ذخیره شد! ✅");
      // بعد از ذخیره، وضعیت حساب رو بگیر
      loadAccountStatus();
    } catch (err) {
      push("خطا در ذخیره: " + (err.message || "ناموفق"), "error");
    } finally {
      setSaving(false);
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
    setSending(true);
    setSendResult(null);
    try {
      // جدا کردن شماره‌ها با کاما یا خط جدید
      const numbers = smsNumbers
        .split(/[,;\n]+/)
        .map((n) => n.trim().replace(/^0/, ""))
        .filter(Boolean)
        .join(",");

      const data = await amootFetch("SendSimple", apiToken, {
        SendDateTime: new Date().toISOString(),
        SMSMessageText: smsText,
        LineNumber: lineNumber || "public",
        Mobiles: numbers,
      });

      if (data.Status === 0 || data.Status === "0") {
        setSendResult({ success: true, data });
        push("پیامک با موفقیت ارسال شد! ✅");
        setSmsText("");
        setSmsNumbers("");
      } else {
        setSendResult({ success: false, data });
        push("خطا در ارسال: " + (data.Message || "نامشخص"), "error");
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
      <div className="flex gap-2 bg-white/60 backdrop-blur-sm rounded-pill-lg p-1.5 border-2 border-navy/10">
        {[
          { id: "status", label: "وضعیت حساب", icon: CreditCard },
          { id: "send", label: "ارسال پیامک", icon: Send },
          { id: "settings", label: "تنظیمات", icon: Settings },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-pill-md text-sm font-bold transition-all ${
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

      {/* ─── تب وضعیت حساب ─── */}
      {tab === "status" && (
        <div className="flex flex-col gap-5">
          {!apiToken ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-pill-lg p-6 text-center">
              <AlertTriangle size={40} className="mx-auto text-amber-500 mb-3" />
              <h3 className="font-black text-amber-800 mb-2">توکن API تنظیم نشده</h3>
              <p className="text-sm text-amber-700 mb-4">
                ابتدا توکن وب‌سرویس آموت را در بخش تنظیمات وارد کنید.
              </p>
              <Button variant="teal" size="sm" onClick={() => setTab("settings")}>
                رفتن به تنظیمات
              </Button>
            </div>
          ) : fetchingStatus ? (
            <Spinner label="دریافت اطلاعات حساب..." />
          ) : accountInfo ? (
            <>
              {/* کارت اطلاعات حساب */}
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
                    <div className="text-lg font-black text-navy">
                      {accountInfo.AccountName || "—"}
                    </div>
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

              {/* تعرفه‌ها */}
              <div className="bg-white/70 backdrop-blur-sm rounded-pill-lg border-2 border-navy/10 p-5">
                <h3 className="font-black text-navy mb-3 flex items-center gap-2">
                  <Zap size={18} className="text-orange" />
                  تعرفه‌های ارسال
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: "پایه فارسی", value: accountInfo.BaseSMS_PersianPrice, color: "teal" },
                    { label: "پایه انگلیسی", value: accountInfo.BaseSMS_EnglishPrice, color: "teal" },
                    { label: "خدماتی فارسی", value: accountInfo.ServiceSMS_PersianPrice, color: "blue" },
                    { label: "خدماتی انگلیسی", value: accountInfo.ServiceSMS_EnglishPrice, color: "blue" },
                    { label: "تبلیغاتی فارسی", value: accountInfo.AdsSMS_PersianPrice, color: "orange" },
                    { label: "تبلیغاتی انگلیسی", value: accountInfo.AdsSMS_EnglishPrice, color: "orange" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between bg-bg-lavender/50 rounded-pill-md px-3 py-2">
                      <span className="text-xs font-bold text-ink-subtle">{item.label}</span>
                      <span className="text-sm font-black text-navy">{formatRial(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* دکمه رفرش */}
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={loadAccountStatus}>
                  <RefreshCw size={14} className="ml-1" /> بروزرسانی اطلاعات
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-ink-subtle">
              <p className="text-sm">برای مشاهده اطلاعات حساب، دکمه زیر را بزنید.</p>
              <Button variant="teal" size="sm" className="mt-3" onClick={loadAccountStatus}>
                دریافت اطلاعات حساب
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── تب ارسال پیامک ─── */}
      {tab === "send" && (
        <div className="flex flex-col gap-5 max-w-2xl">
          {!apiToken ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-pill-lg p-6 text-center">
              <AlertTriangle size={40} className="mx-auto text-amber-500 mb-3" />
              <h3 className="font-black text-amber-800 mb-2">توکن API تنظیم نشده</h3>
              <p className="text-sm text-amber-700 mb-4">
                ابتدا توکن وب‌سرویس آموت را در بخش تنظیمات وارد کنید.
              </p>
              <Button variant="teal" size="sm" onClick={() => setTab("settings")}>
                رفتن به تنظیمات
              </Button>
            </div>
          ) : (
            <>
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

              {/* خط ارسال */}
              <div>
                <label className="block text-sm font-extrabold text-navy mb-1.5">
                  خط ارسال
                </label>
                <input
                  type="text"
                  value={lineNumber}
                  onChange={(e) => setLineNumber(e.target.value)}
                  className={inputCls}
                  dir="ltr"
                />
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
            </>
          )}
        </div>
      )}

      {/* ─── تب تنظیمات ─── */}
      {tab === "settings" && (
        <div className="flex flex-col gap-5 max-w-2xl">
          {/* راهنما */}
          <div className="bg-bg-mint/30 border-2 border-teal/20 rounded-pill-lg p-4">
            <h3 className="font-black text-navy text-sm mb-2">راهنمای دریافت توکن</h3>
            <ol className="text-xs text-ink/70 space-y-1 list-decimal list-inside leading-6">
              <li>
                وارد{" "}
                <a
                  href="https://portal.amootsms.com"
                  target="_blank"
                  rel="noopener"
                  className="text-teal font-bold underline"
                >
                  پنل آموت
                </a>{" "}
                شوید
              </li>
              <li>از منوی <strong>وب‌سرویس ← توکن‌ها</strong> یک توکن REST بسازید</li>
              <li>توکن را در فیلد زیر کپی کنید</li>
              <li>برای تست رایگان، خط <code className="bg-white px-1 rounded">public</code> را انتخاب کنید</li>
            </ol>
          </div>

          {/* توکن API */}
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">
              توکن API آموت *
            </label>
            <input
              type="password"
              dir="ltr"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className={inputCls}
              placeholder="توکن وب‌سرویس آموت را اینجا وارد کنید"
            />
          </div>

          {/* شماره خط */}
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">
              شماره خط ارسال
            </label>
            <input
              type="text"
              dir="ltr"
              value={lineNumber}
              onChange={(e) => setLineNumber(e.target.value)}
              className={inputCls}
              placeholder="public"
            />
            <p className="text-xs text-ink-subtle mt-1">
              برای تست رایگان: <code>public</code> — برای خط اختصاصی: شماره خط را وارد کنید
            </p>
          </div>

          {/* نام فرستنده */}
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">
              نام فرستنده / برند
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className={inputCls}
              placeholder="پرسکاد"
            />
            <p className="text-xs text-ink-subtle mt-1">
              طبق قوانین اپراتور، نام برند در انتهای پیامک OTP الزامی است
            </p>
          </div>

          {/* دکمه ذخیره */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="teal"
              size="md"
              onClick={handleSaveSettings}
              disabled={saving || !apiToken.trim()}
            >
              {saving ? "در حال ذخیره..." : "ذخیره تنظیمات ✅"}
            </Button>
            {apiToken && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setTab("status");
                }}
              >
                مشاهده وضعیت حساب
              </Button>
            )}
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
