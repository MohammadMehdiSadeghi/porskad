import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import {
  FileText,
  Plus,
  Copy,
  ExternalLink,
  Edit,
  Eye,
  BarChart3,
  Download,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
} from "lucide-react";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../context/AuthContext";
import Spinner from "../../../components/ui/Spinner";
import EmptyState from "../../../components/ui/EmptyState";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { copyToClipboard } from "../../../lib/utils";

export default function FormsList() {
  const { push } = useToast();
  const { hasPermission, canManage } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | published | draft
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: formsData }, { data: respData }] = await Promise.all([
      supabase
        .from("forms")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("responses").select("form_id, is_complete"),
    ]);
    setForms(formsData ?? []);
    const c = {};
    for (const r of respData ?? []) {
      c[r.form_id] = c[r.form_id] ?? { total: 0, complete: 0 };
      c[r.form_id].total++;
      if (r.is_complete) c[r.form_id].complete++;
    }
    setCounts(c);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createForm() {
    if (!hasPermission("create_form")) {
      push("شما مجوز ایجاد فرم ندارید.", "error");
      return;
    }
    setBusy(true);
    const base = {
      slug: `form-${Math.random().toString(36).slice(2, 8)}`,
      title: "فرم جدید",
      published: false,
      manager_id: null, // will be set by trigger or manually
    };
    const { data, error } = await supabase
      .from("forms")
      .insert(base)
      .select()
      .single();
    setBusy(false);
    if (error) {
      push("ساخت فرم ناموفق بود: " + error.message, "error");
      return;
    }
    push("فرم جدید ساخته شد!");
    navigate(`/admin/forms/${data.id}`);
  }

  async function togglePublish(form) {
    if (!hasPermission("publish_form")) {
      push("شما مجوز انتشار فرم ندارید.", "error");
      return;
    }
    const { error } = await supabase
      .from("forms")
      .update({ published: !form.published })
      .eq("id", form.id);
    if (error) {
      push("تغییر وضعیت ناموفق بود", "error");
      return;
    }
    push(form.published ? "فرم از انتشار خارج شد" : "فرم منتشر شد! 🎉");
    setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, published: !f.published } : f)));
  }

  async function duplicate(form) {
    if (!hasPermission("create_form")) {
      push("شما مجوز ایجاد فرم ندارید.", "error");
      return;
    }
    setBusy(true);
    const copy = {
      slug: `form-${Math.random().toString(36).slice(2, 8)}`,
      title: `${form.title} (کپی)`,
      description: form.description,
      welcome_title: form.welcome_title,
      welcome_message: form.welcome_message,
      exit_title: form.exit_title,
      exit_message: form.exit_message,
      published: false,
    };
    const { data: newForm, error } = await supabase
      .from("forms")
      .insert(copy)
      .select()
      .single();
    if (!error) {
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("form_id", form.id)
        .order("position");
      const rows = (qs ?? []).map((q, i) => ({
        form_id: newForm.id,
        type: q.type,
        title: q.title,
        description: q.description,
        required: q.required,
        options: q.options,
        position: i,
      }));
      if (rows.length) await supabase.from("questions").insert(rows);
      push("کپی ساخته شد");
      load();
    } else {
      push("کپی ناموفق بود", "error");
    }
    setBusy(false);
  }

  async function share(form) {
    const url = `${window.location.origin}/f/${form.slug}`;
    const ok = await copyToClipboard(url);
    push(ok ? "لینک فرم کپی شد!" : `لینک: ${url}`, ok ? "success" : "info");
  }

  async function confirmDelete() {
    if (!deleting) return;
    if (!hasPermission("delete_form")) {
      push("شما مجوز حذف فرم ندارید.", "error");
      setDeleting(null);
      return;
    }
    const { error } = await supabase.from("forms").delete().eq("id", deleting.id);
    setDeleting(null);
    if (error) {
      push("حذف ناموفق بود", "error");
      return;
    }
    push("فرم و همه‌ی پاسخ‌هایش حذف شد");
    load();
  }

  const filtered = useMemo(() => {
    let result = forms;
    if (filter === "published") result = result.filter((f) => f.published);
    else if (filter === "draft") result = result.filter((f) => !f.published);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((f) => f.title.toLowerCase().includes(s));
    }
    return result;
  }, [forms, filter, search]);

  if (loading) return <Spinner label="فرم‌ها در حال بارگذاری..." />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">فرم‌ها</h1>
          <p className="text-sm text-ink/50 mt-0.5">
            {forms.length} فرم — برای ویرایش روی هر فرم بزنید
          </p>
        </div>
        <Button variant="indigo" size="md" onClick={createForm} disabled={busy}>
          <Plus size={16} />
          فرم جدید
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
            size={16}
          />
          <input
            type="text"
            placeholder="جستجوی فرم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-ink/15 rounded-lg pr-9 pl-4 py-2 text-sm font-medium text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-ink/15 rounded-lg p-1">
          {[
            { key: "all", label: "همه" },
            { key: "published", label: "منتشرشده" },
            { key: "draft", label: "پیش‌نویس" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f.key
                  ? "bg-bg-mint text-teal-text"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forms Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title={search ? "فرمی یافت نشد" : "هنوز فرمی نساخته‌ای!"}
          subtitle={
            search
              ? "عبارت جستجو را تغییر دهید."
              : "با دکمه‌ی «فرم جدید» شروع کن."
          }
          action={
            !search && (
              <Button variant="indigo" onClick={createForm}>
                + فرم جدید
              </Button>
            )
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((f) => {
            const c = counts[f.id] ?? { total: 0, complete: 0 };
            return (
              <div
                key={f.id}
                className="bg-white rounded-xl border border-ink/10 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-bg-mint rounded-lg flex items-center justify-center">
                      <FileText size={16} className="text-teal-text" />
                    </div>
                    <h3 className="font-bold text-navy leading-6 line-clamp-1">
                      {f.title}
                    </h3>
                  </div>
                  {f.published ? (
                    <span className="text-xs font-semibold text-teal-text bg-bg-mint px-2 py-0.5 rounded-full">
                      ✓ منتشر
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-ink/50 bg-bg-neutral px-2 py-0.5 rounded-full">
                      پیش‌نویس
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-ink/50 mb-4">
                  <span>📥 {c.total} پاسخ</span>
                  <span>✓ {c.complete} کامل</span>
                  <span className="mr-auto">
                    {new Date(f.created_at).toLocaleDateString("fa-IR")}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    as={Link}
                    to={`/admin/forms/${f.id}`}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit size={14} />
                    ویرایش
                  </Button>
                  <Button
                    as={Link}
                    to={`/admin/forms/${f.id}/responses`}
                    variant="ghost"
                    size="sm"
                  >
                    <Eye size={14} />
                    پاسخ‌ها
                  </Button>
                  {f.published && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => share(f)}>
                        <Copy size={14} />
                        کپی لینک
                      </Button>
                      <Button
                        as="a"
                        href={`/f/${f.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        variant="ghost"
                        size="sm"
                      >
                        <ExternalLink size={14} />
                        مشاهده
                      </Button>
                    </>
                  )}
                  {hasPermission("publish_form") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePublish(f)}
                      className={f.published ? "!text-amber-600" : "!text-teal-text"}
                    >
                      {f.published ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                      {f.published ? "لغو انتشار" : "انتشار"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicate(f)}
                    disabled={busy}
                  >
                    <Copy size={14} />
                    کپی
                  </Button>
                  {hasPermission("delete_form") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!text-magenta hover:!bg-blush"
                      onClick={() => setDeleting(f)}
                    >
                      <Trash2 size={14} />
                      حذف
                    </Button>
                  )}
                </div>

                {f.published && (
                  <a
                    href={`/f/${f.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    dir="ltr"
                    className="block mt-3 text-xs font-mono text-teal-text hover:underline truncate"
                  >
                    /f/{f.slug}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="حذف فرم؟">
        <p className="text-sm text-ink/70 leading-7 mb-5">
          فرم «<span className="font-bold text-magenta-text">{deleting?.title}</span>» و همه‌ی سوال‌ها و پاسخ‌هایش
          برای همیشه حذف می‌شود. مطمئنید؟
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="red" size="sm" onClick={confirmDelete}>
            بله، حذف کن
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>
            انصراف
          </Button>
        </div>
      </Modal>
    </div>
  );
}
