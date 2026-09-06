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
import { Plus, Edit, Trash2, Crown, Users, ChevronDown, ChevronUp, Shield, FileText, BarChart3, Settings, Eye, EyeOff, Sliders, Bot, Copy } from "lucide-react";
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

  // ─── مشاهده و مدیریت رمز عبور و ربات تلگرام ───
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [newCanUseTelegram, setNewCanUseTelegram] = useState(false);
  const [editCanUseTelegram, setEditCanUseTelegram] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editPasswordVisible, setEditPasswordVisible] = useState(false);

  function toggleRevealPassword(id) {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function copyPassword(pwd) {
    if (!pwd) return;
    navigator.clipboard?.writeText?.(pwd);
    push("رمز عبور در کلیپ‌بورد کپی شد ✅", "success");
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
      const data = await listManagers({ includeHidden: isOwner() });
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
          {managers.map((m, i) => (
            <div key={m.id} className={i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"}>
              <StickerCard theme={m.is_owner ? "orange" : "white"}>
                <div className="p-3.5 flex flex-col gap-2.5">
                  {/* هدر کارت */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm rotate-[3deg] ${
                        m.is_owner ? "bg-orange/20 text-orange" :
                        m.is_active ? "bg-bg-mint text-teal-text" :
                        "bg-bg-neutral text-ink-subtle"
                      }`}>
                        {m.full_name?.[0]?.toUpperCase() ?? m.email?.[0]?.toUpperCase() ?? "U"}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-navy leading-5 line-clamp-1 text-sm">
                            {m.full_name || "—"}
                          </span>
                          {m.is_owner ? (
                            <span className="inline-flex items-center gap-0.5 text-[0.6rem] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">
                              <Crown size={10} /> صاحب
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[0.6rem] font-bold text-navy bg-bg-lavender rounded-full px-1.5 py-0.5">
                              کاربر
                            </span>
                          )}
                        </div>
                        <span className="text-[0.65rem] font-medium text-ink-subtle" dir="ltr">{m.email}</span>
                        {m.phone && <span className="text-[0.65rem] font-bold text-teal-text" dir="ltr">{m.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {m.is_active ? <Badge color="green">فعال</Badge> : <Badge color="gray">غیرفعال</Badge>}
                    </div>
                  </div>

                  {/* دسترسی به ربات تلگرام — تنها دسترسی قابل قطع و وصل */}
                  {!m.is_owner && (
                    <div className="flex items-center justify-between bg-bg-lavender/40 border border-ink/10 rounded-pill-sm px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Bot size={14} className={m.can_use_telegram ? "text-teal" : "text-ink/40"} />
                        <span className="text-xs font-bold text-navy">ربات تلگرام:</span>
                        <span className={`text-[0.65rem] font-black ${m.can_use_telegram ? "text-teal-text" : "text-ink-subtle"}`}>
                          {m.can_use_telegram ? "✓ فعال" : "✕ قطع"}
                        </span>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => toggleTelegramAccess(m)}
                          className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border transition-all ${
                            m.can_use_telegram
                              ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                              : "bg-teal text-white border-teal hover:bg-teal-text"
                          }`}
                        >
                          {m.can_use_telegram ? "قطع دسترسی" : "وصل دسترسی"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* رمز عبور کاربر با قابلیت رویت و کپی */}
                  <div className="flex items-center justify-between bg-bg-neutral/70 border border-ink/10 rounded-pill-sm px-2.5 py-1 text-xs">
                    <span className="font-bold text-ink-subtle text-[0.7rem]">رمز عبور:</span>
                    {m.admin_pwd ? (
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <span className="font-mono text-[0.75rem] font-black text-navy">
                          {revealedPasswords[m.id] ? m.admin_pwd : "••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRevealPassword(m.id)}
                          className="text-ink-subtle hover:text-navy p-0.5"
                          title={revealedPasswords[m.id] ? "مخفی کردن" : "نمایش رمز"}
                        >
                          {revealedPasswords[m.id] ? <EyeOff size={13} className="text-teal" /> : <Eye size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyPassword(m.admin_pwd)}
                          className="text-teal hover:text-teal-text p-0.5"
                          title="کپی رمز"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[0.65rem] text-ink-subtle">هش‌شده (قدیمی)</span>
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="text-[0.65rem] text-teal font-bold hover:underline"
                        >
                          تعیین
                        </button>
                      </div>
                    )}
                  </div>

                  {/* سهمیه و پلن کاربر */}
                  <div className="flex flex-wrap items-center justify-between text-[0.7rem] font-bold text-ink-subtle bg-bg-neutral/70 rounded-pill-sm px-2.5 py-1 gap-1">
                    <span>سقف فرم: <strong className="text-navy">{m.is_owner ? "نامحدود" : faNum(m.max_forms ?? 5)}</strong></span>
                    <span>پلن: <strong className="text-teal-text">{m.is_owner ? "سازمانی" : (m.plan === "enterprise" ? "سازمانی" : m.plan === "pro" ? "حرفه‌ای" : "رایگان")}</strong></span>
                  </div>

                  {/* تاریخ */}
                  <div className="text-[0.65rem] font-semibold text-ink-subtle flex items-center justify-between">
                    <span>📅 {new Date(m.created_at).toLocaleDateString("fa-IR")}</span>
                    <span className="text-[0.6rem] text-teal-text font-bold bg-bg-mint/40 rounded px-1.5 py-0.5">
                      مجوزهای فرم، پاسخ و تحلیل: ثابت
                    </span>
                  </div>

                  {/* دکمه‌های عملیات */}
                  {canManage && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}
                        title={m.is_owner ? "فقط نام صاحب اصلی قابل تغییر است" : "ویرایش مشخصات و رمز"}>
                        ویرایش
                      </Button>
                      {isOwner() && !m.is_owner && (
                        <Button variant="ghost" size="sm" className="!text-teal-text" onClick={() => openQuotaModal(m)} title="تنظیم سهمیه و پلن">
                          سهمیه ⚙️
                        </Button>
                      )}
                      {!m.is_owner && (
                        <>
                          <Button variant="ghost" size="sm" className="!text-amber-600"
                            onClick={() => handleDeactivate(m.id)}>
                            {m.is_active ? "غیرفعال" : "فعال"}
                          </Button>
                          <Button variant="ghost" size="sm" className="!text-magenta-text"
                            onClick={() => setDeleteTarget(m)}>
                            حذف
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </StickerCard>
            </div>
          ))}
        </div>
      )}

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
      <Modal open={!!quotaModal} onClose={() => setQuotaModal(null)} title={`تنظیم سهمیه و پلن: ${quotaModal?.full_name || quotaModal?.email || ""}`}>
        <form onSubmit={handleSaveQuota} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">پلن کاربری</label>
            <select
              value={quotaPlan}
              onChange={(e) => setQuotaPlan(e.target.value)}
              className={inputCls}
            >
              <option value="free">رایگان (Free)</option>
              <option value="pro">حرفه‌ای (Pro)</option>
              <option value="enterprise">سازمانی (Enterprise)</option>
            </select>
          </div>

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
