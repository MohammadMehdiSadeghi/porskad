import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import StickerCard from "../../../components/ui/StickerCard";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import { FormsListSkeleton } from "../../../components/ui/Skeleton";

import EmptyState from "../../../components/ui/EmptyState";
import Modal from "../../../components/ui/Modal";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../context/AuthContext";
import { copyToClipboard, randomSlug, faNum, faDate, getFormModelBadge } from "../../../lib/utils";
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

// ─── کامپوننت نوتیفیکیشن Undo با دیزاین سیستم پرس‌کاد ───
function UndoToast({ formTitle, onUndo, onDismiss, duration = 6000 }) {
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
    <div
      dir="rtl"
      className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-slide-up"
    >
      <div className="pointer-events-auto relative isolate bg-[#0B0F19] dark:bg-[#131B2E] border border-teal/40 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_20px_rgba(45,212,191,0.15)] rounded-2xl flex items-center gap-3 pr-4 pl-3 py-3 w-full sm:w-auto sm:min-w-[400px] sm:max-w-lg transition-all">
        {/* نوار گرادینت عمودی سمت راست */}
        <span className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-teal to-cyan-400 rounded-r-2xl shadow-[0_0_10px_#2DD4BF]" />

        {/* آیکون مدرن زباله */}
        <div className="w-10 h-10 shrink-0 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.2)]">
          <Trash2 size={17} />
        </div>

        {/* پیام و عنوان */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-xs sm:text-sm font-extrabold text-white truncate leading-5">
            فرم «<span className="text-teal font-black">{formTitle}</span>» به سطل زباله منتقل شد
          </p>
          <span className="text-[11px] font-semibold text-slate-400 leading-4 mt-0.5 whitespace-nowrap">
            امکان بازگردانی تا پایان تایمر
          </span>
        </div>

        {/* دکمه بازگردانی بدون ماسک مشکی و کاملاً روان */}
        <button
          type="button"
          onClick={() => {
            cancelAnimationFrame(timerRef.current);
            onUndo();
          }}
          className="no-anim shrink-0 flex items-center gap-1.5 bg-teal hover:bg-[#34e2cb] active:bg-[#20b8a4] text-[#0B0F19] font-black rounded-xl px-4 py-2 text-xs border border-teal/30 shadow-[0_0_14px_rgba(45,212,191,0.35)] outline-none focus:outline-none focus:ring-0 active:outline-none select-none transition-colors cursor-pointer whitespace-nowrap"
        >
          <Undo2 size={14} className="stroke-[2.5]" />
          <span>بازگردانی</span>
        </button>

        {/* دکمه بستن */}
        <button
          type="button"
          onClick={() => {
            cancelAnimationFrame(timerRef.current);
            onDismiss();
          }}
          className="no-anim shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 outline-none focus:outline-none focus:ring-0 active:outline-none transition-colors cursor-pointer"
          aria-label="بستن"
        >
          <X size={14} />
        </button>

        {/* نوار پیشرفت زمانی پیوسته با گوشه‌های گرد پایینی */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-2xl overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-teal to-cyan-400 shadow-[0_0_10px_#2DD4BF] transition-none"
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
  const [permanentDeleting, setPermanentDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newFormTheme, setNewFormTheme] = useState("light");
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [publishPromptForm, setPublishPromptForm] = useState(null);
  const [actionModalForm, setActionModalForm] = useState(null);

  // ─── Undo state ───
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
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
      // کاربر عادی فقط فرم‌های خودش را دریافت می‌کند (و فرم‌های حذف دائمی شده را به هیچ وجه نمی‌بیند)
      if (!isOwner()) {
        allForms = allForms.filter(
          (f) =>
            (f.manager_id === user.id || f.created_by === user.id) &&
            !f.user_purged_at &&
            !f.settings?.user_purged
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
    () =>
      forms.filter(
        (f) =>
          f.published &&
          !f.archived &&
          !f.deleted_at &&
          !f.user_purged_at &&
          !f.settings?.user_purged
      ).length,
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

    // ۱. ابتدا تلاش از طریق API v1 رسمی جهت کنترل سهمیه و ساخت فرم
    try {
      const apiRes = await fetch("/api/v1/forms", {
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
      } else {
        const errJson = await apiRes.json().catch(() => ({}));
        if (errJson.quota_exceeded) {
          setBusy(false);
          setShowTypeModal(false);
          setShowQuotaModal(true);
          push(errJson.error || "سقف فرم‌های همزمان تکمیل شده است.", "error");
          return;
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
      if (error) {
        console.warn("Direct insert initial error:", error);
        const retryBase = { ...base };
        if (error.message?.includes("default_theme")) delete retryBase.default_theme;
        if (error.message?.includes("form_type")) delete retryBase.form_type;
        if (error.message?.includes("manager_id")) delete retryBase.manager_id;

        let retry = await supabase.from("forms").insert(retryBase).select().single();
        if (retry.error) {
          const minimalBase = {
            slug,
            title,
            published: false,
            created_by: currentUserId,
          };
          retry = await supabase.from("forms").insert(minimalBase).select().single();
        }
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
    push("فرم فعلاً پیش‌نویس است — بعد از انتشار، لینک آن قابل کپی و بازدید می‌شود.", "warning", 5500);
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

  // انتشار فرم (بدون toggle) — برای مودال «ابتدا منتشر کنید»
  async function publishNow(form) {
    if (!form || form.published) return false;
    if (!hasPermission("publish_form")) {
      push("شما مجوز انتشار فرم ندارید.", "error");
      return false;
    }
    if (!isOwner()) {
      const activePublishedCount = forms.filter(
        (f) => f.published && !f.archived && !f.deleted_at && f.id !== form.id
      ).length;
      const allowedMax = profile?.max_forms ?? 5;
      if (allowedMax < 999999 && activePublishedCount >= allowedMax) {
        setShowQuotaModal(true);
        push(`سقف فرم‌های همزمان فعال (حداکثر ${faNum(allowedMax)} فرم) تکمیل شده است. لطفاً ابتدا یکی از فرم‌های فعال را غیرفعال یا بایگانی کنید.`, "error");
        return false;
      }
    }
    const { error } = await supabase.from("forms").update({ published: true }).eq("id", form.id);
    if (error) {
      push(error.message || "انتشار فرم ناموفق بود", "error");
      return false;
    }
    push("فرم منتشر شد!");
    setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, published: true } : f)));
    setActionModalForm((prev) => (prev && prev.id === form.id ? { ...prev, published: true } : prev));
    return true;
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

    // ۱. تلاش از طریق API سرورلس v1
    try {
      const apiRes = await fetch("/api/v1/forms", {
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
    // تا وقتی فرم منتشر نشده، لینک عمومی کار نمی‌کند — اجازه کپی داده نمی‌شود
    if (!form.published) {
      push("ابتدا فرم را منتشر کنید، بعد از آن لینک قابل کپی است.", "warning");
      setPublishPromptForm(form);
      return;
    }
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
    const nowIso = new Date().toISOString();
    setDeleting(null);

    let deleteSuccess = false;

    // ۱. ابتدا تلاش از طریق API سرور (با دسترسی کامل service_role و ثبت در جدول trash)
    try {
      const apiRes = await fetch(`/api/v1/forms/${formToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
      });
      if (apiRes.ok) {
        deleteSuccess = true;
      }
    } catch (e) {
      console.warn("API delete fallback:", e);
    }

    // ۲. فالبک مستقیم با supabase client
    if (!deleteSuccess) {
      const { error } = await supabase
        .from("forms")
        .update({ deleted_at: nowIso, published: false })
        .eq("id", formToDelete.id);
      if (error) {
        push("حذف ناموفق بود: " + (error.message || ""), "error");
        return;
      }
    }

    // به‌روزرسانی وضعیت در استیت محلی جهت انتقال به تب سطل زباله (نه حذف کامل از آرایه)
    setForms((fs) =>
      fs.map((f) =>
        f.id === formToDelete.id
          ? { ...f, deleted_at: nowIso, published: false }
          : f
      )
    );

    // نمایش Undo toast به مدت ۶ ثانیه
    setUndoToast({ ...formToDelete, deleted_at: nowIso, published: false });

    // ذخیره تایمر برای لغو toast بعد از ۶ ثانیه
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 6000);
  }

  // ─── بازگردانی از سطل زباله ───
  async function restoreForm(form) {
    let restoreSuccess = false;

    // ۱. تلاش از طریق API سرور
    try {
      const apiRes = await fetch(`/api/v1/forms/${form.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({ deleted_at: null }),
      });
      if (apiRes.ok) {
        restoreSuccess = true;
      }
    } catch (e) {
      console.warn("API restore fallback:", e);
    }

    // ۲. فالبک با supabase client
    if (!restoreSuccess) {
      const { error } = await supabase
        .from("forms")
        .update({ deleted_at: null })
        .eq("id", form.id);
      if (error) {
        push("بازیابی ناموفق بود: " + (error.message || ""), "error");
        return;
      }
    }

    push("فرم بازیابی شد");
    setForms((fs) =>
      fs.map((f) => (f.id === form.id ? { ...f, deleted_at: null } : f))
    );
    load(true);
  }

  // ─── تایید حذف دائمی (از دید کاربر حذف می‌شود اما تا ۳۰ روز در سوپرادمین محفوظ می‌ماند) ───
  async function confirmPermanentDelete() {
    if (!permanentDeleting) return;
    const form = permanentDeleting;
    setPermanentDeleting(null);

    let hardSuccess = false;
    const nowIso = new Date().toISOString();

    // ۱. فراخوانی RPC امن دیتابیس جهت ثبت در سطل زباله سوپرادمین و حذف قطعی از دید کاربر
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("user_permanent_delete_form", {
        p_form_id: form.id,
      });
      if (!rpcErr && (rpcData?.ok || rpcData === true)) {
        hardSuccess = true;
      }
    } catch (e) {
      console.warn("RPC permanent delete fallback:", e);
    }

    // ۲. فالبک از طریق وب‌سرویس سرور با فلگ permanent=true
    if (!hardSuccess) {
      try {
        const apiRes = await fetch(`/api/v1/forms/${form.id}?permanent=true`, {
          method: "DELETE",
          headers: {
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          },
        });
        if (apiRes.ok) {
          hardSuccess = true;
        }
      } catch (e) {
        console.warn("API permanent delete fallback:", e);
      }
    }

    // ۳. فالبک مستقیم در کلاینت
    if (!hardSuccess) {
      const nextSettings = {
        ...(form.settings || {}),
        user_purged: true,
        user_purged_at: nowIso,
        deleted_by: user?.id,
        deleted_by_email: user?.email,
      };

      const updatePayload = {
        deleted_at: nowIso,
        published: false,
        user_purged_at: nowIso,
        settings: nextSettings,
      };

      let { error } = await supabase.from("forms").update(updatePayload).eq("id", form.id);
      if (error && error.message?.includes("user_purged_at")) {
        delete updatePayload.user_purged_at;
        const retry = await supabase.from("forms").update(updatePayload).eq("id", form.id);
        error = retry.error;
      }
      if (!error) {
        hardSuccess = true;
      }
    }

    if (!hardSuccess) {
      push("حذف ناموفق بود", "error");
      return;
    }

    push("فرم برای همیشه از لیست شما حذف شد");
    setForms((fs) => fs.filter((f) => f.id !== form.id));
    load(true);
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

    // کاربران عادی هرگز فرم‌های حذف دائمی شده را نباید ببینند
    if (!isOwner()) {
      result = result.filter((f) => !f.user_purged_at && !f.settings?.user_purged);
    }

    if (filter === "trash") {
      // سطل زباله کاربر: فقط فرم‌های حذف‌شده موقت (نه حذف قطعی)
      result = result.filter((f) => f.deleted_at && !f.user_purged_at && !f.settings?.user_purged);
    } else if (filter === "archived") {
      result = result.filter((f) => f.archived && !f.deleted_at && !f.user_purged_at && !f.settings?.user_purged);
    } else {
      // حالت عادی: حذف‌شده و آرشیو‌شده رو نشون نده
      result = result.filter((f) => !f.deleted_at && !f.archived && !f.user_purged_at && !f.settings?.user_purged);
      if (filter === "published") result = result.filter((f) => f.published);
      else if (filter === "draft") result = result.filter((f) => !f.published);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((f) => f.title.toLowerCase().includes(s));
    }
    return result;
  }, [forms, filter, search, isOwner]);

  // شمارنده سطل زباله (صرفاً موارد حذف موقت)
  const trashCount = useMemo(
    () => forms.filter((f) => f.deleted_at && !f.user_purged_at && !f.settings?.user_purged).length,
    [forms]
  );

  if (loading) return <FormsListSkeleton />;

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
          <h1 className="text-xl sm:text-3xl font-black text-sec dark:text-white">فرم‌ها</h1>
          <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
            {forms.filter((f) => !f.deleted_at).length} فرم — برای ویرایش روی هر فرم بزنید
          </p>
        </div>
        <Button
          variant="teal"
          size="sm"
          onClick={() => {
            setShowTypeModal(true);
          }}
          disabled={busy}
        >
          + فرم جدید
        </Button>
      </div>

      {/* نوار سهمیه برای کاربر عادی */}
      {!isOwner() && (
        <div className="rokad-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-hard-sm dark:shadow-dark-hard">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ecosystem-light dark:bg-ecosystem-darker/60 text-ecosystem-darker dark:text-ecosystem-light flex items-center justify-center font-black text-sm">
              {faNum(activeFormsCount)}/{faNum(maxForms)}
            </div>
            <div>
              <div className="text-sm font-black text-sec dark:text-white flex items-center gap-2">
                <span>سهمیه فرم‌های فعال شما</span>
                <Badge color={activeFormsCount >= maxForms ? "red" : "green"}>
                  {activeFormsCount >= maxForms ? "تکمیل شده" : `${faNum(maxForms - activeFormsCount)} فرم باقی‌مانده`}
                </Badge>
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                تعداد فرم‌های همزمان فعال (منتشر شده) در سامانه
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-36 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${activeFormsCount >= maxForms ? "bg-female-normal" : "bg-ecosystem-normal"}`}
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
          className="flex-1 min-w-[200px] bg-white dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-sec dark:text-white placeholder:text-gray-400 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/20 focus:outline-none"
        />
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 rounded-xl p-1 overflow-x-auto scrollbar-none max-w-full">
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
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${filter === f.key
                  ? f.key === "trash" ? "bg-female-normal text-white shadow-xs" : "bg-ecosystem-normal text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-sec dark:hover:text-white"
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
          action={!search && filter !== "trash" && <Button variant="teal" size="sm" onClick={() => setShowTypeModal(true)}>+ فرم جدید</Button>}
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
                className="transition-all duration-200"
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
                        {!isTrashed && !f.archived && (
                          <Badge color={getFormModelBadge(f).color}>
                            {getFormModelBadge(f).label}
                          </Badge>
                        )}
                        {!isTrashed && !f.archived && (f.published ? (
                          <Badge color="green">منتشر</Badge>
                        ) : (
                          <Badge color="gray">پیش‌نویس</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Stats & Creation Date (آمار و تاریخ ساخت) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-subtle dark:text-slate-400 bg-[#FAFAFA] dark:bg-[#1C2536] rounded-xl px-3.5 py-2 border-[1.5px] border-gray-200 dark:border-[#242F42]">
                      {!isTrashed ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span>{faNum(c.total)} دریافتی</span>
                            <span>·</span>
                            <span>{faNum(c.complete)} تکمیل</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar size={12} className="text-teal shrink-0" />
                            <span>ساخت: {faDate(f.created_at)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs font-semibold text-ink-subtle dark:text-slate-400">
                          حذف شده در {faDate(f.deleted_at)}
                        </div>
                      )}
                    </div>

                    {/* Link (لینک فرم با قابلیت کپی سریع و باز کردن) */}
                    {!isTrashed && (
                      <div className="flex items-center gap-2 bg-white dark:bg-[#151C28] rounded-xl px-3.5 py-2 border-[1.5px] border-gray-200 dark:border-[#242F42] text-xs">
                        <Link2 size={13} className="text-teal shrink-0" />
                        <span className="font-mono text-ink-subtle dark:text-slate-300 truncate flex-1" dir="ltr">
                          /f/{f.slug}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            share(f);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:text-ecosystem-normal-hover transition-colors shrink-0 cursor-pointer"
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
                            className="inline-flex items-center text-ink-subtle hover:text-sec dark:hover:text-white shrink-0 transition-colors"
                            title="مشاهده فرم"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}

                    {/* دکمه استاندارد عملیات و مدیریت فرم بر اساس دیزاین سیستم رُکاد */}
                    <div className="pt-1 mt-auto">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionModalForm(f);
                        }}
                        className="w-full justify-between group"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Settings size={14} className="text-teal group-hover:text-white transition-colors shrink-0" />
                          <span>مدیریت و عملیات فرم</span>
                        </span>
                        <span className="text-xs font-bold opacity-80 group-hover:opacity-100 whitespace-nowrap shrink-0">
                          گزینه‌ها ←
                        </span>
                      </Button>
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
              <div className="bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-sec dark:text-white text-base leading-6">
                      {f.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-ink-subtle dark:text-slate-400">
                      <User size={13} className="text-teal shrink-0" />
                      <span>سازنده: <strong className="text-sec dark:text-slate-200">{creatorName}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {isTrashed && <Badge color="red">حذف شده</Badge>}
                    {!isTrashed && f.archived && <Badge color="gray">آرشیو</Badge>}
                    {!isTrashed && !f.archived && (
                      <Badge color={getFormModelBadge(f).color}>
                        {getFormModelBadge(f).label}
                      </Badge>
                    )}
                    {!isTrashed && !f.archived && (f.published ? (
                      <Badge color="green">منتشر</Badge>
                    ) : (
                      <Badge color="gray">پیش‌نویس</Badge>
                    ))}
                  </div>
                </div>

                {/* آمار و زمان */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-subtle dark:text-slate-400 pt-2 border-t border-gray-200 dark:border-[#242F42]">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1"><BarChart3 size={13} className="text-teal" /> {faNum(c.total)} پاسخ دریافتی</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-teal" /> {faNum(c.complete)} تکمیل</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar size={13} className="text-teal" />
                    <span>ساخت: {faDate(f.created_at)}</span>
                  </div>
                </div>

                {/* لینک سریع با کپی */}
                {!isTrashed && (
                  <div className="flex items-center gap-2 bg-white dark:bg-[#151C28] rounded-xl px-3.5 py-2 border-[1.5px] border-gray-200 dark:border-[#242F42] text-xs mt-1">
                    <Link2 size={13} className="text-teal shrink-0" />
                    <span className="font-mono text-ink-subtle dark:text-slate-300 truncate flex-1" dir="ltr">
                      /f/{f.slug}
                    </span>
                    <button
                      type="button"
                      onClick={() => share(f)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:text-ecosystem-normal-hover transition-colors shrink-0 cursor-pointer"
                    >
                      <Copy size={11} /> کپی
                    </button>
                    {f.published && (
                      <a
                        href={`/f/${f.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-ink-subtle hover:text-sec dark:hover:text-white transition-colors shrink-0"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* گزینه‌ها و دکمه‌های عملیات */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-black text-sec dark:text-slate-200">گزینه‌های دسترسی و عملیات:</span>

                {isTrashed ? (
                  <div className="flex flex-wrap items-center gap-2.5">
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
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setActionModalForm(null);
                        setPermanentDeleting(f);
                      }}
                    >
                      <Trash2 size={14} className="ml-1" /> حذف دائمی فرم
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* دکمه‌های ناوبری اصلی */}
                    <div className="flex flex-wrap items-center gap-2.5">
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
                        variant="outline"
                        size="sm"
                        onClick={() => setActionModalForm(null)}
                      >
                        <Share2 size={14} className="ml-1.5 text-teal" /> اشتراک‌گذاری و امبد
                      </Button>
                      {f.published && (
                        <Button
                          as="a"
                          href={`/f/${f.slug}`}
                          target="_blank"
                          variant="white"
                          size="sm"
                        >
                          <ExternalLink size={14} className="ml-1.5" /> مشاهده زنده
                        </Button>
                      )}
                    </div>

                    {/* دکمه‌های تغییر وضعیت */}
                    <div className="border-t border-gray-200 dark:border-[#242F42] pt-3 flex flex-wrap gap-2.5">
                      {hasPermission("publish_form") && (
                        <Button
                          variant={f.published ? "orange" : "teal"}
                          size="sm"
                          onClick={() => togglePublish(f)}
                        >
                          {f.published ? "⏸ لغو انتشار فرم" : "▶ انتشار فرم"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActionModalForm(null);
                          duplicate(f);
                        }}
                        disabled={busy}
                      >
                        <Copy size={13} className="ml-1 text-teal" /> تکثیر (کپی)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archiveForm(f)}
                      >
                        {f.archived ? (
                          <>
                            <ArchiveRestore size={14} className="ml-1.5 text-teal" />
                            <span>خروج از آرشیو</span>
                          </>
                        ) : (
                          <>
                            <Archive size={14} className="ml-1.5 text-sec dark:text-slate-300" />
                            <span>آرشیو فرم</span>
                          </>
                        )}
                      </Button>
                      {hasPermission("delete_form") && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="mr-auto"
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
              <div className="pt-3 border-t border-gray-200 dark:border-[#242F42] flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setActionModalForm(null)}>
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

      {/* ─── Delete Modal (انتقال به سطل زباله) ─── */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="انتقال فرم به سطل زباله">
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/30 text-rose-500 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
            <Trash2 size={26} />
          </div>
          <h3 className="text-base sm:text-lg font-black text-navy dark:text-white mb-2 leading-7">
            فرم «<span className="text-teal">{deleting?.title}</span>» به سطل زباله منتقل شود؟
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 leading-6 max-w-sm mb-6">
            این فرم از لیست فعال شما خارج می‌شود، اما تا ۳۰ روز آینده در تب «سطل زباله» محفوظ است و هر زمان بخواهید می‌توانید آن را بازیابی کنید.
          </p>
          <div className="flex gap-3 w-full justify-center">
            <button
              type="button"
              onClick={confirmDelete}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(244,63,94,0.35)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              بله، انتقال به سطل زباله
            </button>
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="py-2.5 px-5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-ink dark:text-slate-300 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap"
            >
              انصراف
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Permanent Delete Modal (حذف دائمی — جایگزین کامل confirm مرورگر) ─── */}
      <Modal open={!!permanentDeleting} onClose={() => setPermanentDeleting(null)} title="حذف دائمی فرم">
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <AlertTriangle size={26} />
          </div>
          <h3 className="text-base sm:text-lg font-black text-navy dark:text-white mb-2 leading-7">
            حذف دائمی فرم «<span className="text-rose-400">{permanentDeleting?.title}</span>»
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 leading-6 max-w-sm mb-6">
            آیا از حذف کامل این فرم اطمینان دارید؟ این فرم و تمام دسترسی‌های آن به طور کامل از پنل مدیریت شما پاک خواهد شد.
          </p>
          <div className="flex gap-3 w-full justify-center">
            <button
              type="button"
              onClick={confirmPermanentDelete}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              بله، برای همیشه حذف کن
            </button>
            <button
              type="button"
              onClick={() => setPermanentDeleting(null)}
              className="py-2.5 px-5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-ink dark:text-slate-300 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap"
            >
              انصراف
            </button>
          </div>
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

      {/* ─── Publish Required Modal (کپی لینک قبل از انتشار) ─── */}
      <Modal
        open={Boolean(publishPromptForm)}
        onClose={() => setPublishPromptForm(null)}
        title="فرم هنوز منتشر نشده!"
      >
        {publishPromptForm && (
          <div className="flex flex-col gap-4 text-center items-center py-2">
            <AlertTriangle size={44} className="text-amber-500" />
            <h3 className="text-base font-black text-navy dark:text-white leading-7">
              برای کپی کردن لینک، ابتدا باید فرم «{publishPromptForm.title}» را منتشر کنید.
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 leading-6">
              تا وقتی فرم منتشر نشده، لینک آن برای مخاطب‌ها باز نمی‌شود؛ پس کپی لینک کمکی نمی‌کند. همین‌جا منتشرش کنیم؟
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              <Button
                variant="teal"
                size="sm"
                disabled={busy || !hasPermission("publish_form")}
                onClick={async () => {
                  const f = publishPromptForm;
                  const fresh = forms.find((x) => x.id === f.id) || f;
                  const done = await publishNow(fresh);
                  if (done) {
                    setPublishPromptForm(null);
                    const url = `${window.location.origin}/f/${f.slug}`;
                    const ok = await copyToClipboard(url);
                    push(ok ? "فرم منتشر شد و لینک کپی شد!" : `لینک: ${url}`, ok ? "success" : "info");
                  }
                }}
              >
                ▶ انتشار و کپی لینک
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPublishPromptForm(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Undo Toast ─── */}
      {undoToast && (
        <UndoToast
          formTitle={undoToast.title}
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
