import { useEffect, useState } from "react";
import { useAuth, isPrimaryGodEmail } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { ALL_PERMISSIONS } from "../../context/AuthContext";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StickerCard from "../../components/ui/StickerCard";
import Modal from "../../components/ui/Modal";
import { Plus, Edit, Edit3, Trash2, Crown, Users, ChevronDown, ChevronUp, Shield, FileText, BarChart3, Settings, Eye, EyeOff, Sliders, Bot, Copy, Calendar, CheckCircle, XCircle, Phone, Mail, RotateCcw, Save, Info } from "lucide-react";
import SEO from "../../components/ui/SEO";
import { supabase } from "../../lib/supabaseClient";
import { logActivity } from "../../lib/activityLogger";
import { faNum } from "../../lib/utils";

// ─── دسته‌بندی مجوزها ───
const PERMISSION_CATEGORIES = [
  {
    id: "forms",
    label: "فرم‌ها",
    icon: FileText,
    color: "teal",
    permissions: [
      { id: "create_form", label: "ایجاد فرم", desc: "ساخت فرم جدید" },
      { id: "edit_form", label: "ویرایش فرم", desc: "تغییر تنظیمات و سوال‌ها" },
      { id: "delete_form", label: "حذف فرم", desc: "حذف فرم و پاسخ‌ها" },
      { id: "publish_form", label: "انتشار فرم", desc: "فعال/غیرفعال کردن انتشار" },
    ],
  },
  {
    id: "data",
    label: "داده‌ها و تحلیل",
    icon: BarChart3,
    color: "navy",
    permissions: [
      { id: "view_responses", label: "مشاهده پاسخ‌ها", desc: "دیدن پاسخ‌های فرم‌ها" },
      { id: "view_analytics", label: "مشاهده تحلیل‌ها", desc: "دیدن نمودارها و آمار" },
      { id: "export_excel", label: "خروجی اکسل", desc: "دانلود پاسخ‌ها به‌صورت فایل" },
    ],
  },
  {
    id: "management",
    label: "مدیریت و ابزارها",
    icon: Settings,
    color: "orange",
    permissions: [
      { id: "manage_managers", label: "مدیریت مدیران", desc: "ایجاد/ویرایش/حذف مدیران" },
      { id: "manage_sms", label: "پنل پیامک", desc: "ارسال و مدیریت پیامک" },
      { id: "manage_telegram", label: "بات تلگرام", desc: "ارسال خودکار ورودی به تلگرام" },
      { id: "view_admins", label: "نمایش مدیران", desc: "دیدن سایر ادمین‌ها در لیست" },
    ],
  },
];

// همه permission‌ها به تخت (برای محاسبه تعداد)
const ALL_PERM_IDS = PERMISSION_CATEGORIES.flatMap((c) => c.permissions.map((p) => p.id));

// رنگ هر دسته
const CATEGORY_COLORS = {
  teal: { bg: "bg-ecosystem-light", border: "border-teal", text: "text-teal-text", icon: "text-teal" },
  navy: { bg: "bg-male-light", border: "border-navy", text: "text-navy", icon: "text-navy" },
  orange: { bg: "bg-college-light", border: "border-orange", text: "text-orange", icon: "text-orange" },
};

const inputCls =
  "w-full bg-white border-2 border-ink/15 focus:border-teal focus:ring-2 focus:ring-teal/20 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy focus:outline-none transition-all";

