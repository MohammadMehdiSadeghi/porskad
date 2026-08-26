import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import StickerCard from "../../../components/ui/StickerCard";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Modal from "../../../components/ui/Modal";
import Spinner from "../../../components/ui/Spinner";
import EmptyState from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/ui/Toast";
import { faNum, faRelative, copyToClipboard, randomSlug } from "../../../lib/utils";

export default function FormsList() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [counts, setCounts] = useState({});
  const [deleting, setDeleting] = useState(null); // فرم در انتظار تایید حذف
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: formsData }, { data: respData }] = await Promise.all([
      supabase.from("forms").select("*").order("created_at", { ascending: false }),
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
    setBusy(true);
    const base = {
      slug: `form-${randomSlug(6)}`,
      title: "فرم جدید",
      published: false,
    };
    const { data, error } = await supabase.from("forms").insert(base).select().single();
    setBusy(false);
    if (error) {
      push("ساخت فرم ناموفق بود: " + error.message, "error");
      return;
    }
    push("فرم جدید ساخته شد؛ حالا سوال‌ها را بچین!");
    navigate(`/admin/forms/${data.id}`);
  }

  async function togglePublish(form) {
    const { error } = await supabase
      .from("forms")
      .update({ published: !form.published })
      .eq("id", form.id);
    if (error) {
      push("تغییر وضعیت ناموفق بود", "error");
      return;
    }
    push(form.published ? "فرم از انتشار خارج شد" : "فرم منتشر شد! لینکش الان فعال است 🎉");
    setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, published: !f.published } : f)));
  }

  async function duplicate(form) {
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
    };
    const { data: newForm, error } = await supabase.from("forms").insert(copy).select().single();
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
      push("کپی ساخته شد (پیش‌نویس)");
      load();
    } else {
      push("کپی ناموفق بود", "error");
    }
    setBusy(false);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("forms").delete().eq("id", deleting.id);
    setDeleting(null);
    if (error) {
      push("حذف ناموفق بود", "error");
      return;
    }
    push("فرم و همه‌ی پاسخ‌هایش حذف شد");
    load();
  }

  async function share(form) {
    const url = `${window.location.origin}/f/${form.slug}`;
    const ok = await copyToClipboard(url);
    push(ok ? "لینک فرم کپی شد!" : `لینک: ${url}`, ok ? "success" : "info");
  }

  if (loading) return <Spinner label="فرم‌ها دارن لود می‌شن..." />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy">فرم‌ها</h1>
          <p className="text-sm font-semibold text-ink-subtle mt-1">
            {faNum(forms.length)} فرم — برای ویرایش روی هر فرم بزن
          </p>
        </div>
        <Button variant="teal" size="lg" rotate="-rotate-[1.5deg]" disabled={busy} onClick={createForm}>
          + فرم جدید
        </Button>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="هنوز فرمی نساخته‌ای!"
          subtitle="با دکمه‌ی «فرم جدید» شروع کن؛ خوش‌آمد، سوال‌ها و پیام خروج را بچین و منتشرش کن."
          action={<Button variant="teal" onClick={createForm}>+ فرم جدید</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {forms.map((f, i) => {
            const c = counts[f.id] ?? { total: 0, complete: 0 };
            const rots = ["-rotate-[0.6deg]", "rotate-[0.5deg]"];
            return (
              <div key={f.id} className={rots[i % 2]}>
                <StickerCard theme="white" radius="rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none">
                  <div className="p-5 sm:p-6 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black text-navy leading-8 break-words">
                        {f.title}
                      </h3>
                      {f.published ? (
                        <Badge color="green">✓ منتشرشده</Badge>
                      ) : (
                        <Badge color="gray">پیش‌نویس</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge color="navy">📥 {faNum(c.total)} پاسخ</Badge>
                      <Badge color="teal">✓ {faNum(c.complete)} کامل</Badge>
                      <span className="text-[0.7rem] font-medium text-ink-subtle self-center">
                        ساخته‌شده {faRelative(f.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button as={Link} to={`/admin/forms/${f.id}`} variant="navy" size="sm">
                        ✏️ ویرایش
                      </Button>
                      <Button as={Link} to={`/admin/forms/${f.id}/responses`} variant="white" size="sm">
                        📊 پاسخ‌ها
                      </Button>
                      {f.published && (
                        <Button variant="white" size="sm" onClick={() => share(f)}>
                          🔗 کپی لینک
                        </Button>
                      )}
                      <Button variant={f.published ? "white" : "teal"} size="sm" onClick={() => togglePublish(f)}>
                        {f.published ? "⏸ لغو انتشار" : "🚀 انتشار"}
                      </Button>
                      <Button variant="white" size="sm" disabled={busy} onClick={() => duplicate(f)}>
                        ⧉ کپی
                      </Button>
                      <Button variant="ghost" size="sm" className="!text-magenta-text" onClick={() => setDeleting(f)}>
                        🗑 حذف
                      </Button>
                    </div>

                    {f.published && (
                      <a
                        href={`/f/${f.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        dir="ltr"
                        className="text-xs font-bold text-teal-text hover:underline text-left truncate"
                      >
                        /f/{f.slug} ↗
                      </a>
                    )}
                  </div>
                </StickerCard>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="حذف فرم؟">
        <p className="text-sm font-semibold text-ink-soft leading-8 mb-5">
          فرم «<span className="font-black text-magenta-text">{deleting?.title}</span>» و
          همه‌ی سوال‌ها و پاسخ‌هایش برای همیشه حذف می‌شود. مطمئنی؟
        </p>
        <div className="flex gap-3">
          <Button variant="magenta" onClick={confirmDelete}>بله، حذف کن</Button>
          <Button variant="white" onClick={() => setDeleting(null)}>نه، پشیمون شدم</Button>
        </div>
      </Modal>
    </div>
  );
}
