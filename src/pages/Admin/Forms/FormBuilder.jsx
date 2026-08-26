import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import StickerCard from "../../../components/ui/StickerCard";
import { useToast } from "../../../components/ui/Toast";
import { QUESTION_TYPES, QUESTION_TYPE_ORDER, makeQuestion } from "../../../lib/questionTypes";
import { slugify, copyToClipboard } from "../../../lib/utils";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save,
  Eye,
  Link as LinkIcon,
  FileText,
  Settings,
} from "lucide-react";

const inputCls =
  "w-full bg-white border-2 border-ink/25 focus:border-teal focus:ring-4 focus:ring-teal/20 rounded-pill-md px-4 py-2.5 text-sm font-semibold text-navy focus:outline-none transition-all";

function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-extrabold text-navy">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink/40">{hint}</span>}
    </label>
  );
}

function QuestionEditor({ q, index, total, onChange, onMove, onDelete }) {
  const meta = QUESTION_TYPES[q.type];

  function setOpt(i, val) {
    const opts = [...q.options];
    opts[i] = val;
    onChange({ options: opts });
  }

  return (
    <div className="bg-white rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] border-2 border-ink/10 p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="w-7 h-7 flex items-center justify-center bg-teal text-white rounded-lg text-xs font-black">
          {index + 1}
        </span>
        <Badge color="indigo">
          {meta.icon} {meta.label}
        </Badge>
        <label className="flex items-center gap-1.5 text-xs font-medium text-ink/50 mr-auto cursor-pointer">
          <input
            type="checkbox"
            checked={q.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="accent-teal w-4 h-4"
          />
          اجباری
        </label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="w-7 h-7 rounded-lg border border-ink/15 bg-white text-ink/50 hover:bg-bg-neutral disabled:opacity-30 flex items-center justify-center transition-colors"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="w-7 h-7 rounded-lg border border-ink/15 bg-white text-ink/50 hover:bg-bg-neutral disabled:opacity-30 flex items-center justify-center transition-colors"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg border border-magenta-text/25 bg-white text-magenta hover:bg-blush flex items-center justify-center transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        value={q.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="متن سوال..."
        className={`${inputCls} !font-bold !text-base mb-2`}
      />
      <input
        value={q.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="توضیح اختیاری..."
        className={`${inputCls} !text-sm`}
      />

      {/* Options */}
      {meta.hasOptions && (
        <div className="mt-3 flex flex-col gap-2 border border-dashed border-amber-200 rounded-lg bg-amber-50/50 p-3">
          <span className="text-xs font-bold text-amber-700">
            گزینه‌ها ({q.options.length} — بین ۲ تا ۶)
          </span>
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full border border-amber-300 text-amber-700 text-xs font-black">
                {i + 1}
              </span>
              <input
                value={opt}
                onChange={(e) => setOpt(i, e.target.value)}
                className={`${inputCls} !py-1.5 !text-sm flex-1`}
              />
              <button
                onClick={() => onChange({ options: q.options.filter((_, j) => j !== i) })}
                disabled={q.options.length <= 2}
                className="w-6 h-6 shrink-0 rounded text-ink/40 hover:text-magenta disabled:opacity-30 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ options: [...q.options, `گزینه ${q.options.length + 1}`] })}
            disabled={q.options.length >= 6}
            className="self-start text-xs font-bold text-amber-700 hover:text-amber-900 disabled:opacity-40"
          >
            + افزودن گزینه
          </button>
        </div>
      )}
    </div>
  );
}

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: f, error } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
      if (error || !f) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("form_id", id)
        .order("position");
      setForm(f);
      setQuestions((qs ?? []).map((q) => ({ ...q, localId: q.id })));
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const setFormField = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const updateQuestion = (localId, patch) => {
    setQuestions((qs) => qs.map((q) => (q.localId === localId ? { ...q, ...patch } : q)));
    setDirty(true);
  };

  const addQuestion = (type) => {
    setQuestions((qs) => [...qs, makeQuestion(type, qs.length)]);
    setDirty(true);
  };

  const deleteQuestion = (localId) => {
    setQuestions((qs) => qs.filter((q) => q.localId !== localId));
    setDirty(true);
  };

  const moveQuestion = (localId, dir) => {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.localId === localId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    setDirty(true);
  };

  const publicUrl = form?.slug ? `${window.location.origin}/f/${form.slug}` : "";

  async function save() {
    if (saving) return;
    const cleanSlug = slugify(form.slug);
    if (cleanSlug.length < 3) {
      setSlugError("اسلاگ باید حداقل ۳ کاراکتر باشد.");
      return;
    }
    if (!form.title.trim()) {
      push("عنوان فرم خالی است", "error");
      return;
    }
    const emptyQ = questions.find((q) => !q.title.trim());
    if (emptyQ) {
      push("یکی از سوال‌ها متن خالی دارد", "error");
      return;
    }
    const badChoice = questions.find(
      (q) => q.type === "choice" && (q.options.length < 2 || q.options.some((o) => !o.trim()))
    );
    if (badChoice) {
      push("سوال چندگزینه‌ای باید ۲ تا ۶ گزینه‌ی غیرخالی داشته باشد", "error");
      return;
    }

    setSaving(true);
    setSlugError(null);
    try {
      const { error: formError } = await supabase
        .from("forms")
        .update({
          title: form.title.trim(),
          description: form.description ?? "",
          slug: cleanSlug,
          welcome_title: form.welcome_title,
          welcome_message: form.welcome_message,
          exit_title: form.exit_title,
          exit_message: form.exit_message,
          published: form.published,
        })
        .eq("id", id);

      if (formError) {
        if (formError.code === "23505") setSlugError("این اسلاگ قبلاً استفاده شده.");
        throw formError;
      }

      const { data: dbQuestions } = await supabase
        .from("questions")
        .select("id")
        .eq("form_id", id);
      const localIds = new Set(questions.filter((q) => q.id).map((q) => q.id));
      const toDelete = (dbQuestions ?? []).filter((q) => !localIds.has(q.id));
      if (toDelete.length) {
        const { error: delError } = await supabase
          .from("questions")
          .delete()
          .in("id", toDelete.map((q) => q.id));
        if (delError) throw delError;
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.id) {
          const { error } = await supabase
            .from("questions")
            .update({
              title: q.title.trim(),
              description: q.description ?? "",
              required: q.required,
              options: q.type === "choice" ? q.options.map((o) => o.trim()) : [],
              position: i,
            })
            .eq("id", q.id);
          if (error) throw error;
        }
      }

      const newOnes = questions.filter((q) => !q.id);
      if (newOnes.length) {
        const rows = newOnes.map((q) => ({
          form_id: id,
          type: q.type,
          title: q.title.trim(),
          description: q.description ?? "",
          required: q.required,
          options: q.type === "choice" ? q.options.map((o) => o.trim()) : [],
          position: questions.findIndex((qq) => qq.localId === q.localId),
        }));
        const { error: insError } = await supabase.from("questions").insert(rows);
        if (insError) throw insError;
      }

      const { data: fresh } = await supabase
        .from("questions")
        .select("*")
        .eq("form_id", id)
        .order("position");
      if (fresh) setQuestions(fresh.map((q) => ({ ...q, localId: q.id })));
      setForm((f) => ({ ...f, slug: cleanSlug }));
      setDirty(false);
      push("همه‌چیز ذخیره شد ✅");
    } catch (err) {
      console.error(err);
      push("ذخیره ناموفق بود: " + (err.message ?? ""), "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="فرم‌ساز در حال بارگذاری..." />;

  if (notFound) {
    return (
      <div className="max-w-md mx-auto mt-10 rotate-[0.5deg]">
        <StickerCard theme="magenta">
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <span className="text-5xl -rotate-[3deg]">🤷</span>
            <h2 className="text-xl font-black text-navy">این فرم پیدا نشد!</h2>
            <Button as={Link} to="/admin/forms" variant="navy">برگشت به لیست فرم‌ها</Button>
          </div>
        </StickerCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button as={Link} to="/admin/forms" variant="ghost" size="sm">
            ← فرم‌ها
          </Button>
          <h1 className="text-xl font-black text-navy">فرم‌ساز</h1>
          {dirty && <Badge color="amber">• تغییرات ذخیره‌نشده</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {form.published && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const ok = await copyToClipboard(publicUrl);
                  push(ok ? "لینک کپی شد!" : publicUrl, ok ? "success" : "info");
                }}
              >
                <LinkIcon size={14} />
                کپی لینک
              </Button>
              <Button as="a" href={`/f/${form.slug}`} target="_blank" variant="ghost" size="sm">
                <Eye size={14} />
                پیش‌نمایش
              </Button>
            </>
          )}
          <Button
            as={Link}
            to={`/admin/forms/${id}/responses`}
            variant="ghost"
            size="sm"
          >
            <FileText size={14} />
            پاسخ‌ها
          </Button>
          <Button variant="indigo" size="sm" onClick={save} disabled={saving || !dirty}>
            <Save size={14} />
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </Button>
        </div>
      </div>

      {/* Form Settings */}        <div className="bg-white rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] border-2 border-ink/10 p-5 sm:p-6">
        <h2 className="font-bold text-navy mb-4 flex items-center gap-2">
          <Settings size={18} className="text-teal-text" />
          تنظیمات فرم
        </h2>

        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-ink/10">
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setFormField({ published: e.target.checked })}
              className="accent-teal w-5 h-5"
            />
            {form.published ? "✓ منتشرشده" : "پیش‌نویس"}
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="عنوان فرم">
            <input
              value={form.title}
              onChange={(e) => setFormField({ title: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="اسلاگ لینک" hint="لینک: /f/اسلاگ">
            <input
              dir="ltr"
              value={form.slug}
              onChange={(e) => setFormField({ slug: e.target.value })}
              className={`${inputCls} text-left ${slugError ? "!border-red-400" : ""}`}
            />
            {slugError && <p className="text-xs text-magenta mt-0.5">{slugError}</p>}
          </Field>
        </div>

        <div className="mt-4">
          <Field label="توضیح فرم (اختیاری)">
            <textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => setFormField({ description: e.target.value })}
              className={`${inputCls} resize-y`}
            />
          </Field>
        </div>

        <div className="mt-4 pt-4 border-t border-ink/10 grid sm:grid-cols-2 gap-4">
          <Field label="👋 عنوان پیام ورود">
            <input
              value={form.welcome_title}
              onChange={(e) => setFormField({ welcome_title: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="🎉 عنوان پیام خروج">
            <input
              value={form.exit_title}
              onChange={(e) => setFormField({ exit_title: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="متن پیام ورود">
            <textarea
              rows={2}
              value={form.welcome_message}
              onChange={(e) => setFormField({ welcome_message: e.target.value })}
              className={`${inputCls} resize-y`}
            />
          </Field>
          <Field label="متن پیام خروج">
            <textarea
              rows={2}
              value={form.exit_message}
              onChange={(e) => setFormField({ exit_message: e.target.value })}
              className={`${inputCls} resize-y`}
            />
          </Field>
        </div>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-navy">
          🧩 سوال‌ها ({questions.length})
        </h2>

        {questions.map((q, i) => (
          <QuestionEditor
            key={q.localId}
            q={q}
            index={i}
            total={questions.length}
            onChange={(patch) => updateQuestion(q.localId, patch)}
            onMove={(dir) => moveQuestion(q.localId, dir)}
            onDelete={() => deleteQuestion(q.localId)}
          />
        ))}

        {/* Add question */}
        <div className="bg-white rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] border-2 border-dashed border-ink/15 p-4 sm:p-5">
          <span className="text-sm font-bold text-ink/70 mb-3 block">
            ➕ افزودن سوال جدید
          </span>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPE_ORDER.map((key) => {
              const t = QUESTION_TYPES[key];
              return (
                <button
                  key={key}
                  onClick={() => addQuestion(key)}
                  title={t.hint}
                  className="flex items-center gap-1.5 bg-bg-neutral border border-ink/15 rounded-lg px-3 py-2 text-xs font-bold text-ink hover:bg-bg-mint hover:border-teal/30 hover:text-teal-text transition-colors cursor-pointer"
                >
                  <span className="text-base">{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur border-t border-ink/10 px-4 py-3 flex items-center justify-end gap-3 -mx-4 -mb-4 z-10">
        {dirty && <Badge color="amber">تغییرات ذخیره‌نشده</Badge>}
        <Button variant="ghost" size="sm" as={Link} to="/admin/forms">
          انصراف
        </Button>
        <Button variant="indigo" size="sm" onClick={save} disabled={saving || !dirty}>
          <Save size={16} />
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
      </div>
    </div>
  );
}