// ─── کامپوننت دسته مجوزها (قابل باز شدن) ───
function PermissionCategory({ category, selected, onToggle, disabled = false }) {
  const [open, setOpen] = useState(false);
  const colors = CATEGORY_COLORS[category.color] || CATEGORY_COLORS.teal;
  const activeCount = category.permissions.filter((p) => selected.includes(p.id)).length;
  const totalCount = category.permissions.length;
  const allActive = activeCount === totalCount;
  const noneActive = activeCount === 0;

  return (
    <div className={`border-2 rounded-pill-md overflow-hidden transition-all ${
      allActive ? colors.border + " " + colors.bg :
      noneActive ? "border-ink/10 bg-white" :
      "border-ink/20 bg-bg-lavender/40"
    }`}>
      {/* هدر دسته */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-white/50 transition-colors"
        disabled={disabled}
      >
        <category.icon size={18} className={colors.icon} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-navy">{category.label}</span>
            <Badge color={allActive ? "green" : noneActive ? "gray" : "blue"}>
              {activeCount}/{totalCount}
            </Badge>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-ink-subtle" /> : <ChevronDown size={16} className="text-ink-subtle" />}
      </button>

      {/* لیست مجوزها */}
      {open && (
        <div className="px-4 pb-3 border-t border-ink/10">
          <div className="flex flex-col gap-1 pt-2">
            {category.permissions.map((perm) => {
              const isActive = selected.includes(perm.id);
              return (
                <label
                  key={perm.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-pill-sm cursor-pointer transition-all ${
                    isActive ? colors.bg : "hover:bg-bg-lavender/60"
                  } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
                >
                  {/* Toggle switch */}
                  <button
                    type="button"
                    onClick={() => onToggle(perm.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                      isActive ? "bg-teal" : "bg-ink/20"
                    }`}
                    disabled={disabled}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      isActive ? "right-0.5" : "right-[22px]"
                    }`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-navy block">{perm.label}</span>
                    <span className="text-xs font-medium text-ink-subtle block">{perm.desc}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── کامپوننت نمایش خلاصه مجوزها روی کارت مدیر ───
function PermissionSummary({ permissions }) {
  const total = ALL_PERM_IDS.length;
  const active = ALL_PERM_IDS.filter((p) => permissions.includes(p)).length;
  const percent = Math.round((active / total) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-ink/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-bold text-ink-subtle whitespace-nowrap">
        {active}/{total}
      </span>
    </div>
  );
}

export default function Managers() {
  const { push } = useToast();
  const { listManagers, createManager, updateManager, deactivateManager, activateManager, deleteManager, isOwner, user, session, hasPermission, updateUserQuota, resetUserQuota } = useAuth();
  const canManage = isOwner() || hasPermission("manage_managers");
  const canView = isOwner() || hasPermission("manage_managers") || hasPermission("view_admins");
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [busy, setBusy] = useState(false);

  // ─── مدیریت ربات تلگرام ───
  const [newCanUseTelegram, setNewCanUseTelegram] = useState(false);
  const [editCanUseTelegram, setEditCanUseTelegram] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editPasswordVisible, setEditPasswordVisible] = useState(false);
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [userFormsCount, setUserFormsCount] = useState({});

  // ─── ویرایش مستقیم سهمیه کاربر در مودال کاربری ───
  const [userEditMaxForms, setUserEditMaxForms] = useState(5);
  const [userEditMaxResponses, setUserEditMaxResponses] = useState(100);
  const [userEditResponsesUsed, setUserEditResponsesUsed] = useState(0);
  const [userEditSaving, setUserEditSaving] = useState(false);

  useEffect(() => {
    if (selectedUserModal) {
      setUserEditMaxForms(selectedUserModal.max_forms ?? 5);
      setUserEditMaxResponses(selectedUserModal.max_responses_per_month ?? 100);
      setUserEditResponsesUsed(selectedUserModal.monthly_responses_used ?? 0);
    }
  }, [selectedUserModal?.id]);

  async function handleSaveUserQuotaDirect(e) {
    e?.preventDefault?.();
    if (!selectedUserModal) return;
    setUserEditSaving(true);
    try {
      const maxF = Math.max(1, Number(userEditMaxForms) || 1);
      const maxR = Math.max(1, Number(userEditMaxResponses) || 1);
      const usedR = Math.max(0, Number(userEditResponsesUsed) || 0);

      await updateUserQuota(selectedUserModal.id, {
        maxForms: maxF,
        maxResponses: maxR,
        monthlyResponsesUsed: usedR,
        plan: selectedUserModal.plan ?? "free",
        canUseTelegram: selectedUserModal.can_use_telegram,
      });

      setManagers((prev) =>
        prev.map((x) =>
          x.id === selectedUserModal.id
            ? { ...x, max_forms: maxF, max_responses_per_month: maxR, monthly_responses_used: usedR }
            : x
        )
      );
      setSelectedUserModal((prev) =>
        prev
          ? { ...prev, max_forms: maxF, max_responses_per_month: maxR, monthly_responses_used: usedR }
          : null
      );
      push(`سهمیه کاربر «${selectedUserModal.full_name || selectedUserModal.email}» با موفقیت ذخیره شد.`, "success");
    } catch (err) {
      push("خطا در ذخیره سهمیه: " + err.message, "error");
    } finally {
      setUserEditSaving(false);
    }
  }

  // ─── تنظیمات سامانه و محدودیت‌ها ───
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sysSettings, setSysSettings] = useState({
    site_title: "پرس‌کاد",
    telegram_support_id: "porskad_support",
    default_max_active_forms: 5,
    default_max_monthly_responses: 100,
    registration_enabled: true,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    async function loadSysSettings() {
      try {
        const { data, error } = await supabase.rpc("get_system_settings");
        if (!error && data) {
          setSysSettings((prev) => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.error("Failed to fetch system settings:", e);
      }
    }
    loadSysSettings();
  }, []);

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const { data, error } = await supabase.rpc("update_system_settings", {
        p_settings: sysSettings,
      });
      if (error) throw error;
      if (data) setSysSettings(data);
      push("تنظیمات سامانه و محدودیت‌ها با موفقیت ذخیره شد.", "success");
      setShowSettingsModal(false);
    } catch (err) {
      push("خطا در ذخیره تنظیمات: " + err.message, "error");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function toggleTelegramAccess(m) {
    const newVal = !m.can_use_telegram;
    try {
      await updateUserQuota(m.id, {
        maxForms: m.max_forms ?? 5,
        maxResponses: m.max_responses_per_month ?? 100,
        plan: m.plan ?? "free",
        canUseTelegram: newVal,
      });
      setManagers((prev) => prev.map((x) => x.id === m.id ? { ...x, can_use_telegram: newVal } : x));
      setSelectedUserModal((prev) => (prev && prev.id === m.id ? { ...prev, can_use_telegram: newVal } : prev));
      push(`دسترسی به ربات تلگرام برای «${m.full_name || m.email}» ${newVal ? "فعال شد" : "قطع شد"}`, "success");
    } catch (err) {
      push("خطا در تغییر دسترسی تلگرام: " + err.message, "error");
    }
  }

  // ─── مدیریت سهمیه ───
  const [quotaModal, setQuotaModal] = useState(null);
  const [quotaMaxForms, setQuotaMaxForms] = useState(5);
  const [quotaMaxResponses, setQuotaMaxResponses] = useState(100);
  const [quotaPlan, setQuotaPlan] = useState("free");
  const [quotaCanUseTelegram, setQuotaCanUseTelegram] = useState(false);
  const [quotaSaving, setQuotaSaving] = useState(false);

  function openQuotaModal(m) {
    setQuotaModal(m);
    setQuotaMaxForms(m.max_forms ?? 5);
    setQuotaMaxResponses(m.max_responses_per_month ?? 100);
    setQuotaPlan(m.plan ?? "free");
    setQuotaCanUseTelegram(Boolean(m.can_use_telegram));
  }

  async function handleSaveQuota(e) {
    e.preventDefault();
    if (!quotaModal) return;
    setQuotaSaving(true);
    try {
      await updateUserQuota(quotaModal.id, {
        maxForms: Number(quotaMaxForms) || 5,
        maxResponses: Number(quotaMaxResponses) || 100,
        plan: quotaPlan,
        canUseTelegram: Boolean(quotaCanUseTelegram),
      });
      push("سهمیه و دسترسی‌های کاربر با موفقیت به‌روزرسانی شد.", "success");
      setQuotaModal(null);
      load();
    } catch (err) {
      push("خطا در تغییر سهمیه: " + err.message, "error");
    } finally {
      setQuotaSaving(false);
    }
  }

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");
  const [createError, setCreateError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [data, formsRes] = await Promise.all([
        listManagers({ includeHidden: isOwner() }),
        supabase.from("forms").select("manager_id").is("deleted_at", null),
      ]);

      const formCountMap = {};
      (formsRes?.data || []).forEach((f) => {
        if (f.manager_id) {
          formCountMap[f.manager_id] = (formCountMap[f.manager_id] || 0) + 1;
        }
      });
      setUserFormsCount(formCountMap);

      const callerIsGod = isPrimaryGodEmail(user?.email);
      let filtered = data || [];
      // استتار: سوپرادمین ثانویه نباید از وجود اکانت اصلی superadmin@gmailc.com مطلع شود
      if (!callerIsGod) {
        filtered = filtered.filter((m) => !isPrimaryGodEmail(m.email));
      }
      setManagers(filtered);
    } catch (err) {
      push("خطا در بارگذاری: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newEmail || !newPassword) {
      setCreateError("ایمیل و رمز عبور الزامی است.");
      return;
    }
    setBusy(true);
    setCreateError(null);
    try {
      const userId = await createManager({
        email: newEmail.trim(),
        password: newPassword,
        fullName: newName.trim() || newEmail.split("@")[0],
        permissionIds: [
          "create_form",
          "edit_form",
          "delete_form",
          "publish_form",
          "view_responses",
          "view_analytics",
          "export_excel",
        ],
      });
      if (userId) {
        try {
          await updateUserQuota(userId, {
            maxForms: 5,
            maxResponses: 100,
            plan: "free",
            canUseTelegram: Boolean(newCanUseTelegram),
          });
        } catch {}
      }
      push("کاربر جدید با موفقیت ایجاد شد!");
      setShowCreateModal(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewCanUseTelegram(false);
      load();
    } catch (err) {
      setCreateError(err.message || "ایجاد کاربر ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(manager) {
    setSelectedManager(manager);
    setEditName(manager.full_name || manager.email.split("@")[0]);
    setEditCanUseTelegram(Boolean(manager.can_use_telegram));
    setEditNewPassword("");
    setEditPasswordVisible(false);
    setShowEditModal(true);
  }

  async function handleDeactivate(managerId) {
    const manager = managers.find((m) => m.id === managerId);
    const activating = manager ? !manager.is_active : false;
    if (!confirm(activating ? "فعال‌سازی این مدیر؟" : "غیرفعال‌سازی این مدیر؟")) return;
    try {
      if (activating) {
        await activateManager(managerId);
        logActivity("activate_manager", "user", managerId, { name: manager?.full_name });
        push("مدیر فعال شد");
      } else {
        await deactivateManager(managerId);
        logActivity("deactivate_manager", "user", managerId, { name: manager?.full_name });
        push("مدیر غیرفعال شد");
      }
      load();
      setSelectedUserModal((prev) => (prev && prev.id === managerId ? { ...prev, is_active: activating } : prev));
    } catch (err) {
      push("خطا: " + err.message, "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (!confirm(`حذف کامل مدیر «${deleteTarget.full_name || deleteTarget.email}»؟`)) {
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteManager(deleteTarget.id);
      logActivity("delete_manager", "user", deleteTarget.id, { email: deleteTarget.email, name: deleteTarget.full_name });
      push("مدیر حذف شد");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push("خطا: " + err.message, "error");
    }
  }

  if (loading) return <Spinner label="لیست مدیران..." />;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-lg sm:text-xl font-black text-navy">دسترسی غیرمجاز</h2>
        <p className="text-sm font-semibold text-ink-subtle">شما مجوز مشاهده مدیران را ندارید.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SEO title="مدیریت مدیران" description="مدیریت مدیران و مجوزها — پرس‌کاد" url="/admin/managers" noIndex />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy">مدیریت کاربران</h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-0.5">
            {managers.filter((m) => m.is_active).length} کاربر فعال — دسترسی به سایر کاربران برای تمامی کاربران عادی مسدود است
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="gap-1.5"
            >
              <Settings size={14} className="text-navy" />
              <span>تنظیمات و محدودیت‌های سامانه</span>
            </Button>
          )}
          {canManage && (
            <Button variant="teal" size="sm" onClick={() => setShowCreateModal(true)} rotate="-rotate-[1deg]">
              <Plus size={14} className="ml-1" /> کاربر جدید
            </Button>
          )}
        </div>
      </div>

      {/* لیست کاربران */}
      {managers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="هنوز کاربری وجود ندارد"
          subtitle="اولین کاربر سیستم را ایجاد کنید."
          action={<Button variant="teal" onClick={() => setShowCreateModal(true)}>کاربر جدید</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-5">
          {managers.map((m, i) => {
            const createdForms = userFormsCount[m.id] || 0;
            const maxForms = m.max_forms ?? 5;
            const remainingForms = Math.max(0, maxForms - createdForms);

            return (
              <div
                key={m.id}
                className={`${i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"} transition-all duration-200`}
              >
                <StickerCard theme={m.is_owner ? "orange" : "white"}>
                  <div
                    className="p-3.5 sm:p-4 flex flex-col gap-3 cursor-pointer select-none"
                    onClick={(e) => {
                      if (e.target.closest("button, a, input")) return;
                      setSelectedUserModal(m);
                    }}
                  >
                    {/* هدر کارت: آواتار، نام، ایمیل، وضعیت */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-xs ${
                            m.is_owner
                              ? "bg-orange text-white"
                              : m.is_active
                              ? "bg-teal/15 text-teal-text border border-teal/30"
                              : "bg-bg-neutral text-ink-subtle"
                          }`}
                        >
                          {m.full_name?.[0]?.toUpperCase() ?? m.email?.[0]?.toUpperCase() ?? "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-navy text-xs sm:text-sm truncate">
                              {m.full_name || "کاربر بدون نام"}
                            </span>
                            {m.is_owner && (
                              <span className="inline-flex items-center gap-0.5 text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 shrink-0">
                                <Crown size={11} /> صاحب
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-ink-subtle truncate block" dir="ltr">
                            {m.email}
                          </span>
                        </div>
                      </div>

                      <Badge color={m.is_active ? "green" : "gray"}>
                        {m.is_active ? "فعال" : "غیرفعال"}
                      </Badge>
                    </div>

                    {/* اطلاعات فشرده: تاریخ عضویت و باقیمانده سهمیه */}
                    <div className="bg-bg-lavender/50 rounded-xl p-2.5 flex flex-col gap-1.5 border border-navy/5 text-xs font-semibold">
                      <div className="flex items-center justify-between text-ink-subtle">
                        <span className="flex items-center gap-1 text-xs">
                          <Calendar size={12} className="text-teal shrink-0" />
                          تاریخ عضویت:
                        </span>
                        <strong className="text-navy text-[0.7rem]">
                          {new Date(m.created_at).toLocaleDateString("fa-IR")}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-ink-subtle pt-1 border-t border-navy/5">
                        <span className="flex items-center gap-1 text-[0.7rem]">
                          <BarChart3 size={12} className="text-orange shrink-0" />
                          باقیمانده سهمیه:
                        </span>
                        <span className={`text-[0.7rem] font-black ${remainingForms === 0 && !m.is_owner ? "text-magenta-text" : "text-teal-text"}`}>
                          {m.is_owner ? "نامحدود" : `${faNum(remainingForms)} از ${faNum(maxForms)} فرم`}
                        </span>
                      </div>
                    </div>

                    {/* دکمه مشاهده و مدیریت کاربر */}
                    <div className="pt-0.5 mt-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserModal(m);
                        }}
                        className="w-full py-2 px-3 rounded-pill-sm text-xs font-bold transition-all flex items-center justify-between bg-navy/5 hover:bg-teal hover:text-white text-navy border border-navy/10 group cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Settings size={13} className="text-teal group-hover:text-white transition-colors" />
                          <span>مشاهده و عملیات کاربر</span>
                        </span>
                        <span className="text-[0.7rem] font-bold text-ink/40 group-hover:text-white/90">مشاهده ←</span>
                      </button>
                    </div>
                  </div>
                </StickerCard>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── مودال پاپ‌آپ مدیریت کاربر ─── */}
      <Modal
        open={Boolean(selectedUserModal)}
        onClose={() => setSelectedUserModal(null)}
        title="مدیریت و مشخصات کاربر"
      >
        {selectedUserModal && (() => {
          const m = selectedUserModal;
          const createdForms = userFormsCount[m.id] || 0;
          const maxForms = m.max_forms ?? 5;
          const remainingForms = Math.max(0, maxForms - createdForms);

          return (
            <div className="flex flex-col gap-4 text-right">
              {/* خلاصه اطلاعات هویتی کاربر */}
              <div className="bg-bg-lavender/60 border border-navy/10 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base shadow-sm ${
                        m.is_owner ? "bg-orange text-white" : "bg-teal text-white"
                      }`}
                    >
                      {m.full_name?.[0]?.toUpperCase() ?? m.email?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-navy">{m.full_name || "کاربر بدون نام"}</h3>
                        {m.is_owner ? (
                          <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 flex items-center gap-1">
                            <Crown size={11} />
                            <span>صاحب اصلی</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-navy bg-navy/10 rounded-full px-2 py-0.5">
                            کاربر سیستم
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-ink-subtle mt-0.5" dir="ltr">{m.email}</p>
                      {m.phone && (
                        <p className="text-xs font-bold text-teal-text mt-0.5 flex items-center gap-1" dir="ltr">
                          <Phone size={11} /> {m.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge color={m.is_active ? "green" : "gray"}>
                    {m.is_active ? "فعال" : "غیرفعال"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-ink-subtle pt-2 border-t border-navy/5">
                  <span className="flex items-center gap-1"><Calendar size={12} className="text-ink/40" /> تاریخ عضویت: <strong className="text-navy">{new Date(m.created_at).toLocaleDateString("fa-IR")}</strong></span>
                  <span>کد شناسه: <code className="text-xs text-navy font-mono" dir="ltr">{m.id.slice(0, 8)}</code></span>
                </div>
              </div>

              {/* سهمیه و وضعیت فرم‌های کاربر */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-navy flex items-center gap-1.5">
                    <BarChart3 size={15} className="text-teal" /> سهمیه، محدودیت‌ها و ظرفیت‌های کاربر
                  </span>
                  {m.is_owner ? (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      مالک کل — بدون محدودیت
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-teal bg-teal/10 px-2.5 py-0.5 rounded-full">
                      قابل ویرایش دستی
                    </span>
                  )}
                </div>

                {/* آمار خلاصه وضعیت */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-bg-neutral p-2.5 rounded-xl text-center">
                    <span className="text-xs text-ink-subtle block font-semibold mb-0.5">فرم‌های فعال ایجاد شده</span>
                    <strong className="text-navy text-sm font-black">{faNum(createdForms)} فرم</strong>
                  </div>
                  <div className="bg-bg-neutral p-2.5 rounded-xl text-center">
                    <span className="text-xs text-ink-subtle block font-semibold mb-0.5">سقف مجاز فعلی</span>
                    <strong className="text-navy text-sm font-black">{m.is_owner ? "نامحدود" : `${faNum(m.max_forms ?? 5)} فرم`}</strong>
                  </div>
                  <div className="bg-bg-neutral p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
                    <span className="text-xs text-ink-subtle block font-semibold mb-0.5">باقیمانده فرم فعال</span>
                    <strong className={`text-sm font-black ${remainingForms === 0 && !m.is_owner ? "text-magenta-text" : "text-teal-text"}`}>
                      {m.is_owner ? "نامحدود" : `${faNum(remainingForms)} فرم`}
                    </strong>
                  </div>
                </div>

                {!m.is_owner && (
                  <form onSubmit={handleSaveUserQuotaDirect} className="pt-2 border-t border-navy/10 space-y-3">
                    <div className="text-xs font-black text-navy flex items-center justify-between">
                      <span className="flex items-center gap-1"><Edit3 size={12} className="text-teal" /> ویرایش دستی محدودیت‌های این کاربر:</span>
                      <span className="text-xs text-ink-subtle font-semibold">
                        ریست بعدی: {m.quota_reset_at ? new Date(m.quota_reset_at).toLocaleDateString("fa-IR") : "چرخه ۳۰ روزه"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-navy mb-1">
                          سقف فرم‌های همزمان فعال
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          dir="ltr"
                          value={userEditMaxForms}
                          onChange={(e) => setUserEditMaxForms(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border-2 border-ink/15 text-xs font-black font-mono text-center text-navy focus:border-teal outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-navy mb-1">
                          سقف ورودی ماهانه
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100000"
                          step="10"
                          dir="ltr"
                          value={userEditMaxResponses}
                          onChange={(e) => setUserEditMaxResponses(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border-2 border-ink/15 text-xs font-black font-mono text-center text-navy focus:border-teal outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-navy mb-1">
                          ورودی‌های مصرف‌شده
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100000"
                          dir="ltr"
                          value={userEditResponsesUsed}
                          onChange={(e) => setUserEditResponsesUsed(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border-2 border-ink/15 text-xs font-black font-mono text-center text-navy focus:border-teal outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-navy/5">
                      <button
                        type="button"
                        onClick={() => handleResetQuota(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-magenta-text bg-magenta/10 hover:bg-magenta/20 transition-colors border border-magenta/20 cursor-pointer"
                        title="شمارنده ورودی‌های مصرف‌شده را ۰ کرده و دوره ۳۰ روزه را تازه می‌کند"
                      >
                        <RotateCcw size={13} />
                        <span>ریست سهمیه ماهانه</span>
                      </button>

                      <Button
                        type="submit"
                        variant="teal"
                        size="sm"
                        disabled={userEditSaving}
                        className="text-xs font-black"
                      >
                        <Save size={13} className="ml-1" />
                        {userEditSaving ? "در حال ذخیره..." : "ذخیره تغییرات سهمیه"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* دسترسی به ربات تلگرام */}
              {!m.is_owner && (
                <div className="bg-white border-2 border-ink/10 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.can_use_telegram ? "bg-teal/15 text-teal" : "bg-ink/10 text-ink-subtle"}`}>
                      <Bot size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-navy block">اتصال به ربات تلگرام</span>
                      <span className="text-xs font-semibold text-ink-subtle">
                        وضعیت: {m.can_use_telegram ? <strong className="text-teal-text">فعال</strong> : <strong className="text-amber-700">قطع</strong>}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <Button
                      variant={m.can_use_telegram ? "ghost" : "teal"}
                      size="sm"
                      className={m.can_use_telegram ? "!text-amber-700 border-amber-300 hover:bg-amber-50 text-xs" : "text-xs"}
                      onClick={() => toggleTelegramAccess(m)}
                    >
                      {m.can_use_telegram ? "قطع دسترسی" : "وصل دسترسی"}
                    </Button>
                  )}
                </div>
              )}

              {/* دکمه‌های عملیات کاربر */}
              <div className="border-t border-ink/10 pt-3 flex flex-wrap items-center gap-2">
                {canManage && (
                  <>
                    <Button
                      variant="teal"
                      size="sm"
                      onClick={() => {
                        setSelectedUserModal(null);
                        openEdit(m);
                      }}
                    >
                      <Edit size={13} className="ml-1" /> ویرایش مشخصات
                    </Button>

                    {!m.is_owner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={m.is_active ? "!text-amber-700 hover:bg-amber-50" : "!text-teal-text hover:bg-teal/10"}
                        onClick={() => handleDeactivate(m.id)}
                      >
                        {m.is_active ? "غیرفعال‌سازی کاربر" : "فعال‌سازی کاربر"}
                      </Button>
                    )}

                    {!m.is_owner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!text-magenta-text hover:bg-magenta/10 mr-auto"
                        onClick={() => {
                          setSelectedUserModal(null);
                          setDeleteTarget(m);
                        }}
                      >
                        <Trash2 size={13} className="ml-1" /> حذف کاربر
                      </Button>
                    )}
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-auto"
                  onClick={() => setSelectedUserModal(null)}
                >
                  بستن
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ─── مودال ایجاد کاربر ─── */}
      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateError(null); }} title="ایجاد کاربر جدید">
        <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">ایمیل کاربر</label>
            <input type="email" dir="ltr" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className={inputCls} placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">رمز عبور</label>
            <input type="text" dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls} placeholder="حداقل ۶ کاراکتر شامل حروف و اعداد" />
          </div>
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">نام نمایشی</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              className={inputCls} placeholder="نام و نام خانوادگی" />
          </div>

          {/* دسترسی به ربات تلگرام */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-lavender/50 border-2 border-teal/20">
            <div>
              <span className="block text-sm font-extrabold text-navy">دسترسی به ربات تلگرام</span>
              <span className="text-xs font-semibold text-ink-subtle">
                امکان اتصال فرم‌های این کاربر به ربات تلگرام
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={newCanUseTelegram}
                onChange={(e) => setNewCanUseTelegram(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-ink/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal"></div>
            </label>
          </div>

          <div className="p-3 bg-bg-neutral/70 rounded-pill-sm text-xs text-ink-subtle leading-5 flex items-start gap-1.5">
            <Info size={16} className="text-teal shrink-0 mt-0.5" />
            <span><strong>پرمیشن‌های یکسان و ثابت:</strong> تمامی کاربران دارای دسترسی‌های پایه (ایجاد، ویرایش، حذف، مشاهده پاسخ‌ها و خروجی اکسل) هستند. مشاهده سایر کاربران برای تمامی کاربران عادی کاملاً مسدود می‌باشد.</span>
          </div>

          {createError && (
            <div className="text-sm font-bold text-magenta-text bg-magenta/10 border-2 border-magenta rounded-pill-md px-3 py-2">
              {createError}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="teal" size="sm" onClick={handleCreate} disabled={busy}>
              {busy ? "در حال ایجاد..." : "ایجاد کاربر"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      {/* ─── مودال ویرایش کاربر ─── */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}
        title={selectedManager?.is_owner ? "ویرایش صاحب اصلی" : "ویرایش کاربر و تنظیم رمز"}>
        <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">
          {selectedManager?.is_owner && (
            <div className="flex items-center gap-2 bg-college-light border-2 border-orange/30 rounded-pill-md px-3 py-2 text-sm font-bold text-orange">
              <Crown size={16} /> صاحب اصلی سایت — فقط نام قابل تغییر است
            </div>
          )}

          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">نام نمایشی</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
          </div>

          {/* دسترسی به بات تلگرام */}
          {!selectedManager?.is_owner && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-bg-lavender/50 border-2 border-teal/20">
              <div>
                <span className="block text-sm font-extrabold text-navy">دسترسی به بات تلگرام</span>
                <span className="text-xs font-semibold text-ink-subtle">
                  تنها دسترسی متغیر کاربر — امکان اتصال فرم‌ها به بات تلگرام
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editCanUseTelegram}
                  onChange={(e) => setEditCanUseTelegram(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-ink/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal"></div>
              </label>
            </div>
          )}

          {/* تنظیم رمز عبور */}
          <div className="p-3.5 rounded-xl bg-bg-neutral/70 border border-ink/10 flex flex-col gap-2.5">
            <span className="block text-xs font-extrabold text-navy">تغییر رمز عبور کاربر</span>
            <div>
              <label className="block text-xs font-bold text-ink-subtle mb-1">تعیین رمز عبور جدید (اختیاری):</label>
              <input
                type="text"
                dir="ltr"
                value={editNewPassword}
                onChange={(e) => setEditNewPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر جهت تغییر رمز"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="teal" size="sm" onClick={async () => {
              if (!selectedManager) return;
              try {
                if (selectedManager.is_owner) {
                  await updateManager(selectedManager.id, { fullName: editName });
                } else {
                  await updateManager(selectedManager.id, {
                    fullName: editName,
                    isActive: selectedManager.is_active,
                  });
                  await updateUserQuota(selectedManager.id, {
                    maxForms: selectedManager.max_forms ?? 5,
                    maxResponses: selectedManager.max_responses_per_month ?? 100,
                    plan: selectedManager.plan ?? "free",
                    canUseTelegram: Boolean(editCanUseTelegram),
                  });
                  if (editNewPassword.trim() && editNewPassword.trim().length >= 6) {
                    const res = await fetch("/api/admin-user-management", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
                      },
                      body: JSON.stringify({
                        action: "reset_password",
                        target_user_id: selectedManager.id,
                        new_password: editNewPassword.trim(),
                      }),
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      throw new Error(j.error || "خطا در تغییر رمز");
                    }
                  }
                }
                logActivity("edit_manager", "user", selectedManager.id, { name: editName });
                push("تغییرات با موفقیت ذخیره شد!");
                setShowEditModal(false);
                load();
              } catch (err) {
                push("خطا: " + (err.message || "ناموفق"), "error");
              }
            }}>ذخیره</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      {/* ─── تایید حذف ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="حذف مدیر؟">
        <p className="text-sm font-semibold text-ink-soft leading-7 mb-5">
          مدیر «<span className="font-black text-magenta-text">{deleteTarget?.full_name || deleteTarget?.email}</span>»
          به‌طور کامل حذف خواهد شد.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="red" size="sm" onClick={handleDelete}>بله، حذف شود</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>انصراف</Button>
        </div>
      </Modal>

      {/* ─── مودال تنظیم سهمیه کاربر ─── */}
      <Modal open={!!quotaModal} onClose={() => setQuotaModal(null)} title={`تنظیم سهمیه و دسترسی: ${quotaModal?.full_name || quotaModal?.email || ""}`}>
        <form onSubmit={handleSaveQuota} className="flex flex-col gap-4">

          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">حداکثر تعداد فرم‌های فعال</label>
            <input
              type="number"
              min="1"
              value={quotaMaxForms}
              onChange={(e) => setQuotaMaxForms(e.target.value)}
              className={inputCls}
            />
            <span className="text-xs text-ink-subtle mt-1 block">پیش‌فرض: ۵ فرم. برای نامحدود عدد بالایی مثل ۹۹۹۹ قرار دهید.</span>
          </div>

          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">حداکثر پاسخ در ماه</label>
            <input
              type="number"
              min="1"
              value={quotaMaxResponses}
              onChange={(e) => setQuotaMaxResponses(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-bg-lavender/50 border-2 border-teal/20">
            <div>
              <span className="block text-sm font-extrabold text-navy">دسترسی به بات تلگرام</span>
              <span className="text-xs font-semibold text-ink-subtle">
                امکان اتصال فرم‌ها به بات تلگرام و دریافت ورودی‌ها
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={quotaCanUseTelegram}
                onChange={(e) => setQuotaCanUseTelegram(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-ink/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal"></div>
            </label>
          </div>

          {/* وضعیت مصرف سهمیه در مودال */}
          <div className="p-3 bg-bg-neutral/70 rounded-xl border border-ink/10 flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-ink-subtle">ورودی‌های مصرف‌شده ماه جاری:</span>
              <span className="font-black text-navy">{quotaModal?.monthly_responses_used ?? 0} از {quotaModal?.max_responses_per_month ?? 100}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-subtle">تاریخ پایان دوره و ریست بعدی:</span>
              <span className="font-mono text-navy" dir="ltr">{quotaModal?.quota_reset_at ? new Date(quotaModal.quota_reset_at).toLocaleDateString("fa-IR") : "—"}</span>
            </div>
            {canManage && (
              <div className="pt-1.5 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="!text-teal-text border border-teal/30 hover:bg-teal/10 text-xs py-1 gap-1"
                  onClick={async () => {
                    await handleResetQuota(quotaModal);
                    setQuotaModal(null);
                  }}
                >
                  <RotateCcw size={12} />
                  <span>ریست سهمیه همین الان</span>
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="teal" size="sm" type="submit" disabled={quotaSaving}>
              {quotaSaving ? "در حال ذخیره..." : "ذخیره سهمیه"}
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setQuotaModal(null)}>انصراف</Button>
          </div>
        </form>
      </Modal>

      {/* مودال تنظیمات سامانه و محدودیت‌ها */}
      <Modal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="تنظیمات سامانه و محدودیت‌ها"
        size="md"
      >
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
          <p className="text-xs text-ink-subtle font-medium leading-relaxed">
            تنظیمات عمومی سامانه، آیدی تلگرام پشتیبانی و محدودیت‌های سهمیه پیش‌فرض برای کاربران در این بخش قابل مدیریت است.
          </p>

          <div>
            <label className="block text-xs font-bold text-navy mb-1.5">
              نام / عنوان سامانه
            </label>
            <input
              type="text"
              value={sysSettings.site_title || ""}
              onChange={(e) => setSysSettings({ ...sysSettings, site_title: e.target.value })}
              placeholder="پرس‌کاد"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1.5">
              آیدی پشتیبانی در تلگرام (بدون @ یا با @)
            </label>
            <input
              type="text"
              dir="ltr"
              value={sysSettings.telegram_support_id || ""}
              onChange={(e) => setSysSettings({ ...sysSettings, telegram_support_id: e.target.value })}
              placeholder="porskad_support"
              className={inputCls}
            />
            <span className="text-[0.7rem] text-ink-subtle mt-1 block">
              این آیدی در بخش پشتیبانی برای ارتباط سریع با تلگرام قرار می‌گیرد.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                سقف فرم‌های فعال همزمان (پیش‌فرض)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={sysSettings.default_max_active_forms ?? 5}
                onChange={(e) => setSysSettings({ ...sysSettings, default_max_active_forms: parseInt(e.target.value) || 5 })}
                className={inputCls}
              />
              <span className="text-[0.7rem] text-ink-subtle mt-1 block">
                محدودیت پیش‌فرض: ۵ فرم فعال همزمان
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                سقف ورودی ماهانه پیش‌فرض هر کاربر
              </label>
              <input
                type="number"
                min={10}
                max={10000}
                value={sysSettings.default_max_monthly_responses ?? 100}
                onChange={(e) => setSysSettings({ ...sysSettings, default_max_monthly_responses: parseInt(e.target.value) || 100 })}
                className={inputCls}
              />
              <span className="text-[0.7rem] text-ink-subtle mt-1 block">
                محدودیت پیش‌فرض: ۱۰۰ ورودی در ماه (با چرخه ۳۰ روزه)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-bg-lavender/50 rounded-xl border border-navy/10">
            <div>
              <div className="text-xs font-bold text-navy">امکان ثبت‌نام مستقیم کاربران</div>
              <div className="text-[0.7rem] text-ink-subtle">
                در صورت غیرفعال بودن، کاربران جدید فقط توسط ادمین قابل ثبت خواهند بود.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sysSettings.registration_enabled !== false}
                onChange={(e) => setSysSettings({ ...sysSettings, registration_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-ink/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal"></div>
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-ink/10">
            <Button variant="teal" size="sm" type="submit" disabled={settingsSaving}>
              {settingsSaving ? "در حال ذخیره..." : "ذخیره تنظیمات سامانه"}
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowSettingsModal(false)}>
              انصراف
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
