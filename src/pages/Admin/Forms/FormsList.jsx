import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import StickerCard from "../../../components/ui/StickerCard";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import EmptyState from "../../../components/ui/EmptyState";
import Modal from "../../../components/ui/Modal";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../context/AuthContext";
import { copyToClipboard, randomSlug } from "../../../lib/utils";

export default function FormsList() {
  const { push } = useToast();
  const { hasPermission, canManage, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const PAGE_SIZE = 500;

  async function load() {
    setLoading(true);
    try {
      const [{ data: formsData, error: formsError }, { data: respData }] =
        await Promise.all([
          supabase.from("forms").select("*").order("created_at", { ascending: false }),
          // شمارش پاسخ‌ها صفحه‌به‌صفحه
          (async () => {
            let all = [];
            let from = 0;
            for (;;) {
              const { data, error } = await supabase
                .from("responses")
                .select("form_id, is_complete")
                .range(from, from + PAGE_SIZE - 1);
              if (error) throw error;
              all = all.concat(data ?? []);
              if (!data || data.length < PAGE_SIZE) break;
              from += PAGE_SIZE;
            }
            return { data: all };
          })(),
        ]);
      if (formsError) throw formsError;
      setForms(formsData ?? []);
      const c = {};
      for (const r of respData?.data ?? []) {
        c[r.form_id] = c[r.form_id] ?? { total: 0, complete: 0 };
        c[r.form_id].total++;
        if (r.is_complete) c[r.form_id].complete++;
      }
      setCounts(c);
    } catch (err) {
      console.error("load error:", err);
      push("خطا در بارگذاری فرم‌ها: " + (err.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createForm() {
    if (!hasPermission("create_form")) {
      push("شما مجوز ایجاد فرم ندارید.", "error");
      return;
    }
    setBusy(true);
    const base = {
      slug: `form-${randomSlug(6)}`,
      title: "فرم جدید",
      published: false,
      manager_id: user?.id ?? null,
    };
    const { data, error } = await supabase.from("forms").insert(base).select().single();
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
    const { error } = await supabase.from("forms").update({ published: !form.published }).eq("id", form.id);
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
      slug: `form-${randomSlug(6)}`,
      title: `${form.title} (کپی)`,
      description: form.description,
      welcome_title: form.welcome_title,
      welcome_message: form.welcome_message,
      exit_title: form.exit_title,
      exit_message: form.exit_message,
      published: false,
      manager_id: user?.id ?? null,
    };
    const { data: newForm, error } = await supabase.from("forms").insert(copy).select().single();
    if (!error) {
      const { data: qs } = await supabase.from("questions").select("*").eq("form_id", form.id).order("position");
      const rows = (qs ?? []).map((q, i) => ({
        form_id: newForm.id, type: q.type, title: q.title, description: q.description,
        required: q.required, options: q.options, position: i,
      }));
      if (rows.length) {
        const { error: qError } = await supabase.from("questions").insert(rows);
        if (qError) push("کپی سوال‌ها ناموفق بود", "error");
      }
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
          <h1 className="text-2xl sm:text-3xl font-black text-navy">فرم‌ها</h1>
          <p className="text-sm font-semibold text-ink-subtle mt-1">
            {forms.length} فرم — برای ویرایش روی هر فرم بزنید
          </p>
        </div>
        <Button variant="indigo" onClick={createForm} disabled={busy} rotate="-rotate-[1deg]">
          فرم جدید ➕
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="جستجوی فرم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-white border-2 border-ink/15 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
        />
        <div className="flex items-center gap-1 bg-white border-2 border-ink/15 rounded-pill-md p-1">
          {[
            { key: "all", label: "همه" },
            { key: "published", label: "منتشرشده" },
            { key: "draft", label: "پیش‌نویس" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-sm font-bold rounded-pill-sm transition-colors ${
                filter === f.key
                  ? "bg-teal text-white"
                  : "text-ink-subtle hover:text-ink"
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
          subtitle={search ? "عبارت جستجو را تغییر دهید." : "با دکمه‌ی «فرم جدید» شروع کن."}
          action={!search && <Button variant="indigo" onClick={createForm}>+ فرم جدید</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-7">
          {filtered.map((f, i) => {
            const c = counts[f.id] ?? { total: 0, complete: 0 };
            return (
              <div key={f.id} className={i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"}>
                <StickerCard theme="white">
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-navy leading-6 line-clamp-1">{f.title}</h3>
                      {f.published ? (
                        <Badge color="green">منتشر</Badge>
                      ) : (
                        <Badge color="gray">پیش‌نویس</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold text-ink-subtle">
                      <span>📥 {c.total} پاسخ</span>
                      <span>✓ {c.complete} کامل</span>
                      <span className="mr-auto">{new Date(f.created_at).toLocaleDateString("fa-IR")}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1">
                      <Button as={Link} to={`/admin/forms/${f.id}`} variant="ghost" size="sm">ویرایش ✏️</Button>
                      <Button as={Link} to={`/admin/forms/${f.id}/responses`} variant="ghost" size="sm">پاسخ‌ها 👁️</Button>
                      {f.published && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => share(f)}>کپی لینک 📋</Button>
                          <Button as="a" href={`/f/${f.slug}`} target="_blank" variant="ghost" size="sm">مشاهده ↗</Button>
                        </>
                      )}
                      {hasPermission("publish_form") && (
                        <Button variant="ghost" size="sm" onClick={() => togglePublish(f)}>
                          {f.published ? "لغو انتشار" : "انتشار 🚀"}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => duplicate(f)} disabled={busy}>کپی 📄</Button>
                      {hasPermission("delete_form") && (
                        <Button variant="ghost" size="sm" className="!text-magenta-text" onClick={() => setDeleting(f)}>حذف 🗑️</Button>
                      )}
                    </div>

                    {f.published && (
                      <span className="text-xs font-mono text-teal-text truncate" dir="ltr">/f/{f.slug}</span>
                    )}
                  </div>
                </StickerCard>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="حذف فرم؟">
        <p className="text-sm font-semibold text-ink-soft leading-7 mb-5">
          فرم «<span className="font-black text-magenta-text">{deleting?.title}</span>» و همه‌ی سوال‌ها و پاسخ‌هایش
          برای همیشه حذف می‌شود. مطمئنید؟
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="red" size="sm" onClick={confirmDelete}>بله، حذف کن</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>انصراف</Button>
        </div>
      </Modal>
    </div>
  );
}
