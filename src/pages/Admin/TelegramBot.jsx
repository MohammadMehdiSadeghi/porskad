import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { faNum, faRelative, faDateTime } from "../../lib/utils";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StickerCard from "../../components/ui/StickerCard";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";
import { TableSkeleton, TelegramBotSkeleton } from "../../components/ui/Skeleton";
import SEO from "../../components/ui/SEO";
import { sendToTelegram } from "../../lib/telegram";
import {
  Send,
  Settings,
  Link2,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Plus,
  Bot,
  HelpCircle,
  Search,
  RefreshCw,
  Eye,
  SendHorizonal,
  Calendar,
  User,
  FileText,
  CheckSquare,
} from "lucide-react";

const inputCls =
  "w-full bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-xl px-4 py-2.5 text-sm font-semibold text-sec dark:text-white placeholder:text-gray-400 focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all";

export default function TelegramBot() {
  const { user, profile, isOwner, hasPermission } = useAuth();
  const canManage =
    isOwner() ||
    hasPermission("manage_telegram") ||
    profile?.can_use_telegram !== false;
  const [tab, setTab] = useState("config");
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [configSearch, setConfigSearch] = useState("");
  const [linkSearch, setLinkSearch] = useState("");

  // ─── Config ───
  const [configs, setConfigs] = useState([]);
  const [configForm, setConfigForm] = useState({
    bot_token: "",
    chat_id: "",
    chat_title: "",
  });
  const [editingConfig, setEditingConfig] = useState(null);

  // ─── Form Links ───
  const [forms, setForms] = useState([]); // همه فرم‌های دامنه کاربر (برای عنوان لاگ/جدول)
  const [activeForms, setActiveForms] = useState([]); // فقط فعال، برای انتخاب‌گر
  const [ownerNames, setOwnerNames] = useState({}); // userId → نمایشی (سوپرامین)
  const [links, setLinks] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState("");

  // ─── Send Log ───
  const [sendLog, setSendLog] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  // ─── Manual Dispatch (SuperAdmin Only) ───
  const [manualFormId, setManualFormId] = useState("");
  const [manualResponses, setManualResponses] = useState([]);
  const [manualQuestions, setManualQuestions] = useState([]);
  const [manualAnswers, setManualAnswers] = useState({});
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [previewResponse, setPreviewResponse] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [sendingResponseId, setSendingResponseId] = useState(null);
  const [manualSelectedIds, setManualSelectedIds] = useState([]);
  const [batchSending, setBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // ─── Toast ───
  const [toast, setToast] = useState(null);
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Load Data ───
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // عنوان لاگ/جدول‌ها باید برای لینک‌های قدیمی هم پیدا شود، پس همهٔ
      // فرم‌ها را می‌گیریم و «فعال‌ها» (منتشر + نه آرشیو + نه زباله‌دان) را
      // جدا می‌کنیم؛ آرشیو/پیش‌نویس/زباله‌دان هرگز در انتخاب‌گر دیده نمی‌شود.
      const [configRes, formsRes, linksRes] = await Promise.all([
        supabase
          .from("telegram_config")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("forms")
          .select(
            "id, title, published, archived, deleted_at, manager_id, created_by",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("telegram_form_links")
          .select("id, form_id, config_id, is_active, created_at"),
      ]);

      let allForms = formsRes.data || [];

      // سوپرامین همه را می‌بیند و باید بداند هر فرم/توکن مال چه کسی است
      // (برای اینکه موقع لینک‌کردن بین فرم‌های هم‌اسم کاربرهای مختلف
      // اشتباه نزند و بداند هر توکن را چه کسی اضافه کرده). بقیه فقط
      // موارد خودشان.
      if (isOwner()) {
        const ownerIds = new Set([
          ...allForms.map((f) => f.created_by || f.manager_id),
          ...(configRes.data || []).map((c) => c.user_id),
        ].filter((x) => !!x));
        if (ownerIds.size > 0) {
          const { data: ownerRows } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", [...ownerIds]);
          setOwnerNames(
            Object.fromEntries(
              (ownerRows || []).map((p) => [
                p.id,
                p.full_name || p.email || "کاربر حذف‌شده",
              ]),
            ),
          );
        } else setOwnerNames({});
      } else {
        if (user?.id) {
          allForms = allForms.filter(
            (f) => f.manager_id === user.id || f.created_by === user.id,
          );
        }
        setOwnerNames({});
      }
      const userFormIds = new Set(allForms.map((f) => f.id));

      // انتخاب‌گر ربات: منحصراً فرم‌های فعال (منتشر شده + بدون آرشیو + بدون حذف)
      setActiveForms(
        allForms.filter(
          (f) => f.published && !f.archived && !f.deleted_at,
        ),
      );

      let allConfigs = configRes.data || [];
      if (
        !isOwner() &&
        user?.id &&
        allConfigs.length > 0 &&
        "user_id" in allConfigs[0]
      ) {
        allConfigs = allConfigs.filter(
          (c) => !c.user_id || c.user_id === user.id,
        );
      }

      setConfigs(allConfigs);
      setForms(allForms);
      setLinks(
        isOwner()
          ? linksRes.data || []
          : (linksRes.data || []).filter((l) => userFormIds.has(l.form_id)),
      );
    } catch (err) {
      console.error("loadAll error:", err);
    }
    setLoading(false);
  }, [isOwner, user?.id]);

  const loadSendLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const { data, error } = await supabase
        .from("telegram_send_log")
        .select(
          "id, form_id, response_id, chat_id, status, error_message, sent_at",
        )
        .order("sent_at", { ascending: false })
        .limit(100);

      let logList = data || [];
      if (!isOwner() && forms.length > 0) {
        const formIdSet = new Set(forms.map((f) => f.id));
        logList = logList.filter((item) => formIdSet.has(item.form_id));
      }
      setSendLog(logList);
    } catch (err) {
      console.error(err);
    }
    setLogLoading(false);
  }, [isOwner, forms]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (tab === "log") loadSendLog();
  }, [tab, loadSendLog]);

  // ─── Manual Dispatch (SuperAdmin) ───
  const loadManualFormResponses = useCallback(async (fId) => {
    setManualSelectedIds([]);
    if (!fId) {
      setManualResponses([]);
      setManualQuestions([]);
      setManualAnswers({});
      return;
    }
    setManualLoading(true);
    try {
      const [{ data: respRows, error: respErr }, { data: qRows, error: qErr }] = await Promise.all([
        supabase
          .from("responses")
          .select("id, form_id, is_complete, duration_seconds, device, browser, created_at, submitted_at")
          .eq("form_id", fId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("questions")
          .select("id, title, type, position")
          .eq("form_id", fId)
          .order("position", { ascending: true }),
      ]);
      if (respErr) throw respErr;
      if (qErr) throw qErr;

      const responsesList = respRows || [];
      const questionsList = qRows || [];

      let answersMap = {};
      if (responsesList.length > 0) {
        const respIds = responsesList.map((r) => r.id);
        const { data: ansRows, error: ansErr } = await supabase
          .from("answers")
          .select("response_id, question_id, value")
          .in("response_id", respIds);

        if (!ansErr && ansRows) {
          ansRows.forEach((a) => {
            if (!answersMap[a.response_id]) answersMap[a.response_id] = {};
            answersMap[a.response_id][a.question_id] = a.value;
          });
        }
      }

      setManualResponses(responsesList);
      setManualQuestions(questionsList);
      setManualAnswers(answersMap);
    } catch (err) {
      console.error("Error loading manual form responses:", err);
      showToast("خطا در بارگذاری پاسخ‌ها: " + err.message, "error");
    } finally {
      setManualLoading(false);
    }
  }, []);

  async function handleResend(formId, responseId) {
    if (!canManage) return;
    setResendingId(responseId);
    try {
      const res = await sendToTelegram(formId, responseId, { force: true });
      if (res.ok) {
        showToast("پاسخ با موفقیت مجدداً به تلگرام ارسال شد.");
        loadSendLog();
      } else {
        showToast("خطا در ارسال: " + (res.error || res.results?.[0]?.error || "عدم ارسال"), "error");
      }
    } catch (err) {
      showToast("خطا: " + err.message, "error");
    } finally {
      setResendingId(null);
    }
  }

  async function handleManualDispatch(responseObj) {
    if (!manualFormId || !responseObj) return;
    setSendingResponseId(responseObj.id);
    try {
      const res = await sendToTelegram(manualFormId, responseObj.id, { force: true });
      if (res.ok) {
        showToast("گزارش ورودی با موفقیت به بات تلگرام متصل به این فرم ارسال شد.");
        loadSendLog();
        setPreviewModalOpen(false);
      } else {
        showToast("خطا در ارسال: " + (res.error || res.results?.[0]?.error || "عدم ارسال"), "error");
      }
    } catch (err) {
      showToast("خطا: " + err.message, "error");
    } finally {
      setSendingResponseId(null);
    }
  }

  async function handleBatchManualDispatch() {
    if (!manualFormId || manualSelectedIds.length === 0 || batchSending) return;
    setBatchSending(true);
    const total = manualSelectedIds.length;
    setBatchProgress({ current: 0, total });
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < total; i++) {
        const respId = manualSelectedIds[i];
        setBatchProgress({ current: i + 1, total });
        try {
          const res = await sendToTelegram(manualFormId, respId, { force: true });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
        // وقفه کوتاه ۱۲۰ میلی‌ثانیه‌ای برای مهار نرخ ارسال تلگرام
        if (i < total - 1) {
          await new Promise((r) => setTimeout(r, 120));
        }
      }

      if (successCount > 0) {
        showToast(`${faNum(successCount)} پاسخ با موفقیت به چت تلگرام ارسال شد.`);
        setManualSelectedIds([]);
        loadSendLog();
      }
      if (failCount > 0) {
        showToast(`${faNum(failCount)} پاسخ به دلیل عدم اتصال یا خطای تلگرام ارسال نشد.`, "error");
      }
    } catch (err) {
      showToast("خطا در ارسال گروهی: " + err.message, "error");
    } finally {
      setBatchSending(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  }

  function buildPreviewMessage(responseObj) {
    if (!responseObj) return "";
    const fTitle = formTitleById[manualFormId] || "—";
    const subDate = responseObj.submitted_at || responseObj.created_at;
    const timeStr = subDate
      ? new Date(subDate).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" })
      : "—";
    const dateStr = subDate
      ? new Date(subDate).toLocaleDateString("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" })
      : "—";
    const respAnswers = manualAnswers[responseObj.id] || {};

    const lines = [
      "━━━━━━━━━━━━━━━━━━",
      "🔴 پرس‌کاد",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `📋 فرم: ${fTitle}`,
      "",
    ];

    manualQuestions.forEach((q, i) => {
      const val = respAnswers[q.id];
      let display = "—";
      if (val !== null && val !== undefined && val !== "") {
        if (typeof val === "object") {
          if (val.name || val.url) display = val.name ? `${val.name} (${val.url})` : val.url;
          else if (val.province || val.city || val.address) display = [val.province, val.city, val.address].filter(Boolean).join(" - ");
          else display = JSON.stringify(val);
        } else if (Array.isArray(val)) {
          display = val.join("، ");
        } else if (String(val).startsWith("data:image/")) {
          display = "✍️ [تصویر امضا ثبت شد]";
        } else {
          display = String(val);
        }
      }
      lines.push(`${faNum(i + 1)}. ${q.title || "بدون عنوان"}: ${display}`);
    });

    lines.push("");
    lines.push(`⏰ زمان ثبت: ${timeStr} — ${dateStr}`);
    lines.push("━━━━━━━━━━━━━━━━━━");

    return lines.join("\n");
  }

  // ─── Config CRUD ───
  async function saveConfig(e) {
    e.preventDefault();
    if (!canManage) {
      showToast("شما مجوز مدیریت بات تلگرام را ندارید", "error");
      return;
    }
    const cleanToken = configForm.bot_token.trim().replace(/^bot/i, "");
    const cleanChatId = configForm.chat_id.trim();
    if (!cleanToken || !cleanChatId) {
      showToast("توکن و شناسه چت الزامی هستند", "error");
      return;
    }
    try {
      if (editingConfig) {
        const { error } = await supabase
          .from("telegram_config")
          .update({
            bot_token: cleanToken,
            chat_id: cleanChatId,
            chat_title: configForm.chat_title.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingConfig.id);
        if (error) throw error;
        showToast("تنظیمات بروزرسانی شد");
      } else {
        const payload = {
          bot_token: cleanToken,
          chat_id: cleanChatId,
          chat_title: configForm.chat_title.trim(),
        };

        if (!user?.id) throw new Error("کاربر احراز هویت نشده است.");
        const { error: insertErr } = await supabase
          .from("telegram_config")
          .insert({ ...payload, user_id: user.id });

        if (insertErr) throw insertErr;
        showToast("تنظیمات جدید ذخیره شد");
      }
      setConfigForm({ bot_token: "", chat_id: "", chat_title: "" });
      setEditingConfig(null);
      loadAll();
    } catch (err) {
      showToast("خطا: " + err.message, "error");
    }
  }

  function editConfig(cfg) {
    setEditingConfig(cfg);
    setConfigForm({
      bot_token: cfg.bot_token,
      chat_id: cfg.chat_id,
      chat_title: cfg.chat_title || "",
    });
    setTab("config");
  }

  async function deleteConfig(id) {
    if (!canManage) {
      showToast("شما مجوز مدیریت بات تلگرام را ندارید", "error");
      return;
    }
    if (!confirm("تنظیمات و تمام لینک‌های متصل به آن حذف شود؟")) return;
    try {
      const { error } = await supabase
        .from("telegram_config")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("تنظیمات حذف شد");
      loadAll();
    } catch (err) {
      showToast("خطا: " + err.message, "error");
    }
  }

  async function toggleConfigActive(id, current) {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from("telegram_config")
        .update({
          is_active: !current,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      loadAll();
    } catch (err) {
      showToast("خطا: " + err.message, "error");
    }
  }

  // ─── Link CRUD ───
  async function addLink() {
    if (!canManage) {
      showToast("شما مجوز مدیریت بات تلگرام را ندارید", "error");
      return;
    }
    if (!selectedFormId || !selectedConfigId) {
      showToast("فرم و تنظیمات تلگرام را انتخاب کنید", "error");
      return;
    }
    try {
      const { error } = await supabase.from("telegram_form_links").insert({
        form_id: selectedFormId,
        config_id: selectedConfigId,
      });
      if (error) {
        if (error.code === "23505") {
          showToast("این فرم قبلاً لینک شده", "error");
        } else throw error;
      } else {
        showToast("لینک اضافه شد");
      }
      setSelectedFormId("");
      setSelectedConfigId("");
      loadAll();
    } catch (err) {
      showToast("خطا: " + err.message, "error");
    }
  }

  async function toggleLinkActive(id, current) {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from("telegram_form_links")
        .update({ is_active: !current })
        .eq("id", id);
      if (error) throw error;
      loadAll();
    } catch (err) {
      showToast("خطا: " + err.message, "error");
    }
  }

  async function deleteLink(id) {
    if (!canManage) {
      showToast("شما مجوز مدیریت بات تلگرام را ندارید", "error");
      return;
    }
    if (!confirm("لینک حذف شود؟")) return;
    try {
      const { error } = await supabase
        .from("telegram_form_links")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("لینک حذف شد");
      loadAll();
    } catch (err) {
      showToast("خطا: " + err.message, "error");
    }
  }

  // ─── Helpers ───
  const ownerOf = (f) => f.created_by || f.manager_id || "";
  const formTitleById = Object.fromEntries(forms.map((f) => [f.id, f.title]));
  // فرمِ آرشیو/حذف‌شده ممکن است لینک قدیمی داشته باشد → عنوان در جدول خالی نماند
  const linkOwnerById = Object.fromEntries(
    forms.map((f) => [f.id, ownerOf(f)]),
  );
  const configLabelById = Object.fromEntries(
    configs.map((c) => [c.id, c.chat_title || c.chat_id]),
  );

  // ─── جستجو در توکن‌ها و لینک‌ها ───
  const cq = configSearch.trim().toLowerCase();
  const matchQ = (s) => (s || "").toLowerCase().includes(cq);
  const filteredConfigs = configs.filter(
    (c) => !cq || matchQ(c.chat_title) || matchQ(c.chat_id) || matchQ(ownerNames[c.user_id]),
  );
  const lq = linkSearch.trim().toLowerCase();
  const matchL = (s) => (s || "").toLowerCase().includes(lq);
  const filteredLinks = links.filter(
    (l) =>
      !lq ||
      matchL(formTitleById[l.form_id]) ||
      matchL(configLabelById[l.config_id]) ||
      matchL(ownerNames[linkOwnerById[l.form_id]]),
  );

  const TABS = [
    { id: "config", label: "تنظیمات ربات", icon: Settings },
    { id: "links", label: "لینک فرم‌ها", icon: Link2 },
    { id: "log", label: "تاریخچه ارسال", icon: History },
    ...(isOwner()
      ? [{ id: "manual", label: "ارسال دستی ورودی‌ها", icon: SendHorizonal }]
      : []),
  ];

  if (loading) {
    return <TelegramBotSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
      <SEO
        title="بات تلگرام"
        description="تنظیمات بات تلگرام — پنل مدیریت پرس‌کاد"
        url="/admin/telegram"
        noIndex
      />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy dark:text-slate-100 flex items-center gap-2">
            <Bot size={24} className="text-teal" />
            بات تلگرام
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 mt-0.5">
            ارسال خودکار ورودی‌های فرم به تلگرام
          </p>
        </div>

        <Button
          variant="teal"
          size="sm"
          className="flex items-center gap-1.5 shadow-sm"
          onClick={() => setShowHelpModal(true)}
        >
          <HelpCircle size={15} />
          <span>راهنمای راه‌اندازی</span>
        </Button>
      </div>

      {/* هشدار عدم دسترسی و دعوت به ارسال تیکت */}
      {!canManage && (
        <div>
          <StickerCard theme="orange">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="w-10 h-10 rounded-full bg-orange text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot size={22} />
                </span>
                <div>
                  <h3 className="font-black text-navy dark:text-slate-100 text-base">
                    قابلیت اتصال به بات تلگرام برای حساب شما فعال نیست
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-300 mt-1 leading-6">
                    برای اتصال ربات و دریافت لحظه‌ای اطلاعات فرم‌ها در کانال یا
                    گروه تلگرامی خود، می‌توانید درخواست خود را از طریق تیکت برای
                    مدیریت ارسال کنید تا این قابلیت برای حسابتان فعال گردد.
                  </p>
                </div>
              </div>
              <Button
                as={Link}
                to={`/admin/support?subject=${encodeURIComponent("درخواست فعال‌سازی بات تلگرام")}&message=${encodeURIComponent("سلام، لطفاً قابلیت اتصال بات تلگرام را برای حساب کاربری من فعال نمایید.")}`}
                variant="teal"
                size="sm"
                className="whitespace-nowrap shrink-0"
              >
                ارسال تیکت فعال‌سازی
              </Button>
            </div>
          </StickerCard>
        </div>
      )}

      {/* تب‌ها بر اساس دیزاین سیستم رُکاد */}
      <div className="flex gap-1.5 bg-gray-100 dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-2xl p-1.5 overflow-x-auto scrollbar-none max-w-full">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              tab === t.id
                ? "bg-primary text-white shadow-[2px_2px_0_#1F413D]"
                : "text-ink-subtle dark:text-slate-400 hover:text-sec dark:hover:text-white hover:bg-white dark:hover:bg-slate-800"
            }`}
          >
            <t.icon size={15} />
            <span>{t.label}</span>
            {t.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold mr-1 ${
                  tab === t.id ? "bg-white/25 text-white" : "bg-primary text-white"
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

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

      {/* ═══════ تب تنظیمات ربات ═══════ */}
      {tab === "config" && (
        <div className="flex flex-col gap-6">
          {/* فرم افزودن/ویرایش */}
          <div>
            <StickerCard theme="white">
              <form onSubmit={saveConfig} className="p-5 flex flex-col gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-navy dark:text-slate-100 mb-1">
                    {editingConfig ? "ویرایش تنظیمات" : "افزودن تنظیمات جدید"}
                  </h2>
                  <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400">
                    توکن ربات تلگرام و شناسه چت گروه/کانال را وارد کنید.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy dark:text-slate-200 mb-1">
                      توکن ربات تلگرام *
                    </label>
                    <input
                      type="text"
                      value={configForm.bot_token}
                      onChange={(e) =>
                        setConfigForm((p) => ({
                          ...p,
                          bot_token: e.target.value,
                        }))
                      }
                      className={inputCls}
                      placeholder="123456:ABC-DEF..."
                      dir="ltr"
                      disabled={!canManage}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy dark:text-slate-200 mb-1">
                        شناسه چت (Chat ID) *
                      </label>
                      <input
                        type="text"
                        value={configForm.chat_id}
                        onChange={(e) =>
                          setConfigForm((p) => ({
                            ...p,
                            chat_id: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="-100123456789"
                        dir="ltr"
                        disabled={!canManage}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy dark:text-slate-200 mb-1">
                        عنوان (اختیاری)
                      </label>
                      <input
                        type="text"
                        value={configForm.chat_title}
                        onChange={(e) =>
                          setConfigForm((p) => ({
                            ...p,
                            chat_title: e.target.value,
                          }))
                        }
                        className={inputCls}
                        placeholder="گروه مدیریت"
                        disabled={!canManage}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-1">
                  {editingConfig && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setEditingConfig(null);
                        setConfigForm({
                          bot_token: "",
                          chat_id: "",
                          chat_title: "",
                        });
                      }}
                    >
                      انصراف
                    </Button>
                  )}
                  <Button
                    variant="teal"
                    size="sm"
                    type="submit"
                    disabled={!canManage}
                  >
                    {editingConfig ? "بروزرسانی" : "ذخیره"}
                  </Button>
                </div>
              </form>
            </StickerCard>
          </div>

          {/* لیست تنظیمات */}
          {configs.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-slate-100 shrink-0">
                  تنظیمات ذخیره‌شده ({faNum(filteredConfigs.length)})
                </h2>
                <div className="relative flex-1 max-w-xs mr-auto">
                  <Search
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                  />
                  <input
                    type="text"
                    value={configSearch}
                    onChange={(e) => setConfigSearch(e.target.value)}
                    placeholder={
                      isOwner()
                        ? "جستجو در عنوان، چت یا نام کاربر..."
                        : "جستجو در عنوان یا چت..."
                    }
                    className={inputCls + " !py-1.5 !pr-9 text-xs"}
                  />
                </div>
              </div>
              {filteredConfigs.length === 0 ? (
                <p className="text-xs font-bold text-ink-subtle py-4 text-center">
                  موردی با این جستجو پیدا نشد
                </p>
              ) : (
              <div className="flex flex-col gap-3">
                {filteredConfigs.map((cfg) => (
                  <StickerCard key={cfg.id} theme="white">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-sm text-navy dark:text-slate-100 truncate">
                            {cfg.chat_title || "بدون عنوان"}
                          </span>
                          <Badge color={cfg.is_active ? "green" : "gray"}>
                            {cfg.is_active ? "فعال" : "غیرفعال"}
                          </Badge>
                        </div>
                        <div
                          className="text-xs font-mono text-ink-subtle dark:text-slate-400 truncate"
                          dir="ltr"
                        >
                          Chat: {cfg.chat_id}
                        </div>
                        <div
                          className="text-xs font-mono text-ink-subtle dark:text-slate-400 truncate"
                          dir="ltr"
                        >
                          Token: {cfg.bot_token.slice(0, 20)}...
                        </div>
                        {/* برای سوپرامین: چه کسی و کِی اضافه کرده */}
                        {isOwner() && (
                          <div className="mt-1 flex items-center flex-wrap gap-x-2 text-[10px] font-extrabold text-brand-purple">
                            <span>
                              👤 {ownerNames[cfg.user_id] || "کاربر حذف‌شده"}
                            </span>
                            <span className="text-ink-subtle font-bold">
                              {cfg.created_at ? faDateTime(cfg.created_at) : ""}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleConfigActive(cfg.id, cfg.is_active)
                          }
                          disabled={!canManage}
                        >
                          {cfg.is_active ? "غیرفعال" : "فعال"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editConfig(cfg)}
                          disabled={!canManage}
                        >
                          ویرایش
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!text-female-normal"
                          onClick={() => deleteConfig(cfg.id)}
                          disabled={!canManage}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </StickerCard>
                ))}
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════ تب لینک فرم‌ها ═══════ */}
      {tab === "links" && (
        <div className="flex flex-col gap-6">
          {configs.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle size={48} />}
              title="ابتدا تنظیمات ربات را ذخیره کنید"
              subtitle="برای لینک کردن فرم‌ها، ابتدا باید توکن ربات و شناسه چت را تنظیم کنید."
              action={
                <Button
                  variant="teal"
                  size="sm"
                  onClick={() => setTab("config")}
                >
                  رفتن به تنظیمات
                </Button>
              }
            />
          ) : (
            <>
              {/* فرم لینک جدید */}
              <div>
                <StickerCard theme="white">
                  <div className="p-5 flex flex-col gap-3">
                    <h2 className="text-base sm:text-lg font-black text-navy dark:text-slate-100">
                      افزودن لینک جدید
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-navy dark:text-slate-200 mb-1">
                          فرم
                        </label>
                        {activeForms.length === 0 ? (
                          <div className={inputCls + " opacity-60"}>
                            فرم فعالی ندارید
                          </div>
                        ) : (
                          <select
                            value={selectedFormId}
                            onChange={(e) =>
                              setSelectedFormId(e.target.value)
                            }
                            className={inputCls}
                          >
                            <option value="">انتخاب فرم...</option>
                            {isOwner()
                              ? // سوپرامین: اول کاربر، بعد فرم‌های فعال او
                                Object.entries(
                                  activeForms.reduce((g, f) => {
                                    const who =
                                      ownerNames[ownerOf(f)] ||
                                      "کاربر حذف‌شده";
                                    (g[who] = g[who] || []).push(f);
                                    return g;
                                  }, {}),
                                )
                                  .sort((a, b) => a[0].localeCompare(b[0], "fa"))
                                  .map(([who, list]) => (
                                    <optgroup key={who} label={`👤 کاربر: ${who}`}>
                                      {list.map((f) => (
                                        <option key={f.id} value={f.id}>
                                          {f.title}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))
                              : activeForms.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.title}
                                  </option>
                                ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-navy dark:text-slate-200 mb-1">
                          چت تلگرام
                        </label>
                        <select
                          value={selectedConfigId}
                          onChange={(e) => setSelectedConfigId(e.target.value)}
                          className={inputCls}
                        >
                          <option value="">انتخاب چت...</option>
                          {configs
                            .filter((c) => c.is_active)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.chat_title || c.chat_id}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="teal"
                          size="sm"
                          onClick={addLink}
                          className="w-full"
                          disabled={!canManage}
                        >
                          <Plus size={14} className="ml-1" />
                          افزودن لینک
                        </Button>
                      </div>
                    </div>
                  </div>
                </StickerCard>
              </div>

              {/* لیست لینک‌ها */}
              {links.length > 0 ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-slate-100 shrink-0">
                      لینک‌های فعال ({faNum(filteredLinks.length)})
                    </h2>
                    <div className="relative flex-1 max-w-xs mr-auto">
                      <Search
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                      />
                      <input
                        type="text"
                        value={linkSearch}
                        onChange={(e) => setLinkSearch(e.target.value)}
                        placeholder={
                          isOwner()
                            ? "جستجو در فرم، چت یا نام کاربر..."
                            : "جستجو در فرم یا چت..."
                        }
                        className={inputCls + " !py-1.5 !pr-9 text-xs"}
                      />
                    </div>
                  </div>
                  {filteredLinks.length === 0 ? (
                    <p className="text-xs font-bold text-ink-subtle py-4 text-center">
                      موردی با این جستجو پیدا نشد
                    </p>
                  ) : (
                  <div>
                    <StickerCard theme="white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700">
                              <th className="text-right font-black px-4 py-3">
                                فرم
                              </th>
                              <th className="text-right font-black px-4 py-3">
                                چت تلگرام
                              </th>
                              <th className="text-center font-black px-4 py-3">
                                وضعیت
                              </th>
                              <th className="text-center font-black px-4 py-3">
                                عملیات
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLinks.map((link, i) => (
                              <tr
                                key={link.id}
                                className={`${
                                  i % 2
                                    ? "bg-bg-lavender/60 dark:bg-slate-800/40"
                                    : ""
                                } border-b border-ink/5 dark:border-slate-800 last:border-0`}
                              >
                                <td className="px-4 py-3 font-bold text-ink dark:text-slate-200">
                                  {formTitleById[link.form_id] || "—"}
                                  {isOwner() &&
                                    linkOwnerById[link.form_id] && (
                                      <span className="block text-[10px] font-extrabold text-brand-purple">
                                        👤 {ownerNames[linkOwnerById[link.form_id]]}
                                      </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-semibold text-ink-subtle dark:text-slate-400">
                                  {configLabelById[link.config_id] || "—"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge
                                    color={link.is_active ? "green" : "gray"}
                                  >
                                    {link.is_active ? "فعال" : "غیرفعال"}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        toggleLinkActive(
                                          link.id,
                                          link.is_active,
                                        )
                                      }
                                      disabled={!canManage}
                                    >
                                      {link.is_active ? "غیرفعال" : "فعال"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="!text-female-normal"
                                      onClick={() => deleteLink(link.id)}
                                      disabled={!canManage}
                                    >
                                      <Trash2 size={13} />
                                    </Button>
                                  </div>
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
              ) : (
                <EmptyState
                  icon={<Link2 size={48} />}
                  title="هنوز لینکی وجود ندارد"
                  subtitle="فرم‌های مورد نظر خود را به چت تلگرام لینک کنید تا ورودی‌ها به‌صورت خودکار ارسال شوند."
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════ تب تاریخچه ارسال ═══════ */}
      {tab === "log" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-slate-100">
              تاریخچه ارسال‌ها
            </h2>
            <Button variant="ghost" size="sm" onClick={loadSendLog}>
              بروزرسانی
            </Button>
          </div>

          {logLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : sendLog.length > 0 ? (
            <div>
              <StickerCard theme="white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700">
                        <th className="text-right font-black px-4 py-3">فرم</th>
                        <th className="text-right font-black px-4 py-3">چت</th>
                        <th className="text-center font-black px-4 py-3">
                          وضعیت
                        </th>
                        <th className="text-right font-black px-4 py-3">
                          زمان ثبت / ارسال
                        </th>
                        {isOwner() && (
                          <th className="text-center font-black px-4 py-3">
                            عملیات
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sendLog.map((log, i) => (
                        <tr
                          key={log.id}
                          className={`${
                            i % 2
                              ? "bg-bg-lavender/60 dark:bg-slate-800/40"
                              : ""
                          } border-b border-ink/5 dark:border-slate-800 last:border-0`}
                        >
                          <td className="px-4 py-3 font-bold text-ink dark:text-slate-200">
                            {formTitleById[log.form_id] || "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink-subtle dark:text-slate-400 truncate max-w-[150px]">
                            {log.chat_id}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.status === "sent" ? (
                              <Badge color="green">
                                <CheckCircle
                                  size={11}
                                  className="ml-1 inline"
                                />
                                ارسال شد
                              </Badge>
                            ) : (
                              <Badge color="red" title={log.error_message || "خطا در ارسال"}>
                                <XCircle size={11} className="ml-1 inline" />
                                {log.error_message ? `خطا: ${log.error_message.length > 25 ? log.error_message.slice(0, 25) + "..." : log.error_message}` : "خطا"}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-ink-subtle dark:text-slate-400">
                            {log.sent_at ? faRelative(log.sent_at) : "—"}
                          </td>
                          {isOwner() && (
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {log.form_id && log.response_id ? (
                                <button
                                  type="button"
                                  onClick={() => handleResend(log.form_id, log.response_id)}
                                  disabled={resendingId === log.response_id || !canManage}
                                  title="ارسال مجدد این ورودی به تلگرام با تاریخ واقعی"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill-sm border border-teal/30 bg-teal/10 hover:bg-teal/20 text-xs font-bold text-teal dark:text-teal transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <RefreshCw
                                    size={13}
                                    className={resendingId === log.response_id ? "animate-spin shrink-0" : "shrink-0"}
                                  />
                                  <span>{resendingId === log.response_id ? "در حال ارسال..." : "ارسال مجدد"}</span>
                                </button>
                              ) : (
                                <span className="text-ink-subtle text-xs">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </StickerCard>
            </div>
          ) : (
            <EmptyState
              icon={<Send size={48} />}
              title="هنوز پیامی ارسال نشده"
              subtitle="وقتی کسی فرم لینک‌شده را پر کند، تاریخچه ارسال‌ها اینجا نمایش داده می‌شود."
            />
          )}
        </div>
      )}

      {/* ═══════ تب ارسال دستی ورودی‌ها (ویژه سوپرادمین) ═══════ */}
      {tab === "manual" && isOwner() && (
        <div className="flex flex-col gap-6">
          <StickerCard theme="white">
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-navy dark:text-slate-100 flex items-center gap-2">
                    <SendHorizonal size={20} className="text-teal" />
                    ارسال اختصاصی ورودی‌های فرم به تلگرام
                  </h2>
                  <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 mt-0.5">
                    هر ورودی دلخواه از هر فرمی را با حفظ تاریخ و زمان اصلی ثبت پاسخ به بات تلگرام مربوطه ارسال کنید.
                  </p>
                </div>
              </div>

              {/* انتخاب فرم */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2 border-t border-ink/5 dark:border-slate-800">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-navy dark:text-slate-200 mb-1">
                    انتخاب فرم (فقط فرم‌های فعال) *
                  </label>
                  {activeForms.length === 0 ? (
                    <div className={inputCls + " opacity-60"}>
                      فرم فعالی وجود ندارد
                    </div>
                  ) : (
                    <select
                      value={manualFormId}
                      onChange={(e) => {
                        const fId = e.target.value;
                        setManualFormId(fId);
                        loadManualFormResponses(fId);
                      }}
                      className={inputCls}
                    >
                      <option value="">یک فرم فعال را انتخاب کنید...</option>
                      {Object.entries(
                        activeForms.reduce((g, f) => {
                          const who = ownerNames[ownerOf(f)] || "سایر فرم‌ها";
                          (g[who] = g[who] || []).push(f);
                          return g;
                        }, {}),
                      )
                        .sort((a, b) => a[0].localeCompare(b[0], "fa"))
                        .map(([who, list]) => (
                          <optgroup key={who} label={`👤 کاربر: ${who}`}>
                            {list.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.title}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                    </select>
                  )}
                </div>

                {manualFormId && (
                  <div>
                    {links.filter((l) => l.form_id === manualFormId && l.is_active).length > 0 ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-teal bg-teal/10 border border-teal/30 px-3 py-2.5 rounded-pill-md">
                        <Bot size={16} />
                        <span>
                          متصل به {faNum(links.filter((l) => l.form_id === manualFormId && l.is_active).length)} چت تلگرام
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-orange bg-orange/10 border border-orange/30 px-3 py-2.5 rounded-pill-md">
                        <AlertTriangle size={16} />
                        <span>این فرم هنوز به چت تلگرام لینک نشده است</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </StickerCard>

          {/* لیست پاسخ‌های فرم انتخاب شده */}
          {manualFormId && (
            <div>
              {manualLoading ? (
                <TableSkeleton rows={5} cols={4} />
              ) : manualResponses.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm sm:text-base font-extrabold text-navy dark:text-slate-100">
                      پاسخ‌های ثبت‌شده ({faNum(manualResponses.length)})
                    </h3>
                    <div className="relative flex-1 max-w-xs">
                      <Search
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                      />
                      <input
                        type="text"
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        placeholder="جستجو در پاسخ‌ها..."
                        className={inputCls + " !py-1.5 !pr-9 text-xs"}
                      />
                    </div>
                  </div>

                  {(() => {
                    const filtered = manualResponses.filter((r) => {
                      if (!manualSearch.trim()) return true;
                      const q = manualSearch.trim().toLowerCase();
                      const rAns = manualAnswers[r.id] || {};
                      return Object.values(rAns).some((v) =>
                        String(v ?? "").toLowerCase().includes(q)
                      );
                    });

                    const isAllSelected =
                      filtered.length > 0 &&
                      filtered.every((r) => manualSelectedIds.includes(r.id));

                    return (
                      <>
                        {/* نوار عملیات ارسال دسته‌جمعی / همزمان */}
                        {manualSelectedIds.length > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-teal/10 dark:bg-teal/15 border-2 border-teal/40 rounded-xl animate-in fade-in duration-200">
                            <div className="flex items-center gap-2">
                              <CheckSquare size={18} className="text-teal shrink-0" />
                              <span className="text-xs sm:text-sm font-black text-navy dark:text-slate-100">
                                {faNum(manualSelectedIds.length)} پاسخ برای ارسال انتخاب شده است
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setManualSelectedIds([])}
                                disabled={batchSending}
                                className="px-3 py-1.5 rounded-pill-sm border border-ink/20 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-ink-subtle hover:text-rose-500 transition-colors cursor-pointer"
                              >
                                لغو انتخاب
                              </button>
                              <button
                                type="button"
                                onClick={handleBatchManualDispatch}
                                disabled={batchSending}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill-sm bg-teal hover:bg-teal-600 text-white text-xs font-bold shadow-[2px_2px_0_#1F413D] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send size={13} className={batchSending ? "animate-spin shrink-0" : "shrink-0"} />
                                <span>
                                  {batchSending
                                    ? `در حال ارسال (${faNum(batchProgress.current)} از ${faNum(batchProgress.total)})...`
                                    : `ارسال همزمان به تلگرام (${faNum(manualSelectedIds.length)})`}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}

                        <StickerCard theme="white">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700">
                                  <th className="text-center font-black px-3 py-3 w-10">
                                    <input
                                      type="checkbox"
                                      checked={isAllSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const setIds = new Set([
                                            ...manualSelectedIds,
                                            ...filtered.map((r) => r.id),
                                          ]);
                                          setManualSelectedIds([...setIds]);
                                        } else {
                                          const filteredSet = new Set(filtered.map((r) => r.id));
                                          setManualSelectedIds(
                                            manualSelectedIds.filter((id) => !filteredSet.has(id))
                                          );
                                        }
                                      }}
                                      className="w-4 h-4 accent-teal cursor-pointer rounded"
                                      title="انتخاب همه پاسخ‌های این لیست"
                                    />
                                  </th>
                                  <th className="text-center font-black px-3 py-3 w-16">ورودی #</th>
                                  <th className="text-right font-black px-4 py-3">زمان دقیق ثبت</th>
                                  <th className="text-right font-black px-4 py-3">چکیده پاسخ‌ها</th>
                                  <th className="text-center font-black px-4 py-3">عملیات</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map((r, i) => {
                                  const rAns = manualAnswers[r.id] || {};
                                  const subDate = r.submitted_at || r.created_at;
                                  const isSending = sendingResponseId === r.id;
                                  const isChecked = manualSelectedIds.includes(r.id);

                                  // خلاصه سه پاسخ اول
                                  const summarySnippets = manualQuestions
                                    .slice(0, 3)
                                    .map((q) => {
                                      const val = rAns[q.id];
                                      if (!val) return null;
                                      return `${q.title}: ${typeof val === "object" ? JSON.stringify(val) : String(val)}`;
                                    })
                                    .filter(Boolean);

                                  return (
                                    <tr
                                      key={r.id}
                                      className={`${
                                        isChecked
                                          ? "bg-teal/10 dark:bg-teal/20"
                                          : i % 2
                                          ? "bg-bg-lavender/60 dark:bg-slate-800/40"
                                          : ""
                                      } border-b border-ink/5 dark:border-slate-800 last:border-0 hover:bg-teal/5 transition-colors`}
                                    >
                                      <td className="px-3 py-3 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setManualSelectedIds((prev) => [...prev, r.id]);
                                            } else {
                                              setManualSelectedIds((prev) =>
                                                prev.filter((id) => id !== r.id)
                                              );
                                            }
                                          }}
                                          className="w-4 h-4 accent-teal cursor-pointer rounded"
                                        />
                                      </td>
                                      <td className="px-3 py-3 text-center font-extrabold text-xs text-navy dark:text-slate-300">
                                        {faNum(manualResponses.length - i)}
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-xs text-ink-subtle dark:text-slate-400 whitespace-nowrap">
                                        {subDate ? faDateTime(subDate) : "—"}
                                        <span className="block text-[10px] text-ink-subtle/70">
                                          ({subDate ? faRelative(subDate) : "—"})
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-xs font-semibold text-ink dark:text-slate-200 max-w-md">
                                        {summarySnippets.length > 0 ? (
                                          <div className="flex flex-col gap-0.5 truncate">
                                            {summarySnippets.map((s, idx) => (
                                              <span key={idx} className="truncate">
                                                • {s}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-ink-subtle italic">بدون پاسخ متنی</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPreviewResponse(r);
                                              setPreviewModalOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill-sm border border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-navy dark:text-slate-200 hover:border-teal hover:text-teal dark:hover:text-teal hover:bg-teal/5 transition-all cursor-pointer shadow-sm active:scale-95"
                                            title="مشاهده متن کامل گزارش ارسالی"
                                          >
                                            <Eye size={13} className="text-teal shrink-0" />
                                            <span>پیش‌نمایش</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleManualDispatch(r)}
                                            disabled={isSending || batchSending}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill-sm bg-teal hover:bg-teal-600 text-xs font-bold text-white transition-all cursor-pointer shadow-[2px_2px_0_#1F413D] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                                            title="ارسال مستقیم به چت تلگرام با تاریخ واقعی"
                                          >
                                            <Send
                                              size={13}
                                              className={isSending ? "animate-spin shrink-0" : "shrink-0"}
                                            />
                                            <span>{isSending ? "در حال ارسال..." : "ارسال به تلگرام"}</span>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </StickerCard>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <EmptyState
                  icon={<FileText size={48} />}
                  title="پاسخی برای این فرم ثبت نشده است"
                  subtitle="به محض ثبت پاسخ، ورودی‌ها در این قسمت جهت ارسال دستی در دسترس خواهند بود."
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── مودال پیش‌نمایش کارت تلگرام ─── */}
      <Modal
        open={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setPreviewResponse(null);
        }}
        title="پیش‌نمایش گزارش ارسالی به تلگرام"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-subtle dark:text-slate-400">
            این گزارش با حفظ زمان دقیق ثبت پاسخ به ربات و چت تلگرام ارسال می‌شود:
          </p>
          <div className="bg-[#1E293B] text-slate-100 p-4 rounded-xl font-mono text-xs leading-6 whitespace-pre-wrap dir-rtl select-all border border-slate-700 max-h-80 overflow-y-auto">
            {buildPreviewMessage(previewResponse)}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-ink/10 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreviewModalOpen(false);
                setPreviewResponse(null);
              }}
            >
              انصراف
            </Button>
            <Button
              variant="teal"
              size="sm"
              onClick={() => handleManualDispatch(previewResponse)}
              disabled={sendingResponseId === previewResponse?.id}
            >
              <Send size={14} className={sendingResponseId === previewResponse?.id ? "animate-spin ml-1" : "ml-1"} />
              {sendingResponseId === previewResponse?.id ? "در حال ارسال..." : "تایید و ارسال به تلگرام"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── مودال راهنمای بات تلگرام ─── */}
      <Modal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="راهنمای سریع راه‌اندازی بات تلگرام"
      >
        <div className="flex flex-col gap-3.5 text-sm leading-7">
          <div className="flex items-start gap-3 p-3.5 bg-bg-neutral dark:bg-slate-800 rounded-xl border border-ink/10 dark:border-slate-700">
            <span className="w-6 h-6 rounded-full bg-teal text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
              ۱
            </span>
            <div>
              <strong className="text-navy dark:text-slate-100 block text-sm">
                دریافت توکن از BotFather:
              </strong>
              <p className="text-xs text-ink-subtle dark:text-slate-300 mt-0.5">
                در تلگرام به ربات رسمی{" "}
                <code
                  className="text-teal font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-ink/10 dark:border-slate-700"
                  dir="ltr"
                >
                  @BotFather
                </code>{" "}
                بروید، دستور{" "}
                <code
                  className="text-teal font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-ink/10 dark:border-slate-700"
                  dir="ltr"
                >
                  /newbot
                </code>{" "}
                را ارسال کرده و نام و یوزرنیم بات را وارد کنید تا{" "}
                <strong>توکن اختصاصی</strong> دریافت شود.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-bg-neutral dark:bg-slate-800 rounded-xl border border-ink/10 dark:border-slate-700">
            <span className="w-6 h-6 rounded-full bg-teal text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
              ۲
            </span>
            <div>
              <strong className="text-navy dark:text-slate-100 block text-sm">
                دریافت چت‌آیدی (Chat ID):
              </strong>
              <p className="text-xs text-ink-subtle dark:text-slate-300 mt-0.5">
                برای پیوی شخصی، به یک ربات مانند{" "}
                <code
                  className="text-teal font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-ink/10 dark:border-slate-700"
                  dir="ltr"
                >
                  @userinfobot
                </code>{" "}
                پیام دهید تا Chat ID عددی شما را بدهد.
                <br />
                برای کانال یا گروه، ربات ساخته‌شده را در کانال/گروه{" "}
                <strong>ادمین</strong> کنید و آیدی یا چت‌آیدی آن را وارد کنید.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-bg-neutral dark:bg-slate-800 rounded-xl border border-ink/10 dark:border-slate-700">
            <span className="w-6 h-6 rounded-full bg-teal text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
              ۳
            </span>
            <div>
              <strong className="text-navy dark:text-slate-100 block text-sm">
                انتخاب و لینک کردن فرم:
              </strong>
              <p className="text-xs text-ink-subtle dark:text-slate-300 mt-0.5">
                اطلاعات ربات را در تب «تنظیمات ربات» ذخیره کنید. سپس در تب «لینک
                فرم‌ها»، فرم مورد نظرتان را انتخاب کرده تا از این پس پاسخ‌های
                ثبت‌شده فوراً به تلگرام ارسال گردند.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="teal"
              size="sm"
              onClick={() => setShowHelpModal(false)}
            >
              متوجه شدم
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
