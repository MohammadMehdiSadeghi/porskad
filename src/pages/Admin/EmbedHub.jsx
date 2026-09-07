import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import StickerCard from "../../components/ui/StickerCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import SEO from "../../components/ui/SEO";
import { faNum } from "../../lib/utils";
import {
  Code,
  Link2,
  MessageSquare,
  Layout,
  Globe,
  Copy,
  Check,
  Eye,
  FileText,
  Lightbulb,
} from "lucide-react";

// ─── توضیحات هر حالت Embed ───
const EMBED_MODES = [
  {
    key: "inline",
    label: "Inline",
    icon: Layout,
    bgClass: "bg-bg-mint",
    borderClass: "border-teal/30",
    textClass: "text-teal-text",
    description:
      "فرم مستقیم داخل بدنه صفحه و بین محتوای دیگر نمایش داده می‌شود. مناسب صفحه تماس با ما، لندینگ‌پیج یا هرجا که فرم بخشی از محتوا باشد.",
    example: "سایت شرکتی که فرم نظرسنجی وسط صفحه اصلیشه",
  },
  {
    key: "popup",
    label: "Popup",
    icon: MessageSquare,
    bgClass: "bg-bg-lavender",
    borderClass: "border-indigo/30",
    textClass: "text-indigo-600",
    description:
      "فرم با کلیک روی یک دکمه/لینک، در یک پنجره شناور وسط صفحه باز می‌شود. مناسب فرم‌های نظرسنجی سریع یا CTA.",
    example: "دکمه «تماس با ما» که کلیک کنی فرم باز بشه",
  },
  {
    key: "popover",
    label: "Popover",
    icon: Globe,
    bgClass: "bg-bg-blush",
    borderClass: "border-magenta/30",
    textClass: "text-magenta-text",
    description:
      "فرم از گوشه صفحه (پایین‌راست) به‌صورت پنل کوچک باز می‌شود. مناسب فیدبک، چت‌بات یا ویجت کوچک.",
    example: "دکمه شناور گوشه صفحه که کلیک کنی فرم فیدبک باز بشه",
  },
  {
    key: "iframe",
    label: "Iframe",
    icon: Code,
    bgClass: "bg-gray-100",
    borderClass: "border-navy/20",
    textClass: "text-navy",
    description:
      "کد HTML ساده بدون اسکریپت اضافی. مناسب CMSها و پلتفرم‌هایی که JavaScript دلخواه اجازه نمی‌دهند.",
    example: "وردپرس، جوملا یا هر CMS دیگر",
  },
  {
    key: "link",
    label: "لینک مستقیم",
    icon: Link2,
    bgClass: "bg-[#FEF7EC]",
    borderClass: "border-orange/30",
    textClass: "text-orange",
    description:
      "لینک مستقیم به فرم روی دامنه خودمان. مناسب کمپین ایمیلی، لینک در بیو شبکه اجتماعی یا QR Code.",
    example: "لینک در اینستاگرام، ایمیل یا تلگرام",
  },
];

