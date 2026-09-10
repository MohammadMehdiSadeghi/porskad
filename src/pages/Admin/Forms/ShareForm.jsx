import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Spinner from "../../../components/ui/Spinner";
import { ShareFormSkeleton } from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import StickerCard from "../../../components/ui/StickerCard";
import Badge from "../../../components/ui/Badge";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../context/AuthContext";
import {
  ArrowLeft,
  Copy,
  Check,
  Code,
  Link2,
  SearchX,
  ExternalLink,
  Globe,
  AlertTriangle,
  Monitor,
  Maximize,
  PanelRightOpen,
  PanelBottomOpen,
  Layers,
  Sun,
  Moon,
} from "lucide-react";
import SEO from "../../../components/ui/SEO";

function CopyButton({ text, locked = false, onLocked }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    // تا وقتی فرم منتشر نشده، کپی لینک/کد ممنوع — اول انتشار
    if (locked) {
      onLocked?.();
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
        copied
          ? "bg-green-100 text-green-700 border border-green-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700"
          : "bg-bg-neutral text-ink/70 border border-ink/15 hover:bg-bg-mint hover:text-teal-text hover:border-teal/30 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:text-teal"
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "کپی شد!" : "کپی"}
    </button>
  );
}

function CodeBlock({ code, label, locked = false, onLocked }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-ink/50">{label}</span>
        <CopyButton text={code} locked={locked} onLocked={onLocked} />
      </div>
      <pre className="bg-gray-900 text-gray-100 rounded-xl px-4 py-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all" dir="ltr">
        {code}
      </pre>
    </div>
  );
}

