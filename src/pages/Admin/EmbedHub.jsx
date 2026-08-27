import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
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
  ExternalLink,
  Eye,
} from "lucide-react";

// ─── توضیحات هر حالت Embed ───
const EMBED_MODES = [
  {
    key: "inline",
    label: "Inline",
    icon: Layout,
    color: "teal",
    bgClass: "bg-bg-mint",
    borderClass: "border-teal/30",
    textClass: "text-teal-text",
    hoverBg: "hover:bg-teal/10",
    description:
      "فرم مستقیم داخل بدنه صفحه و بین محتوای دیگر نمایش داده می‌شود. مناسب صفحه تماس با ما، لندینگ‌پیج یا هرجا که فرم بخشی از محتوا باشد.",
    example: "سایت شرکتی که فرم نظرسنجی وسط صفحه اصلیشه",
  },
  {
    key: "popup",
    label: "Popup",
    icon: MessageSquare,
    color: "indigo",
    bgClass: "bg-bg-lavender",
    borderClass: "border-indigo/30",
    textClass: "text-indigo-600",
    hoverBg: "hover:bg-indigo/10",
    description:
      "فرم با کلیک روی یک دکمه/لینک، در یک پنجره شناور وسط صفحه باز می‌شود. مناسب فرم‌های نظرسنجی سریع یا CTA.",
    example: "دکمه «تماس با ما» که کلیک کنی فرم باز بشه",
  },
  {
    key: "popover",
    label: "Popover",
    icon: Globe,
    color: "magenta",
    bgClass: "bg-bg-blush",
    borderClass: "border-magenta/30",
    textClass: "text-magenta-text",
    hoverBg: "hover:bg-magenta/10",
    description:
      "فرم از گوشه صفحه (پایین‌راست) به‌صورت پنل کوچک باز می‌شود. مناسب فیدبک، چت‌بات یا ویجت کوچک.",
    example: "دکمه شناور گوشه صفحه که کلیک کنی فرم فیدبک باز بشه",
  },
  {
    key: "iframe",
    label: "Iframe",
    icon: Code,
    color: "navy",
    bgClass: "bg-gray-100",
    borderClass: "border-navy/20",
    textClass: "text-navy",
    hoverBg: "hover:bg-navy/5",
    description:
      "کد HTML ساده بدون اسکریپت اضافی. مناسب CMSها و پلتفرم‌هایی که JavaScript دلخواه اجازه نمی‌دهند.",
    example: "وردپرس، جوملا یا هر CMS دیگر",
  },
  {
    key: "link",
    label: "لینک مستقیم",
    icon: Link2,
    color: "orange",
    bgClass: "bg-[#FEF7EC]",
    borderClass: "border-orange/30",
    textClass: "text-orange",
    hoverBg: "hover:bg-orange/10",
    description:
      "لینک مستقیم به فرم روی دامنه خودمان. مناسب کمپین ایمیلی، لینک در بیو شبکه اجتماعی یا QR Code.",
    example: "لینک در اینستاگرام، ایمیل یا تلگرام",
  },
];