// ─── کپی ───
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
        copied
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-white text-ink/50 border border-ink/15 hover:text-teal-text hover:border-teal/30"
      }`}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "کپی شد!" : "کپی"}
    </button>
  );
}

// ─── کارت حالت Embed با hover و tooltip ───
function EmbedModeCard({ mode, code }) {
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef(null);
  const Icon = mode.icon;

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    timerRef.current = setTimeout(() => setShowTooltip(true), 1500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    clearTimeout(timerRef.current);
    setShowTooltip(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* کارت */}
      <div
        className={`
          relative overflow-hidden rounded-2xl border-2 ${mode.borderClass}
          bg-white cursor-pointer transition-all duration-300 ease-out
          ${hovered ? "scale-[1.03] shadow-lg -translate-y-1" : "hover:shadow-md"}
        `}
      >
        <div
          className={`absolute inset-0 ${mode.bgClass} transition-opacity duration-300 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className="relative z-10 p-3 flex flex-col items-center gap-2 text-center">
          <div
            className={`w-10 h-10 rounded-xl ${mode.bgClass} flex items-center justify-center transition-all duration-300 ${
              hovered ? "scale-110 rotate-[-5deg]" : ""
            }`}
          >
            <Icon size={18} className={`${mode.textClass} transition-transform duration-300 ${hovered ? "scale-110" : ""}`} />
          </div>
          <span className={`text-xs font-black ${mode.textClass}`}>{mode.label}</span>
          <CopyButton text={code} />
        </div>

        <div className={`h-0.5 ${mode.bgClass} transition-all duration-500 ${hovered ? "w-full" : "w-0"}`} />
      </div>

      {/* Tooltip */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-50
          w-64 p-3 bg-white rounded-2xl shadow-2xl border-2 ${mode.borderClass}
          transition-all duration-300 pointer-events-none
          ${showTooltip ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        `}
      >
        <div className={`absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r-2 border-b-2 ${mode.borderClass} rotate-45 -mt-1.5`} />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Icon size={14} className={mode.textClass} />
            <span className={`text-xs font-black ${mode.textClass}`}>{mode.label}</span>
          </div>
          <p className="text-[0.7rem] text-ink/60 leading-5">{mode.description}</p>
          <div className={`text-[0.6rem] font-bold ${mode.textClass} ${mode.bgClass} rounded-lg px-2 py-1 flex items-center gap-1`}>
            <Lightbulb size={11} className="shrink-0" />
            <span>{mode.example}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── کارت فرم (شبیه FormsList) ───
function FormEmbedCard({ form, baseUrl, index }) {
  const [expanded, setExpanded] = useState(false);
  const publicId = form.public_id || form.id;

  const codes = {
    inline: `<div data-pcode-form="${publicId}"></div>\n<script src="${baseUrl}/loader.js" async></script>`,
    popup: `<button data-pcode-popup="${publicId}">باز کردن فرم</button>\n<script src="${baseUrl}/loader.js" async></script>`,
    popover: `<script>\n  window.PorsCode = window.PorsCode || {};\n  window.PorsCode.popover = {\n    formId: "${publicId}",\n    position: "bottom-right"\n  };\n</script>\n<script src="${baseUrl}/loader.js" async></script>`,
    iframe: `<iframe src="${baseUrl}/embed/${publicId}" width="100%" height="600" frameborder="0"></iframe>`,
    link: `${baseUrl}/f/${form.slug}`,
  };

  // کد انتخاب شده (پیش‌فرض inline)
  const [selectedMode, setSelectedMode] = useState("inline");

  return (
    <div className={index % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"}>
      <StickerCard theme="white">
        <div className="p-3.5 sm:p-5 flex flex-col gap-2.5 sm:gap-3">
          {/* هدر */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-navy leading-6 line-clamp-1">{form.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={form.published ? "green" : "gray"}>
                  {form.published ? "منتشر" : "پیش‌نویس"}
                </Badge>
                <span className="text-[0.65rem] font-mono text-ink/40" dir="ltr">{publicId}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {form.published && (
                <a href={`/f/${form.slug}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm"><Eye size={14} /></Button>
                </a>
              )}
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                {expanded ? "بستن" : "کد Embed"}
              </Button>
            </div>
          </div>

          {/* لینک سریع */}
          {form.published && (
            <div className="flex items-center gap-2 bg-bg-neutral rounded-lg px-3 py-2">
              <Link2 size={12} className="text-ink/40 shrink-0" />
              <span className="text-xs font-mono text-ink/60 truncate flex-1" dir="ltr">
                {baseUrl}/f/{form.slug}
              </span>
              <CopyButton text={`${baseUrl}/f/${form.slug}`} />
            </div>
          )}

          {/* حالت‌های Embed — فقط وقتی expand شد */}
          {expanded && (
            <div className="flex flex-col gap-2.5 sm:gap-3 mt-1">
              {/* ۵ کارت حالت — ریسپانسیو */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                {EMBED_MODES.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setSelectedMode(mode.key)}
                    className={`
                      flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-2.5 rounded-xl border-2 transition-all cursor-pointer
                      ${selectedMode === mode.key
                        ? `${mode.borderClass} ${mode.bgClass} shadow-sm`
                        : "border-ink/10 bg-white hover:border-ink/20"
                      }
                    `}
                  >
                    <mode.icon size={14} className={selectedMode === mode.key ? mode.textClass : "text-ink/40"} />
                    <span className={`text-[0.6rem] sm:text-[0.65rem] font-bold leading-tight ${selectedMode === mode.key ? mode.textClass : "text-ink/50"}`}>
                      {mode.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* توضیح حالت انتخاب شده */}
              {(() => {
                const active = EMBED_MODES.find((m) => m.key === selectedMode);
                if (!active) return null;
                return (
                  <div className={`rounded-xl border ${active.borderClass} ${active.bgClass} px-2.5 sm:px-3 py-2 flex items-start gap-1.5 sm:gap-2`}>
                    <active.icon size={13} className={`${active.textClass} shrink-0 mt-0.5`} />
                    <p className="text-[0.6rem] sm:text-[0.7rem] text-ink/60 leading-4 sm:leading-5">{active.description}</p>
                  </div>
                );
              })()}

              {/* کد */}
              <div className="bg-gray-900 text-gray-100 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[0.65rem] sm:text-xs font-mono" dir="ltr">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-gray-500 text-[0.6rem] sm:text-[0.65rem]">{EMBED_MODES.find((m) => m.key === selectedMode)?.label}</span>
                  <CopyButton text={codes[selectedMode]} />
                </div>
                <pre className="whitespace-pre-wrap break-all leading-4 sm:leading-5 max-h-[12rem] overflow-y-auto">{codes[selectedMode]}</pre>
              </div>
            </div>
          )}
        </div>
      </StickerCard>
    </div>
  );
}

