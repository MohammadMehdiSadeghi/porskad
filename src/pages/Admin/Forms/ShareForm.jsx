import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Button from "../../../components/ui/Button";
import Spinner from "../../../components/ui/Spinner";
import EmptyState from "../../../components/ui/EmptyState";
import StickerCard from "../../../components/ui/StickerCard";
import Badge from "../../../components/ui/Badge";
import { useToast } from "../../../components/ui/Toast";
import {
  ArrowLeft,
  Copy,
  Check,
  Code,
  Link2,
  SearchX,
  ExternalLink,
  Globe,
  MessageSquare,
  Layout,
} from "lucide-react";
import SEO from "../../../components/ui/SEO";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
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
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
        copied
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-bg-neutral text-ink/60 border border-ink/15 hover:bg-bg-mint hover:text-teal-text hover:border-teal/30"
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "کپی شد!" : "کپی"}
    </button>
  );
}

function CodeBlock({ code, label }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-ink/50">{label}</span>
        <CopyButton text={code} />
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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [activeTab, setActiveTab] = useState("inline");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("forms")
        .select("id, slug, title, public_id, published")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        push("فرم پیدا نشد", "error");
        setLoading(false);
        return;
      }
      setForm(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <Spinner label="در حال بارگذاری..." />;
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
  const embedUrl = `${baseUrl}/embed/${publicId}`;
  const directLink = `${baseUrl}/f/${form.slug}`;

  const codes = {
    inline: {
      label: "جاسازی در صفحه (Inline)",
      icon: Layout,
      description: "فرم مستقیم داخل محتوای صفحه نمایش داده می‌شود",
      code: `<div data-pcode-form="${publicId}"></div>\n<script src="${baseUrl}/loader.js" async></script>`,
    },
    popup: {
      label: "پنجره شناور (Popup)",
      icon: MessageSquare,
      description: "فرم با کلیک روی دکمه باز می‌شود",
      code: `<button data-pcode-popup="${publicId}">باز کردن فرم</button>\n<script src="${baseUrl}/loader.js" async></script>`,
    },
    popover: {
      label: "پنل کوچک (Popover)",
      icon: MessageSquare,
      description: "فرم از گوشه صفحه باز می‌شود",
      code: `<script>\n  window.PorsCode = window.PorsCode || {};\n  window.PorsCode.popover = {\n    formId: "${publicId}",\n    position: "bottom-right"\n  };\n</script>\n<script src="${baseUrl}/loader.js" async></script>`,
    },
    iframe: {
      label: "Iframe مستقیم",
      icon: Code,
      description: "بدون اسکریپت اضافی، مناسب CMSها",
      code: `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  allow="camera; microphone; autoplay"\n></iframe>`,
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
        description={`کدهای Embed فرم ${form.title} — پرسکاد`}
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
            <h1 className="text-xl font-black text-navy">اشتراک‌گذاری فرم</h1>
            <p className="text-xs text-ink/40 mt-0.5">{form.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={form.published ? "green" : "gray"}>
            {form.published ? "منتشر شده" : "پیش‌نویس"}
          </Badge>
          <a href={directLink} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">
              <ExternalLink size={14} />
              مشاهده فرم
            </Button>
          </a>
        </div>
      </div>

      {/* Public ID */}
      <div className="bg-bg-mint border border-teal/20 rounded-xl px-4 py-3 flex items-center gap-3">
        <Globe size={16} className="text-teal-text shrink-0" />
        <div className="flex-1">
          <span className="text-xs font-bold text-ink/50 block">شناسه عمومی فرم</span>
          <span className="text-sm font-mono font-bold text-navy" dir="ltr">{publicId}</span>
        </div>
        <CopyButton text={publicId} />
      </div>

      {/* تب‌های نوع Embed */}
      <div className="flex gap-1 bg-bg-neutral rounded-lg p-1 overflow-x-auto">
        {Object.entries(codes).map(([key, c]) => {
          const Icon = c.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${
                activeTab === key
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-ink/50 hover:text-ink"
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
              <h2 className="text-lg font-black text-navy flex items-center gap-2">
                {active.label}
              </h2>
              <p className="text-sm text-ink/50 mt-1">{active.description}</p>
            </div>
            <CodeBlock code={active.code} label="کد Embed" />
          </div>
        </StickerCard>
      </div>

      {/* پیش‌نمایش */}
      <div className="rotate-[-0.2deg]">
        <StickerCard theme="white" radius="rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-lg font-black text-navy">پیش‌نمایش زنده</h2>
            <div className="border-2 border-dashed border-ink/15 rounded-xl overflow-hidden" style={{ minHeight: "400px" }}>
              {form.published ? (
                <iframe
                  src={embedUrl}
                  className="w-full"
                  style={{ height: "500px", border: "none" }}
                  title="پیش‌نمایش Embed"
                />
              ) : (
                <div className="flex items-center justify-center h-[400px] text-ink/40 text-sm">
                  فرم هنوز منتشر نشده — ابتدا منتشر کنید
                </div>
              )}
            </div>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
