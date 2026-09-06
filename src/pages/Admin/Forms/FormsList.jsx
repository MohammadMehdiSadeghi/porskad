import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
import { FileText, Plus, AlignLeft, ClipboardList, Undo2, Trash2 } from "lucide-react";
import SEO from "../../../components/ui/SEO";

const FORM_TYPES = [
  {
    key: "step_by_step",
    title: "مرحله به مرحله",
    icon: "step_by_step",
    description: "هر سوال در یک صفحه جداگانه نمایش داده می‌شود. مناسب نظرسنجی‌ها و آزمون‌ها.",
    color: "teal",
    theme: "teal",
  },
  {
    key: "registration",
    title: "فرم ثبت‌نامی",
    icon: "registration",
    description: "همه فیلدها در یک صفحه نمایش داده می‌شوند. مناسب فرم‌های ثبت‌نام و عضویت.",
    color: "orange",
    theme: "orange",
  },
];

// ─── کامپوننت نوتیفیکیشن Undo ───
function UndoToast({ message, onUndo, onDismiss, duration = 6000 }) {
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        timerRef.current = requestAnimationFrame(tick);
      } else {
        onDismiss();
      }
    };
    timerRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [duration, onDismiss]);

  return (
    <div dir="rtl" className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-slide-up">
      <div className="pointer-events-auto relative overflow-hidden bg-navy text-white rounded-2xl border border-white/10 shadow-2xl shadow-navy/30 flex items-center gap-2.5 sm:gap-3 pr-5 pl-2.5 sm:pl-3 py-3 w-full sm:w-auto sm:min-w-[380px] sm:max-w-md rotate-[0.3deg]">
        {/* نوار تاکید رنگی سمت راست */}
        <span className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-teal via-teal/50 to-magenta" />

        {/* آیکون */}
        <div className="w-10 h-10 shrink-0 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
          <Trash2 size={16} className="text-magenta" />
        </div>

        {/* پیام */}
        <p className="text-sm font-bold leading-6 flex-1 min-w-0">{message}</p>

        {/* دکمه بازگردانی */}
        <button
          onClick={() => { cancelAnimationFrame(timerRef.current); onUndo(); }}
          className="shrink-0 flex items-center gap-1.5 bg-teal hover:bg-teal/85 active:scale-95 text-white rounded-xl px-3.5 py-2 text-xs font-extrabold shadow-lg shadow-teal/30 transition-all cursor-pointer"
        >
          <Undo2 size={13} />
          بازگردانی
        </button>

        {/* دکمه بستن */}
        <button
          onClick={() => { cancelAnimationFrame(timerRef.current); onDismiss(); }}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="بستن اعلان"
        >
          ✕
        </button>

        {/* نوار پیشرفت */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-teal to-magenta transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function FormsList() {
  const { push } = useToast();
  const { hasPermission, canManage, user, profile, isOwner } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  // ─── Undo state ───
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: formsData, error: formsError }, { data: countsData }] =
        await Promise.all([
          supabase
            .from("forms")
            .select("*, profiles:manager_id(full_name)")
            .order("created_at", { ascending: false }),
          supabase.rpc("get_form_response_counts"),
        ]);
      if (formsError) throw formsError;

      let allForms = formsData ?? [];
      // کاربر عادی فقط فرم‌های خودش را دریافت می‌کند
      if (!isOwner()) {
        allForms = allForms.filter(
          (f) => f.manager_id === user.id || f.created_by === user.id
        );
      }

      setForms(allForms);
      setCounts(countsData || {});
    } catch (err) {
      console.error("load error:", err);
      push("خطا در بارگذاری فرم‌ها: " + (err.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }, [user, isOwner, push]);

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);

  const activeFormsCount = useMemo(() => forms.filter((f) => !f.deleted_at).length, [forms]);
  const maxForms = profile?.max_forms ?? 5;

  async function createForm(formType = "step_by_step") {
    if (!hasPermission("create_form")) {
      push("شما مجوز ایجاد فرم ندارید.", "error");
      return;
    }

    if (!isOwner() && activeFormsCount >= maxForms) {
      setShowTypeModal(false);
      setShowQuotaModal(true);
      return;
    }

    setBusy(true);

    const isRegistration = formType === "registration";
    const base = {
      slug: `form-${randomSlug(6)}`,
      title: isRegistration ? "فرم ثبت‌نام" : "فرم جدید",
      published: false,
      manager_id: user?.id ?? null,
      created_by: user?.id ?? null,
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
    push(isRegistration ? "فرم ثبت‌نامی ساخته شد!" : "فرم جدید ساخته شد!");
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
    push(form.published ? "فرم از انتشار خارج شد" : "فرم منتشر شد!");
    setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, published: !form.published } : f)));
  }

  async function duplicate(form) {
    if (!hasPermission("create_form")) {
      push("شما مجوز ایجاد فرم ندارید.", "error");
      return;
    }

    if (!isOwner() && activeFormsCount >= maxForms) {
      setShowQuotaModal(true);
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
      created_by: user?.id ?? null,
      form_type: form.form_type || "step_by_step",
    };
    const { data: newForm, error } = await supabase.from("forms").insert(copy).select().single();
    if (!error) {
      const { data: qs } = await supabase.from("questions").select("*").eq("form_id", form.id).order("position");
      const rows = (qs ?? []).map((q, i) => ({
        form_id: newForm.id, type: q.type, title: q.title, description: q.description,
        required: q.required, options: q.options, position: i,
        placeholder: q.placeholder ?? "",
        validation: q.validation ?? null,
        conditions: q.conditions ?? null,
        jump_actions: q.jump_actions ?? [],
        correct_answer: q.correct_answer ?? null,
        points: q.points ?? null,
        display_mode: q.display_mode ?? null,
        max_selections: q.max_selections ?? 1,
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

  // ─── حذف نرم (سطل زباله) ───
  async function confirmDelete() {
    if (!deleting) return;
    if (!hasPermission("delete_form")) {
      push("شما مجوز حذف فرم ندارید.", "error");
      setDeleting(null);
      return;
    }
    const formToDelete = deleting;
    const { error } = await supabase.from("forms").update({ deleted_at: new Date().toISOString() }).eq("id", formToDelete.id);
    setDeleting(null);
    if (error) {
      push("حذف ناموفق بود", "error");
      return;
    }

    // حذف از لیست
    setForms((fs) => fs.filter((f) => f.id !== formToDelete.id));

    // نمایش Undo toast به مدت ۶ ثانیه
    setUndoToast(formToDelete);

    // ذخیره تایمر برای حذف دائمی بعد از ۶ ثانیه
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 6000);
  }

  // ─── بازگردانی از سطل زباله ───
  async function restoreForm(form) {
    const { error } = await supabase.from("forms").update({ deleted_at: null }).eq("id", form.id);
    if (error) {
      push("بازیابی ناموفق بود", "error");
      return;
    }
    push("فرم بازیابی شد");
    load();
  }

  // ─── حذف دائمی ───
  async function permanentDelete(form) {
    if (!confirm(`حذف دائمی فرم «${form.title}»؟ این عمل غیرقابل بازگشت است.`)) return;
    const { error } = await supabase.from("forms").delete().eq("id", form.id);
    if (error) {
      push("حذف ناموفق بود", "error");
      return;
    }
    push("فرم برای همیشه حذف شد");
    load();
  }

  // ─── آرشیو ───
  async function archiveForm(form) {
    if (!hasPermission("delete_form")) {
      push("شما مجوز آرشیو فرم ندارید.", "error");
      return;
    }
    const update = { archived: !form.archived };
    if (!form.archived && form.published) {
      update.published = false;
    }
    const { error } = await supabase.from("forms").update(update).eq("id", form.id);
    if (error) {
      push("آرشیو ناموفق بود", "error");
      return;
    }
    push(form.archived ? "فرم از آرشیو بازیابی شد" : "فرم آرشیو شد");
    setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, ...update } : f)));
  }

  // ─── فیلتر ───
  const filtered = useMemo(() => {
    let result = forms;

    if (filter === "trash") {
      // سطل زباله: فقط فرم‌های حذف‌شده
      result = result.filter((f) => f.deleted_at);
    } else if (filter === "archived") {
      result = result.filter((f) => f.archived && !f.deleted_at);
    } else {
      // حالت عادی: حذف‌شده و آرشیو‌شده رو نشون نده
      result = result.filter((f) => !f.deleted_at && !f.archived);
      if (filter === "published") result = result.filter((f) => f.published);
      else if (filter === "draft") result = result.filter((f) => !f.published);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((f) => f.title.toLowerCase().includes(s));
    }
    return result;
  }, [forms, filter, search]);

  // شمارنده سطل زباله
  const trashCount = useMemo(() => forms.filter((f) => f.deleted_at).length, [forms]);

  if (loading) return <Spinner label="فرم‌ها در حال بارگذاری..." />;

  return (
    <div className="flex flex-col gap-6">
      <SEO
        title="مدیریت فرم‌ها"
        description="ساخت، ویرایش و مدیریت فرم‌های نظرسنجی — پرس‌کاد"
        url="/admin/forms"
        noIndex
      />
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy">فرم‌ها</h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-1">
            {forms.filter((f) => !f.deleted_at).length} فرم — برای ویرایش روی هر فرم بزنید
          </p>
        </div>
        <Button
          variant="indigo"
          size="sm"
          onClick={() => {
            if (!isOwner() && activeFormsCount >= maxForms) {
              setShowQuotaModal(true);
            } else {
              setShowTypeModal(true);
            }
          }}
          disabled={busy}
          rotate="-rotate-[1deg]"
        >
          + فرم جدید
        </Button>
      </div>

      {/* نوار سهمیه برای کاربر عادی */}
      {!isOwner() && (
        <div className="bg-white border-2 border-teal/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 -rotate-[0.2deg]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal-text flex items-center justify-center font-black text-sm">
              {faNum(activeFormsCount)}/{faNum(maxForms)}
            </div>
            <div>
              <div className="text-sm font-black text-navy flex items-center gap-2">
                <span>سهمیه فرم‌های فعال شما</span>
                <Badge color={activeFormsCount >= maxForms ? "red" : "green"}>
                  {activeFormsCount >= maxForms ? "تکمیل شده" : `${faNum(maxForms - activeFormsCount)} فرم باقی‌مانده`}
                </Badge>
              </div>
              <p className="text-xs font-semibold text-ink-subtle mt-0.5">
                پلن: {profile?.plan === "enterprise" ? "سازمانی" : profile?.plan === "pro" ? "حرفه‌ای" : "رایگان"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-36 bg-ink/10 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${activeFormsCount >= maxForms ? "bg-magenta" : "bg-teal"}`}
                style={{ width: `${Math.min(100, Math.round((activeFormsCount / maxForms) * 100))}%` }}
              />
            </div>
            {activeFormsCount >= maxForms && (
              <Button as={Link} to="/admin/support" variant="teal" size="sm">
                افزایش سهمیه 🚀
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          type="text"
          placeholder="جستجوی فرم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-white border-2 border-ink/15 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
        />
        <div className="flex items-center gap-0.5 bg-white border-2 border-ink/15 rounded-pill-md p-0.5">
          {[
            { key: "all", label: "همه" },
            { key: "published", label: "منتشر" },
            { key: "draft", label: "پیش‌نویس" },
            { key: "archived", label: "آرشیو" },
            { key: "trash", label: `سطل زباله${trashCount > 0 ? ` (${trashCount})` : ""}` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-sm font-bold rounded-pill-sm transition-colors ${
                filter === f.key
                  ? f.key === "trash" ? "bg-magenta text-white" : "bg-teal text-white"
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
          title={search ? "فرمی یافت نشد" : filter === "trash" ? "سطل زباله خالی است" : "هنوز فرمی نساخته‌ای!"}
          subtitle={search ? "عبارت جستجو را تغییر دهید." : filter === "trash" ? "فرم حذف‌شده‌ای وجود ندارد." : "با دکمه‌ی «فرم جدید» شروع کن."}
          action={!search && filter !== "trash" && <Button variant="indigo" size="sm" onClick={() => setShowTypeModal(true)}>+ فرم جدید</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 lg:gap-5">
          {filtered.map((f, i) => {
            const c = counts[f.id] ?? { total: 0, complete: 0 };
            const isReg = f.form_type === "registration";
            const isTrashed = filter === "trash";

            return (
              <div key={f.id} data-form-card className={i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"}>
                <StickerCard theme={isTrashed ? "orange" : "white"}>
                  <div className={`p-5 sm:p-6 flex flex-col gap-3.5 ${isTrashed ? "opacity-75" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-navy text-base leading-6 line-clamp-1">{f.title}</h3>
                        {f.profiles?.full_name && (
                          <span className="text-[0.65rem] font-medium text-ink-subtle/60 mt-0.5 block">ساخته شده توسط {f.profiles.full_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isTrashed && <Badge color="red">حذف شده</Badge>}
                        {!isTrashed && f.archived && <Badge color="gray">آرشیو</Badge>}
                        {!isTrashed && isReg && !f.archived && <Badge color="orange">ثبت‌نامی</Badge>}
                        {!isTrashed && !f.archived && (f.published ? (
                          <Badge color="green">منتشر</Badge>
                        ) : (
                          <Badge color="gray">پیش‌نویس</Badge>
                        ))}
                      </div>
                    </div>

                    {!isTrashed && (
                      <div className="flex items-center gap-3 text-sm font-semibold text-ink-subtle">
                        <span>{c.total} دریافتی</span>
                        <span>{c.complete} تکمیل</span>
                        <span className="mr-auto">{new Date(f.created_at).toLocaleDateString("fa-IR")}</span>
                      </div>
                    )}

                    {isTrashed && (
                      <div className="text-xs font-semibold text-ink-subtle">
                        حذف شده در {new Date(f.deleted_at).toLocaleDateString("fa-IR")}
                      </div>
                    )}

                    {/* ─── دکمه‌ها ─── */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {isTrashed ? (
                        <>
                          <Button variant="teal" size="md" onClick={() => restoreForm(f)} rotate="rotate-[1deg]">بازیابی</Button>
                          <Button variant="red" size="md" onClick={() => permanentDelete(f)} rotate="-rotate-[1deg]">حذف دائمی</Button>
                        </>
                      ) : (
                        <>
                          <Button as={Link} to={`/admin/forms/${f.id}`} variant="glass" size="md" rotate="rotate-[1deg]">ویرایش</Button>
                          <Button as={Link} to={`/admin/forms/${f.id}/responses`} variant="glass" size="md" rotate="-rotate-[1deg]">پاسخ‌ها</Button>
                          <Button as={Link} to={`/admin/forms/${f.id}/share`} variant="glass" size="md" rotate="rotate-[1deg]">اشتراک</Button>
                          {f.published && (
                            <>
                              <Button variant="glass" size="md" onClick={() => share(f)} rotate="-rotate-[1deg]">کپی لینک</Button>
                              <Button as="a" href={`/f/${f.slug}`} target="_blank" variant="glass" size="md" rotate="rotate-[1deg]">مشاهده</Button>
                            </>
                          )}
                          {hasPermission("publish_form") && (
                            <Button variant="glass" size="md" onClick={() => togglePublish(f)} rotate="-rotate-[1deg]">
                              {f.published ? "لغو انتشار" : "انتشار"}
                            </Button>
                          )}
                          <Button variant="glass" size="md" onClick={() => duplicate(f)} disabled={busy} rotate="rotate-[1deg]">کپی</Button>
                          <Button variant="glass" size="md" onClick={() => archiveForm(f)} rotate="-rotate-[1deg]">
                            {f.archived ? "بازیابی" : "آرشیو"}
                          </Button>
                          {hasPermission("delete_form") && (
                            <Button variant="glass" size="md" className="!text-magenta-text" onClick={() => setDeleting(f)} rotate="rotate-[1deg]">حذف</Button>
                          )}
                        </>
                      )}
                    </div>

                    {!isTrashed && f.published && (
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
        title="انتخاب نوع فرم"
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
            در حال ساخت فرم...
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="انتقال به سطل زباله؟">
        <p className="text-sm font-semibold text-ink-soft leading-7 mb-5">
          فرم «<span className="font-black text-magenta-text">{deleting?.title}</span>» به سطل زباله منتقل می‌شود.
          می‌توانید بعداً آن را بازیابی یا برای همیشه حذف کنید.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="red" size="sm" onClick={confirmDelete}>بله، حذف کن</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>انصراف</Button>
        </div>
      </Modal>

      {/* ─── Quota Limit Modal ─── */}
      <Modal
        open={showQuotaModal}
        onClose={() => setShowQuotaModal(false)}
        title="سقف ساخت فرم تکمیل شده است"
      >
        <div className="flex flex-col gap-4 text-center items-center py-2">
          <span className="text-4xl">⚠️</span>
          <h3 className="text-base font-black text-navy">
            شما به سقف مجاز فرم‌های فعال ({faNum(maxForms)} فرم) رسیده‌اید
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle leading-6">
            برای ایجاد فرم جدید می‌توانید یکی از فرم‌های قبلی را حذف یا آرشیو کنید، یا از طریق بخش پشتیبانی درخواست افزایش ظرفیت ثبت نمایید.
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <Button
              as={Link}
              to="/admin/support"
              variant="teal"
              size="sm"
              onClick={() => setShowQuotaModal(false)}
            >
              پیام به پشتیبانی برای ارتقا 🚀
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuotaModal(false)}
            >
              متوجه شدم
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Undo Toast ─── */}
      {undoToast && (
        <UndoToast
          message={`«${undoToast.title}» به سطل زباله منتقل شد`}
          duration={6000}
          onUndo={async () => {
            // لغو تایمر حذف دائمی
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            setUndoToast(null);
            // بازگردانی فرم
            await restoreForm(undoToast);
          }}
          onDismiss={() => setUndoToast(null)}
        />
      )}
    </div>
  );
}