// ─── باکس کپی کد ───
function CopyButton({ text, small }) {
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

// ─── کارت هر حالت Embed ───
function EmbedModeCard({ mode, formId, formSlug, baseUrl, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef(null);
  const Icon = mode.icon;

  const codes = {
    inline: `<div data-pcode-form="${formId}"></div>\n<script src="${baseUrl}/loader.js" async></script>`,
    popup: `<button data-pcode-popup="${formId}">باز کردن فرم</button>\n<script src="${baseUrl}/loader.js" async></script>`,
    popover: `<script>\n  window.PorsCode = window.PorsCode || {};\n  window.PorsCode.popover = {\n    formId: "${formId}",\n    position: "bottom-right"\n  };\n</script>\n<script src="${baseUrl}/loader.js" async></script>`,
    iframe: `<iframe src="${baseUrl}/embed/${formId}" width="100%" height="600" frameborder="0"></iframe>`,
    link: `${baseUrl}/f/${formSlug}`,
  };

  const code = codes[mode.key];

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    timerRef.current = setTimeout(() => setShowTooltip(true), 1500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    clearTimeout(timerRef.current);
    setShowTooltip(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* کارت اصلی */}
      <div
        className={`
          relative overflow-hidden rounded-2xl border-2 ${mode.borderClass}
          bg-white cursor-pointer transition-all duration-300 ease-out
          ${hovered ? "scale-[1.03] shadow-lg -translate-y-1" : "hover:shadow-md"}
        `}
      >
        {/* هاور بکگراند */}
        <div
          className={`absolute inset-0 ${mode.bgClass} transition-opacity duration-300 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className="relative z-10 p-4 flex flex-col items-center gap-2.5 text-center">
          {/* آیکون با انیمیشن */}
          <div
            className={`
              w-12 h-12 rounded-xl ${mode.bgClass} flex items-center justify-center
              transition-all duration-300
              ${hovered ? "scale-110 rotate-[-5deg]" : ""}
            `}
          >
            <Icon
              size={22}
              className={`${mode.textClass} transition-transform duration-300 ${
                hovered ? "scale-110" : ""
              }`}
            />
          </div>

          {/* عنوان */}
          <span className={`text-sm font-black ${mode.textClass}`}>
            {mode.label}
          </span>

          {/* دکمه کپی */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={code} small />
          </div>
        </div>

        {/* نوار پایین متحرک */}
        <div
          className={`h-1 ${mode.bgClass} transition-all duration-500 ${
            hovered ? "w-full" : "w-0"
          }`}
        />
      </div>

      {/* Tooltip توضیحات */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-50
          w-72 p-4 bg-white rounded-2xl shadow-2xl border-2 ${mode.borderClass}
          transition-all duration-300 pointer-events-none
          ${showTooltip ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        `}
      >
        {/* فلش */}
        <div
          className={`absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r-2 border-b-2 ${mode.borderClass} rotate-45 -mt-1.5`}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon size={16} className={mode.textClass} />
            <span className={`text-sm font-black ${mode.textClass}`}>
              {mode.label}
            </span>
          </div>
          <p className="text-xs text-ink/60 leading-6">{mode.description}</p>
          <div className={`text-[0.65rem] font-bold ${mode.textClass} ${mode.bgClass} rounded-lg px-2.5 py-1.5`}>
            💡 {mode.example}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── کارت فرم ───
function FormEmbedCard({ form, baseUrl }) {
  const [expanded, setExpanded] = useState(false);
  const publicId = form.public_id || form.id;

  return (
    <div className="rotate-[0.2deg]">
      <StickerCard
        theme="white"
        radius="rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none"
      >
        <div className="p-5 sm:p-6 flex flex-col gap-4">
          {/* هدر فرم */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-black text-navy truncate">
                  {form.title}
                </h3>
                <Badge color={form.published ? "green" : "gray"}>
                  {form.published ? "منتشر" : "پیش‌نویس"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink/40">
                <Globe size={12} />
                <span className="font-mono" dir="ltr">
                  {publicId}
                </span>
                <span>•</span>
                <span>{faNum(form.question_count ?? 0)} سوال</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {form.published && (
                <a href={`/f/${form.slug}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <Eye size={14} />
                  </Button>
                </a>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "بستن ↑" : "انتخاب حالت ↓"}
              </Button>
            </div>
          </div>

          {/* لینک مستقیم سریع */}
          {form.published && (
            <div className="flex items-center gap-2 bg-bg-neutral rounded-xl px-3 py-2">
              <Link2 size={14} className="text-ink/40 shrink-0" />
              <span className="text-xs font-mono text-ink/60 truncate flex-1" dir="ltr">
                {baseUrl}/f/{form.slug}
              </span>
              <CopyButton text={`${baseUrl}/f/${form.slug}`} />
            </div>
          )}

          {/* حالت‌های Embed */}
          {expanded && (
            <div className="grid grid-cols-5 gap-3 mt-2">
              {EMBED_MODES.map((mode, i) => (
                <EmbedModeCard
                  key={mode.key}
                  mode={mode}
                  formId={publicId}
                  formSlug={form.slug}
                  baseUrl={baseUrl}
                  delay={i * 100}
                />
              ))}
            </div>
          )}

          {/* کد Inline سریع */}
          {expanded && (
            <div className="mt-2">
              <div className="bg-gray-900 text-gray-100 rounded-xl px-4 py-3 text-xs font-mono overflow-x-auto" dir="ltr">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-[0.65rem]">کد Inline</span>
                  <CopyButton text={`<div data-pcode-form="${publicId}"></div>\n<script src="${baseUrl}/loader.js" async></script>`} />
                </div>
                <pre className="whitespace-pre-wrap break-all">{`<div data-pcode-form="${publicId}"></div>\n<script src="${baseUrl}/loader.js" async></script>`}</pre>
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
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const baseUrl = window.location.origin;

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("forms")
          .select("id, slug, title, public_id, published, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // گرفتن تعداد سوالات هر فرم
        const formIds = (data ?? []).map((f) => f.id);
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
          (data ?? []).map((f) => ({
            ...f,
            question_count: questionCounts[f.id] ?? 0,
          }))
        );
      } catch (err) {
        push("خطا در بارگذاری فرم‌ها: " + err.message, "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Spinner label="در حال بارگذاری فرم‌ها..." />;

  return (
    <div className="flex flex-col gap-6">
      <SEO
        title="اشتراک‌گذاری و Embed"
        description="جاسازی فرم‌ها در سایت‌های دیگر — پرسکاد"
        url="/admin/embed"
        noIndex
      />

      {/* هدر */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-navy">
          🔗 اشتراک‌گذاری فرم
        </h1>
        <p className="text-sm font-semibold text-ink-subtle mt-1">
          فرم مورد نظرت رو انتخاب کن و کدش رو کپی کن
        </p>
      </div>

      {/* راهنمای سریع */}
      <div className="rotate-[-0.3deg]">
        <StickerCard theme="navy" radius="rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 flex flex-col gap-3">
            <h2 className="text-base font-black text-navy">چطوری کار می‌کنه؟</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { step: "۱", text: "روی فرم کلیک کن و حالت Embed رو انتخاب کن" },
                { step: "۲", text: "کد رو کپی کن و توی سایتت پیست کن" },
                { step: "۳", text: "فرم داخل سایتت نمایش داده می‌شه! 🎉" },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
                  <span className="w-7 h-7 bg-teal rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0">
                    {s.step}
                  </span>
                  <span className="text-xs font-semibold text-white/80">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </StickerCard>
      </div>

      {/* لیست فرم‌ها */}
      {forms.length === 0 ? (
        <EmptyState
          icon="📝"
          title="هنوز فرمی نداری!"
          subtitle="اول یه فرم بساز، بعد بیا اینجا کدش رو بردار."
          action={
            <Button as={Link} to="/admin/forms" variant="indigo">
              ساخت فرم جدید
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {forms.map((f) => (
            <FormEmbedCard key={f.id} form={f} baseUrl={baseUrl} />
          ))}
        </div>
      )}

      {/* توضیحات بج برندینگ */}
      <div className="rotate-[0.2deg]">
        <StickerCard theme="white" radius="rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 flex flex-col gap-3">
            <h3 className="text-base font-black text-navy">📝 درباره بج برندینگ</h3>
            <p className="text-sm text-ink/60 leading-7">
              در نسخه رایگان، پایین فرم Embed شده یک بج کوچک «ساخته‌شده با پرس‌کد» نمایش داده می‌شود.
              این بج از سرور کنترل می‌شود و از طریق کلاینت قابل حذف نیست.
            </p>
            <div className="flex items-center gap-2 text-xs text-ink/40">
              <span className="w-1.5 h-1.5 rounded-full bg-teal" />
              <span>برای حذف بج، ارتقاء به پلن پولی لازم است</span>
            </div>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
