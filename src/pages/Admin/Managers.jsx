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
import { Plus, Edit, Trash2, Check, X, Shield, Crown, Users } from "lucide-react";
import SEO from "../../components/ui/SEO";
import { faNum } from "../../lib/utils";

const PERMISSION_LABELS = {
  create_form: "ایجاد فرم",
  edit_form: "ویرایش فرم",
  delete_form: "حذف فرم",
  publish_form: "انتشار فرم",
  view_responses: "مشاهده پاسخ‌ها",
  view_analytics: "مشاهده تحلیل‌ها",
  export_excel: "خروجی اکسل",
  manage_managers: "مدیریت مدیران",
};

const inputCls =
  "w-full bg-white border-2 border-ink/20 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink focus:outline-none transition-all";

export default function Managers() {
  const { push } = useToast();
  const { listManagers, createManager, updateManager, deactivateManager, activateManager, deleteManager } = useAuth();
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
    ALL_PERMISSIONS.filter((p) => p !== "manage_managers")
  );
  const [editName, setEditName] = useState("");
  const [editPermissions, setEditPermissions] = useState([]);
  const [createError, setCreateError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listManagers();
      setManagers(data);
    } catch (err) {
      push("خطا در بارگذاری لیست مدیران: " + err.message, "error");
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
      await createManager({
        email: newEmail.trim(),
        password: newPassword,
        fullName: newName.trim() || newEmail.split("@")[0],
        permissionIds: newPermissions,
      });
      push("مدیر جدید با موفقیت ایجاد شد!");
      setShowCreateModal(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewPermissions(ALL_PERMISSIONS.filter((p) => p !== "manage_managers"));
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
      manager.permissions?.length
        ? [...manager.permissions]
        : [...ALL_PERMISSIONS].filter((p) => p !== "manage_managers")
    );
    setShowEditModal(true);
  }

  async function handleDeactivate(managerId) {
    const manager = managers.find((m) => m.id === managerId);
    const activating = manager ? !manager.is_active : false;
    if (!confirm(activating ? "آیا از فعال‌سازی این مدیر مطمئنید؟" : "آیا از غیرفعال‌سازی این مدیر مطمئنید؟")) return;
    try {
      if (activating) {
        await activateManager(managerId);
        push("مدیر فعال شد");
      } else {
        await deactivateManager(managerId);
        push("مدیر غیرفعال شد");
      }
      load();
    } catch (err) {
      push("خطا: " + err.message, "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (!confirm(`آیا از حذف کامل مدیر "${deleteTarget.full_name || deleteTarget.email}" مطمئنید؟`)) {
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteManager(deleteTarget.id);
      push("مدیر حذف شد");
      setDeleteTarget(null);
      load();
    } catch (err) {
      push("خطا: " + err.message, "error");
    }
  }

  if (loading) return <Spinner label="لیست مدیران در حال بارگذاری..." />;

  return (
    <div className="flex flex-col gap-6">
      <SEO
        title="مدیریت مدیران"
        description="مدیریت مدیران و مجوزهای پنل ادمین — پرسکاد"
        url="/admin/managers"
        noIndex
      />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy">مدیریت مدیران</h1>
          <p className="text-sm font-semibold text-ink-subtle mt-1">
            {managers.filter((m) => m.is_active).length} مدیر فعال — برای ویرایش روی هر مدیر بزنید
          </p>
        </div>
        <Button variant="teal" size="md" onClick={() => setShowCreateModal(true)} rotate="-rotate-[1deg]">
          مدیر جدید
        </Button>
      </div>

      {/* لیست مدیران */}
      {managers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="هنوز مدیری وجود ندارد"
          subtitle="اولین مدیر خود را ایجاد کنید."
          action={
            <Button variant="teal" onClick={() => setShowCreateModal(true)}>
              مدیر جدید
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 lg:gap-7">
          {managers.map((m, i) => (
            <div key={m.id} className={i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"}>
              <StickerCard
                theme={m.is_owner ? "orange" : "white"}
                radius="rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none"
              >
                <div className="p-5 flex flex-col gap-3">
                  {/* هدر: آواتار + اسم + وضعیت */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-base rotate-[3deg] ${
                        m.is_owner
                          ? "bg-orange/20 text-orange"
                          : m.is_active
                            ? "bg-bg-mint text-teal-text"
                            : "bg-bg-neutral text-ink-subtle"
                      }`}>
                        {m.full_name?.[0]?.toUpperCase() ?? m.email?.[0]?.toUpperCase() ?? "U"}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-navy leading-5 line-clamp-1">
                            {m.full_name || "—"}
                          </span>
                          {m.is_owner && (
                            <span className="inline-flex items-center gap-0.5 text-[0.6rem] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">
                              <Crown size={10} />
                              صاحب
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-ink-subtle" dir="ltr">
                          {m.email}
                        </span>
                      </div>
                    </div>
                    {m.is_active ? (
                      <Badge color="green">فعال</Badge>
                    ) : (
                      <Badge color="gray">غیرفعال</Badge>
                    )}
                  </div>

                  {/* تاریخ عضویت */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink-subtle">
                    <span>📅 {new Date(m.created_at).toLocaleDateString("fa-IR")}</span>
                  </div>

                  {/* دکمه‌های عملیات */}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(m)}
                      title={m.is_owner ? "فقط نام صاحب اصلی قابل تغییر است" : "ویرایش"}
                    >
                      ویرایش
                    </Button>
                    {!m.is_owner && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!text-amber-600"
                          onClick={() => handleDeactivate(m.id)}
                        >
                          {m.is_active ? "غیرفعال 🛑" : "فعال 🟢"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!text-magenta-text"
                          onClick={() => setDeleteTarget(m)}
                        >
                          حذف
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

      {/* ─── Create Modal ─── */}
      <Modal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateError(null); }}
        title="ایجاد مدیر جدید"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">ایمیل</label>
            <input
              type="email"
              dir="ltr"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={inputCls}
              placeholder="manager@porskad.ir"
            />
          </div>
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">رمز عبور</label>
            <input
              type="password"
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">نام نمایشی</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={inputCls}
              placeholder="نام و نام خانوادگی"
            />
          </div>
          <div>
            <label className="block text-sm font-extrabold text-navy mb-2">مجوزها</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border-2 border-dashed border-navy/15 rounded-pill-md p-3 bg-bg-lavender/40">
              {ALL_PERMISSIONS.filter((p) => p !== "manage_managers").map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermissions.includes(p)}
                    onChange={(e) =>
                      setNewPermissions((prev) =>
                        e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)
                      )
                    }
                    className="accent-teal w-4 h-4"
                  />
                  {PERMISSION_LABELS[p]}
                </label>
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
            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Edit Modal ─── */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={selectedManager?.is_owner ? "ویرایش صاحب اصلی" : "ویرایش مدیر"}
      >
        <div className="flex flex-col gap-4">
          {selectedManager?.is_owner && (
            <div className="flex items-center gap-2 bg-orange/10 border-2 border-orange/30 rounded-pill-md px-3 py-2 text-sm font-bold text-orange">
              <Crown size={16} />
              صاحب اصلی سایت — فقط نام قابل تغییر است
            </div>
          )}
          <div>
            <label className="block text-sm font-extrabold text-navy mb-1.5">نام نمایشی</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={inputCls}
            />
          </div>
          {!selectedManager?.is_owner && (
            <div>
              <label className="block text-sm font-extrabold text-navy mb-2">مجوزها</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border-2 border-dashed border-navy/15 rounded-pill-md p-3 bg-bg-lavender/40">
                {ALL_PERMISSIONS.filter((p) => p !== "manage_managers").map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(p)}
                      onChange={(e) =>
                        setEditPermissions((prev) =>
                          e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)
                        )
                      }
                      className="accent-teal w-4 h-4"
                    />
                    {PERMISSION_LABELS[p]}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="teal"
              size="sm"
              onClick={async () => {
                if (selectedManager) {
                  try {
                    if (selectedManager.is_owner) {
                      await updateManager(selectedManager.id, { fullName: editName });
                    } else {
                      await updateManager(selectedManager.id, {
                        fullName: editName,
                        isActive: selectedManager.is_active,
                        permissions: editPermissions,
                      });
                    }
                    push("تغییرات ذخیره شد!");
                    setShowEditModal(false);
                    load();
                  } catch (err) {
                    push("خطا در ذخیره: " + (err.message || "ناموفق بود"), "error");
                  }
                }
              }}
            >
              ذخیره
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="حذف مدیر؟">
        <p className="text-sm text-ink/70 leading-7 mb-5">
          مدیر «
          <span className="font-bold text-magenta-text">
            {deleteTarget?.full_name || deleteTarget?.email}
          </span>
          » به‌طور کامل حذف خواهد شد.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="red" size="sm" onClick={handleDelete}>
            بله، حذف شود
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
            انصراف
          </Button>
        </div>
      </Modal>
    </div>
  );
}
