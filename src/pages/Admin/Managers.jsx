import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { ALL_PERMISSIONS } from "../../context/AuthContext";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StickerCard from "../../components/ui/StickerCard";
import Modal from "../../components/ui/Modal";
import { Plus, Edit, Trash2, Crown, Users, ChevronDown, ChevronUp, Shield, FileText, BarChart3, Settings, Eye, EyeOff } from "lucide-react";
import SEO from "../../components/ui/SEO";
import { supabase } from "../../lib/supabaseClient";
import { logActivity } from "../../lib/activityLogger";

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
  const { listManagers, createManager, updateManager, deactivateManager, activateManager, deleteManager, isOwner, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [busy, setBusy] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newPermissions, setNewPermissions] = useState(
    ALL_PERM_IDS.filter((p) => p !== "manage_managers" && p !== "manage_sms")
  );
  const [editName, setEditName] = useState("");
  const [editPermissions, setEditPermissions] = useState([]);
  const [createError, setCreateError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editHiddenFrom, setEditHiddenFrom] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const data = await listManagers({ includeHidden: isOwner() });
      // فیلتر کردن سوپرادمین از لیست (اکانت مخفی)
      // مخفی کردن اکانت سوپرادمین از لیست مدیران
      const filtered = data.filter((m) => !(m.is_owner && (m.email === "superadmin@gmail.com" || m.email === "superadmin@gmailc.com")));
      setManagers(filtered);
    } catch (err) {
      push("خطا در بارگذاری: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function togglePermission(list, setList, permId) {
    setList((prev) =>
      prev.includes(permId) ? prev.filter((x) => x !== permId) : [...prev, permId]
    );
  }

  async function handleCreate() {
    if (!newEmail || !newPassword) {
      setCreateError("ایمیل و رمز عبور الزامی است.");
      return;
    }
    setBusy(true);
    setCreateError(null);
    try {
      const mgrId = await createManager({
        email: newEmail.trim(),
        password: newPassword,
        fullName: newName.trim() || newEmail.split("@")[0],
        permissionIds: newPermissions,
      });
      logActivity("create_manager", "user", mgrId, { email: newEmail.trim(), name: newName.trim() });
      push("مدیر جدید ایجاد شد! ✅");
      setShowCreateModal(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewPermissions(ALL_PERM_IDS.filter((p) => p !== "manage_managers" && p !== "manage_sms"));
      load();
    } catch (err) {
      setCreateError(err.message || "ایجاد مدیر ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(manager) {
    setSelectedManager(manager);
    setEditName(manager.full_name || manager.email.split("@")[0]);
    setEditPermissions(
      manager.permissions?.length ? [...manager.permissions] : [...ALL_PERM_IDS].filter((p) => p !== "manage_managers")
    );
    setEditHiddenFrom(manager.hidden_from || []);
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

  return (
    <div className="flex flex-col gap-6">
      <SEO title="مدیریت مدیران" description="مدیریت مدیران و مجوزها — پرسکاد" url="/admin/managers" noIndex />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-navy">مدیریت مدیران</h1>
          <p className="text-sm font-semibold text-ink-subtle mt-0.5">
            {managers.filter((m) => m.is_active).length} فعال — {ALL_PERM_IDS.length} مجوز
          </p>
        </div>
        <Button variant="teal" size="sm" onClick={() => setShowCreateModal(true)} rotate="-rotate-[1deg]">
          <Plus size={14} className="ml-1" /> مدیر جدید
        </Button>
      </div>

      {/* لیست مدیران */}
      {managers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="هنوز مدیری وجود ندارد"
          subtitle="اولین مدیر خود را ایجاد کنید."
          action={<Button variant="teal" onClick={() => setShowCreateModal(true)}>مدیر جدید</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-5">
          {managers.map((m, i) => (
            <div key={m.id} className={i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"}>
              <StickerCard theme={m.is_owner ? "orange" : "white"}>
                <div className="p-3.5 flex flex-col gap-2.5">
                  {/* هدر */}
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
                          {m.is_owner && (
                            <span className="inline-flex items-center gap-0.5 text-[0.6rem] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">
                              <Crown size={10} /> صاحب
                            </span>
                          )}
                        </div>                          <span className="text-[0.65rem] font-medium text-ink-subtle" dir="ltr">{m.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isOwner() && m.hidden_from?.includes(user?.id) && <Badge color="purple">مخفی</Badge>}
                      {m.is_active ? <Badge color="green">فعال</Badge> : <Badge color="gray">غیرفعال</Badge>}
                    </div>
                  </div>

                  {/* خلاصه مجوزها */}
                  {!m.is_owner && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[0.65rem] font-bold text-ink-subtle flex items-center gap-1">
                          <Shield size={10} /> مجوزها
                        </span>
                        <span className="text-[0.65rem] font-bold text-teal-text">
                          {ALL_PERM_IDS.filter((p) => m.permissions?.includes(p)).length} از {ALL_PERM_IDS.length}
                        </span>
                      </div>
                      <PermissionSummary permissions={m.permissions || []} />
                    </div>
                  )}

                  {/* تاریخ */}
                  <div className="text-xs font-semibold text-ink-subtle">
                    📅 {new Date(m.created_at).toLocaleDateString("fa-IR")}
                  </div>

                  {/* دکمه‌ها */}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)}
                      title={m.is_owner ? "فقط نام صاحب اصلی قابل تغییر است" : "ویرایش"}>
                      ویرایش ✏️
                    </Button>
                    {!m.is_owner && (
                      <>
                        <Button variant="ghost" size="sm" className="!text-amber-600"
                          onClick={() => handleDeactivate(m.id)}>
                          {m.is_active ? "غیرفعال 🛑" : "فعال 🟢"}
                        </Button>
                        <Button variant="ghost" size="sm" className="!text-magenta-text"
                          onClick={() => setDeleteTarget(m)}>
                          حذف 🗑️
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </StickerCard>
            </div>
          ))}
        </div>
      )}

      {/* ─── مودال ایجاد مدیر ─── */}
      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateError(null); }} title="ایجاد مدیر جدید">
        <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">ایمیل</label>
            <input type="email" dir="ltr" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className={inputCls} placeholder="manager@porskad.ir" />
          </div>
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">رمز عبور</label>
            <input type="password" dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">نام نمایشی</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              className={inputCls} placeholder="نام و نام خانوادگی" />
          </div>

          {/* مجوزها — دسته‌بندی شده */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-extrabold text-navy">مجوزها</label>
              <span className="text-xs font-bold text-teal-text">
                {newPermissions.length} از {ALL_PERM_IDS.length} فعال
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {PERMISSION_CATEGORIES.map((cat) => (
                <PermissionCategory
                  key={cat.id}
                  category={cat}
                  selected={newPermissions}
                  onToggle={(id) => togglePermission(newPermissions, setNewPermissions, id)}
                />
              ))}
            </div>
          </div>

          {createError && (
            <div className="text-sm font-bold text-magenta-text bg-magenta/10 border-2 border-magenta rounded-pill-md px-3 py-2">
              {createError}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="teal" size="sm" onClick={handleCreate} disabled={busy}>
              {busy ? "در حال ایجاد..." : "ایجاد مدیر"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      {/* ─── مودال ویرایش مدیر ─── */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}
        title={selectedManager?.is_owner ? "ویرایش صاحب اصلی" : "ویرایش مدیر"}>
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

          {!selectedManager?.is_owner && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-extrabold text-navy">مجوزها</label>
                <span className="text-xs font-bold text-teal-text">
                  {editPermissions.length} از {ALL_PERM_IDS.length} فعال
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {PERMISSION_CATEGORIES.map((cat) => (
                  <PermissionCategory
                    key={cat.id}
                    category={cat}
                    selected={editPermissions}
                    onToggle={(id) => togglePermission(editPermissions, setEditPermissions, id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── کنترل نمایش مدیران (فقط owner) ─── */}
          {isOwner() && !selectedManager?.is_owner && (
            <div className="border-2 border-purple/30 bg-purple/5 rounded-pill-md p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-extrabold text-navy flex items-center gap-1.5">
                  <Eye size={14} className="text-purple-600" /> نمایش مدیران
                </label>
              </div>
              <p className="text-[0.65rem] text-ink-subtle mb-2">
                مشخص کنید این مدیر کدام ادمین‌ها رو در لیست مدیران خود ببیند.
                اگر ادمینی انتخاب شود، این مدیر آن ادمین را نخواهد دید.
              </p>

              {/* دکمه‌های نمایش همه / عدم نمایش همه */}
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    const otherAdmins = managers.filter((m) => !m.is_owner && m.id !== selectedManager?.id).map((m) => m.id);
                    setEditHiddenFrom(otherAdmins);
                  }}
                  className="flex items-center gap-1 text-[0.65rem] font-bold text-female-text bg-female-light border border-female/30 rounded-pill-sm px-2.5 py-1 hover:bg-female/10 transition-colors"
                >
                  <EyeOff size={11} /> عدم نمایش همه ادمین‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setEditHiddenFrom([])}
                  className="flex items-center gap-1 text-[0.65rem] font-bold text-teal bg-ecosystem-light border border-teal/30 rounded-pill-sm px-2.5 py-1 hover:bg-teal/10 transition-colors"
                >
                  <Eye size={11} /> نمایش همه ادمین‌ها
                </button>
              </div>

              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {managers
                  .filter((m) => !m.is_owner && m.id !== selectedManager?.id)
                  .map((m) => {
                    const isHidden = editHiddenFrom.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-pill-sm cursor-pointer transition-all border ${
                          isHidden ? "border-female-normal bg-female-light" : "border-ink/10 bg-white hover:border-teal/30"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditHiddenFrom((prev) =>
                              prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            );
                          }}
                          className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                            isHidden ? "bg-female-normal" : "bg-ink/20"
                          }`}
                        >
                          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                            isHidden ? "right-0.5" : "right-[16px]"
                          }`} />
                        </button>
                        <span className="text-xs font-bold text-navy">{m.full_name || m.email}</span>
                        {isHidden && <span className="mr-auto text-[0.6rem] font-bold text-female-text">مخفی</span>}
                      </label>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="teal" size="sm" onClick={async () => {
              if (!selectedManager) return;
              try {
                if (selectedManager.is_owner) {
                  await updateManager(selectedManager.id, { fullName: editName });
                } else {
                  // ذخیره مجوزها
                  await updateManager(selectedManager.id, {
                    fullName: editName,
                    isActive: selectedManager.is_active,
                    permissions: editPermissions,
                  });
                  // ذخیره hidden_from (فقط owner)
                  if (isOwner()) {
                    const hiddenFromValue = editHiddenFrom.length > 0 ? editHiddenFrom : null;
                    const { error: hfErr } = await supabase
                      .from("profiles")
                      .update({ hidden_from: hiddenFromValue })
                      .eq("id", selectedManager.id);
                    if (hfErr) throw hfErr;
                  }
                }
                logActivity("edit_manager", "user", selectedManager.id, { name: editName, permissions: editPermissions });
                push("تغییرات ذخیره شد! ✅");
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
        <div className="flex gap-3 justify-end">
          <Button variant="red" size="sm" onClick={handleDelete}>بله، حذف شود</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>انصراف</Button>
        </div>
      </Modal>

    </div>
  );
}
