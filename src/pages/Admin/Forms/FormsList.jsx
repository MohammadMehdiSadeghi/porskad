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
import { FileText, Plus, AlignLeft, ClipboardList } from "lucide-react";
import SEO from "../../../components/ui/SEO";

// ─── تمپلیت فرم ثبت‌نامی ───
// فرم ثبت‌نامی بدون فیلدهای پیش‌فرض — ادمین خودش فیلدها رو اضافه می‌کنه

const FORM_TYPES = [
  {
    key: "step_by_step",
    title: "Step by Step",
    icon: "step_by_step",
    description: "Each question on a separate page. Great for surveys and quizzes.",
    color: "teal",
    theme: "teal",
  },
  {
    key: "registration",
    title: "Registration Form",
    icon: "registration",
    description: "All fields on a single page. Ideal for sign-up and membership forms.",
    color: "orange",
    theme: "orange",
  },
];

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
  const [showTypeModal, setShowTypeModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ data: formsData, error: formsError }, { data: countsData }] =
        await Promise.all([
          supabase.from("forms").select("*").order("created_at", { ascending: false }),
          supabase.rpc("get_form_response_counts"),
        ]);
      if (formsError) throw formsError;
      setForms(formsData ?? []);
      setCounts(countsData || {});
    } catch (err) {
      console.error("load error:", err);
      push("Error loading forms: " + (err.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createForm(formType = "step_by_step") {
    if (!hasPermission("create_form")) {
      push("You don't have permission to create forms.", "error");
      return;
    }
    setBusy(true);

    const isRegistration = formType === "registration";
    const base = {
      slug: `form-${randomSlug(6)}`,
      title: isRegistration ? "Registration Form" : "New Form",
      published: false,
      manager_id: user?.id ?? null,
      form_type: formType,
    };

    const { data, error } = await supabase.from("forms").insert(base).select().single();
    if (error) {
      setBusy(false);
      push("ساخت فرم ناموفق بود: " + error.message, "error");
      return;
    }

    setBusy(false);
    setShowTypeModal(false);
    push(isRegistration ? "Registration form created!" : "New form created!");
    navigate(`/admin/forms/${data.id}`);
  }

  async function togglePublish(form) {
    if (!hasPermission("publish_form")) {
      push("You don't have permission to publish forms.", "error");
      return;
    }
    const { error } = await supabase.from("forms").update({ published: !form.published }).eq("id", form.id);
    if (error) {
      push("تغییر وضعیت ناموفق بود", "error");
      return;
    }
    push(form.published ? "Form unpublished" : "Form published!");
    setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, published: !f.published } : f)));
  }

  async function duplicate(form) {
    if (!hasPermission("create_form")) {
      push("You don't have permission to create forms.", "error");
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
      form_type: form.form_type || "step_by_step",
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
        if (qError) push("Failed to copy questions", "error");
      }
      push("Duplicate created");
      load();
    } else {
      push("Duplicate failed", "error");
    }
    setBusy(false);
  }

  async function share(form) {
    const url = `${window.location.origin}/f/${form.slug}`;
    const ok = await copyToClipboard(url);
    push(ok ? "Form link copied!" : `Link: ${url}`, ok ? "success" : "info");
  }

  async function confirmDelete() {
    if (!deleting) return;
    if (!hasPermission("delete_form")) {
      push("You don't have permission to delete forms.", "error");
      setDeleting(null);
      return;
    }
    const { error } = await supabase.from("forms").delete().eq("id", deleting.id);
    setDeleting(null);
    if (error) {
      push("Delete failed", "error");
      return;
    }
    push("Form and all its responses deleted");
    load();
  }

  async function archiveForm(form) {
    if (!hasPermission("delete_form")) {
      push("You don't have permission to archive forms.", "error");
      return;
    }
    const { error } = await supabase.from("forms").update({ archived: !form.archived }).eq("id", form.id);
    if (error) {
      push("Archive failed", "error");
      return;
    }
    push(form.archived ? "Form restored from archive" : "Form archived");
    setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, archived: !f.archived } : f)));
  }

  const filtered = useMemo(() => {
    let result = forms;
    if (filter === "archived") result = result.filter((f) => f.archived);
    else {
      result = result.filter((f) => !f.archived);
      if (filter === "published") result = result.filter((f) => f.published);
      else if (filter === "draft") result = result.filter((f) => !f.published);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((f) => f.title.toLowerCase().includes(s));
    }
    return result;
  }, [forms, filter, search]);

  if (loading) return <Spinner label="Loading forms..." />;

  return (
    <div className="flex flex-col gap-6">
      <SEO
        title="Form Management"
        description="Create, edit and manage survey forms — Porskad"
        url="/admin/forms"
        noIndex
      />
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>           <h1 className="text-xl sm:text-3xl font-black text-navy">فرم‌ها</h1>           <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-1">
            {forms.length} forms — click any form to edit
          </p>
        </div>
        <Button variant="indigo" size="sm" onClick={() => setShowTypeModal(true)} disabled={busy} rotate="-rotate-[1deg]">
          + New Form
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          type="text"
          placeholder="Search forms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-white border-2 border-ink/15 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
        />
        <div className="flex items-center gap-0.5 bg-white border-2 border-ink/15 rounded-pill-md p-0.5">
          {[
            { key: "all", label: "All" },
            { key: "published", label: "Published" },
            { key: "draft", label: "Draft" },
            { key: "archived", label: "Archived" },
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
          icon={<FileText size={48} />}
          title={search ? "No forms found" : "No forms yet!"}
          subtitle={search ? "Try a different search term." : "Click '+ New Form' to get started."}
          action={!search && <Button variant="indigo" size="sm" onClick={() => setShowTypeModal(true)}>+ فرم جدید</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 lg:gap-5">
          {filtered.map((f, i) => {
            const c = counts[f.id] ?? { total: 0, complete: 0 };
            const isReg = f.form_type === "registration";
            return (
              <div key={f.id} className={i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"}>
                <StickerCard theme="white">
                  <div className="p-5 sm:p-6 flex flex-col gap-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-black text-navy text-lg leading-7 line-clamp-2">{f.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {f.archived && <Badge color="gray">Archived</Badge>}
                        {isReg && !f.archived && <Badge color="orange">Registration</Badge>}
                        {!f.archived && (f.published ? (
                          <Badge color="green">Published</Badge>
                        ) : (
                          <Badge color="gray">Draft</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm font-semibold text-ink-subtle">
                      <span>📥 {c.total}</span>
                      <span>✓ {c.complete}</span>
                      <span className="mr-auto">{new Date(f.created_at).toLocaleDateString("fa-IR")}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1">
                      <Button as={Link} to={`/admin/forms/${f.id}`} variant="glass" size="md" rotate="rotate-[1deg]">Edit</Button>
                      <Button as={Link} to={`/admin/forms/${f.id}/responses`} variant="glass" size="md" rotate="-rotate-[1deg]">Responses</Button>
                      <Button as={Link} to={`/admin/forms/${f.id}/share`} variant="glass" size="md" rotate="rotate-[1deg]">Share</Button>
                      {f.published && (
                        <>
                          <Button variant="glass" size="md" onClick={() => share(f)} rotate="-rotate-[1deg]">Copy Link</Button>
                          <Button as="a" href={`/f/${f.slug}`} target="_blank" variant="glass" size="md" rotate="rotate-[1deg]">Preview ↗</Button>
                        </>
                      )}
                      {hasPermission("publish_form") && (
                        <Button variant="glass" size="md" onClick={() => togglePublish(f)} rotate="-rotate-[1deg]">
                          {f.published ? "Unpublish" : "Publish 🚀"}
                        </Button>
                      )}
                      <Button variant="glass" size="md" onClick={() => duplicate(f)} disabled={busy} rotate="rotate-[1deg]">Duplicate 📄</Button>
                      <Button variant="glass" size="md" onClick={() => archiveForm(f)} rotate="-rotate-[1deg]">
                        {f.archived ? "Restore 📂" : "Archive 📦"}
                      </Button>
                      {hasPermission("delete_form") && (
                        <Button variant="glass" size="md" className="!text-magenta-text" onClick={() => setDeleting(f)} rotate="rotate-[1deg]">Delete</Button>
                      )}
                    </div>

                    {f.published && (
                      <span className="text-sm font-mono text-teal-text truncate" dir="ltr">/f/{f.slug}</span>
                    )}
                  </div>
                </StickerCard>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Type Selection Modal ─── */}
      <Modal
        open={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title="Choose Form Type"
      >
        <p className="text-sm font-semibold text-ink-subtle mb-4 leading-7">
          نوع فرم خود را انتخاب کنید. هر دو قابل ویرایش و سفارشی‌سازی هستند.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FORM_TYPES.map((ft) => (
            <button
              key={ft.key}
              onClick={() => createForm(ft.key)}
              disabled={busy}
              className="text-right p-5 rounded-pill-md border-2 border-ink/15 bg-white hover:border-teal hover:shadow-md transition-all group disabled:opacity-50"
            >
              <span className="block mb-3 group-hover:scale-110 transition-transform text-navy">{ft.key === "step_by_step" ? <ClipboardList size={36} /> : <AlignLeft size={36} />}</span>
              <h3 className="text-lg font-black text-navy mb-1">{ft.title}</h3>
              <p className="text-xs font-medium text-ink-subtle leading-5">{ft.description}</p>
            </button>
          ))}
        </div>
        {busy && (
          <div className="mt-4 text-center text-sm font-bold text-teal-text">
            Creating form...
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)}        title="Delete Form?">
        <p className="text-sm font-semibold text-ink-soft leading-7 mb-5">
          Form "<span className="font-black text-magenta-text">{deleting?.title}</span>" and all its questions and responses will be permanently deleted. Are you sure?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="red" size="sm" onClick={confirmDelete}>Yes, Delete</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
