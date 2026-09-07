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
import { Plus, Edit, Trash2, Crown, Users, ChevronDown, ChevronUp, Shield, FileText, BarChart3, Settings, Eye, EyeOff, Sliders, Bot, Copy, Calendar, CheckCircle, XCircle, Phone, Mail } from "lucide-react";
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
  const { listManagers, createManager, updateManager, deactivateManager, activateManager, deleteManager, isOwner, user, session, hasPermission, updateUserQuota } = useAuth();
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
      push(`دسترسی به ربات تلگرام برای «${m.full_name || m.email}» ${newVal ? "فعال شد ✓" : "قطع شد ✕"}`, "success");
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
      push("کاربر جدید با موفقیت ایجاد شد! ✅");
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
        push("مدیر فعال شد ✅");
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
        <h2 className="text-xl font-black text-navy">دسترسی غیرمجاز</h2>
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
        {canManage && (
          <Button variant="teal" size="sm" onClick={() => setShowCreateModal(true)} rotate="-rotate-[1deg]">
            <Plus size={14} className="ml-1" /> کاربر جدید
          </Button>
        )}
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
                              <span className="inline-flex items-center gap-0.5 text-[0.6rem] font-black text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5 shrink-0">
                                <Crown size={10} /> صاحب
                              </span>
                            )}
                          </div>
                          <span className="text-[0.65rem] font-medium text-ink-subtle truncate block" dir="ltr">
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
                        <span className="flex items-center gap-1 text-[0.7rem]">
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
                          {m.is_owner ? "نامحدود 👑" : `${faNum(remainingForms)} از ${faNum(maxForms)} فرم`}
                        </span>
                      </div>
                    </div>

                    {/* دکمه پاپ‌آپ مدیریت */}
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
                          مشاهده و عملیات کاربر...
                        </span>
                        <span className="text-[0.65rem] opacity-70 group-hover:opacity-100 font-medium">پاپ‌آپ ⚙️</span>
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
                          <span className="text-[0.65rem] font-black text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
                            👑 صاحب اصلی
                          </span>
                        ) : (
                          <span className="text-[0.65rem] font-bold text-navy bg-navy/10 rounded-full px-2 py-0.5">
                            کاربر سیستم
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-ink-subtle mt-0.5" dir="ltr">{m.email}</p>
                      {m.phone && (
                        <p className="text-xs font-bold text-teal-text mt-0.5" dir="ltr">📱 {m.phone}</p>
                      )}
                    </div>
                  </div>
                  <Badge color={m.is_active ? "green" : "gray"}>
                    {m.is_active ? "فعال" : "غیرفعال"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-ink-subtle pt-2 border-t border-navy/5">
                  <span>📅 تاریخ عضویت: <strong className="text-navy">{new Date(m.created_at).toLocaleDateString("fa-IR")}</strong></span>
                  <span>کد شناسه: <code className="text-[0.65rem] text-navy font-mono" dir="ltr">{m.id.slice(0, 8)}</code></span>
                </div>
              </div>

              {/* سهمیه و وضعیت فرم‌های کاربر */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-navy flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-teal" /> سهمیه و فرم‌های فعال
                  </span>
                  {isOwner() && !m.is_owner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!text-teal-text text-xs"
                      onClick={() => {
                        setSelectedUserModal(null);
                        openQuotaModal(m);
                      }}
                    >
                      ویرایش سهمیه ⚙️
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-bg-neutral p-2.5 rounded-xl text-center">
                    <span className="text-[0.68rem] text-ink-subtle block font-semibold">فرم‌های فعال</span>
                    <strong className="text-navy text-sm font-black">{faNum(createdForms)} فرم</strong>
                  </div>
                  <div className="bg-bg-neutral p-2.5 rounded-xl text-center">
                    <span className="text-[0.68rem] text-ink-subtle block font-semibold">سقف مجاز</span>
                    <strong className="text-navy text-sm font-black">{m.is_owner ? "نامحدود" : `${faNum(maxForms)} فرم`}</strong>
                  </div>
                  <div className="bg-bg-neutral p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
                    <span className="text-[0.68rem] text-ink-subtle block font-semibold">باقیمانده سهمیه</span>
                    <strong className={`text-sm font-black ${remainingForms === 0 && !m.is_owner ? "text-magenta-text" : "text-teal-text"}`}>
                      {m.is_owner ? "نامحدود" : `${faNum(remainingForms)} فرم`}
                    </strong>
                  </div>
                </div>

                <div className="text-[0.7rem] text-ink-subtle font-semibold flex items-center justify-between pt-1 border-t border-ink/5">
                  <span>سقف پاسخ‌های ماهانه:</span>
                  <strong className="text-navy">{m.is_owner ? "نامحدود" : `${faNum(m.max_responses_per_month ?? 100)} پاسخ`}</strong>
                </div>
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
                      <span className="text-[0.68rem] font-semibold text-ink-subtle">
                        وضعیت: {m.can_use_telegram ? <strong className="text-teal-text">فعال ✓</strong> : <strong className="text-amber-700">قطع ✕</strong>}
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
              <span className="text-[0.65rem] font-semibold text-ink-subtle">
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

          <div className="p-3 bg-bg-neutral/70 rounded-pill-sm text-xs text-ink-subtle leading-5">
            ℹ️ <strong>پرمیشن‌های یکسان و ثابت:</strong> تمامی کاربران دارای دسترسی‌های پایه (ایجاد، ویرایش، حذف، مشاهده پاسخ‌ها و خروجی اکسل) هستند. مشاهده سایر کاربران برای تمامی کاربران عادی کاملاً مسدود می‌باشد.
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
                <span className="text-[0.65rem] font-semibold text-ink-subtle">
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

          {/* مشاهده و تنظیم رمز عبور */}
          <div className="p-3.5 rounded-xl bg-bg-neutral/70 border border-ink/10 flex flex-col gap-2.5">
            <span className="block text-xs font-extrabold text-navy">رمز عبور کاربر</span>
            {selectedManager?.admin_pwd ? (
              <div className="flex items-center justify-between bg-white border border-ink/15 rounded-pill-sm px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink-subtle">رمز فعلی:</span>
                  <span className="font-mono text-xs font-black text-navy" dir="ltr">
                    {editPasswordVisible ? selectedManager.admin_pwd : "••••••••"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditPasswordVisible(!editPasswordVisible)}
                    className="text-ink-subtle hover:text-navy p-1"
                    title={editPasswordVisible ? "مخفی کردن" : "نمایش رمز"}
                  >
                    {editPasswordVisible ? <EyeOff size={14} className="text-teal" /> : <Eye size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyPassword(selectedManager.admin_pwd)}
                    className="text-teal hover:text-teal-text p-1"
                    title="کپی رمز"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-xs text-ink-subtle">رمز عبور قدیمی (هش‌شده) است. با فیلد زیر می‌توانید رمزی جدید برای او ثبت کنید:</span>
            )}

            <div>
              <label className="block text-[0.7rem] font-bold text-ink-subtle mb-1">تعیین رمز عبور جدید (اختیاری):</label>
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
                push("تغییرات با موفقیت ذخیره شد! ✅");
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
            <span className="text-[0.65rem] text-ink-subtle mt-1 block">پیش‌فرض: ۵ فرم. برای نامحدود عدد بالایی مثل ۹۹۹۹ قرار دهید.</span>
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
              <span className="text-[0.65rem] font-semibold text-ink-subtle">
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

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="teal" size="sm" type="submit" disabled={quotaSaving}>
              {quotaSaving ? "در حال ذخیره..." : "ذخیره سهمیه"}
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setQuotaModal(null)}>انصراف</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