export default function ShareForm() {
  const { id } = useParams();
  const { push } = useToast();
  const { user, isOwner, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [activeTab, setActiveTab] = useState("inline");
  const [embedTheme, setEmbedTheme] = useState("default");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function handleLockedCopy() {
    push("تا فرم منتشر نشده، لینک و کد قابل کپی نیست — ابتدا منتشر کنید.", "warning");
    setShowPublishModal(true);
  }

  // انتشار همان‌جایی از مودال «ابتدا منتشر کنید» (با بررسی سقف فرم‌های فعال)
  async function publishNow() {
    if (!form || form.published) return false;
    if (!isOwner()) {
      const { count, error: countError } = await supabase
        .from("forms")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
        .eq("archived", false)
        .is("deleted_at", null)
        .neq("id", form.id);
      const allowedMax = profile?.max_forms ?? 5;
      if (!countError && allowedMax < 999999 && (count ?? 0) >= allowedMax) {
        push(`سقف فرم‌های همزمان فعال (حداکثر ${allowedMax} فرم) تکمیل شده است.`, "error");
        return false;
      }
    }
    setPublishing(true);
    const { error } = await supabase.from("forms").update({ published: true }).eq("id", form.id);
    setPublishing(false);
    if (error) {
      push(error.message || "انتشار فرم ناموفق بود", "error");
      return false;
    }
    setForm((f) => ({ ...f, published: true }));
    setShowPublishModal(false);
    push("فرم منتشر شد! حالا می‌توانید لینک را کپی کنید.");
    return true;
  }

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      const { data, error } = await supabase
        .from("forms")
        .select("id, slug, title, public_id, published, manager_id, created_by, default_theme")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        push("فرم پیدا نشد", "error");
        setLoading(false);
        return;
      }
      if (!isOwner() && (!user || (data.manager_id !== user.id && data.created_by !== user.id))) {
        push("شما به این فرم دسترسی ندارید", "error");
        setForm(null);
        setLoading(false);
        return;
      }
      setForm(data);
      setLoading(false);
    }
    load();
  }, [id, user?.id, isOwner, authLoading, push]);

  if (loading) return <ShareFormSkeleton />;
  if (!form) {
    return (
      <EmptyState
        icon={<SearchX size={48} />}
        title="فرم پیدا نشد!"
        action={<Button as={Link} to="/admin/forms" variant="indigo">برگشت</Button>}
      />
    );
  }

  const publicId = form.public_id || form.id;
  const baseUrl = window.location.origin;

  const themeAttr = embedTheme !== "default" ? ` data-pcode-theme="${embedTheme}"` : "";
  const themeQuery = embedTheme !== "default" ? `?theme=${embedTheme}` : "";
  const popoverThemeLine = embedTheme !== "default" ? `\n    theme: "${embedTheme}",` : "";

  const embedUrl = `${baseUrl}/embed/${publicId}${themeQuery}`;
  const directLink = `${baseUrl}/f/${form.slug}${themeQuery}`;

  const codes = {
    inline: {
      label: "جاسازی در صفحه (Inline)",
      icon: Monitor,
      description: "فرم مستقیم داخل محتوای صفحه نمایش داده می‌شود",
      code: `<div data-pcode-form="${publicId}"${themeAttr} style="min-height:600px;"></div>\n<script src="${baseUrl}/loader.js" async></script>\n<!--
  تنظیمات دلخواه:
  - min-height: حداقل ارتفاع (پیش‌فرض: 600px)
  - اگر اسکرول نمی‌خواهید: overflow:hidden اضافه کنید
-->
`,
    },
    popup: {
      label: "پنجره شناور (Popup)",
      icon: Maximize,
      description: "فرم با کلیک روی دکمه باز می‌شود",
      code: `<button data-pcode-popup="${publicId}"${themeAttr}>باز کردن فرم</button>\n<script src="${baseUrl}/loader.js" async></script>`,
    },
    popover: {
      label: "پنل کوچک (Popover)",
      icon: PanelBottomOpen,
      description: "فرم از گوشه صفحه باز می‌شود",
      code: `<script>\n  window.PorsCode = window.PorsCode || {};\n  window.PorsCode.popover = {\n    formId: "${publicId}",${popoverThemeLine}\n    position: "bottom-right"\n  };\n</script>\n<script src="${baseUrl}/loader.js" async></script>`,
    },
    fullpage: {
      label: "تمام صفحه (Fullpage)",
      icon: Maximize,
      description: "فرم تمام صفحه را پر می‌کند",
      code: `<div id="pc-${publicId}" style="min-height:480px;width:100vw;height:100dvh;position:fixed;top:0;left:0;z-index:99999;background:transparent;">\n  <iframe\n    src="${embedUrl}"\n    style="width:100%;height:100%;border:none;background:transparent;"\n    allow="camera; microphone; autoplay"\n  ></iframe>\n</div>\n<!--
  تنظیمات دلخواه:
  - اگر اسکرول می‌خواهید: height را به مقدار دلخواه تغییر دهید (مثلاً 800px)
  - اگر اسکرول نمی‌خواهید: overflow:hidden اضافه کنید
  - مثال با اسکرول:
    <div style="height:800px;overflow:auto;">
      <iframe src="${embedUrl}" style="width:100%;height:100%;border:none;"></iframe>
    </div>
  - مثال بدون اسکرول:
    <div style="height:800px;overflow:hidden;">
      <iframe src="${embedUrl}" style="width:100%;height:100%;border:none;"></iframe>
    </div>
-->
`,
    },
    iframe: {
      label: "Iframe مستقیم",
      icon: Code,
      description: "بدون اسکریپت اضافی، مناسب CMSها",
      code: `<!--
  تنظیمات ارتفاع:
  - height: ارتفاع iframe را تنظیم کنید (پیش‌فرض: 600px)
  - overflow:visible → اسکرول فعال (پیش‌فرض مرورگر)
  - overflow:hidden → بدون اسکرول
  - مثال بدون اسکرول:
    <iframe src="${embedUrl}" width="100%" height="800"
      style="border:none;overflow:hidden;" frameborder="0"></iframe>
  - مثال با اسکرول:
    <iframe src="${embedUrl}" width="100%" height="600"
      style="border:none;overflow:auto;" frameborder="0"></iframe>
-->
<iframe
  src="${embedUrl}"
  width="100%"
  height="600"
  frameborder="0"
  allow="camera; microphone; autoplay"
  style="border:none;background:transparent;"
></iframe>`,
    },
    link: {
      label: "لینک مستقیم",
      icon: Link2,
      description: "لینک مستقیم به فرم (Full-page)",
      code: directLink,
    },
  };

  const active = codes[activeTab];

  return (
    <div className="flex flex-col gap-6">
      <SEO
        title={`اشتراک‌گذاری: ${form.title}`}
        description={`کدهای Embed فرم ${form.title} — پرس‌کاد`}
        url={`/admin/forms/${id}/share`}
        noIndex
      />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button as={Link} to={`/admin/forms/${id}`} variant="ghost" size="sm">
            <ArrowLeft size={14} />
            ویرایش فرم
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-navy dark:text-white">اشتراک‌گذاری فرم</h1>
            <p className="text-xs text-ink/40 dark:text-slate-400 mt-0.5">{form.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={form.published ? "green" : "gray"}>
            {form.published ? "منتشر شده" : "پیش‌نویس"}
          </Badge>
          {form.published ? (
            <a href={directLink} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">
                <ExternalLink size={14} />
                مشاهده فرم
              </Button>
            </a>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowPublishModal(true)}>
              ▶ انتشار فرم
            </Button>
          )}
        </div>
      </div>

      {/* Public ID */}
      <div className="bg-bg-mint dark:bg-slate-800/90 border border-teal/20 dark:border-teal/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <Globe size={16} className="text-teal-text dark:text-teal shrink-0" />
        <div className="flex-1">
          <span className="text-xs font-bold text-ink/50 dark:text-slate-400 block">شناسه عمومی فرم</span>
          <span className="text-sm font-mono font-bold text-navy dark:text-slate-100" dir="ltr">{publicId}</span>
        </div>
        <CopyButton text={publicId} locked={!form.published} onLocked={handleLockedCopy} />
      </div>

      {/* انتخاب تم خروجی کد و لینک */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2">
          <Sun size={16} className="text-teal" />
          <span className="text-xs sm:text-sm font-black text-navy dark:text-white">تم خروجی کد و پیش‌نمایش:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "default", label: `پیش‌فرض (${form.default_theme === "dark" ? "دارک" : form.default_theme === "system" ? "سیستم" : "روشن"})` },
            { id: "light", label: "روشن" },
            { id: "dark", label: "دارک" },
            { id: "system", label: "سیستم" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setEmbedTheme(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                embedTheme === t.id
                  ? "bg-teal text-white shadow-xs font-black"
                  : "bg-navy/5 dark:bg-slate-700/60 text-ink/70 dark:text-slate-300 hover:bg-navy/10 dark:hover:bg-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* تب‌های نوع Embed */}
      <div className="flex gap-1 bg-bg-neutral dark:bg-slate-800/90 border border-transparent dark:border-slate-700 rounded-lg p-1 overflow-x-auto">
        {Object.entries(codes).map(([key, c]) => {
          const Icon = c.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === key
                  ? "bg-white dark:bg-slate-700 text-teal-text dark:text-teal shadow-sm"
                  : "text-ink/50 dark:text-slate-400 hover:text-ink dark:hover:text-white"
              }`}
            >
              <Icon size={14} />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* کد انتخاب شده */}
      <div className="rotate-[0.2deg]">
        <StickerCard theme="white" radius="rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-navy flex items-center gap-2">
                {active.label}
              </h2>
              <p className="text-sm text-ink/50 mt-1">{active.description}</p>
            </div>
            <CodeBlock code={active.code} label="کد Embed" locked={!form.published} onLocked={handleLockedCopy} />
          </div>
        </StickerCard>
      </div>

      {/* پیش‌نمایش بر اساس حالت */}
      <div className="rotate-[-0.2deg]">
        <StickerCard theme="white" radius="rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-base sm:text-lg font-black text-navy">پیش‌نمایش زنده — {active.label}</h2>
            <div className="border-2 border-dashed border-ink/15 rounded-xl overflow-hidden bg-bg-mint/30" style={{ minHeight: "400px" }}>
              {!form.published ? (
                <div className="flex items-center justify-center h-[400px] text-ink/40 text-sm">
                  فرم هنوز منتشر نشده — ابتدا منتشر کنید
                </div>
              ) : activeTab === "inline" ? (
                <iframe src={embedUrl} className="w-full" style={{ height: "500px", border: "none" }} title="پیش‌نمایش Inline" />
              ) : activeTab === "iframe" ? (
                <iframe src={embedUrl} className="w-full" style={{ height: "500px", border: "none" }} title="پیش‌نمایش Iframe" />
              ) : activeTab === "popup" ? (
                <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                  <p className="text-sm text-ink/50">روی دکمه کلیک کنید تا فرم در پنجره شناور باز شود</p>
                  <button
                    onClick={() => window.open(embedUrl, "_blank", "width=600,height=700,top=100,left=100")}
                    className="bg-teal text-white px-6 py-3 rounded-pill-md font-extrabold hover:bg-teal-text transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,0.2)]"
                  >باز کردن فرم</button>
                </div>
              ) : activeTab === "popover" ? (
                <div className="relative h-[400px]">
                  <div className="absolute inset-0 flex items-center justify-center text-ink/30 text-sm">محتوای سایت شما</div>
                  <div className="absolute bottom-4 right-4 z-10">
                    <button className="w-14 h-14 rounded-full bg-navy text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                      <span className="text-xs font-black">پرس<br/>کاد</span>
                    </button>
                  </div>
                  <div className="absolute bottom-20 right-4 w-80 bg-white border-2 border-navy rounded-[1.5rem] shadow-xl overflow-hidden" style={{ height: "300px" }}>
                    <iframe src={embedUrl} className="w-full h-full" style={{ border: "none" }} title="پیش‌نمایش Popover" />
                  </div>
                </div>
              ) : activeTab === "fullpage" ? (
                <div className="relative h-[400px] bg-white">
                  <div className="absolute top-2 right-2 z-10 bg-navy text-white px-3 py-1 rounded-pill-sm text-xs font-bold">تمام صفحه</div>
                  <iframe src={embedUrl} className="w-full h-full" style={{ border: "none" }} title="پیش‌نمایش Fullpage" />
                </div>
              ) : activeTab === "link" ? (
                <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                  <p className="text-sm text-ink/50">لینک مستقیم فرم:</p>
                  <a href={directLink} target="_blank" rel="noopener noreferrer"
                    className="bg-teal text-white px-6 py-3 rounded-pill-md font-extrabold hover:bg-teal-text transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,0.2)]"
                  >مشاهده فرم ↗</a>
                </div>
              ) : null}
            </div>
          </div>
        </StickerCard>
      </div>

      {/* ─── مودال «ابتدا منتشر کنید» ─── */}
      <Modal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="فرم هنوز منتشر نشده!"
      >
        <div className="flex flex-col gap-4 text-center items-center py-2">
          <AlertTriangle size={44} className="text-amber-500" />
          <h3 className="text-base font-black text-navy dark:text-white leading-7">
            تا وقتی فرم «{form.title}» منتشر نشده، لینک و کد آن برای مخاطب‌ها کار نمی‌کند.
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 leading-6">
            همین‌جا منتشرش کنید تا بلافاصله بتوانید لینک و کد امبد را کپی کنید.
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <Button variant="teal" size="sm" disabled={publishing} onClick={publishNow}>
              {publishing ? "در حال انتشار..." : "▶ انتشار فرم"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowPublishModal(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
