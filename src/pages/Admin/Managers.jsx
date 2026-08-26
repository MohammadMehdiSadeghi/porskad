import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { ALL_PERMISSIONS } from "../../context/AuthContext";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Shield,
  Mail,
  Calendar,
  UserCircle,
} from "lucide-react";

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

export default function Managers() {
  const { push } = useToast();
  const { listManagers, createManager, updateManager, deactivateManager, deleteManager } = useAuth();
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

  useEffect(() => {
    load();
  }, []);

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
      push("مدیر جدید با موفقیت ایجاد شد! ✅");
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
    setEditPermissions([...ALL_PERMISSIONS].filter((p) => p !== "manage_managers"));
    setShowEditModal(true);
  }

  async function handleDeactivate(managerId) {
    if (!confirm("آیا از غیرفعال‌سازی این مدیر مطمئنید؟")) return;
    try {
      await deactivateManager(managerId);
      push("مدیر غیرفعال شد");
      load();
    } catch (err) {
      push("خطا: " + err.message, "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (
      !confirm(
        `آیا از حذف کامل مدیر "${deleteTarget.full_name || deleteTarget.email}" مطمئنید؟`
      )
    ) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">مدیریت مدیران</h1>
          <p className="text-sm text-ink/50 mt-0.5">
            {managers.length} مدیر فعال
          </p>
        </div>
        <Button variant="indigo" size="md" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          مدیر جدید
        </Button>
      </div>

      {managers.length === 0 ? (
        <EmptyState
          icon="👥"
          title="هنوز مدیری وجود ندارد"
          subtitle="اولین مدیر خود را ایجاد کنید."
          action={
            <Button variant="indigo" onClick={() => setShowCreateModal(true)}>
              مدیر جدید
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-neutral border-b border-ink/10">
                  <th className="text-right font-semibold text-ink/70 px-4 py-3">مدیر</th>
                  <th className="text-right font-semibold text-ink/70 px-4 py-3">ایمیل</th>
                  <th className="text-right font-semibold text-ink/70 px-4 py-3">وضعیت</th>
                  <th className="text-right font-semibold text-ink/70 px-4 py-3">تاریخ عضویت</th>
                  <th className="text-right font-semibold text-ink/70 px-4 py-3">مجوزها</th>
                  <th className="text-left font-semibold text-ink/70 px-4 py-3">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-ink/5 last:border-0 hover:bg-bg-neutral/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-bg-mint rounded-full flex items-center justify-center text-teal-text font-bold text-sm">
                          {m.full_name?.[0]?.toUpperCase() ??
                            m.email?.[0]?.toUpperCase() ??
                            "U"}
                        </div>
                        <span className="font-medium text-navy">
                          {m.full_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink/50 font-mono text-left" dir="ltr">
                      {m.email}
                    </td>
                    <td className="px-4 py-3">
                      {m.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-text bg-bg-mint px-2 py-0.5 rounded-full">
                          <Check size={12} />
                          فعال
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink/50 bg-bg-neutral px-2 py-0.5 rounded-full">
                          <X size={12} />
                          غیرفعال
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/50">
                      {new Date(m.created_at).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ALL_PERMISSIONS.filter((p) => p !== "manage_managers")
                          .slice(0, 3)
                          .map((p) => (
                            <span
                              key={p}
                              className="text-[0.65rem] font-medium text-teal-text bg-bg-mint px-1.5 py-0.5 rounded"
                            >
                              {PERMISSION_LABELS[p]}
                            </span>
                          ))}
                        {ALL_PERMISSIONS.filter((p) => p !== "manage_managers").length >
                          3 && (
                          <span className="text-[0.65rem] text-ink/40">
                            +
                            {ALL_PERMISSIONS.filter((p) => p !== "manage_managers").length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(m)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!text-amber-600 hover:!bg-amber-50"
                          onClick={() => handleDeactivate(m.id)}
                        >
                          {m.is_active ? <Shield size={14} /> : <Check size={14} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!text-magenta hover:!bg-blush"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateError(null);
        }}
        title="ایجاد مدیر جدید"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              ایمیل
            </label>
            <input
              type="email"
              dir="ltr"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-bg-neutral border border-ink/15 rounded-lg px-3 py-2 text-sm font-medium text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              placeholder="manager@porskad.ir"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              رمز عبور
            </label>
            <input
              type="password"
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-bg-neutral border border-ink/15 rounded-lg px-3 py-2 text-sm font-medium text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              نام نمایشی
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-bg-neutral border border-ink/15 rounded-lg px-3 py-2 text-sm font-medium text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              placeholder="نام و نام خانوادگی"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              مجوزها
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-ink/15 rounded-lg p-3 bg-bg-neutral">
              {ALL_PERMISSIONS.filter((p) => p !== "manage_managers").map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer"
                >
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
            <div className="text-sm font-semibold text-magenta-text bg-blush border border-red-100 rounded-lg px-3 py-2">
              {createError}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="indigo" size="sm" onClick={handleCreate} disabled={busy}>
              {busy ? "در حال ایجاد..." : "ایجاد مدیر"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              انصراف
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="ویرایش مدیر"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              نام نمایشی
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-bg-neutral border border-ink/15 rounded-lg px-3 py-2 text-sm font-medium text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              مجوزها
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-ink/15 rounded-lg p-3 bg-bg-neutral">
              {ALL_PERMISSIONS.filter((p) => p !== "manage_managers").map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer"
                >
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
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="indigo"
              size="sm"
              onClick={async () => {
                if (selectedManager) {
                  await updateManager(selectedManager.id, {
                    fullName: editName,
                    isActive: selectedManager.is_active,
                  });
                  push("تغییرات ذخیره شد ✅");
                  setShowEditModal(false);
                  load();
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

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف مدیر؟"
      >
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