// ─── صفحه اصلی ───
export default function EmbedHub() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const baseUrl = window.location.origin;

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setForms([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // فقط فرم‌های فعال (منتشرشده و حذف/آرشیو نشده) متعلق به خود کاربر نمایش داده می‌شوند
      let query = supabase
        .from("forms")
        .select("id, slug, title, public_id, published, created_at, manager_id, created_by")
        .eq("published", true)
        .eq("archived", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!isOwner()) {
        query = query.or(`manager_id.eq.${user.id},created_by.eq.${user.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let activeForms = data ?? [];
      if (!isOwner()) {
        activeForms = activeForms.filter(
          (f) => f.manager_id === user.id || f.created_by === user.id
        );
      }

      const formIds = activeForms.map((f) => f.id);
      let questionCounts = {};
      if (formIds.length) {
        const { data: qData } = await supabase
          .from("questions")
          .select("form_id")
          .in("form_id", formIds);
        if (qData) {
          for (const q of qData) {
            questionCounts[q.form_id] = (questionCounts[q.form_id] ?? 0) + 1;
          }
        }
      }

      setForms(
        activeForms.map((f) => ({
          ...f,
          question_count: questionCounts[f.id] ?? 0,
        }))
      );
    } catch (err) {
      push("خطا در بارگذاری فرم‌ها: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, isOwner, authLoading, push]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || authLoading) return <Spinner label="در حال بارگذاری فرم‌ها..." />;

  return (
    <div className="flex flex-col gap-6">
      <SEO
        title="اشتراک‌گذاری و Embed"
        description="جاسازی فرم‌ها در سایت‌های دیگر — پرس‌کاد"
        url="/admin/embed"
        noIndex
      />

      {/* هدر */}
      <div>
        <h1 className="text-xl sm:text-3xl font-black text-navy">
          اشتراک‌گذاری فرم
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-1">
          روی فرم کلیک کن، حالت Embed رو انتخاب کن و کدش رو کپی کن
        </p>
        <p className="text-[0.65rem] font-bold text-ink-subtle/70 mt-1.5 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal" />
          فقط فرم‌های منتشرشده اینجا نمایش داده می‌شوند
        </p>
      </div>

      {/* لیست فرم‌ها — گرید شبیه صفحه فرم‌ها */}
      {forms.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="فرم منتشرشده‌ای برای اشتراک‌گذاری نیست!"
          subtitle="فقط فرم‌های منتشرشده اینجا ظاهر می‌شوند؛ فرم پیش‌نویس خود را از صفحه «فرم‌ها» منتشر کن."
          action={
            <Button as={Link} to="/admin/forms" variant="indigo">
              رفتن به فرم‌ها
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-7">
          {forms.map((f, i) => (
            <FormEmbedCard key={f.id} form={f} baseUrl={baseUrl} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
