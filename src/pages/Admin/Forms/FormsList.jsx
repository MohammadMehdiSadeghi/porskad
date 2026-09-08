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
import { copyToClipboard, randomSlug, faNum } from "../../../lib/utils";
import { FileText, Plus, AlignLeft, ClipboardList, Undo2, Trash2, User, Calendar, Link2, Copy, ExternalLink, Settings, BarChart3, Share2, Edit, Archive, ArchiveRestore, CheckCircle2, AlertTriangle, X, Sun, Moon, Monitor } from "lucide-react";
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
          <X size={14} />
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
  const { hasPermission, canManage, user, profile, isOwner, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newFormTheme, setNewFormTheme] = useState("light");
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [actionModalForm, setActionModalForm] = useState(null);

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
            .select("*, profiles:manager_id(full_name, email)")
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

  const activeFormsCount = useMemo(
    () => forms.filter((f) => f.published && !f.archived && !f.deleted_at).length,
    [forms]
  );
  const maxForms = profile?.max_forms ?? 5;

  async function createForm(formType = "step_by_step", formTheme = newFormTheme) {
    if (!hasPermission("create_form")) {
      push("شما مجوز ایجاد فرم ندارید.", "error");
      return;
    }

    setBusy(true);

    const isRegistration = formType === "registration";
    const title = isRegistration ? "فرم ثبت‌نام" : "فرم جدید";
    const slug = `form-${randomSlug(6)}`;

    const currentUserId = user?.id || (await supabase.auth.getUser()).data?.user?.id;
    if (!currentUserId) {
      setBusy(false);
      push("لطفاً ابتدا وارد حساب کاربری خود شوید.", "error");
      return;
    }

    let createdFormData = null;

    // ۱. ابتدا تلاش از طریق API سرورلس اختصاصی جهت دور زدن محدودیت‌های RLS و اطمینان از ثبت نقش
    try {
      const apiRes = await fetch("/api/create-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          title,
          form_type: formType,
          slug,
          default_theme: formTheme,
        }),
      });
      if (apiRes.ok) {
        const resJson = await apiRes.json();
        if (resJson.form) {
          createdFormData = resJson.form;
        }
      }
    } catch (e) {
      console.warn("create-form api fallback:", e);
    }

    // ۲. فالبک مستقیم با supabase client
    if (!createdFormData) {
      const base = {
        slug,
        title,
        published: false,
        manager_id: currentUserId,
        created_by: currentUserId,
        form_type: formType,
        default_theme: formTheme,
      };

      let { data, error } = await supabase.from("forms").insert(base).select().single();
      if (error && error.message?.includes("default_theme")) {
        delete base.default_theme;
        const retry = await supabase.from("forms").insert(base).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        setBusy(false);
        console.error("createForm error:", error);
        push("ساخت فرم ناموفق بود: " + (error.message || "خطای پایگاه‌داده"), "error");
        return;
      }
      createdFormData = data;
    }

    setBusy(false);
    setShowTypeModal(false);
    push(isRegistration ? "فرم ثبت‌نامی ساخته شد!" : "فرم جدید ساخته شد!");
    navigate(`/admin/forms/${createdFormData.id}`);
  }

  async function togglePublish(form) {
    if (!hasPermission("publish_form")) {
      push("شما مجوز انتشار فرم ندارید.", "error");
      return;
    }

    // اگر فرم قرار است فعال/منتشر شود، سقف فرم‌های همزمان فعال بررسی شود
    if (!form.published && !isOwner()) {
      const activePublishedCount = forms.filter(
        (f) => f.published && !f.archived && !f.deleted_at && f.id !== form.id
      ).length;
      const allowedMax = profile?.max_forms ?? 5;
      if (allowedMax < 999999 && activePublishedCount >= allowedMax) {
        setShowQuotaModal(true);
        push(`سقف فرم‌های همزمان فعال (حداکثر ${faNum(allowedMax)} فرم) تکمیل شده است. لطفاً ابتدا یکی از فرم‌های فعال را غیرفعال یا بایگانی کنید.`, "error");
        return;
      }
    }

    const { error } = await supabase.from("forms").update({ published: !form.published }).eq("id", form.id);
    if (error) {
      push(error.message || "تغییر وضعیت ناموفق بود", "error");
      return;
    }
    push(form.published ? "فرم از انتشار خارج شد" : "فرم منتشر شد!");
    setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, published: !form.published } : f)));
    setActionModalForm((prev) => (prev && prev.id === form.id ? { ...prev, published: !form.published } : prev));
  }

  async function duplicate(form) {
    if (!hasPermission("create_form")) {
      push("شما مجوز ایجاد فرم ندارید.", "error");
      return;
    }

    setBusy(true);
    const slug = `form-${randomSlug(6)}`;
    const copyTitle = `${form.title} (کپی)`;

    const currentUserId = user?.id || (await supabase.auth.getUser()).data?.user?.id;
    if (!currentUserId) {
      setBusy(false);
      push("لطفاً ابتدا وارد حساب کاربری خود شوید.", "error");
      return;
    }

    let newForm = null;

    // ۱. تلاش از طریق API سرورلس
    try {
      const apiRes = await fetch("/api/create-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          title: copyTitle,
          description: form.description || "",
          welcome_title: form.welcome_title || "سلام!",
          welcome_message: form.welcome_message || "ممنون که وقت گذاشتی؛ چند سوال کوتاه داریم.",
          exit_title: form.exit_title || "تمام شد!",
          exit_message: form.exit_message || "از اینکه جواب دادی خیلی ممنونیم. نظراتت برای ما طلاست!",
          slug,
          form_type: form.form_type || "step_by_step",
          default_theme: form.default_theme || "light",
        }),
      });
      if (apiRes.ok) {
        const resJson = await apiRes.json();
        if (resJson.form) {
          newForm = resJson.form;
        }
      }
    } catch (e) {
      console.warn("duplicate api fallback:", e);
    }

    // ۲. فالبک مستقیم supabase
    if (!newForm) {
      const copy = {
        slug,
        title: copyTitle,
        description: form.description,
        welcome_title: form.welcome_title,
        welcome_message: form.welcome_message,
        exit_title: form.exit_title,
        exit_message: form.exit_message,
        published: false,
        manager_id: currentUserId,
        created_by: currentUserId,
        form_type: form.form_type || "step_by_step",
        default_theme: form.default_theme || "light",
      };
      let { data, error } = await supabase.from("forms").insert(copy).select().single();
      if (error && error.message?.includes("default_theme")) {
        delete copy.default_theme;
        const retry = await supabase.from("forms").insert(copy).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error) {
        setBusy(false);
        console.error("duplicate error:", error);
        push("کپی ناموفق بود: " + (error.message || "خطای پایگاه‌داده"), "error");
        return;
      }
      newForm = data;
    }

    if (newForm) {
      const { data: qs } = await supabase.from("questions").select("*").eq("form_id", form.id).order("position");
      const rows = (qs ?? []).map((q, i) => ({
        form_id: newForm.id,
        type: q.type,
        title: q.title,
        description: q.description,
        required: q.required,
        options: q.options,
        position: i,
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
    setActionModalForm((prev) => (prev && prev.id === form.id ? { ...prev, ...update } : prev));
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
            setShowTypeModal(true);
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
                تعداد فرم‌های همزمان فعال (منتشر شده) در سامانه
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
                افزایش سهمیه
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
          className="flex-1 min-w-[200px] bg-white dark:bg-slate-800/90 border-2 border-ink/15 dark:border-slate-700 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy dark:text-white placeholder:text-ink/40 dark:placeholder:text-slate-500 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
        />
        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800/90 border-2 border-ink/15 dark:border-slate-700 rounded-pill-md p-0.5 overflow-x-auto scrollbar-none max-w-full">
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
              className={`px-3 py-1.5 text-sm font-bold rounded-pill-sm transition-colors cursor-pointer ${filter === f.key
                  ? f.key === "trash" ? "bg-magenta text-white" : "bg-teal text-white"
                  : "text-ink-subtle dark:text-slate-400 hover:text-ink dark:hover:text-white"
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
            const creatorName = f.profiles?.full_name || f.profiles?.email || (f.manager_id ? "کاربر سیستم" : "مدیر کل");
            const isOwnerUser = isOwner();

            return (
              <div
                key={f.id}
                data-form-card
                className={`${i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"} transition-all duration-200`}
              >
                <StickerCard theme={isTrashed ? "orange" : "white"}>
                  <div
                    className={`p-4 sm:p-5 flex flex-col gap-3 ${isTrashed ? "opacity-75" : ""} cursor-pointer select-none`}
                    onClick={(e) => {
                      if (e.target.closest("button, a, input")) return;
                      setActionModalForm(f);
                    }}
                  >
                    {/* Header: Title + Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-navy text-base leading-6 line-clamp-1">
                          {f.title}
                        </h3>
                        {/* Creator (سازنده فرم) */}
                        <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-ink-subtle">
                          <User size={12} className="text-teal shrink-0" />
                          <span>سازنده: <strong className="text-navy">{creatorName}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
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

                    {/* Stats & Creation Date (آمار و تاریخ ساخت) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-subtle bg-bg-neutral/50 rounded-pill-sm px-3 py-1.5 border border-ink/5">
                      {!isTrashed ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span>{faNum(c.total)} دریافتی</span>
                            <span>·</span>
                            <span>{faNum(c.complete)} تکمیل</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar size={12} className="text-ink-subtle/70" />
                            <span>ساخت: {new Date(f.created_at).toLocaleDateString("fa-IR")}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs font-semibold text-ink-subtle">
                          حذف شده در {new Date(f.deleted_at).toLocaleDateString("fa-IR")}
                        </div>
                      )}
                    </div>

                    {/* Link (لینک فرم با قابلیت کپی سریع و باز کردن) */}
                    {!isTrashed && (
                      <div className="flex items-center gap-2 bg-white rounded-pill-sm px-3 py-1.5 border border-ink/15 text-xs">
                        <Link2 size={13} className="text-teal shrink-0" />
                        <span className="font-mono text-ink-subtle truncate flex-1" dir="ltr">
                          /f/{f.slug}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            share(f);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:text-teal/80 shrink-0"
                          title="کپی لینک"
                        >
                          <Copy size={11} />
                          کپی لینک
                        </button>
                        {f.published && (
                          <a
                            href={`/f/${f.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center text-ink-subtle hover:text-navy shrink-0"
                            title="مشاهده فرم"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}

                    {/* دکمه عملیات و مدیریت فرم */}
                    <div className="pt-0.5 mt-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionModalForm(f);
                        }}
                        className="w-full py-2 px-3 rounded-pill-sm text-xs font-bold transition-all flex items-center justify-between bg-navy/5 hover:bg-teal hover:text-white text-navy border border-navy/10 group cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Settings size={14} className="text-teal group-hover:text-white transition-colors" />
                          <span>مدیریت و عملیات فرم</span>
                        </span>
                        <span className="text-xs font-bold text-ink/40 group-hover:text-white/90">
                          گزینه‌ها ←
                        </span>
                      </button>
                    </div>
                  </div>
                </StickerCard>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── مودال پاپ‌آپ عملیات فرم مخصوص سوپرادمین ─── */}
      <Modal
        open={Boolean(actionModalForm)}
        onClose={() => setActionModalForm(null)}
        title="مدیریت و عملیات فرم"
      >
        {actionModalForm && (() => {
          const f = actionModalForm;
          const c = counts[f.id] ?? { total: 0, complete: 0 };
          const isReg = f.form_type === "registration";
          const isTrashed = Boolean(f.deleted_at);
          const creatorName = f.profiles?.full_name || f.profiles?.email || (f.manager_id ? "کاربر سیستم" : "مدیر کل");

          return (
            <div className="flex flex-col gap-4 text-right">
              {/* مشخصات کلی فرم در پاپ‌آپ */}
              <div className="bg-bg-lavender/60 border border-navy/10 rounded-2xl p-4 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-navy text-base leading-6">
                      {f.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-ink-subtle">
                      <User size={13} className="text-teal shrink-0" />
                      <span>سازنده: <strong className="text-navy">{creatorName}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
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

                {/* آمار و زمان */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-subtle pt-2 border-t border-navy/5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1"><BarChart3 size={12} className="text-teal" /> {faNum(c.total)} پاسخ دریافتی</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-teal" /> {faNum(c.complete)} تکمیل</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar size={12} className="text-teal" />
                    <span>ساخت: {new Date(f.created_at).toLocaleDateString("fa-IR")}</span>
                  </div>
                </div>

                {/* لینک سریع با کپی */}
                {!isTrashed && (
                  <div className="flex items-center gap-2 bg-white rounded-pill-sm px-3 py-1.5 border border-ink/15 text-xs mt-1">
                    <Link2 size={13} className="text-teal shrink-0" />
                    <span className="font-mono text-ink-subtle truncate flex-1" dir="ltr">
                      /f/{f.slug}
                    </span>
                    <button
                      type="button"
                      onClick={() => share(f)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:text-teal/80 shrink-0 cursor-pointer"
                    >
                      <Copy size={11} /> کپی
                    </button>
                    {f.published && (
                      <a
                        href={`/f/${f.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-ink-subtle hover:text-navy shrink-0"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* گزینه‌ها و دکمه‌های عملیات */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-black text-navy">گزینه‌های دسترسی و عملیات:</span>

                {isTrashed ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="teal"
                      size="sm"
                      onClick={() => {
                        setActionModalForm(null);
                        restoreForm(f);
                      }}
                    >
                      <Undo2 size={14} className="ml-1" /> بازیابی فرم
                    </Button>
                    <Button
                      variant="red"
                      size="sm"
                      onClick={() => {
                        setActionModalForm(null);
                        permanentDelete(f);
                      }}
                    >
                      <Trash2 size={14} className="ml-1" /> حذف دائمی فرم
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* دکمه‌های ناوبری اصلی */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        as={Link}
                        to={`/admin/forms/${f.id}`}
                        variant="teal"
                        size="sm"
                        onClick={() => setActionModalForm(null)}
                      >
                        <Edit size={14} className="ml-1.5" /> ویرایش در فرم‌ساز
                      </Button>
                      <Button
                        as={Link}
                        to={`/admin/forms/${f.id}/responses`}
                        variant="navy"
                        size="sm"
                        onClick={() => setActionModalForm(null)}
                      >
                        <BarChart3 size={14} className="ml-1.5" /> پاسخ‌ها ({faNum(c.total)})
                      </Button>
                      <Button
                        as={Link}
                        to={`/admin/forms/${f.id}/share`}
                        variant="white"
                        size="sm"
                        onClick={() => setActionModalForm(null)}
                      >
                        <Share2 size={14} className="ml-1.5" /> اشتراک‌گذاری و امبد
                      </Button>
                      {f.published && (
                        <Button
                          as="a"
                          href={`/f/${f.slug}`}
                          target="_blank"
                          variant="white"
                          size="sm"
                        >
                          <ExternalLink size={14} className="ml-1.5" /> مشاهده فرم زنده
                        </Button>
                      )}
                    </div>

                    {/* دکمه‌های تغییر وضعیت */}
                    <div className="border-t border-ink/10 pt-2.5 flex flex-wrap gap-2">
                      {hasPermission("publish_form") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePublish(f)}
                          className={f.published ? "!text-amber-700 hover:!bg-amber-50" : "!text-teal-text hover:!bg-teal/10"}
                        >
                          {f.published ? "⏸ لغو انتشار فرم" : "▶ انتشار فرم"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActionModalForm(null);
                          duplicate(f);
                        }}
                        disabled={busy}
                      >
                        <Copy size={13} className="ml-1" /> تکثیر (کپی)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archiveForm(f)}
                        className="text-navy hover:bg-navy/5"
                      >
                        {f.archived ? (
                          <>
                            <ArchiveRestore size={14} className="ml-1.5 text-navy" />
                            <span>خروج از آرشیو</span>
                          </>
                        ) : (
                          <>
                            <Archive size={14} className="ml-1.5 text-navy" />
                            <span>آرشیو کردن فرم</span>
                          </>
                        )}
                      </Button>
                      {hasPermission("delete_form") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!text-magenta-text hover:!bg-magenta/10 mr-auto"
                          onClick={() => {
                            setActionModalForm(null);
                            setDeleting(f);
                          }}
                        >
                          <Trash2 size={13} className="ml-1" /> سطل زباله
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* دکمه بستن */}
              <div className="pt-2 border-t border-ink/10 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setActionModalForm(null)}>
                  بستن
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ─── Type Selection Modal ─── */}
      <Modal
        open={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title="ساخت فرم جدید"
      >
        <p className="text-sm font-semibold text-ink-subtle dark:text-slate-400 mb-4 leading-7">
          تم پیش‌فرض و نوع ارائه فرم را مشخص کنید. بعداً در تنظیمات فرم نیز می‌توانید آن‌ها را تغییر دهید.
        </p>

        {/* تم پیش‌فرض ظاهر فرم */}
        <div className="mb-5 p-3.5 rounded-2xl bg-navy/5 dark:bg-slate-800/60 border border-navy/10 dark:border-slate-700">
          <label className="block text-xs sm:text-sm font-black text-navy dark:text-slate-200 mb-2.5">
            🎨 تم پیش‌فرض فرم:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "light", label: "روشن (سفید)", icon: Sun, desc: "تم شاداب رکاد" },
              { id: "dark", label: "دارک مود (شب)", icon: Moon, desc: "تیره و پرکنتراست" },
              { id: "system", label: "هماهنگ با دستگاه", icon: Monitor, desc: "تشخیص خودکار" },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = newFormTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setNewFormTheme(t.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer text-center ${
                    isSelected
                      ? "border-teal bg-teal/15 text-teal shadow-xs font-black scale-[1.02]"
                      : "border-ink/10 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-ink/70 dark:text-slate-300 hover:border-teal/40"
                  }`}
                >
                  <Icon size={20} className={isSelected ? "text-teal" : "text-ink/60 dark:text-slate-400"} />
                  <span className="text-xs font-black mt-1.5">{t.label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5 leading-tight">{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* انتخاب نوع نمایش فرم */}
        <label className="block text-xs sm:text-sm font-black text-navy dark:text-slate-200 mb-2.5">
          📋 ساختار سوالات:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {FORM_TYPES.map((ft) => (
            <button
              key={ft.key}
              onClick={() => createForm(ft.key, newFormTheme)}
              disabled={busy}
              className="text-right p-5 rounded-2xl border-2 border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal dark:hover:border-teal hover:shadow-md transition-all group disabled:opacity-50 cursor-pointer"
            >
              <span className="block mb-3 group-hover:scale-110 transition-transform text-navy dark:text-white">
                {ft.key === "step_by_step" ? <ClipboardList size={32} /> : <AlignLeft size={32} />}
              </span>
              <h3 className="text-base sm:text-lg font-black text-navy dark:text-white mb-1">{ft.title}</h3>
              <p className="text-xs font-medium text-ink-subtle dark:text-slate-400 leading-5">{ft.description}</p>
            </button>
          ))}
        </div>
        {busy && (
          <div className="mt-4 text-center text-sm font-bold text-teal-text dark:text-teal">
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
          <AlertTriangle size={44} className="text-amber-500" />
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
              پیام به پشتیبانی برای ارتقا
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
