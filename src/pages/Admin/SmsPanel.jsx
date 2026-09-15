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
  X,
  Users,
  CheckSquare,
  Square,
  Download,
  Phone,
  FileText,
  ListFilter,
  Sparkles,
} from "lucide-react";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-pill-md px-3.5 py-2.5 text-sm font-semibold text-navy dark:text-slate-100 focus:border-teal focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export default function SmsPanel() {
  const { user, hasPermission, isOwner } = useAuth();
  const canSms = hasPermission("manage_sms") || isOwner();

  const isGlobalAdmin = isOwner() || hasPermission("manage_system");
  const tokenStorageKey = isGlobalAdmin ? "porskad_amoot_token" : `porskad_amoot_token_${user?.id || "user"}`;
  const lineStorageKey = isGlobalAdmin ? "porskad_amoot_line" : `porskad_amoot_line_${user?.id || "user"}`;
  const senderStorageKey = isGlobalAdmin ? "porskad_amoot_sender" : `porskad_amoot_sender_${user?.id || "user"}`;
  const activeStorageKey = isGlobalAdmin ? "porskad_amoot_active" : `porskad_amoot_active_${user?.id || "user"}`;

  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // ─── Settings State ───
  const [amootToken, setAmootToken] = useState(() => localStorage.getItem(tokenStorageKey) || "");
  const [showToken, setShowToken] = useState(false);
  const [hasTokenInDb, setHasTokenInDb] = useState(() => Boolean(localStorage.getItem(tokenStorageKey)));
  const [maskedToken, setMaskedToken] = useState(() => {
    const t = localStorage.getItem(tokenStorageKey) || "";
    return t.length > 5 ? "••••••••" + t.slice(-4) : "";
  });
  const [lineNumber, setLineNumber] = useState(() => {
    const saved = localStorage.getItem(lineStorageKey);
    return (saved && saved !== "Service" && saved !== "Public") ? saved : "98";
  });
  const [senderName, setSenderName] = useState(() => localStorage.getItem(senderStorageKey) || "پرس‌کاد");
  const [isActive, setIsActive] = useState(() => {
    const saved = localStorage.getItem(activeStorageKey);
    return saved !== null ? saved === "true" : true;
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [availableLines, setAvailableLines] = useState(["98"]);
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

  // ─── Form Contacts Extraction State ───
  const [formsList, setFormsList] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [formQuestions, setFormQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [extractedContacts, setExtractedContacts] = useState([]);
  const [uniqueExtractedPhones, setUniqueExtractedPhones] = useState([]);
  const [extractingContacts, setExtractingContacts] = useState(false);
  const [searchContactFilter, setSearchContactFilter] = useState("");

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
      const storedToken = localStorage.getItem(tokenStorageKey) || "";
      const storedLine = localStorage.getItem(lineStorageKey) || "";
      const storedSender = localStorage.getItem(senderStorageKey) || "";
      const storedActive = localStorage.getItem(activeStorageKey);

      if (storedLine) {
        const clean = (storedLine === "Service" || storedLine === "Public") ? "98" : storedLine;
        setLineNumber(clean);
      }
      if (storedSender) setSenderName(storedSender);
      if (storedActive !== null) setIsActive(storedActive === "true");

      let resolvedToken = storedToken;

      // ۱. تلاش برای خواندن مستقیم از دیتابیس Supabase
      if (isGlobalAdmin) {
        try {
          const { data: dbSettings } = await supabase
            .from("sms_settings")
            .select("id, amoot_token, line_number, sender_name, is_active, updated_at")
            .eq("id", 1)
            .maybeSingle();

          if (dbSettings) {
            if (dbSettings.amoot_token && dbSettings.amoot_token.length > 5) {
              resolvedToken = dbSettings.amoot_token;
              localStorage.setItem(tokenStorageKey, resolvedToken);
            }
            if (dbSettings.line_number) {
              const clean = (dbSettings.line_number === "Service" || dbSettings.line_number === "Public") ? "98" : dbSettings.line_number;
              setLineNumber(clean);
            }
            if (dbSettings.sender_name) setSenderName(dbSettings.sender_name);
            if (dbSettings.is_active !== undefined && dbSettings.is_active !== null) {
              setIsActive(dbSettings.is_active);
            }
          }
        } catch (err) {
          console.warn("DB settings load note:", err?.message);
        }
      }

      const hasToken = Boolean(resolvedToken && resolvedToken.length > 5);
      setHasTokenInDb(hasToken);
      setMaskedToken(hasToken ? "••••••••" + resolvedToken.slice(-4) : "");
      if (resolvedToken) {
        setAmootToken(resolvedToken);
      }

      // ۲. دریافت اطلاعات زنده از بریج
      const data = await callAmootProxy("get_settings", { token: resolvedToken });
      if (data?.liveAccount) {
        setLiveAccount(data.liveAccount);
        if (Array.isArray(data.liveAccount.listLineNumbers) && data.liveAccount.listLineNumbers.length > 0) {
          const filtered = data.liveAccount.listLineNumbers.filter((l) => l && l !== "Public" && l !== "Service");
          setAvailableLines(filtered.length > 0 ? filtered : ["98"]);
        }
        setHasTokenInDb(true);
      }
    } catch (err) {
      console.error("Load settings error:", err);
    }
  }, [callAmootProxy, tokenStorageKey, lineStorageKey, senderStorageKey, activeStorageKey, isGlobalAdmin]);

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

  // ─── بارگذاری لیست فرم‌ها برای استخراج شماره تماس ───
  const loadFormsList = useCallback(async () => {
    setLoadingForms(true);
    try {
      let query = supabase
        .from("forms")
        .select("id, title, slug, created_at, published")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!isGlobalAdmin && user?.id) {
        query = query.or(`created_by.eq.${user.id},manager_id.eq.${user.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFormsList(data || []);
    } catch (err) {
      console.error("Failed to load forms list:", err);
      showToast("خطا در بارگذاری لیست فرم‌ها", "error");
    } finally {
      setLoadingForms(false);
    }
  }, [isGlobalAdmin, user?.id]);

  useEffect(() => {
    if (tab === "form_import" && formsList.length === 0) {
      loadFormsList();
    }
  }, [tab, formsList.length, loadFormsList]);

  // ─── استخراج شماره‌ها برای فیلدهای انتخابی ───
  const extractNumbersForQuestions = async (formId, questionIds, questionsList = formQuestions) => {
    if (!formId || !questionIds || questionIds.length === 0) {
      setExtractedContacts([]);
      setUniqueExtractedPhones([]);
      return;
    }

    setExtractingContacts(true);
    try {
      const qMap = {};
      (questionsList || []).forEach((q) => {
        qMap[q.id] = q.title;
      });

      const { data: answersData, error } = await supabase
        .from("answers")
        .select("id, response_id, question_id, value, created_at")
        .in("question_id", questionIds);

      if (error) throw error;

      const rawItems = [];
      (answersData || []).forEach((row) => {
        let val = row.value;
        if (Array.isArray(val)) {
          val.forEach((item) => {
            const rawStr = String(item || "").trim();
            if (rawStr) {
              const normalized = normalizeIranPhone(rawStr);
              const valid = isValidIranPhone(normalized);
              rawItems.push({
                id: `${row.id}_${rawStr}`,
                phone: valid ? normalized : rawStr,
                originalValue: rawStr,
                questionTitle: qMap[row.question_id] || "فیلد فرم",
                questionId: row.question_id,
                responseId: row.response_id,
                createdAt: row.created_at,
                isValid: valid,
              });
            }
          });
        } else if (val !== null && val !== undefined) {
          const rawStr = String(val).trim();
          if (rawStr) {
            const normalized = normalizeIranPhone(rawStr);
            const valid = isValidIranPhone(normalized);
            rawItems.push({
              id: row.id,
              phone: valid ? normalized : rawStr,
              originalValue: rawStr,
              questionTitle: qMap[row.question_id] || "فیلد فرم",
              questionId: row.question_id,
              responseId: row.response_id,
              createdAt: row.created_at,
              isValid: valid,
            });
          }
        }
      });

      const validOnly = rawItems.filter((i) => i.isValid);
      const uniqueList = [...new Set(validOnly.map((i) => i.phone))];

      setExtractedContacts(rawItems);
      setUniqueExtractedPhones(uniqueList);

      if (uniqueList.length > 0) {
        showToast(`${faNum(uniqueList.length)} شماره تماس یکتا استخراج گردید.`, "success");
      } else if (rawItems.length > 0) {
        showToast("پاسخ‌هایی یافت شد اما شماره موبایل معتبری منطبق بر الگوی ایران نبود.", "info");
      } else {
        showToast("هنوز پاسخی برای این فیلدها در فرم ثبت نشده است.", "info");
      }
    } catch (err) {
      console.error("Extract numbers error:", err);
      showToast("خطا در استخراج شماره‌های فرم", "error");
    } finally {
      setExtractingContacts(false);
    }
  };

  // ─── انتخاب یک فرم و بارگذاری فیلدها ───
  const handleSelectForm = async (formId) => {
    setSelectedFormId(formId);
    setSelectedQuestionIds([]);
    setExtractedContacts([]);
    setUniqueExtractedPhones([]);
    if (!formId) {
      setFormQuestions([]);
      return;
    }

    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("id, form_id, title, type, position")
        .eq("form_id", formId)
        .order("position", { ascending: true });

      if (error) throw error;
      const questions = data || [];
      setFormQuestions(questions);

      // شناسایی خودکار فیلدهای شماره تماس
      const defaultPhoneQIds = questions
        .filter((q) => {
          const t = (q.type || "").toLowerCase();
          const title = (q.title || "").toLowerCase();
          return (
            t === "phone_ir" ||
            title.includes("موبایل") ||
            title.includes("تلفن") ||
            title.includes("تماس") ||
            title.includes("شماره") ||
            title.includes("phone") ||
            title.includes("mobile")
          );
        })
        .map((q) => q.id);

      setSelectedQuestionIds(defaultPhoneQIds);
      if (defaultPhoneQIds.length > 0) {
        setTimeout(() => {
          extractNumbersForQuestions(formId, defaultPhoneQIds, questions);
        }, 50);
      }
    } catch (err) {
      console.error("Failed to load form questions:", err);
      showToast("خطا در دریافت فیلدهای فرم", "error");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleToggleQuestion = (qId) => {
    const next = selectedQuestionIds.includes(qId)
      ? selectedQuestionIds.filter((id) => id !== qId)
      : [...selectedQuestionIds, qId];
    setSelectedQuestionIds(next);
    if (selectedFormId) {
      extractNumbersForQuestions(selectedFormId, next);
    }
  };

  const handleSelectAllPhoneFields = () => {
    const phoneQIds = formQuestions
      .filter((q) => {
        const t = (q.type || "").toLowerCase();
        const title = (q.title || "").toLowerCase();
        return (
          t === "phone_ir" ||
          title.includes("موبایل") ||
          title.includes("تلفن") ||
          title.includes("تماس") ||
          title.includes("شماره")
        );
      })
      .map((q) => q.id);

    const targetIds = phoneQIds.length > 0 ? phoneQIds : formQuestions.map((q) => q.id);
    setSelectedQuestionIds(targetIds);
    if (selectedFormId) {
      extractNumbersForQuestions(selectedFormId, targetIds);
    }
  };

  const handleClearSelectedQuestions = () => {
    setSelectedQuestionIds([]);
    setExtractedContacts([]);
    setUniqueExtractedPhones([]);
  };

  const handleImportToSend = () => {
    if (uniqueExtractedPhones.length === 0) {
      showToast("شماره معتبری برای انتقال وجود ندارد.", "error");
      return;
    }

    const newMobilesText = uniqueExtractedPhones.join("\n");
    setRawMobiles((prev) => {
      if (!prev.trim()) return newMobilesText;
      const combined = [...new Set([...prev.split(/[\n,;]+/).map((m) => m.trim()), ...uniqueExtractedPhones])];
      return combined.filter(Boolean).join("\n");
    });

    setTab("send");
    showToast(`${faNum(uniqueExtractedPhones.length)} شماره با موفقیت به لیست گیرندگان اضافه شد.`, "success");
  };

  const handleCopyExtractedPhones = () => {
    if (uniqueExtractedPhones.length === 0) {
      showToast("شماره‌ای برای کپی وجود ندارد.", "error");
      return;
    }
    navigator.clipboard.writeText(uniqueExtractedPhones.join("\n"));
    showToast(`${faNum(uniqueExtractedPhones.length)} شماره در کلیپ‌بورد کپی شد.`, "success");
  };

  const handleDownloadTxt = () => {
    if (uniqueExtractedPhones.length === 0) {
      showToast("شماره‌ای برای دانلود وجود ندارد.", "error");
      return;
    }
    const currentForm = formsList.find((f) => f.id === selectedFormId);
    const filename = `contacts-${currentForm?.slug || "form"}.txt`;
    const element = document.createElement("a");
    const file = new Blob([uniqueExtractedPhones.join("\n")], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast("فایل شماره‌ها با موفقیت دانلود شد.", "success");
  };

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
      const storedToken = localStorage.getItem(tokenStorageKey) || "";
      const tokenToTest = (amootToken.trim() && !amootToken.includes("••••"))
        ? amootToken.trim()
        : storedToken;

      if (!tokenToTest) {
        showToast("لطفاً ابتدا توکن وب‌سرویس آموت را وارد نمایید.", "error");
        setTestingConnection(false);
        return;
      }

      const data = await callAmootProxy("test_connection", { token: tokenToTest });
      setTestResult(data);
      if (data?.success) {
        showToast("اتصال به وب‌سرویس آموت با موفقیت تأیید شد.", "success");
        localStorage.setItem(tokenStorageKey, tokenToTest);
        setHasTokenInDb(true);
        setMaskedToken("••••••••" + tokenToTest.slice(-4));
        setAmootToken(tokenToTest);
        setLiveAccount({
          status: "connected",
          accountName: data.accountName,
          remaindCredit: data.remaindCredit,
          remaindCreditTomans: data.remaindCreditTomans,
          listLineNumbers: data.listLineNumbers,
        });
        if (data.listLineNumbers?.length) {
          const filtered = data.listLineNumbers.filter((l) => l && l !== "Public" && l !== "Service");
          setAvailableLines(filtered.length > 0 ? filtered : ["98"]);
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
      const storedToken = localStorage.getItem(tokenStorageKey) || "";
      let finalToken = amootToken.trim();
      if (!finalToken || finalToken.includes("••••")) {
        finalToken = storedToken;
        if (!finalToken && isGlobalAdmin) {
          try {
            const { data: existing } = await supabase
              .from("sms_settings")
              .select("amoot_token")
              .eq("id", 1)
              .maybeSingle();
            finalToken = existing?.amoot_token || "";
          } catch {
            // ignore
          }
        }
      }

      if (finalToken) {
        localStorage.setItem(tokenStorageKey, finalToken);
        setAmootToken(finalToken);
      }
      const finalLine = (!lineNumber || lineNumber === "Service" || lineNumber === "Public") ? "98" : lineNumber;
      localStorage.setItem(lineStorageKey, finalLine);
      localStorage.setItem(senderStorageKey, senderName || "پرس‌کاد");
      localStorage.setItem(activeStorageKey, String(isActive));

      // تلاش برای ذخیره مستقیم در پایگاه داده (برای سوپرادمین)
      if (isGlobalAdmin) {
        try {
          await supabase.from("sms_settings").upsert({
            id: 1,
            amoot_token: finalToken,
            line_number: finalLine.trim(),
            sender_name: (senderName || "پرس‌کاد").trim(),
            is_active: isActive,
            updated_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn("Direct DB upsert note:", dbErr?.message);
        }
      }

      // ارسال به بریج سرورلس با توکن
      await callAmootProxy("save_settings", {
        token: finalToken,
        amoot_token: finalToken,
        line_number: finalLine.trim(),
        sender_name: (senderName || "پرس‌کاد").trim(),
        is_active: isActive,
      });

      showToast("تنظیمات وب‌سرویس پیامک با موفقیت ذخیره شد.", "success");
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

    const storedToken = localStorage.getItem(tokenStorageKey) || "";
    const tokenToSend = (amootToken.trim() && !amootToken.includes("••••"))
      ? amootToken.trim()
      : storedToken;

    setSendingSms(true);
    setSendResult(null);
    try {
      const lineToSend = (!lineNumber || lineNumber === "Service" || lineNumber === "Public") ? "98" : lineNumber;
      const data = await callAmootProxy("send_sms", {
        token: tokenToSend,
        mobiles: uniqueMobiles,
        text: smsText.trim(),
        lineNumber: lineToSend,
      });

      if (data.success) {
        showToast(data.message || "پیامک با موفقیت ارسال شد", "success");
        setSendResult({ success: true, ...data });
        setSmsText("");
        setRawMobiles("");

        // لاگ پیامک به‌صورت خودکار توسط بک‌اند (amoot-proxy) در دیتابیس درج می‌شود
        // فراخوانی مجدد جهت به‌روزرسانی داشبورد و تاریخچه بدون ایجاد رکورد تکراری
        await Promise.all([loadDashboard(), loadSettings(), loadHistory()]);
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
    { id: "form_import", label: "استخراج شماره از فرم‌ها", icon: Users },
    { id: "history", label: "تاریخچه ارسال‌ها", icon: History },
    { id: "inbox", label: "صندوق دریافتی", icon: Inbox },
    { id: "settings", label: "تنظیمات آموت", icon: Settings },
  ];

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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>ارسال پیامک: غیرفعال</span>
            </div>
          ) : (hasTokenInDb || liveAccount) ? (
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
          <div>
            <StickerCard theme="white">
              <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-colors duration-200 ${
                      isActive && (hasTokenInDb || liveAccount)
                        ? "bg-teal/15 text-teal border border-teal/30 shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                        : !isActive
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                    }`}
                  >
                    <Zap
                      size={26}
                      className={
                        isActive && (hasTokenInDb || liveAccount)
                          ? "fill-teal"
                          : !isActive
                          ? "text-rose-500"
                          : "text-amber-500"
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base sm:text-lg font-black text-navy dark:text-white">
                        درگاه پیامک آموت (Amoot Telecom)
                      </h2>
                      <Badge color={!isActive ? "red" : (hasTokenInDb || liveAccount) ? "teal" : "orange"}>
                        {!isActive ? "سرویس خاموش" : (hasTokenInDb || liveAccount) ? "سرویس فعال" : "در انتظار توکن"}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 mt-1">
                      {liveAccount?.accountName ? `حساب کاربری: ${liveAccount.accountName}` : "ارسال پیامک از طریق پرتال رسمی پیامک آموت"}
                      {" • "}
                      خط پیش‌فرض: <code className="font-mono text-xs font-bold text-teal">{(!lineNumber || lineNumber === "Service" || lineNumber === "Public") ? "98" : lineNumber}</code>
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
          <div>
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
                  <div className="bg-slate-100 dark:bg-slate-900 border-[1.5px] border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-mono text-xs text-slate-700 dark:text-slate-300 dir-ltr select-all">
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
          <div>
            <StickerCard theme="white">
              <form onSubmit={handleSendSms} className="p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-ink/10 dark:border-slate-800 pb-3">
                  <h2 className="text-base sm:text-lg font-black text-navy dark:text-white flex items-center gap-2">
                    <Send size={18} className="text-teal" />
                    ارسال آنی پیامک با آموت
                  </h2>
                  <div className="text-xs font-bold text-ink-subtle dark:text-slate-400">
                    خط ارسال‌کننده: <span className="text-teal font-mono">{(!lineNumber || lineNumber === "Service" || lineNumber === "Public") ? "98" : lineNumber}</span>
                  </div>
                </div>

                {/* شماره‌های گیرندگان */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400">
                      شماره‌های موبایل گیرندگان (با اینتر یا کاما جدا کنید):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTab("form_import")}
                        className="flex items-center gap-1 text-[11px] font-bold text-teal bg-teal/10 hover:bg-teal/20 px-2.5 py-1 rounded-pill-sm border border-teal/25 transition-all cursor-pointer"
                        title="استخراج و درون‌ریزی شماره‌ها از پاسخ‌های فرم‌های پرس‌کاد"
                      >
                        <Users size={12} />
                        <span>دریافت شماره از فرم‌ها</span>
                      </button>
                      <span className="text-xs font-extrabold text-teal font-mono">
                        {uniqueMobiles.length > 0 ? `${faNum(uniqueMobiles.length)} شماره` : ""}
                      </span>
                    </div>
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
                      value={(!lineNumber || lineNumber === "Service" || lineNumber === "Public") ? "98" : lineNumber}
                      onChange={(e) => setLineNumber(e.target.value)}
                      className={inputCls}
                    >
                      <option value="98">98 (خط پیش‌فرض سامانه)</option>
                      {availableLines
                        .filter((l) => l && !["Public", "Service", "98"].includes(l))
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
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 transition-all duration-200 shadow-sm ${
                      sendResult.success
                        ? "bg-teal/10 border-teal/30 text-navy dark:text-slate-100"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {sendResult.success ? (
                        <CheckCircle2 size={16} className="text-teal shrink-0" />
                      ) : (
                        <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                      )}
                      <span>{sendResult.message}</span>
                      {sendResult.campaignId && (
                        <span className="font-mono text-[11px] bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 rounded-md border border-teal/20 text-teal" dir="ltr">
                          شناسه: {sendResult.campaignId}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSendResult(null)}
                      className="text-ink-subtle hover:text-navy dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                      title="بستن پیام"
                    >
                      <X size={14} />
                    </button>
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
      {/* تب استخراج شماره از فرم‌ها (FORM CONTACTS IMPORT) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === "form_import" && (
        <div className="flex flex-col gap-6">
          {/* بنر راهنما و سربرگ تب */}
          <div>
            <StickerCard theme="white">
              <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal/15 text-teal border border-teal/30 flex items-center justify-center shrink-0 shadow-sm">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-navy dark:text-white flex items-center gap-2">
                      استخراج هوشمند شماره تماس از فرم‌ها
                      <Badge color="teal">خودکار و بدون تکراری</Badge>
                    </h2>
                    <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
                      فرم و فیلدهای شماره تماس (مانند موبایل داوطلب، شماره والدین، معرف و...) را انتخاب کنید تا تمامی شماره‌های واردشده توسط پاسخ‌دهندگان به صورت خودکار نرمال‌سازی و آماده ارسال پیامک گروهی شوند.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={loadFormsList} disabled={loadingForms}>
                    <RefreshCw size={14} className={loadingForms ? "animate-spin" : ""} />
                    <span>بروزرسانی فرم‌ها</span>
                  </Button>
                </div>
              </div>
            </StickerCard>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* ستون راست: انتخاب فرم و فیلدهای شماره تماس (7 ستون) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-5">
                  {/* ۱. انتخاب فرم */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText size={15} className="text-teal" />
                        ۱. فرم مورد نظر را انتخاب کنید:
                      </span>
                      {formsList.length > 0 && (
                        <span className="text-[11px] font-bold text-teal">
                          {faNum(formsList.length)} فرم موجود در حساب
                        </span>
                      )}
                    </label>

                    {loadingForms ? (
                      <div className="flex items-center gap-2 py-3 text-xs font-bold text-ink-subtle">
                        <Spinner size="sm" /> در حال دریافت لیست فرم‌ها...
                      </div>
                    ) : formsList.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs font-bold text-amber-700 dark:text-amber-300">
                        هیچ فرمی در حساب کاربری شما یافت نشد. لطفاً ابتدا در بخش فرم‌ها یک فرم ایجاد کنید.
                      </div>
                    ) : (
                      <select
                        value={selectedFormId}
                        onChange={(e) => handleSelectForm(e.target.value)}
                        className={`${inputCls} text-sm`}
                      >
                        <option value="">-- انتخاب فرم برای استخراج شماره --</option>
                        {formsList.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.title || "بدون عنوان"} ({f.slug}) {f.published ? "✓ فعال" : "— پیش‌نویس"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* ۲. انتخاب فیلدهای تماس فرم */}
                  {selectedFormId && (
                    <div className="flex flex-col gap-3 pt-3 border-t border-ink/10 dark:border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1.5">
                          <Phone size={15} className="text-teal" />
                          ۲. فیلدهای شماره تماس را علامت بزنید:
                        </label>
                        {formQuestions.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleSelectAllPhoneFields}
                              className="text-[11px] font-bold text-teal hover:underline px-2 py-0.5 rounded cursor-pointer"
                            >
                              انتخاب همه فیلدهای تماس
                            </button>
                            <span className="text-ink/20 dark:text-slate-700">|</span>
                            <button
                              type="button"
                              onClick={handleClearSelectedQuestions}
                              className="text-[11px] font-bold text-rose-500 hover:underline px-2 py-0.5 rounded cursor-pointer"
                            >
                              پاک کردن انتخاب‌ها
                            </button>
                          </div>
                        )}
                      </div>

                      {loadingQuestions ? (
                        <div className="flex items-center gap-2 py-4 text-xs font-bold text-ink-subtle">
                          <Spinner size="sm" /> در حال بارگذاری سوالات فرم...
                        </div>
                      ) : formQuestions.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-ink-subtle text-center">
                          این فرم هنوز هیچ سوالی ندارد.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                          {formQuestions.map((q, idx) => {
                            const isPhone = (q.type || "").toLowerCase() === "phone_ir" ||
                              (q.title || "").includes("موبایل") ||
                              (q.title || "").includes("تلفن") ||
                              (q.title || "").includes("تماس");
                            const isSelected = selectedQuestionIds.includes(q.id);

                            return (
                              <div
                                key={q.id}
                                onClick={() => handleToggleQuestion(q.id)}
                                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? "bg-teal/10 border-teal text-navy dark:text-white shadow-xs"
                                    : "bg-slate-50 dark:bg-slate-800/60 border-ink/5 dark:border-slate-700/60 text-ink-subtle dark:text-slate-300 hover:border-ink/20 dark:hover:border-slate-600"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {isSelected ? (
                                    <CheckSquare size={18} className="text-teal shrink-0" />
                                  ) : (
                                    <Square size={18} className="text-ink-subtle/50 dark:text-slate-500 shrink-0" />
                                  )}
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold truncate text-navy dark:text-slate-100">
                                      {q.title || `سوال ${faNum(idx + 1)}`}
                                    </span>
                                    <span className="text-[11px] text-ink-subtle dark:text-slate-400 font-medium">
                                      سوال شماره {faNum(idx + 1)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isPhone ? (
                                    <Badge color="teal">فیلد تماس</Badge>
                                  ) : (
                                    <Badge color="gray">
                                      {q.type === "short_text"
                                        ? "متن کوتاه"
                                        : q.type === "number"
                                        ? "عدد"
                                        : q.type}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* دکمه استخراج دستی در صورت نیاز */}
                      <div className="pt-2">
                        <Button
                          variant="teal"
                          size="sm"
                          onClick={() => extractNumbersForQuestions(selectedFormId, selectedQuestionIds)}
                          disabled={extractingContacts || selectedQuestionIds.length === 0}
                          className="w-full flex items-center justify-center gap-2 font-bold cursor-pointer"
                        >
                          {extractingContacts ? <Spinner size="sm" /> : <Sparkles size={15} />}
                          <span>
                            {extractingContacts
                              ? "در حال پردازش و استخراج پاسخ‌ها..."
                              : `استخراج شماره‌ها از ${faNum(selectedQuestionIds.length)} فیلد انتخابی`}
                          </span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </StickerCard>
            </div>

            {/* ستون چپ: آمار و عملیات ارسال سریع (5 ستون) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-5">
                  <h3 className="text-sm font-extrabold text-navy dark:text-white flex items-center gap-2 border-b border-ink/10 dark:border-slate-800 pb-3">
                    <Sparkles size={16} className="text-teal" />
                    خلاصه شماره‌های استخراج‌شده
                  </h3>

                  {/* کارت‌های آماری */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-teal/15 border border-teal/30 flex flex-col">
                      <span className="text-[11px] font-bold text-teal-text dark:text-teal">شماره‌های یکتا و معتبر:</span>
                      <strong className="text-2xl font-black text-teal mt-1 font-mono">
                        {faNum(uniqueExtractedPhones.length)}
                      </strong>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col">
                      <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400">کل ورودی‌های خام:</span>
                      <strong className="text-2xl font-black text-navy dark:text-white mt-1 font-mono">
                        {faNum(extractedContacts.length)}
                      </strong>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col">
                      <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400">تکراری‌های حذف‌شده:</span>
                      <strong className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                        {faNum(Math.max(0, extractedContacts.filter((c) => c.isValid).length - uniqueExtractedPhones.length))}
                      </strong>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col">
                      <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400">نامعتبر یا ناقص:</span>
                      <strong className="text-xl font-bold text-rose-500 mt-1 font-mono">
                        {faNum(extractedContacts.filter((c) => !c.isValid).length)}
                      </strong>
                    </div>
                  </div>

                  {/* دکمه‌های عملیات اصلی */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    <Button
                      variant="teal"
                      size="md"
                      onClick={handleImportToSend}
                      disabled={uniqueExtractedPhones.length === 0}
                      className="w-full flex items-center justify-center gap-2 font-black py-3 shadow-md cursor-pointer"
                    >
                      <Send size={16} />
                      <span>انتقال به بخش ارسال پیامک ({faNum(uniqueExtractedPhones.length)})</span>
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="navy"
                        size="sm"
                        onClick={handleCopyExtractedPhones}
                        disabled={uniqueExtractedPhones.length === 0}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold"
                      >
                        <Copy size={14} />
                        <span>کپی همه شماره‌ها</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadTxt}
                        disabled={uniqueExtractedPhones.length === 0}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold border border-ink/10 dark:border-slate-700"
                      >
                        <Download size={14} />
                        <span>دانلود فایل TXT</span>
                      </Button>
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-ink-subtle dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-ink/5 dark:border-slate-800">
                    💡 با زدن دکمه <strong>«انتقال به بخش ارسال پیامک»</strong>، این شماره‌ها فوراً در فیلد گیرندگان قرار می‌گیرند تا بتوانید متن دلخواه خود را بنویسید و ارسال کنید.
                  </p>
                </div>
              </StickerCard>
            </div>
          </div>

          {/* پیش‌نمایش جدول شماره‌های استخراج‌شده */}
          {extractedContacts.length > 0 && (
            <div>
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <ListFilter size={18} className="text-teal" />
                      <h3 className="text-base font-bold text-navy dark:text-white">
                        پیش‌نمایش شماره‌های استخراج‌شده ({faNum(extractedContacts.length)} رکورد)
                      </h3>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                      <input
                        type="text"
                        value={searchContactFilter}
                        onChange={(e) => setSearchContactFilter(e.target.value)}
                        placeholder="جستجو در شماره‌ها..."
                        className={`${inputCls} pr-8 py-1.5 text-xs`}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900/80 text-ink-subtle dark:text-slate-400 font-bold border-b border-gray-200 dark:border-slate-800">
                          <th className="px-4 py-2.5">ردیف</th>
                          <th className="px-4 py-2.5">شماره موبایل استاندارد</th>
                          <th className="px-4 py-2.5">عنوان فیلد در فرم</th>
                          <th className="px-4 py-2.5">مقدار ورودی کاربر</th>
                          <th className="px-4 py-2.5 text-center">وضعیت شماره</th>
                          <th className="px-4 py-2.5">تاریخ ثبت پاسخ</th>
                          <th className="px-4 py-2.5 text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/5 dark:divide-slate-800/60 font-medium">
                        {extractedContacts
                          .filter((c) => !searchContactFilter || c.phone.includes(searchContactFilter) || c.originalValue.includes(searchContactFilter))
                          .slice(0, 100)
                          .map((c, i) => (
                            <tr
                              key={c.id || i}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-bold text-ink-subtle">{faNum(i + 1)}</td>
                              <td className="px-4 py-2.5 font-bold text-navy dark:text-white font-mono text-xs" dir="ltr">
                                {c.phone}
                              </td>
                              <td className="px-4 py-2.5 text-ink-subtle dark:text-slate-300">
                                {c.questionTitle}
                              </td>
                              <td className="px-4 py-2.5 text-ink-subtle font-mono text-xs" dir="ltr">
                                {c.originalValue}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {c.isValid ? (
                                  <Badge color="teal">معتبر</Badge>
                                ) : (
                                  <Badge color="red">نامعتبر</Badge>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-ink-subtle">
                                {c.createdAt ? faDateTime(c.createdAt) : "—"}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(c.phone);
                                    showToast(`شماره ${c.phone} کپی شد.`, "success");
                                  }}
                                  className="p-1 text-ink-subtle hover:text-teal transition-colors cursor-pointer"
                                  title="کپی شماره"
                                >
                                  <Copy size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {extractedContacts.length > 100 && (
                    <div className="text-center py-2 text-xs font-bold text-ink-subtle dark:text-slate-400">
                      نمایش ۱۰۰ شماره اول از مجموع {faNum(extractedContacts.length)} رکورد (تمامی شماره‌ها در عملیات انتقال و دانلود گنجانده می‌شوند).
                    </div>
                  )}
                </div>
              </StickerCard>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ۳. تب تنظیمات پیامک (SETTINGS) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <div className="flex flex-col gap-6 max-w-3xl">
          <div>
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
                  <div className="relative flex items-center">
                    <input
                      type={showToken ? "text" : "password"}
                      value={amootToken}
                      onChange={(e) => setAmootToken(e.target.value)}
                      placeholder="توکن وب‌سرویس را اینجا جای‌گذاری کنید..."
                      className={`${inputCls} pl-10 pr-24 text-left font-mono text-xs`}
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
                    {amootToken && (
                      <button
                        type="button"
                        onClick={() => {
                          setAmootToken("");
                          showToast("توکن پاک شد؛ می‌توانید توکن جدید را وارد کنید.", "info");
                        }}
                        className="absolute right-2 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 rounded-pill-sm border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer"
                      >
                        پاک کردن
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-ink-subtle dark:text-slate-500">
                    توکن فعال در این فیلد باقی می‌ماند. برای جایگزینی، روی «پاک کردن» کلیک کنید و توکن جدید را ثبت و ذخیره نمایید.
                  </p>
                </div>

                {/* خط فرستنده و نام امضا */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1">
                      <Smartphone size={14} className="text-teal" />
                      شماره خط فرستنده (Line Number)
                    </label>
                    <select
                      value={(!lineNumber || lineNumber === "Service" || lineNumber === "Public") ? "98" : lineNumber}
                      onChange={(e) => setLineNumber(e.target.value)}
                      className={inputCls}
                    >
                      <option value="98">98 (خط پیش‌فرض سامانه)</option>
                      {availableLines
                        .filter((l) => l && !["Public", "Service", "98"].includes(l))
                        .map((line) => (
                          <option key={line} value={line}>
                            {line}
                          </option>
                        ))}
                    </select>
                    <span className="text-[11px] text-ink-subtle dark:text-slate-500">
                      خط فعال اکانت شما: <strong className="text-teal font-mono">98</strong> (خط پیش‌فرض ارسال پیامک سامانه).
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
                        isActive ? "text-teal" : "text-rose-500 dark:text-rose-400"
                      }`}
                    >
                      {isActive ? "روشن (سرویس فعال)" : "خاموش (متوقف)"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      onClick={() => setIsActive(!isActive)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal/40 ${
                        isActive ? "bg-teal" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                      title={isActive ? "کلیک برای غیرفعال‌سازی" : "کلیک برای فعال‌سازی"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isActive ? "-translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* نتیجه تست اتصال */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex flex-col gap-2.5 transition-all duration-200 shadow-sm ${
                      testResult.success
                        ? "bg-teal/10 border-teal/30 text-navy dark:text-slate-100"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold">
                        {testResult.success ? (
                          <CheckCircle2 size={16} className="text-teal shrink-0" />
                        ) : (
                          <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                        )}
                        <span className="text-xs font-black">{testResult.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTestResult(null)}
                        className="text-ink-subtle hover:text-navy dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                        title="بستن پیام"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {testResult.success && (
                      <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-teal/20 text-[11px] font-semibold">
                        <span className="bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-teal/20 flex items-center gap-1.5 shadow-2xs">
                          <User size={12} className="text-teal" />
                          <span>اکانت: <strong className="text-navy dark:text-white">{testResult.accountName || "کاربر آموت"}</strong></span>
                        </span>
                        <span className="bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-teal/20 flex items-center gap-1.5 shadow-2xs">
                          <CreditCard size={12} className="text-teal" />
                          <span>اعتبار: <strong className="text-teal font-mono">{faNum((testResult.remaindCreditTomans || 0).toLocaleString())} تومان</strong></span>
                        </span>
                        {testResult.listLineNumbers?.length > 0 && (
                          <span className="bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-teal/20 flex items-center gap-1.5 shadow-2xs">
                            <Smartphone size={12} className="text-teal" />
                            <span>خطوط فعال: <code className="font-mono text-teal font-bold">{testResult.listLineNumbers.join(", ")}</code></span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* دکمه‌های اقدام */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-ink/10 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="navy"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex items-center justify-center gap-1.5 font-bold cursor-pointer rounded-xl h-10 px-4"
                  >
                    {testingConnection ? <Spinner size="sm" /> : <ShieldCheck size={16} />}
                    <span>{testingConnection ? "در حال استعلام از آموت..." : "تست توکن و موجودی"}</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="teal"
                    size="sm"
                    disabled={savingSettings}
                    className="flex items-center justify-center gap-1.5 font-bold rounded-xl h-10 px-6 cursor-pointer shadow-sm hover:shadow-teal/20 transition-all"
                  >
                    {savingSettings ? <Spinner size="sm" /> : <Check size={16} />}
                    <span>{savingSettings ? "در حال ذخیره..." : "ذخیره تنظیمات"}</span>
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
                            {(!o.line_number || o.line_number === "Public" || o.line_number === "Service") ? "98" : o.line_number}
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