import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { faNum, faRelative } from "../../lib/utils";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StickerCard from "../../components/ui/StickerCard";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";
import SEO from "../../components/ui/SEO";
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
} from "lucide-react";

const inputCls =
  "w-full bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy dark:text-slate-100 placeholder:text-ink-subtle/50 dark:placeholder:text-slate-500 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all";

export default function TelegramBot() {
  const { user, profile, isOwner, hasPermission } = useAuth();
  const canManage =
    isOwner() ||
    (hasPermission("manage_telegram") && profile?.can_use_telegram === true);
  const [tab, setTab] = useState("config");
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // ─── Config ───
  const [configs, setConfigs] = useState([]);
  const [configForm, setConfigForm] = useState({
    bot_token: "",
    chat_id: "",
    chat_title: "",
  });
  const [editingConfig, setEditingConfig] = useState(null);

  // ─── Form Links ───
  const [forms, setForms] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState("");

  // ─── Send Log ───
  const [sendLog, setSendLog] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

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
      const [configRes, formsRes, linksRes] = await Promise.all([
        supabase
          .from("telegram_config")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("forms")
          .select("id, title, published, manager_id, created_by")
          .order("created_at", { ascending: false }),
        supabase
          .from("telegram_form_links")
          .select("id, form_id, config_id, is_active, created_at"),
      ]);

      let allForms = formsRes.data || [];
      if (!isOwner() && user?.id) {
        allForms = allForms.filter(
          (f) => f.manager_id === user.id || f.created_by === user.id,
        );
      }
      const userFormIds = new Set(allForms.map((f) => f.id));

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

  // ─── Config CRUD ───
  async function saveConfig(e) {
    e.preventDefault();
    if (!canManage) {
      showToast("شما مجوز مدیریت بات تلگرام را ندارید", "error");
      return;
    }
    if (!configForm.bot_token.trim() || !configForm.chat_id.trim()) {
      showToast("توکن و شناسه چت الزامی هستند", "error");
      return;
    }
    try {
      if (editingConfig) {
        const { error } = await supabase
          .from("telegram_config")
          .update({
            bot_token: configForm.bot_token.trim(),
            chat_id: configForm.chat_id.trim(),
            chat_title: configForm.chat_title.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingConfig.id);
        if (error) throw error;
        showToast("تنظیمات بروزرسانی شد");
      } else {
        const payload = {
          bot_token: configForm.bot_token.trim(),
          chat_id: configForm.chat_id.trim(),
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
    if (!canManage) return;
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
    if (!confirm("آیا از حذف این تنظیمات مطمئنید؟")) return;
    try {
      const { error } = await supabase
        .from("telegram_config")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("حذف شد");
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
        .update({ is_active: !current, updated_at: new Date().toISOString() })
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
  const formTitleById = Object.fromEntries(forms.map((f) => [f.id, f.title]));
  const configLabelById = Object.fromEntries(
    configs.map((c) => [c.id, c.chat_title || c.chat_id]),
  );

  const TABS = [
    { id: "config", label: "تنظیمات ربات", icon: Settings },
    { id: "links", label: "لینک فرم‌ها", icon: Link2 },
    { id: "log", label: "تاریخچه ارسال", icon: History },
  ];

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

      {/* تب‌ها */}
      <div className="flex gap-1 bg-white dark:bg-slate-900 border-2 border-ink/10 dark:border-slate-800 rounded-pill-md p-1 overflow-x-auto scrollbar-none max-w-full">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-pill-sm text-sm font-bold transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-teal text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]"
                : "text-ink-subtle dark:text-slate-400 hover:text-ink dark:hover:text-slate-200 hover:bg-bg-lavender dark:hover:bg-slate-800"
            }`}
          >
            <t.icon size={14} />
            {t.label}
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
              <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-slate-100 mb-3">
                تنظیمات ذخیره‌شده ({faNum(configs.length)})
              </h2>
              <div className="flex flex-col gap-3">
                {configs.map((cfg) => (
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
                        <select
                          value={selectedFormId}
                          onChange={(e) => setSelectedFormId(e.target.value)}
                          className={inputCls}
                        >
                          <option value="">انتخاب فرم...</option>
                          {forms.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.title} {f.published ? "" : "(غيرمنتشر)"}
                            </option>
                          ))}
                        </select>
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
                  <h2 className="text-base sm:text-lg font-extrabold text-navy dark:text-slate-100 mb-3">
                    لینک‌های فعال ({faNum(links.length)})
                  </h2>
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
                            {links.map((link, i) => (
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
            <Spinner label="بارگذاری تاریخچه..." />
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
                          زمان
                        </th>
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
                              <Badge color="red">
                                <XCircle size={11} className="ml-1 inline" />
                                خطا
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-ink-subtle dark:text-slate-400">
                            {log.sent_at ? faRelative(log.sent_at) : "—"}
                          </td>
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
