import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { faNum, faDateTime, faDate } from "../../lib/utils";
import { normalizeIranPhone, isValidIranPhone } from "../../lib/validators";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import StickerCard from "../../components/ui/StickerCard";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";
import Skeleton, { TableSkeleton, DashboardSkeleton } from "../../components/ui/Skeleton";
import SEO from "../../components/ui/SEO";
import PasswordToggle from "../../components/ui/PasswordToggle";
import JalaliDateTimePicker from "../../components/ui/JalaliDateTimePicker";
import Modal from "../../components/ui/Modal";
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
  CalendarClock,
  Clock,
  Calendar,
  Layers,
  Ban,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

const inputCls =
  "w-full bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-xl px-4 py-2.5 text-sm font-semibold text-sec dark:text-white placeholder:text-gray-400 focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed";

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

  // ─── Scheduled SMS State ───
  const [schedSourceType, setSchedSourceType] = useState("manual"); // 'manual' | 'form'
  const [schedFormId, setSchedFormId] = useState("");
  const [schedFormQuestions, setSchedFormQuestions] = useState([]);
  const [schedLoadingQuestions, setSchedLoadingQuestions] = useState(false);
  const [schedSelectedQIds, setSchedSelectedQIds] = useState([]);
  const [schedExtractedContacts, setSchedExtractedContacts] = useState([]);
  const [schedUniquePhones, setSchedUniquePhones] = useState([]);
  const [schedExtracting, setSchedExtracting] = useState(false);
  const [schedRawMobiles, setSchedRawMobiles] = useState("");
  const [schedText, setSchedText] = useState("");
  const [schedLineNumber, setSchedLineNumber] = useState("98");
  const [schedDateTime, setSchedDateTime] = useState(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000);
    return d.toISOString();
  });
  const [schedulingSubmitting, setSchedulingSubmitting] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState(null);

  // ─── Scheduled SMS Queue & Logs ───
  const [scheduledList, setScheduledList] = useState([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledStatusFilter, setScheduledStatusFilter] = useState("all");
  const [scheduledSearch, setScheduledSearch] = useState("");
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);

  // ─── Scheduled SMS Detail Modal ───
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedScheduledItem, setSelectedScheduledItem] = useState(null);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientSearchFilter, setRecipientSearchFilter] = useState("");

  // ─── Dashboard & Logs State ───
  const [stats, setStats] = useState({ outboxToday: 0, outboxMonth: 0, inboxToday: 0, successRate: null });
  const [outbox, setOutbox] = useState([]);
  const [inboxMsgs, setInboxMsgs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOutboxType, setFilterOutboxType] = useState("all"); // 'all' | 'scheduled' | 'instant'

  // ─── Form Contacts Extraction State ───
  const [formsList, setFormsList] = useState([]);
  const [formOwnerNames, setFormOwnerNames] = useState({});
  const [loadingForms, setLoadingForms] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [formQuestions, setFormQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [extractedContacts, setExtractedContacts] = useState([]);
  const [uniqueExtractedPhones, setUniqueExtractedPhones] = useState([]);
  const [extractingContacts, setExtractingContacts] = useState(false);
  const [searchContactFilter, setSearchContactFilter] = useState("");
  const extractionReqIdRef = useRef(0);
  const schedExtractionReqIdRef = useRef(0);

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
        setSchedLineNumber(clean);
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
              setSchedLineNumber(clean);
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

  // ─── بارگذاری صف پیام‌های زماندار ───
  const loadScheduledQueue = useCallback(async () => {
    setScheduledLoading(true);
    try {
      // بررسی و ارسال خودکار پیام‌های سررسید شده در پس‌زمینه
      await callAmootProxy("dispatch_scheduled_sms").catch(() => {});

      const data = await callAmootProxy("get_scheduled_sms_list", {
        status: scheduledStatusFilter,
        search: scheduledSearch,
        page: scheduledPage,
        limit: 20,
      });

      if (data?.success) {
        setScheduledList(data.list || []);
        setScheduledTotal(data.total || 0);
      } else {
        // فالبک از پایگاه داده مستقیم
        let q = supabase
          .from("scheduled_sms")
          .select("*, forms:source_form_id(id, title, slug)", { count: "exact" })
          .order("scheduled_at", { ascending: false });

        if (scheduledStatusFilter !== "all") {
          q = q.eq("status", scheduledStatusFilter);
        }
        if (scheduledSearch.trim()) {
          q = q.ilike("message", `%${scheduledSearch.trim()}%`);
        }

        const offset = (scheduledPage - 1) * 20;
        q = q.range(offset, offset + 19);

        const { data: dbRows, count } = await q;
        setScheduledList(dbRows || []);
        setScheduledTotal(count || 0);
      }
    } catch (err) {
      console.error("Load scheduled queue error:", err);
    } finally {
      setScheduledLoading(false);
    }
  }, [callAmootProxy, scheduledStatusFilter, scheduledSearch, scheduledPage]);

  // ─── بارگذاری اولیه صفحه ───
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

  // ─── بارگذاری فرم‌های فعال ───
  const loadFormsList = useCallback(async () => {
    setLoadingForms(true);
    try {
      let query = supabase
        .from("forms")
        .select("id, title, slug, created_at, published, created_by, manager_id, archived")
        .is("deleted_at", null)
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (!isGlobalAdmin && user?.id) {
        query = query.or(`created_by.eq.${user.id},manager_id.eq.${user.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const activeForms = (data || []).filter((f) => f.published === true && !f.archived);
      setFormsList(activeForms);

      if (isGlobalAdmin) {
        const ownerIds = new Set(
          activeForms.map((f) => f.created_by || f.manager_id).filter(Boolean)
        );
        if (ownerIds.size > 0) {
          const { data: ownerRows } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", [...ownerIds]);
          setFormOwnerNames(
            Object.fromEntries(
              (ownerRows || []).map((p) => [
                p.id,
                p.full_name || p.email || "کاربر حذف‌شده",
              ])
            )
          );
        } else {
          setFormOwnerNames({});
        }
      }
    } catch (err) {
      console.error("Failed to load forms list:", err);
      showToast("خطا در بارگذاری لیست فرم‌ها", "error");
    } finally {
      setLoadingForms(false);
    }
  }, [isGlobalAdmin, user?.id]);

  // رفرش صف زمانبندی در زمان باز بودن تب زماندار
  useEffect(() => {
    if (tab === "scheduled") {
      loadScheduledQueue();
      if (formsList.length === 0) {
        loadFormsList();
      }
    }
  }, [tab, loadScheduledQueue, loadFormsList, formsList.length]);

  useEffect(() => {
    if (tab === "form_import" && formsList.length === 0) {
      loadFormsList();
    }
  }, [tab, formsList.length, loadFormsList]);

  // ─── استخراج شماره‌ها برای فیلدهای انتخابی (تب فرم ایمپورت) ───
  const extractNumbersForQuestions = async (formId, questionIds, questionsList = formQuestions) => {
    if (!formId || !questionIds || questionIds.length === 0) {
      setExtractedContacts([]);
      setUniqueExtractedPhones([]);
      setExtractingContacts(false);
      return;
    }

    const currentReqId = ++extractionReqIdRef.current;
    setExtractingContacts(true);
    try {
      const qMap = {};
      (questionsList || []).forEach((q) => {
        qMap[q.id] = q.title;
      });

      const { data: responsesData, error: respError } = await supabase
        .from("responses")
        .select("id, created_at")
        .eq("form_id", formId);

      if (respError) throw respError;
      if (currentReqId !== extractionReqIdRef.current) return;

      if (!responsesData || responsesData.length === 0) {
        setExtractedContacts([]);
        setUniqueExtractedPhones([]);
        showToast("هنوز هیچ پاسخی برای این فرم ثبت نشده است.", "info");
        return;
      }

      const respMap = {};
      const respIds = [];
      responsesData.forEach((r) => {
        respMap[r.id] = r.created_at;
        respIds.push(r.id);
      });

      let answersData = [];
      const CHUNK_SIZE = 150;
      for (let i = 0; i < respIds.length; i += CHUNK_SIZE) {
        const chunk = respIds.slice(i, i + CHUNK_SIZE);
        const { data: chunkAnswers, error: ansError } = await supabase
          .from("answers")
          .select("id, response_id, question_id, value")
          .in("response_id", chunk)
          .in("question_id", questionIds);

        if (ansError) throw ansError;
        if (currentReqId !== extractionReqIdRef.current) return;
        if (chunkAnswers && chunkAnswers.length > 0) {
          answersData = answersData.concat(chunkAnswers);
        }
      }

      if (currentReqId !== extractionReqIdRef.current) return;

      const rawItems = [];
      answersData.forEach((row) => {
        let val = row.value;
        const rowCreatedAt = respMap[row.response_id] || null;

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
                createdAt: rowCreatedAt,
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
              createdAt: rowCreatedAt,
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
        showToast("برای فیلدهای انتخابی، هنوز هیچ پاسخی ثبت نشده است.", "info");
      }
    } catch (err) {
      console.error("Extract numbers error:", err);
      if (currentReqId === extractionReqIdRef.current) {
        showToast("خطا در استخراج شماره‌های فرم: " + (err.message || ""), "error");
      }
    } finally {
      if (currentReqId === extractionReqIdRef.current) {
        setExtractingContacts(false);
      }
    }
  };

  // ─── استخراج شماره‌ها برای فرم زماندار ───
  const extractNumbersForSchedForm = async (formId, questionIds, questionsList = schedFormQuestions) => {
    if (!formId || !questionIds || questionIds.length === 0) {
      setSchedExtractedContacts([]);
      setSchedUniquePhones([]);
      setSchedExtracting(false);
      return;
    }

    const currentReqId = ++schedExtractionReqIdRef.current;
    setSchedExtracting(true);
    try {
      const qMap = {};
      (questionsList || []).forEach((q) => {
        qMap[q.id] = q.title;
      });

      const { data: responsesData, error: respError } = await supabase
        .from("responses")
        .select("id, created_at")
        .eq("form_id", formId);

      if (respError) throw respError;
      if (currentReqId !== schedExtractionReqIdRef.current) return;

      if (!responsesData || responsesData.length === 0) {
        setSchedExtractedContacts([]);
        setSchedUniquePhones([]);
        showToast("هنوز هیچ پاسخی برای این فرم ثبت نشده است.", "info");
        return;
      }

      const respIds = responsesData.map((r) => r.id);
      let answersData = [];
      const CHUNK_SIZE = 150;
      for (let i = 0; i < respIds.length; i += CHUNK_SIZE) {
        const chunk = respIds.slice(i, i + CHUNK_SIZE);
        const { data: chunkAnswers, error: ansError } = await supabase
          .from("answers")
          .select("id, response_id, question_id, value")
          .in("response_id", chunk)
          .in("question_id", questionIds);

        if (ansError) throw ansError;
        if (currentReqId !== schedExtractionReqIdRef.current) return;
        if (chunkAnswers && chunkAnswers.length > 0) {
          answersData = answersData.concat(chunkAnswers);
        }
      }

      if (currentReqId !== schedExtractionReqIdRef.current) return;

      const rawItems = [];
      answersData.forEach((row) => {
        let val = row.value;
        if (Array.isArray(val)) {
          val.forEach((item) => {
            const rawStr = String(item || "").trim();
            if (rawStr) {
              const norm = normalizeIranPhone(rawStr);
              if (isValidIranPhone(norm)) rawItems.push(norm);
            }
          });
        } else if (val !== null && val !== undefined) {
          const rawStr = String(val).trim();
          if (rawStr) {
            const norm = normalizeIranPhone(rawStr);
            if (isValidIranPhone(norm)) rawItems.push(norm);
          }
        }
      });

      const uniqueList = [...new Set(rawItems)];
      setSchedExtractedContacts(rawItems);
      setSchedUniquePhones(uniqueList);

      if (uniqueList.length > 0) {
        showToast(`${faNum(uniqueList.length)} شماره مخاطب معتبر از فرم استخراج شد.`, "success");
      }
    } catch (err) {
      console.error("Scheduled Form Extract error:", err);
    } finally {
      if (currentReqId === schedExtractionReqIdRef.current) {
        setSchedExtracting(false);
      }
    }
  };

  const handleSelectSchedForm = async (formId) => {
    setSchedFormId(formId);
    setSchedSelectedQIds([]);
    setSchedExtractedContacts([]);
    setSchedUniquePhones([]);
    if (!formId) {
      setSchedFormQuestions([]);
      return;
    }

    setSchedLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("id, form_id, title, type, position")
        .eq("form_id", formId)
        .order("position", { ascending: true });

      if (error) throw error;
      const questions = data || [];
      setSchedFormQuestions(questions);

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

      setSchedSelectedQIds(defaultPhoneQIds);
      if (defaultPhoneQIds.length > 0) {
        extractNumbersForSchedForm(formId, defaultPhoneQIds, questions);
      }
    } catch (err) {
      console.error("Failed to load form questions:", err);
      showToast("خطا در دریافت فیلدهای فرم", "error");
    } finally {
      setSchedLoadingQuestions(false);
    }
  };

  const handleToggleSchedQuestion = (qId) => {
    const next = schedSelectedQIds.includes(qId)
      ? schedSelectedQIds.filter((id) => id !== qId)
      : [...schedSelectedQIds, qId];
    setSchedSelectedQIds(next);
    if (schedFormId) {
      extractNumbersForSchedForm(schedFormId, next);
    }
  };

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
        extractNumbersForQuestions(formId, defaultPhoneQIds, questions);
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

  const handleImportToScheduled = () => {
    if (uniqueExtractedPhones.length === 0) {
      showToast("شماره معتبری برای انتقال وجود ندارد.", "error");
      return;
    }

    const newMobilesText = uniqueExtractedPhones.join("\n");
    setSchedRawMobiles((prev) => {
      if (!prev.trim()) return newMobilesText;
      const combined = [...new Set([...prev.split(/[\n,;]+/).map((m) => m.trim()), ...uniqueExtractedPhones])];
      return combined.filter(Boolean).join("\n");
    });
    setSchedSourceType("manual");

    setTab("scheduled");
    showToast(`${faNum(uniqueExtractedPhones.length)} شماره با موفقیت به بخش پیام‌های زماندار منتقل شد.`, "success");
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
    if (e?.preventDefault) e.preventDefault();
    if (savingSettings) return;
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
          } catch {}
        }
      }

      if (finalToken) {
        localStorage.setItem(tokenStorageKey, finalToken);
        setAmootToken(finalToken);
        setHasTokenInDb(true);
        setMaskedToken("••••••••" + finalToken.slice(-4));
      }
      const finalLine = (!lineNumber || lineNumber === "Service" || lineNumber === "Public") ? "98" : lineNumber;
      localStorage.setItem(lineStorageKey, finalLine);
      localStorage.setItem(senderStorageKey, senderName || "پرس‌کاد");
      localStorage.setItem(activeStorageKey, String(isActive));

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

      callAmootProxy("save_settings", {
        token: finalToken,
        amoot_token: finalToken,
        line_number: finalLine.trim(),
        sender_name: (senderName || "پرس‌کاد").trim(),
        is_active: isActive,
      }).catch((err) => console.warn("Save settings proxy note:", err));

      showToast("تنظیمات وب‌سرویس پیامک با موفقیت ذخیره شد.", "success");
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

  // ─── مشخصات متن پیامک زماندار ───
  const schedParsedManualMobiles = schedRawMobiles
    .split(/[\n,;]+/)
    .map((m) => normalizeIranPhone(m.trim()))
    .filter(isValidIranPhone);
  const schedUniqueManualMobiles = [...new Set(schedParsedManualMobiles)];

  const activeSchedMobiles = schedSourceType === "form" ? schedUniquePhones : schedUniqueManualMobiles;

  const isSchedPersian = /[\u0600-\u06FF]/.test(schedText);
  const schedCharCount = schedText.length;
  let schedPagesCount = 1;
  if (isSchedPersian) {
    if (schedCharCount <= 70) schedPagesCount = 1;
    else schedPagesCount = Math.ceil(schedCharCount / 67);
  } else {
    if (schedCharCount <= 160) schedPagesCount = 1;
    else schedPagesCount = Math.ceil(schedCharCount / 153);
  }

  // ─── ارسال پیامک آنی ───
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

  // ─── ثبت پیام زماندار جدید ───
  async function handleCreateSchedule(e) {
    if (e?.preventDefault) e.preventDefault();
    if (schedulingSubmitting) return;

    if (activeSchedMobiles.length === 0) {
      showToast("لطفاً حداقل یک شماره موبایل معتبر برای زمانبندی وارد یا از فرم استخراج کنید.", "error");
      return;
    }
    if (!schedText.trim()) {
      showToast("متن پیامک نمی‌تواند خالی باشد.", "error");
      return;
    }

    const schedDateObj = new Date(schedDateTime);
    const minAllowedTime = Date.now() + 90 * 1000;
    if (isNaN(schedDateObj.getTime()) || schedDateObj.getTime() < minAllowedTime) {
      showToast("زمان ارسال باید حداقل ۲ دقیقه بعد از زمان کنونی باشد.", "error");
      return;
    }

    setSchedulingSubmitting(true);
    setScheduleFeedback(null);
    try {
      const lineToSend = (!schedLineNumber || schedLineNumber === "Service" || schedLineNumber === "Public")
        ? "98"
        : schedLineNumber;

      const data = await callAmootProxy("schedule_sms", {
        mobiles: activeSchedMobiles,
        text: schedText.trim(),
        lineNumber: lineToSend,
        scheduledAt: schedDateObj.toISOString(),
        sourceType: schedSourceType,
        sourceFormId: schedSourceType === "form" ? schedFormId : null,
      });

      if (data?.success) {
        showToast(data.message || "پیام زماندار با موفقیت در صف ارسال ثبت گردید.", "success");
        setScheduleFeedback({
          success: true,
          message: data.message,
          total: data.total_count,
          removedInvalid: data.removed_invalid_count,
          removedDuplicates: data.removed_duplicate_count,
        });

        // پاکسازی فرم بعد از موفقیت
        setSchedText("");
        if (schedSourceType === "manual") {
          setSchedRawMobiles("");
        }

        // بروزرسانی صف
        await loadScheduledQueue();
      } else {
        showToast(data?.message || "خطا در ثبت زمانبندی پیامک", "error");
        setScheduleFeedback({ success: false, message: data?.message });
      }
    } catch (err) {
      showToast(err.message || "خطا در ارتباط با سرور", "error");
      setScheduleFeedback({ success: false, message: err.message });
    } finally {
      setSchedulingSubmitting(false);
    }
  }

  // ─── لغو پیام زماندار ───
  async function handleCancelScheduled(id) {
    if (!window.confirm("آیا از لغو این پیام زماندار اطمینان دارید؟")) return;
    setCancelingId(id);
    try {
      const data = await callAmootProxy("cancel_scheduled_sms", { id });
      if (data?.success) {
        showToast("پیام زماندار با موفقیت لغو گردید.", "success");
        await loadScheduledQueue();
      } else {
        showToast(data?.message || "خطا در لغو پیام زماندار", "error");
      }
    } catch (err) {
      showToast(err.message || "خطا در لغو پیام", "error");
    } finally {
      setCancelingId(null);
    }
  }

  // ─── مشاهده جزئیات پیام زماندار ───
  async function handleOpenDetail(item) {
    setSelectedScheduledItem(item);
    setSelectedRecipients([]);
    setRecipientSearchFilter("");
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const data = await callAmootProxy("get_scheduled_sms_detail", { id: item.id });
      if (data?.success) {
        setSelectedScheduledItem(data.scheduledSms || item);
        setSelectedRecipients(data.recipients || []);
      }
    } catch (err) {
      console.error("Load scheduled detail error:", err);
    } finally {
      setDetailLoading(false);
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
    const matchesType =
      filterOutboxType === "all" ||
      (filterOutboxType === "scheduled" && Boolean(item.is_scheduled || item.scheduled_sms_id)) ||
      (filterOutboxType === "instant" && !item.is_scheduled && !item.scheduled_sms_id);
    return matchesSearch && matchesStatus && matchesType;
  });

  const TABS = [
    { id: "dashboard", label: "داشبورد و وضعیت", icon: BarChart3 },
    { id: "send", label: "ارسال آنی پیامک", icon: Send },
    { id: "scheduled", label: "ارسال پیام زماندار", icon: CalendarClock },
    { id: "form_import", label: "استخراج شماره از فرم‌ها", icon: Users },
    { id: "history", label: "تاریخچه ارسال‌ها", icon: History },
    { id: "inbox", label: "صندوق دریافتی", icon: Inbox },
    { id: "settings", label: "تنظیمات آموت", icon: Settings },
  ];

  // برچسب‌ها و رنگ‌های وضعیت پیام زماندار
  const getScheduledStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <Badge color="orange">در انتظار ارسال</Badge>;
      case "processing":
        return <Badge color="blue">در حال ارسال</Badge>;
      case "sent":
        return <Badge color="teal">ارسال شد</Badge>;
      case "failed":
        return <Badge color="red">ناموفق</Badge>;
      case "canceled":
        return <Badge color="gray">لغو شده</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <SEO title="سامانه پیامک آموت" description="ارسال آنی و زماندار، مدیریت و تنظیمات وب‌سرویس پیامک آموت — پرس‌کاد" url="/admin/sms" noIndex />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xl border-[1.5px] transition-all flex items-center gap-2 ${
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
            ارسال آنی و زماندار پیامک، استخراج شماره از فرم‌ها و مدیریت درگاه وب‌سرویس آموت
          </p>
        </div>

        {/* بج وضعیت اتصال در هدر */}
        <div className="flex items-center gap-2">
          {!isActive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-[1.5px] border-rose-200 dark:border-rose-900/50 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>ارسال پیامک: غیرفعال</span>
            </div>
          ) : (hasTokenInDb || liveAccount) ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal/15 text-teal border-[1.5px] border-teal/30 text-xs font-bold">
              <Radio size={14} className="animate-pulse" />
              <span>آموت: فعال و آماده</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border-[1.5px] border-amber-500/30 text-xs font-bold">
              <AlertTriangle size={14} />
              <span>نیاز به تنظیم توکن</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex gap-1.5 bg-gray-100 dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-2xl p-1.5 overflow-x-auto scrollbar-none max-w-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                tab === t.id
                  ? "bg-primary text-white shadow-[2px_2px_0_#1F413D]"
                  : "text-ink-subtle dark:text-slate-400 hover:text-sec dark:hover:text-white hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              <t.icon size={15} className="shrink-0" /> {t.label}
            </button>
          ))}
        </div>
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
                <div className="flex items-center gap-3 bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-xl p-3.5 shrink-0">
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
      {/* ۲. تب ارسال آنی پیامک (SEND SMS) */}
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
                        className="flex items-center gap-1 text-[11px] font-bold text-teal bg-teal/10 hover:bg-teal/20 px-2.5 py-1 rounded-lg border-[1.5px] border-teal/25 transition-all cursor-pointer"
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
                      <span className="bg-teal/15 text-teal px-2 py-0.5 rounded-lg font-bold">
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
      {/* ۳. تب ارسال پیام زماندار (SCHEDULED SMS) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === "scheduled" && (
        <div className="flex flex-col gap-6">
          {/* فرم ثبت زمانبندی پیامک */}
          <div>
            <StickerCard theme="white">
              <form onSubmit={handleCreateSchedule} className="p-5 sm:p-6 flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 dark:border-slate-800 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal/15 text-teal flex items-center justify-center border border-teal/25 shrink-0">
                      <CalendarClock size={18} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-navy dark:text-white">
                        ثبت زمان‌بندی جدید ارسال پیامک
                      </h2>
                      <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 mt-0.5">
                        پیامک شما در تاریخ و ساعت مقرر به‌صورت خودکار توسط سیستم به گیرندگان ارسال خواهد شد.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">خط ارسال:</span>
                    <select
                      value={schedLineNumber}
                      onChange={(e) => setSchedLineNumber(e.target.value)}
                      className="bg-white dark:bg-[#1C2536] border border-gray-200 dark:border-slate-700 rounded-lg py-1 px-2.5 text-xs font-mono font-bold text-teal focus:border-teal focus:outline-none cursor-pointer"
                    >
                      <option value="98">98 (خط خدماتی پیش‌فرض)</option>
                      {availableLines
                        .filter((l) => l && !["Public", "Service", "98"].includes(l))
                        .map((line) => (
                          <option key={line} value={line}>
                            {line}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* ۱. انتخاب منبع شماره‌ها (استخراج از فرم یا دستی) */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs font-black text-navy dark:text-slate-200 flex items-center gap-1.5">
                    <Users size={15} className="text-teal" />
                    ۱. منبع شماره‌های گیرندگان:
                  </label>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setSchedSourceType("manual")}
                      className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer select-none transition-all duration-200 ${
                        schedSourceType === "manual"
                          ? "bg-teal/10 border-teal text-navy dark:text-white shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700/60 text-ink-subtle dark:text-slate-300 hover:border-teal/40"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          schedSourceType === "manual" ? "bg-teal text-navy" : "bg-ink/5 dark:bg-white/5 text-ink/50 dark:text-slate-400"
                        }`}
                      >
                        <Smartphone size={16} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">ورود دستی شماره‌ها</span>
                          {schedSourceType === "manual" && <Check size={14} className="text-teal" />}
                        </div>
                        <span className="text-[11px] text-ink-subtle dark:text-slate-400 mt-0.5">
                          جای‌گذاری مستقیم لیست شماره‌ها در کادر متنی
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => setSchedSourceType("form")}
                      className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer select-none transition-all duration-200 ${
                        schedSourceType === "form"
                          ? "bg-teal/10 border-teal text-navy dark:text-white shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700/60 text-ink-subtle dark:text-slate-300 hover:border-teal/40"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          schedSourceType === "form" ? "bg-teal text-navy" : "bg-ink/5 dark:bg-white/5 text-ink/50 dark:text-slate-400"
                        }`}
                      >
                        <FileText size={16} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">استخراج از فرم‌های پرس‌کاد</span>
                          {schedSourceType === "form" && <Check size={14} className="text-teal" />}
                        </div>
                        <span className="text-[11px] text-ink-subtle dark:text-slate-400 mt-0.5">
                          استخراج هوشمند شماره پاسخ‌دهندگان فرم‌ها
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* اگر منبع = استخراج از فرم */}
                {schedSourceType === "form" && (
                  <div className="flex flex-col gap-3.5 p-4 sm:p-5 rounded-2xl bg-teal/5 dark:bg-teal/10 border border-teal/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-black text-navy dark:text-slate-200 flex items-center gap-1.5">
                        <FileText size={15} className="text-teal" />
                        فرم مورد نظر را انتخاب نمایید:
                      </span>
                      {schedUniquePhones.length > 0 && (
                        <span className="text-xs font-black text-teal font-mono bg-teal/15 px-3 py-1 rounded-xl border border-teal/20">
                          {faNum(schedUniquePhones.length)} شماره یکتا آماده زمان‌بندی
                        </span>
                      )}
                    </div>

                    <select
                      value={schedFormId}
                      onChange={(e) => handleSelectSchedForm(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">-- انتخاب فرم ({faNum(formsList.length)} فرم موجود) --</option>
                      {formsList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title || "بدون عنوان"} ({f.slug})
                        </option>
                      ))}
                    </select>

                    {/* فیلدهای سوالات فرم */}
                    {schedFormId && (
                      <div className="flex flex-col gap-2 pt-2">
                        <span className="text-xs font-bold text-ink-subtle dark:text-slate-300">
                          فیلدهای شماره تماس این فرم:
                        </span>
                        {schedLoadingQuestions ? (
                          <Skeleton className="h-12 w-full" rounded="rounded-xl" />
                        ) : schedFormQuestions.length === 0 ? (
                          <div className="text-xs font-semibold text-ink-subtle">سوالی با نوع شماره تماس در این فرم یافت نشد.</div>
                        ) : (
                          <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {schedFormQuestions.map((q) => {
                              const isChecked = schedSelectedQIds.includes(q.id);
                              return (
                                <div
                                  key={q.id}
                                  onClick={() => handleToggleSchedQuestion(q.id)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                    isChecked
                                      ? "bg-teal/15 border-teal text-navy dark:text-white font-bold"
                                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-ink-subtle"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    {isChecked ? <CheckSquare size={15} className="text-teal shrink-0" /> : <Square size={15} className="shrink-0" />}
                                    <span className="truncate">{q.title || "بدون عنوان"}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* اگر منبع = ورود دستی */}
                {schedSourceType === "manual" && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-ink-subtle dark:text-slate-400">
                        شماره‌های موبایل گیرندگان (با اینتر، کاما یا فاصله جدا کنید):
                      </label>
                      <span className="text-xs font-black text-teal font-mono">
                        {schedUniqueManualMobiles.length > 0 ? `${faNum(schedUniqueManualMobiles.length)} شماره معتبر` : ""}
                      </span>
                    </div>
                    <textarea
                      value={schedRawMobiles}
                      onChange={(e) => setSchedRawMobiles(e.target.value)}
                      rows={3}
                      className={`${inputCls} font-mono text-xs leading-relaxed`}
                      placeholder={"09123456789\n09351112233\n09198887766"}
                      dir="ltr"
                    />
                    <p className="text-[11px] font-semibold text-ink-subtle dark:text-slate-500">
                      شماره‌های تکراری به صورت خودکار حذف شده و ارقام فارسی تصحیح می‌گردند.
                    </p>
                  </div>
                )}

                {/* ۲. متن پیامک */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-navy dark:text-slate-200">
                      ۲. متن پیامک زمان‌دار:
                    </label>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
                      <span className="text-ink-subtle dark:text-slate-400">
                        زبان: <strong className="text-navy dark:text-white">{isSchedPersian ? "فارسی" : "لاتین"}</strong>
                      </span>
                      <span className="text-ink-subtle dark:text-slate-400">
                        کاراکتر: <strong className="text-teal font-mono">{faNum(schedCharCount)}</strong>
                      </span>
                      <span className="bg-teal/15 text-teal px-2 py-0.5 rounded-lg font-bold">
                        صفحه: {faNum(schedPagesCount)}
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={schedText}
                    onChange={(e) => setSchedText(e.target.value)}
                    rows={4}
                    className={`${inputCls} text-sm leading-relaxed`}
                    placeholder="متن پیامک ارسالی را در این بخش بنویسید..."
                  />
                </div>

                {/* ۳. انتخاب‌گر تاریخ و زمان شمسی (JalaliDateTimePicker) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-navy dark:text-slate-200">
                    ۳. زمان مقرر ارسال:
                  </label>
                  <JalaliDateTimePicker
                    value={schedDateTime}
                    onChange={(isoStr) => setSchedDateTime(isoStr)}
                    minMinutesAhead={2}
                    disabled={schedulingSubmitting}
                  />
                </div>

                {/* پیام فیدبک ثبت */}
                {scheduleFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col gap-2 transition-all shadow-xs ${
                      scheduleFeedback.success
                        ? "bg-teal/10 border-teal/30 text-navy dark:text-slate-100"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {scheduleFeedback.success ? (
                          <CheckCircle2 size={18} className="text-teal shrink-0" />
                        ) : (
                          <AlertTriangle size={18} className="text-rose-500 shrink-0" />
                        )}
                        <span>{scheduleFeedback.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScheduleFeedback(null)}
                        className="text-ink-subtle hover:text-navy p-1 rounded-lg cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {scheduleFeedback.success && (
                      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-teal/20 text-[11px]">
                        <span>کل گیرندگان: <strong className="font-mono text-teal">{faNum(scheduleFeedback.total)}</strong></span>
                        {scheduleFeedback.removedDuplicates > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">تکراری‌های حذف‌شده: <strong>{faNum(scheduleFeedback.removedDuplicates)}</strong></span>
                        )}
                        {scheduleFeedback.removedInvalid > 0 && (
                          <span className="text-rose-500">شماره‌های نامعتبر: <strong>{faNum(scheduleFeedback.removedInvalid)}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* دکمه ثبت زمانبندی */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-ink/10 dark:border-slate-800">
                  <div className="text-xs text-ink-subtle dark:text-slate-400 font-semibold flex items-center gap-1.5">
                    <Info size={14} className="text-teal shrink-0" />
                    <span>پیام‌ها توسط سیستم ابری خودکار در تاریخ و ساعت مشخص‌شده ارسال خواهند شد.</span>
                  </div>

                  <Button
                    variant="teal"
                    size="md"
                    type="submit"
                    disabled={schedulingSubmitting || activeSchedMobiles.length === 0 || !schedText.trim()}
                    className="flex items-center justify-center gap-2 font-black px-6 py-2.5 cursor-pointer shadow-md"
                  >
                    {schedulingSubmitting ? <Spinner size="sm" /> : <CalendarClock size={16} />}
                    <span>{schedulingSubmitting ? "در حال ثبت زمان‌بندی..." : `تایید و زمان‌بندی پیامک (${faNum(activeSchedMobiles.length)} گیرنده)`}</span>
                  </Button>
                </div>
              </form>
            </StickerCard>
          </div>

          {/* جدول صف پیام‌های زماندار */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-navy dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-teal" />
                  صف پیام‌های زمان‌دار ({faNum(scheduledTotal)} مورد)
                </h2>
                <p className="text-xs text-ink-subtle dark:text-slate-400 font-semibold mt-0.5">
                  لیست و وضعیت لحظه‌ای پیام‌های در انتظار، در حال ارسال و ارسالی
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                  <input
                    type="text"
                    value={scheduledSearch}
                    onChange={(e) => {
                      setScheduledSearch(e.target.value);
                      setScheduledPage(1);
                    }}
                    placeholder="جستجو در متن پیام..."
                    className={inputCls + " !py-1.5 !pr-9 text-xs !w-44 sm:!w-56"}
                  />
                </div>

                <select
                  value={scheduledStatusFilter}
                  onChange={(e) => {
                    setScheduledStatusFilter(e.target.value);
                    setScheduledPage(1);
                  }}
                  className={inputCls + " !py-1.5 text-xs !w-auto"}
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار ارسال</option>
                  <option value="processing">در حال ارسال</option>
                  <option value="sent">ارسال شده</option>
                  <option value="failed">ناموفق</option>
                  <option value="canceled">لغو شده</option>
                </select>

                <Button variant="ghost" size="sm" onClick={loadScheduledQueue} disabled={scheduledLoading} className="cursor-pointer">
                  <RefreshCw size={14} className={scheduledLoading ? "animate-spin" : ""} />
                </Button>
              </div>
            </div>

            {scheduledLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : scheduledList.length === 0 ? (
              <EmptyState
                icon={<CalendarClock size={48} />}
                title="پیام زمان‌داری در صف ثبت نشده است"
                subtitle="می‌توانید با استفاده از فرم بالا، اولین پیامک زمان‌دار خود را برای ارسال در آینده ثبت کنید."
              />
            ) : (
              <div>
                <StickerCard theme="white" className="overflow-hidden">
                  <div className="overflow-x-auto rounded-2xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-xs">
                          <th className="text-right font-black px-4 py-3">شناسه</th>
                          <th className="text-right font-black px-4 py-3">متن پیامک</th>
                          <th className="text-center font-black px-4 py-3">گیرندگان</th>
                          <th className="text-right font-black px-4 py-3">زمان مقرر ارسال (شمسی)</th>
                          <th className="text-center font-black px-4 py-3">وضعیت</th>
                          <th className="text-center font-black px-4 py-3">نتیجه</th>
                          <th className="text-center font-black px-4 py-3">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduledList.map((item, i) => (
                          <tr
                            key={item.id}
                            className={`${
                              i % 2 ? "bg-slate-50/50 dark:bg-slate-800/40" : ""
                            } border-b border-ink/5 dark:border-slate-800/60 last:border-0 hover:bg-slate-100/50 dark:hover:bg-slate-700/40 transition-colors`}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-teal text-xs" dir="ltr">
                              #{item.id}
                            </td>

                            <td className="px-4 py-3 font-semibold text-ink-subtle dark:text-slate-300 text-xs max-w-xs truncate" title={item.message}>
                              {item.message?.slice(0, 45)}
                              {item.message?.length > 45 ? "..." : ""}
                            </td>

                            <td className="px-4 py-3 text-center text-xs font-bold text-navy dark:text-white font-mono">
                              {faNum(item.total_count)}
                            </td>

                            <td className="px-4 py-3 text-xs font-semibold text-navy dark:text-slate-200">
                              <div className="flex flex-col">
                                <span>{faDateTime(item.scheduled_at)}</span>
                                {item.status === "pending" && (
                                  <span className="text-[10px] text-teal font-bold mt-0.5">
                                    {(() => {
                                      const diff = new Date(item.scheduled_at).getTime() - Date.now();
                                      if (diff <= 0) return "سررسید شده";
                                      const mins = Math.round(diff / 60000);
                                      if (mins > 60) return `${faNum(Math.floor(mins / 60))} ساعت دیگر`;
                                      return `${faNum(mins)} دقیقه دیگر`;
                                    })()}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center">
                              {getScheduledStatusBadge(item.status)}
                            </td>

                            <td className="px-4 py-3 text-center text-xs font-bold">
                              {item.status === "sent" || item.status === "failed" ? (
                                <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">موفق {faNum(item.success_count)}</span>
                                  <span>/</span>
                                  <span className="text-rose-500 font-bold">ناموفق {faNum(item.failed_count)}</span>
                                </div>
                              ) : (
                                <span className="text-ink-subtle text-[11px]">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(item)}
                                  className="!py-1 !px-2.5 text-xs text-navy dark:text-slate-200 hover:text-teal font-bold cursor-pointer"
                                  title="مشاهده جزئیات و گیرندگان"
                                >
                                  <Eye size={14} />
                                  <span className="hidden sm:inline">جزئیات</span>
                                </Button>

                                {item.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelScheduled(item.id)}
                                    disabled={cancelingId === item.id}
                                    className="!py-1 !px-2.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold cursor-pointer"
                                    title="لغو زمان‌بندی پیامک"
                                  >
                                    {cancelingId === item.id ? <Spinner size="sm" /> : <Ban size={14} />}
                                    <span className="hidden sm:inline">لغو</span>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* صفحه‌بندی */}
                  {scheduledTotal > 20 && (
                    <div className="flex items-center justify-between p-4 border-t border-ink/10 dark:border-slate-800 text-xs">
                      <span className="text-ink-subtle dark:text-slate-400 font-medium">
                        نمایش صفحه {faNum(scheduledPage)} از {faNum(Math.ceil(scheduledTotal / 20))} ({faNum(scheduledTotal)} کل)
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={scheduledPage <= 1}
                          onClick={() => setScheduledPage((p) => Math.max(1, p - 1))}
                          className="cursor-pointer"
                        >
                          <ChevronRight size={14} />
                          <span>قبلی</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={scheduledPage >= Math.ceil(scheduledTotal / 20)}
                          onClick={() => setScheduledPage((p) => p + 1)}
                          className="cursor-pointer"
                        >
                          <span>بعدی</span>
                          <ChevronLeft size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </StickerCard>
              </div>
            )}
          </div>

          {/* Modal مشاهده جزئیات پیام زماندار */}
          <Modal
            open={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            title={`جزئیات پیام زمان‌دار #${selectedScheduledItem?.id || ""}`}
            wide={true}
          >
            <div className="flex flex-col gap-4">
              {selectedScheduledItem && (
                <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-ink-subtle dark:text-slate-400 block font-semibold">زمان مقرر ارسال:</span>
                    <strong className="text-navy dark:text-white mt-0.5 block">{faDateTime(selectedScheduledItem.scheduled_at)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-subtle dark:text-slate-400 block font-semibold">وضعیت کلی:</span>
                    <div className="mt-1">{getScheduledStatusBadge(selectedScheduledItem.status)}</div>
                  </div>
                  <div>
                    <span className="text-ink-subtle dark:text-slate-400 block font-semibold">خط فرستنده:</span>
                    <strong className="font-mono text-teal mt-0.5 block">{selectedScheduledItem.sender_number || "98"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-subtle dark:text-slate-400 block font-semibold">نتیجه ارسال:</span>
                    <strong className="font-mono text-navy dark:text-white mt-0.5 block">
                      موفق: {faNum(selectedScheduledItem.success_count || 0)} / ناموفق: {faNum(selectedScheduledItem.failed_count || 0)}
                    </strong>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-gray-200/60 dark:border-slate-700/60">
                    <span className="text-ink-subtle dark:text-slate-400 block font-semibold">متن پیامک:</span>
                    <p className="text-navy dark:text-slate-200 mt-1 font-medium leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                      {selectedScheduledItem.message}
                    </p>
                  </div>
                  {selectedScheduledItem.last_error && (
                    <div className="sm:col-span-2 text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 font-bold">
                      علت خطا: {selectedScheduledItem.last_error}
                    </div>
                  )}
                </div>
              )}

              {/* لیست تک‌تک گیرندگان */}
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-navy dark:text-white">
                    لیست گیرندگان ({faNum(selectedRecipients.length)} شماره)
                  </h4>

                  <input
                    type="text"
                    value={recipientSearchFilter}
                    onChange={(e) => setRecipientSearchFilter(e.target.value)}
                    placeholder="جستجو در شماره گیرنده..."
                    className={`${inputCls} !py-1 !px-2.5 text-xs !w-48`}
                  />
                </div>

                {detailLoading ? (
                  <Skeleton className="h-32 w-full" rounded="rounded-xl" />
                ) : selectedRecipients.length === 0 ? (
                  <div className="text-center py-6 text-xs text-ink-subtle dark:text-slate-400">گیرنده‌ای ثبت نشده است.</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-2xl">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900 text-ink-subtle font-bold border-b border-gray-200 dark:border-slate-700">
                          <th className="px-3 py-2">ردیف</th>
                          <th className="px-3 py-2">شماره موبایل</th>
                          <th className="px-3 py-2 text-center">وضعیت</th>
                          <th className="px-3 py-2">شناسه پیام درگاه</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                        {selectedRecipients
                          .filter((r) => !recipientSearchFilter || r.mobile?.includes(recipientSearchFilter))
                          .map((r, i) => (
                            <tr key={r.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-3 py-2 text-ink-subtle font-bold">{faNum(i + 1)}</td>
                              <td className="px-3 py-2 font-mono font-bold text-navy dark:text-white" dir="ltr">{r.mobile}</td>
                              <td className="px-3 py-2 text-center">
                                <Badge
                                  color={
                                    r.status === "sent" ? "teal" : r.status === "failed" ? "red" : "orange"
                                  }
                                >
                                  {r.status === "sent" ? "ارسال شد" : r.status === "failed" ? "ناموفق" : "در انتظار"}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px] text-ink-subtle" dir="ltr">
                                {r.provider_message_id || r.error_message || "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
                {selectedScheduledItem?.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleCancelScheduled(selectedScheduledItem.id);
                      setDetailModalOpen(false);
                    }}
                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold text-xs cursor-pointer"
                  >
                    <Ban size={14} />
                    <span>لغو این زمان‌بندی</span>
                  </Button>
                )}
                <Button
                  variant="teal"
                  size="sm"
                  onClick={() => setDetailModalOpen(false)}
                  className="mr-auto font-bold text-xs cursor-pointer"
                >
                  بستن
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ۴. تب استخراج شماره از فرم‌ها (FORM CONTACTS IMPORT) */}
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
                      فرم و فیلدهای شماره تماس (مانند موبایل داوطلب، شماره والدین، معرف و...) را انتخاب کنید تا تمامی شماره‌های واردشده توسط پاسخ‌دهندگان به صورت خودکار نرمال‌سازی و آماده ارسال پیامک شوند.
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
                  {/* ۱. انتخاب فرم فعال با سلکت‌باکس و فیلتر جستجو */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1.5">
                        <FileText size={15} className="text-teal" />
                        ۱. فرم فعال مورد نظر را انتخاب کنید:
                      </label>
                      {formsList.length > 0 && (
                        <span className="text-[11px] font-bold text-teal">
                          {faNum(formsList.length)} فرم فعال
                        </span>
                      )}
                    </div>

                    {loadingForms ? (
                      <div className="flex flex-col gap-2 py-1">
                        <Skeleton className="h-10 w-full" rounded="rounded-xl" />
                        <Skeleton className="h-10 w-full" rounded="rounded-xl" />
                      </div>
                    ) : formsList.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs font-bold text-amber-700 dark:text-amber-300">
                        هیچ فرم فعالی در حساب کاربری شما یافت نشد. لطفاً در بخش فرم‌ها ابتدا یک فرم را فعال (منتشر) کنید.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {formsList.length > 2 && (
                          <div className="relative">
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle dark:text-slate-400 pointer-events-none flex items-center justify-center">
                              <Search size={15} />
                            </div>
                            <input
                              type="text"
                              value={formSearchQuery}
                              onChange={(e) => setFormSearchQuery(e.target.value)}
                              placeholder="جستجوی سریع در نام یا شناسه فرم..."
                              className={`${inputCls} pr-10 pl-9 py-2 text-xs`}
                            />
                            {formSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setFormSearchQuery("")}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                title="پاک کردن جستجو"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* سلکت‌باکس فرم‌های فعال */}
                        {(() => {
                          const q = formSearchQuery.trim().toLowerCase();
                          const ownerOf = (f) => f.created_by || f.manager_id || "unknown";
                          const filtered = formsList.filter((f) => {
                            if (!q) return true;
                            const ownerName = (formOwnerNames[ownerOf(f)] || "").toLowerCase();
                            return (
                              (f.title || "").toLowerCase().includes(q) ||
                              (f.slug || "").toLowerCase().includes(q) ||
                              ownerName.includes(q)
                            );
                          });

                          return (
                            <select
                              value={selectedFormId}
                              onChange={(e) => handleSelectForm(e.target.value)}
                              className={`${inputCls} text-sm font-semibold cursor-pointer`}
                            >
                              <option value="">
                                {formSearchQuery
                                  ? `-- ${faNum(filtered.length)} فرم پیدا شد (انتخاب کنید) --`
                                  : `-- انتخاب فرم برای استخراج شماره (${faNum(formsList.length)} فرم فعال) --`}
                              </option>
                              {isGlobalAdmin ? (
                                Object.entries(
                                  filtered.reduce((g, f) => {
                                    const who = formOwnerNames[ownerOf(f)] || "سایر فرم‌ها";
                                    (g[who] = g[who] || []).push(f);
                                    return g;
                                  }, {})
                                )
                                  .sort((a, b) => a[0].localeCompare(b[0], "fa"))
                                  .map(([who, list]) => (
                                    <optgroup key={who} label={`👤 کاربر: ${who}`}>
                                      {list.map((f) => (
                                        <option key={f.id} value={f.id}>
                                          {f.title || "بدون عنوان"} ({f.slug})
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))
                              ) : (
                                filtered.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.title || "بدون عنوان"} ({f.slug})
                                  </option>
                                ))
                              )}
                            </select>
                          );
                        })()}
                      </div>
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
                        <div className="flex flex-col gap-2 py-1">
                          <Skeleton className="h-9 w-full" rounded="rounded-xl" />
                          <Skeleton className="h-9 w-full" rounded="rounded-xl" />
                          <Skeleton className="h-9 w-full" rounded="rounded-xl" />
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

            {/* ستون چپ: آمار و عملیات انتقال شماره‌ها (5 ستون) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-5">
                  <h3 className="text-sm font-extrabold text-navy dark:text-white flex items-center gap-2 border-b border-ink/10 dark:border-slate-800 pb-3">
                    <Sparkles size={16} className="text-teal" />
                    خلاصه شماره‌های استخراج‌شده
                  </h3>

                  {/* کارت‌های آماری */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-teal/15 border border-teal/30 flex flex-col justify-between min-h-[72px]">
                      <span className="text-[11px] font-bold text-teal-text dark:text-teal">شماره‌های یکتا و معتبر:</span>
                      {extractingContacts ? (
                        <Skeleton className="h-7 w-16 mt-1 bg-teal/30" rounded="rounded-md" />
                      ) : (
                        <strong className="text-2xl font-black text-teal mt-1 font-mono">
                          {faNum(uniqueExtractedPhones.length)}
                        </strong>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col justify-between min-h-[72px]">
                      <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400">کل ورودی‌های خام:</span>
                      {extractingContacts ? (
                        <Skeleton className="h-7 w-16 mt-1" rounded="rounded-md" />
                      ) : (
                        <strong className="text-2xl font-black text-navy dark:text-white mt-1 font-mono">
                          {faNum(extractedContacts.length)}
                        </strong>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col justify-between min-h-[72px]">
                      <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400">تکراری‌های حذف‌شده:</span>
                      {extractingContacts ? (
                        <Skeleton className="h-7 w-14 mt-1" rounded="rounded-md" />
                      ) : (
                        <strong className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                          {faNum(Math.max(0, extractedContacts.filter((c) => c.isValid).length - uniqueExtractedPhones.length))}
                        </strong>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col justify-between min-h-[72px]">
                      <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400">نامعتبر یا ناقص:</span>
                      {extractingContacts ? (
                        <Skeleton className="h-7 w-14 mt-1" rounded="rounded-md" />
                      ) : (
                        <strong className="text-xl font-bold text-rose-500 mt-1 font-mono">
                          {faNum(extractedContacts.filter((c) => !c.isValid).length)}
                        </strong>
                      )}
                    </div>
                  </div>

                  {/* دکمه‌های عملیات اصلی */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      variant="teal"
                      size="md"
                      onClick={handleImportToScheduled}
                      disabled={extractingContacts || uniqueExtractedPhones.length === 0}
                      className="w-full flex items-center justify-center gap-2 font-black py-2.5 shadow-md cursor-pointer"
                    >
                      <CalendarClock size={16} />
                      <span>انتقال به بخش پیام زماندار ({faNum(uniqueExtractedPhones.length)})</span>
                    </Button>

                    <Button
                      variant="navy"
                      size="md"
                      onClick={handleImportToSend}
                      disabled={extractingContacts || uniqueExtractedPhones.length === 0}
                      className="w-full flex items-center justify-center gap-2 font-black py-2.5 cursor-pointer"
                    >
                      <Send size={15} />
                      <span>انتقال به بخش ارسال آنی</span>
                    </Button>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyExtractedPhones}
                        disabled={extractingContacts || uniqueExtractedPhones.length === 0}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold border border-ink/10 dark:border-slate-700"
                      >
                        <Copy size={14} />
                        <span>کپی شماره‌ها</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadTxt}
                        disabled={extractingContacts || uniqueExtractedPhones.length === 0}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold border border-ink/10 dark:border-slate-700"
                      >
                        <Download size={14} />
                        <span>دانلود TXT</span>
                      </Button>
                    </div>
                  </div>
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
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle dark:text-slate-400 pointer-events-none flex items-center justify-center">
                        <Search size={14} />
                      </div>
                      <input
                        type="text"
                        value={searchContactFilter}
                        onChange={(e) => setSearchContactFilter(e.target.value)}
                        placeholder="جستجو در شماره‌ها..."
                        className={`${inputCls} pr-10 pl-3 py-1.5 text-xs`}
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
      {/* ۵. تب تنظیمات پیامک (SETTINGS) */}
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
                        className="absolute right-2 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 rounded-lg border-[1.5px] border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer"
                      >
                        پاک کردن
                      </button>
                    )}
                  </div>
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
                <div className="flex items-center justify-between p-3.5 bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-xl transition-colors">
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
      {/* ۶. تب تاریخچه ارسال‌ها (HISTORY) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
              <History size={18} className="text-teal" />
              سوابق پیامک‌های ارسالی
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                <input
                  type="text"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  placeholder="جستجو در شماره یا متن..."
                  className={inputCls + " !py-1.5 !pr-9 text-xs"}
                />
              </div>

              {/* فیلتر نوع ارسال */}
              <select
                value={filterOutboxType}
                onChange={(e) => setFilterOutboxType(e.target.value)}
                className={inputCls + " !py-1.5 text-xs !w-auto"}
              >
                <option value="all">همه انواع ارسال</option>
                <option value="scheduled">فقط زماندار</option>
                <option value="instant">فقط آنی / فوری</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={inputCls + " !py-1.5 text-xs !w-auto"}
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
            <TableSkeleton rows={5} cols={6} />
          ) : filteredOutbox.length === 0 ? (
            <EmptyState
              icon={<History size={48} />}
              title="پیامکی با مشخصات مورد نظر یافت نشد"
              subtitle="کلیه پیامک‌های ارسالی با درگاه آموت در این جدول ثبت و نگهداری می‌شوند."
            />
          ) : (
            <div>
              <StickerCard theme="white" className="overflow-hidden">
                <div className="overflow-x-auto rounded-2xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-xs">
                        <th className="text-right font-black px-4 py-3">موبایل گیرنده</th>
                        <th className="text-right font-black px-4 py-3">متن پیامک</th>
                        <th className="text-center font-black px-4 py-3">نوع ارسال</th>
                        <th className="text-center font-black px-4 py-3">خط فرستنده</th>
                        <th className="text-center font-black px-4 py-3">صفحات</th>
                        <th className="text-center font-black px-4 py-3">وضعیت</th>
                        <th className="text-right font-black px-4 py-3">زمان ثبت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOutbox.map((o, i) => {
                        const isSched = Boolean(o.is_scheduled || o.scheduled_sms_id);
                        return (
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
                            <td className="px-4 py-3 text-center">
                              {isSched ? (
                                <span className="inline-flex items-center gap-1 bg-purple/10 text-purple dark:text-purple-300 border border-purple/20 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                                  <CalendarClock size={12} />
                                  <span>زماندار</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-ink-subtle dark:text-slate-400 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                                  <Zap size={12} />
                                  <span>فوری</span>
                                </span>
                              )}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </StickerCard>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ۷. تب صندوق دریافتی (INBOX) */}
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