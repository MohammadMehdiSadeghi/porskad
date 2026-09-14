import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import SEO from "../../components/ui/SEO";
import {
  Code2,
  Key,
  Copy,
  Check,
  Globe,
  FileJson,
  Terminal,
  Layers,
  ShieldCheck,
  ArrowRight,
  Download,
  BookOpen,
  ExternalLink,
  Code,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import PasswordToggle from "../../components/ui/PasswordToggle";

// ─── کامپوننت کنسول تعاملی Swagger مستقیم داخل صفحه ───
function EmbeddedSwaggerUI({ token }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!document.getElementById("swagger-ui-css")) {
      const link = document.createElement("link");
      link.id = "swagger-ui-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
      document.head.appendChild(link);
    }

    function init() {
      if (window.SwaggerUIBundle && containerRef.current && isMounted) {
        const ui = window.SwaggerUIBundle({
          url: "/openapi.json",
          domNode: containerRef.current,
          deepLinking: false,
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIStandalonePreset || window.SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: "BaseLayout",
          docExpansion: "list",
          filter: true,
          tryItOutEnabled: true,
          onComplete: () => {
            if (isMounted) {
              setLoading(false);
              if (token) {
                ui.preauthorizeApiKey("BearerAuth", `Bearer ${token}`);
              }
            }
          },
        });
      }
    }

    if (window.SwaggerUIBundle) {
      init();
    } else {
      const script = document.createElement("script");
      script.id = "swagger-ui-script";
      script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
      script.async = true;
      script.onload = () => {
        init();
      };
      document.body.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border-2 border-ink/10 dark:border-slate-800 bg-white dark:bg-[#0E1526] p-3 sm:p-5 min-h-[600px]">
      <style>{`
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui { font-family: "IRANSansX", "Montserrat", Tahoma, sans-serif !important; }
        .swagger-ui code, .swagger-ui pre, .swagger-ui .microlight { font-family: ui-monospace, monospace !important; }
        .swagger-ui .info { margin: 10px 0 20px !important; }
        .swagger-ui .info .title { font-size: 20px !important; color: #0f172a !important; font-weight: 800 !important; }
        .dark .swagger-ui .info .title { color: #f8fafc !important; }
        .dark .swagger-ui { filter: invert(0.88) hue-rotate(180deg); }
        .dark .swagger-ui img { filter: invert(1) hue-rotate(180deg); }
        .swagger-ui .scheme-container { background: transparent !important; box-shadow: none !important; padding: 5px 0 !important; }
        .swagger-ui .wrapper { padding: 0 !important; max-width: 100% !important; }
        .swagger-ui .col-12 { padding: 0 !important; }
        .swagger-ui .opblock { border-radius: 14px !important; margin: 0 0 12px !important; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.06) !important; }
        .swagger-ui .btn.authorize { background-color: #0d9488 !important; border-color: #0d9488 !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; box-shadow: 2.75px 2.75px 0 #2e7068 !important; }
        .swagger-ui .btn.authorize svg { fill: white !important; }
        .swagger-ui .btn.execute { background-color: #202A5A !important; border-color: #202A5A !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; box-shadow: 2.75px 2.75px 0 #0b0f1f !important; }
        .swagger-ui .btn.try-out__btn { background-color: #59BBAF !important; border-color: #347e75 !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; box-shadow: 2.75px 2.75px 0 #2e7068 !important; }
        .swagger-ui .btn.cancel { background-color: #E0195B !important; border-color: #ce1754 !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; box-shadow: 2.75px 2.75px 0 #ce1754 !important; }
        .swagger-ui .btn.download-url { background-color: #F8A41D !important; border-color: #C57A07 !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; }
        .swagger-ui select { border-radius: 8px !important; border: 2px solid #58bdaf !important; }
        .swagger-ui input[type=text] { border-radius: 8px !important; border: 2px solid #cbd5e1 !important; }
      `}</style>
      {loading && (
        <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10">
          <div className="w-9 h-9 border-3 border-teal/20 border-t-teal rounded-full animate-spin" />
          <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">
            در حال راه‌اندازی و اتصال توکن به کنسول تعاملی Swagger...
          </span>
        </div>
      )}
      <div dir="ltr" ref={containerRef} className="swagger-ui-embedded text-left" />
    </div>
  );
}

export default function WebServiceDocs() {
  const { user } = useAuth();
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeSection, setActiveSection] = useState(() => {
    const s = searchParams.get("section");
    return ["swagger", "openapi", "api"].includes(s) ? s : null;
  });

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const [selectedLang, setSelectedLang] = useState("curl");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [openApiJsonText, setOpenApiJsonText] = useState("");
  const [loadingOpenApiJson, setLoadingOpenApiJson] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const panelDocsUrl = `${origin}/admin/web-service`;
  const openApiUrl = `${origin}/openapi.json`;
  const apiUrl = `${origin}/api/v1`;

  function handleNavigateSection(sec) {
    setActiveSection(sec);
    if (sec) {
      setSearchParams({ section: sec });
    } else {
      setSearchParams({});
    }
  }

  useEffect(() => {
    const secParam = searchParams.get("section");
    if (["swagger", "openapi", "api"].includes(secParam)) {
      setActiveSection(secParam);
    } else if (!secParam) {
      setActiveSection(null);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadToken() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
        }
      } catch (err) {
        console.error("Failed to load session token:", err);
      }
    }
    loadToken();
  }, []);

  useEffect(() => {
    if (activeSection === "openapi" && !openApiJsonText) {
      setLoadingOpenApiJson(true);
      fetch("/openapi.json")
        .then((r) => r.text())
        .then((txt) => {
          try {
            const parsed = JSON.parse(txt);
            setOpenApiJsonText(JSON.stringify(parsed, null, 2));
          } catch {
            setOpenApiJsonText(txt);
          }
        })
        .catch(() => setOpenApiJsonText("خطا در دریافت فایل OpenAPI"))
        .finally(() => setLoadingOpenApiJson(false));
    }
  }, [activeSection, openApiJsonText]);

  function handleCopyText(text, key) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (key === "token") {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedLink(key);
      setTimeout(() => setCopiedLink(null), 2000);
    }
    push("با موفقیت در حافظه کپی شد", "success");
  }

  function handleCopyToken() {
    handleCopyText(token, "token");
  }

  const codeSnippets = {
    curl: `curl -X GET "${apiUrl}/forms" \\
  -H "Authorization: Bearer ${token || "YOUR_TOKEN"}" \\
  -H "Content-Type: application/json"`,

    javascript: `// دریافت لیست فرم‌ها با fetch در جاوااسکریپت
const response = await fetch("${apiUrl}/forms", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${token || "YOUR_TOKEN"}",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data);`,

    python: `# دریافت لیست فرم‌ها با کتابخانه requests در پایتون
import requests

url = "${apiUrl}/forms"
headers = {
    "Authorization": "Bearer ${token || "YOUR_TOKEN"}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
print(response.json())`,
  };

  function handleCopySnippet(text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    push("کد نمونه با موفقیت کپی شد", "success");
    setTimeout(() => setCopiedSnippet(false), 2000);
  }

  const SECTIONS = [
    { id: "swagger", title: "۱. کنسول Swagger", icon: Globe },
    { id: "openapi", title: "۲. نقشه OpenAPI 3.0", icon: FileJson },
    { id: "api", title: "۳. کدهای نمونه و REST API", icon: Terminal },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <SEO
        title="مستندات وب سرویس — پرس‌کاد"
        description="کنسول Swagger، فایل نقشه استاندارد OpenAPI 3.0 و کدهای اتصال REST API پرس‌کاد"
        url="/admin/web-service"
        noIndex
      />

      {/* هدر صفحه */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy dark:text-slate-100 flex items-center gap-2.5">
            <Code2 size={26} className="text-teal" />
            <span>مستندات وب سرویس</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 mt-1">
            کنسول تعاملی Swagger، فایل نقشه OpenAPI 3.0 و کلید احراز هویت REST API
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="navy"
            size="sm"
            onClick={handleCopyToken}
            disabled={!token}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            {copiedToken ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedToken ? "توکن کپی شد" : "کپی سریع توکن"}</span>
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* کارت توکن احراز هویت (سراسری، نیم‌عرض، بدون کشیدگی) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="-rotate-[0.2deg]">
        <StickerCard theme="teal" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 bg-teal/20 text-teal rounded-2xl shrink-0 mt-0.5 sm:mt-0">
                <Key size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-navy dark:text-white">
                    توکن اختصاصی شما (Bearer Token)
                  </h2>
                  <Badge color="teal">کلید امنیتی</Badge>
                </div>
                <p className="text-xs text-ink-subtle dark:text-slate-300 mt-1 leading-relaxed">
                  احراز هویت حساب شما در درخواست‌ها • هدر ارسالی:{" "}
                  <code className="font-mono bg-white/80 dark:bg-slate-800 text-teal px-1.5 py-0.5 rounded border border-teal/20" dir="ltr">
                    Authorization: Bearer &lt;TOKEN&gt;
                  </code>
                </p>
              </div>
            </div>

            {/* فیلد توکن و دکمه کپی — نیم‌عرض و مقید */}
            <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
              <div className="relative flex-1 lg:w-72 xl:w-80 min-w-0 bg-white/95 dark:bg-slate-900 border-2 border-teal/30 dark:border-teal/40 rounded-pill-md px-3.5 py-2 font-mono text-xs text-slate-700 dark:text-slate-200 dir-ltr text-left flex items-center justify-between">
                <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis block min-w-0 flex-1 select-all">
                  {token
                    ? (showToken ? token : `${token.substring(0, 14)}••••••••••••••••••••${token.substring(token.length - 6)}`)
                    : "در حال بارگذاری توکن..."}
                </span>
                <PasswordToggle
                  visible={showToken}
                  onToggle={() => setShowToken(!showToken)}
                  size={15}
                  className="shrink-0 ml-1.5"
                  ariaLabel={showToken ? "مخفی کردن توکن" : "نمایش کامل توکن"}
                />
              </div>

              <Button
                variant="teal"
                size="sm"
                onClick={() => handleCopyText(token, "token")}
                disabled={!token}
                className="shrink-0 flex items-center gap-1.5"
              >
                {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedToken ? "کپی شد" : "کپی توکن"}</span>
              </Button>
            </div>
          </div>

          {/* راهنمای سریع و کاربردی ارسال هدرها */}
          <div className="mt-4 pt-3 border-t-2 border-teal/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-navy dark:text-teal-200 flex items-center gap-1">
                <ShieldCheck size={14} className="text-teal" />
                <span>فرمت ارسال در هدر درخواست‌ها:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-ink-subtle dark:text-slate-400">Authorization:</span>
                <code className="bg-white/90 dark:bg-slate-900 text-teal font-mono px-2 py-0.5 rounded border border-teal/30 font-bold" dir="ltr">
                  Bearer {token ? `${token.substring(0, 10)}...` : "<TOKEN>"}
                </code>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 hidden sm:flex">
                <span className="font-bold text-ink-subtle dark:text-slate-400">Content-Type:</span>
                <code className="bg-white/90 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono px-2 py-0.5 rounded border border-teal/30 font-bold" dir="ltr">
                  application/json
                </code>
              </div>
            </div>

            {token && (
              <button
                type="button"
                onClick={() => handleCopyText(`Authorization: Bearer ${token}`, "auth_header")}
                className="text-xs font-bold text-teal hover:underline flex items-center gap-1 cursor-pointer bg-white/60 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-teal/20"
              >
                {copiedLink === "auth_header" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{copiedLink === "auth_header" ? "کپی شد" : "کپی کل هدر Authorization"}</span>
              </button>
            )}
          </div>
        </StickerCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* نمای ۱: نمایش ۳ بخش اصلی در گرید ۳ ستونه (پر کردن کامل صفحه) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!activeSection ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-navy dark:text-slate-100 flex items-center gap-2">
              <BookOpen size={18} className="text-teal" />
              <span>بخش‌های مستندات وب سرویس</span>
            </h3>
            <span className="text-xs text-ink-subtle dark:text-slate-400">
              روی هر بخش کلیک کنید تا در همین صفحه باز شود
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {/* کارت ۱: کنسول تعاملی Swagger */}
            <div className="rotate-[0.2deg] flex flex-col h-full">
              <StickerCard theme="white" className="h-full">
                <div className="p-5 sm:p-6 flex flex-col justify-between h-full gap-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                        <Globe size={22} />
                      </div>
                      <Badge color="teal">کنسول تعاملی</Badge>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-navy dark:text-white">
                        ۱. کنسول مستندات Swagger
                      </h4>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-mono dir-ltr block mt-0.5">
                        {docsUrl}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 leading-6">
                      مشاهده گرافیکی تمام اندپوینت‌ها با امکان ارسال مستقیم درخواست‌های تستی (GET, POST, PUT, DELETE) از مرورگر به همراه احراز هویت خودکار حساب شما.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t-2 border-ink/5 dark:border-slate-800">
                    <Button
                      variant="teal"
                      size="sm"
                      onClick={() => handleNavigateSection("swagger")}
                      className="w-full justify-center flex items-center gap-1.5"
                    >
                      <span>ورود و استفاده روی همین صفحه</span>
                      <ArrowRight size={14} className="rotate-180" />
                    </Button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        onClick={() => handleCopyText(`${origin}/admin/web-service?section=swagger`, "swagger_link")}
                        className="text-ink-subtle hover:text-navy dark:hover:text-white flex items-center gap-1 font-bold p-1 cursor-pointer transition-colors"
                      >
                        {copiedLink === "swagger_link" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedLink === "swagger_link" ? "کپی شد" : "کپی آدرس کنسول"}</span>
                      </button>

                      <span className="text-ink-subtle dark:text-slate-400 text-[11px] font-semibold">
                        مستندات داخلی پنل
                      </span>
                    </div>
                  </div>
                </div>
              </StickerCard>
            </div>

            {/* کارت ۲: فایل نقشه استاندارد OpenAPI 3.0 */}
            <div className="-rotate-[0.2deg] flex flex-col h-full">
              <StickerCard theme="white" className="h-full">
                <div className="p-5 sm:p-6 flex flex-col justify-between h-full gap-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                        <FileJson size={22} />
                      </div>
                      <Badge color="orange">استاندارد جهانی JSON</Badge>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-navy dark:text-white">
                        ۲. فایل نقشه OpenAPI 3.0
                      </h4>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-mono dir-ltr block mt-0.5">
                        {openApiUrl}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 leading-6">
                      فایل استاندارد JSON شامل مشخصات فنی متدها، فیلدها و الگوهای هر ۲۰ نوع سوال پرس‌کاد؛ آماده جهت Import مستقیم در Postman یا Insomnia.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t-2 border-ink/5 dark:border-slate-800">
                    <Button
                      variant="orange"
                      size="sm"
                      onClick={() => handleNavigateSection("openapi")}
                      className="w-full justify-center flex items-center gap-1.5"
                    >
                      <span>ورود و استفاده روی همین صفحه</span>
                      <ArrowRight size={14} className="rotate-180" />
                    </Button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        onClick={() => handleCopyText(openApiUrl, "openapi")}
                        className="text-ink-subtle hover:text-navy dark:hover:text-white flex items-center gap-1 font-bold p-1 cursor-pointer transition-colors"
                      >
                        {copiedLink === "openapi" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedLink === "openapi" ? "کپی شد" : "کپی لینک"}</span>
                      </button>

                      <a
                        href="/openapi.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        download="porskad-openapi.json"
                        className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold p-1"
                      >
                        <Download size={12} />
                        <span>دانلود JSON</span>
                      </a>
                    </div>
                  </div>
                </div>
              </StickerCard>
            </div>

            {/* کارت ۳: وب‌سرویس و کدهای نمونه REST API */}
            <div className="rotate-[0.2deg] flex flex-col h-full">
              <StickerCard theme="white" className="h-full">
                <div className="p-5 sm:p-6 flex flex-col justify-between h-full gap-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <Terminal size={22} />
                      </div>
                      <Badge color="green">کدهای آماده cURL, JS, Python</Badge>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-navy dark:text-white">
                        ۳. وب‌سرویس و کدهای نمونه
                      </h4>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono dir-ltr block mt-0.5">
                        {apiUrl}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 leading-6">
                      آدرس ریشه وب‌سرویس، راهنمای ارسال هدر Authorization و کدهای آماده اتصال همراه با جدول جامع متدهای فرم‌ها و ثبت ورودی‌ها.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t-2 border-ink/5 dark:border-slate-800">
                    <Button
                      variant="navy"
                      size="sm"
                      onClick={() => handleNavigateSection("api")}
                      className="w-full justify-center flex items-center gap-1.5"
                    >
                      <span>ورود و استفاده روی همین صفحه</span>
                      <ArrowRight size={14} className="rotate-180" />
                    </Button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        onClick={() => handleCopyText(apiUrl, "api")}
                        className="text-ink-subtle hover:text-navy dark:hover:text-white flex items-center gap-1 font-bold p-1 cursor-pointer transition-colors"
                      >
                        {copiedLink === "api" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedLink === "api" ? "کپی شد" : "کپی آدرس API"}</span>
                      </button>

                      <span className="text-[11px] text-teal font-mono font-bold">
                        REST / JSON
                      </span>
                    </div>
                  </div>
                </div>
              </StickerCard>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════ */
        /* نمای ۲: جزییات بخش باز شده (روی همین صفحه با عرض کامل) */
        /* ══════════════════════════════════════════════════════════════ */
        <div className="flex flex-col gap-6">
          {/* نوار ناوبری به سبک پیل‌های استیکری دیزاین رکاد */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border-2 border-ink/10 dark:border-slate-800 rounded-pill-md p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigateSection(null)}
              className="flex items-center gap-1.5 font-bold"
            >
              <ArrowRight size={15} />
              <span>بازگشت به ۳ بخش اصلی مستندات</span>
            </Button>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleNavigateSection(sec.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-pill-sm text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                    activeSection === sec.id
                      ? "bg-teal text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]"
                      : "text-ink-subtle dark:text-slate-400 hover:text-ink dark:hover:text-slate-200 hover:bg-bg-lavender dark:hover:bg-slate-800"
                  }`}
                >
                  <sec.icon size={14} />
                  <span>{sec.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* محتوای بخش ۱: کنسول تعاملی Swagger */}
          {activeSection === "swagger" && (
            <div className="flex flex-col gap-5">
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                        <Globe size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-navy dark:text-white">
                          کنسول مستندات تعاملی Swagger (Swagger UI)
                        </h3>
                        <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 mt-0.5">
                          تست آنلاین و زنده متدها و ارسال مستقیم درخواست‌ها به سرور
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyText(apiUrl, "api_base")}
                        className="flex items-center gap-1.5"
                      >
                        {copiedLink === "api_base" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copiedLink === "api_base" ? "کپی شد" : "کپی آدرس API"}</span>
                      </Button>
                      <Button
                        variant="teal"
                        size="sm"
                        as="a"
                        href="/openapi.json"
                        download="porskad-openapi.json"
                        className="flex items-center gap-1.5"
                      >
                        <Download size={13} />
                        <span>دانلود نقشه OpenAPI</span>
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-ink-subtle dark:text-slate-300 leading-7 bg-bg-mint/40 dark:bg-slate-800/60 border-2 border-teal/20 rounded-xl p-4 flex flex-col gap-2">
                    <p className="font-bold text-navy dark:text-teal flex items-center gap-1.5">
                      <Sparkles size={14} className="text-teal" />
                      <span>نکات راهنمای تست زنده در کنسول Swagger:</span>
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        <strong>احراز هویت خودکار:</strong> توکن حساب شما پیشاپیش روی این کنسول متصل شده است و نیازی به وارد کردن دستی توکن ندارید.
                      </li>
                      <li>
                        <strong>تست هر درخواست:</strong> روی هر اندپوینت (مانند <code className="font-mono text-teal font-bold" dir="ltr">GET /api/v1/forms</code>) کلیک کرده و دکمه <strong>Try it out</strong> را بزنید.
                      </li>
                      <li>
                        سپس دکمه <strong>Execute</strong> را بزنید تا پاسخ مستقیم دیتابیس به همراه Status Code (200/201) و بدنه JSON در پایین آن نمایش داده شود.
                      </li>
                    </ul>
                  </div>
                </div>
              </StickerCard>

              {/* رندر زنده کامپوننت Swagger روی همین صفحه */}
              <EmbeddedSwaggerUI token={token} />
            </div>
          )}

          {/* محتوای بخش ۲: فایل نقشه استاندارد OpenAPI 3.0 */}
          {activeSection === "openapi" && (
            <div className="flex flex-col gap-5">
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                        <FileJson size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-navy dark:text-white">
                          فایل نقشه استاندارد سامانه (OpenAPI 3.0 Specification)
                        </h3>
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-mono dir-ltr block mt-0.5">
                          {openApiUrl}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyText(openApiUrl, "openapi")}
                        className="flex items-center gap-1.5"
                      >
                        {copiedLink === "openapi" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copiedLink === "openapi" ? "کپی شد" : "کپی لینک"}</span>
                      </Button>
                      <Button
                        variant="orange"
                        size="sm"
                        as="a"
                        href="/openapi.json"
                        download="porskad-openapi.json"
                        className="flex items-center gap-1.5"
                      >
                        <Download size={14} />
                        <span>دانلود فایل JSON</span>
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-ink-subtle dark:text-slate-300 leading-7 bg-amber-500/5 dark:bg-amber-950/20 border-2 border-amber-500/20 rounded-xl p-4 flex flex-col gap-2">
                    <p className="font-bold text-navy dark:text-amber-300">
                      📥 راهنمای وارد کردن در نرم‌افزارهای Postman و Insomnia:
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>نرم‌افزار <strong>Postman</strong> را باز کرده و دکمه <strong>Import</strong> را در بالای پنل کلیک کنید.</li>
                      <li>آدرس فایل JSON فوق را وارد کنید یا فایل دانلود شده را به درون برنامه بکشید.</li>
                      <li>تمام کالکشن اندپوینت‌های پرس‌کاد به همراه مدل هر ۲۰ نوع سوال فرم‌ها آماده فراخوانی خواهند بود.</li>
                    </ol>
                  </div>
                </div>
              </StickerCard>

              {/* پیش‌نمایش محتوای JSON */}
              <StickerCard theme="white">
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-navy dark:text-white flex items-center gap-2">
                      <Code size={15} className="text-amber-500" />
                      <span>پیش‌نمایش محتوای فایل OpenAPI JSON:</span>
                    </span>

                    <Button
                      variant="orange"
                      size="sm"
                      onClick={() => handleCopyText(openApiJsonText, "openapi_raw")}
                      disabled={!openApiJsonText}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {copiedLink === "openapi_raw" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      <span>{copiedLink === "openapi_raw" ? "کپی شد" : "کپی تمام JSON"}</span>
                    </Button>
                  </div>

                  <div className="relative bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs dir-ltr text-left overflow-auto max-h-[500px]">
                    {loadingOpenApiJson ? (
                      <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                        <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <span>در حال دریافت فایل OpenAPI...</span>
                      </div>
                    ) : (
                      <pre className="whitespace-pre">{openApiJsonText || "فایل در دسترس نیست"}</pre>
                    )}
                  </div>
                </div>
              </StickerCard>
            </div>
          )}

          {/* محتوای بخش ۳: وب‌سرویس و کدهای نمونه REST API */}
          {activeSection === "api" && (
            <div className="flex flex-col gap-6">
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <Terminal size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-navy dark:text-white">
                          آدرس ریشه وب‌سرویس (Base API URL)
                        </h3>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono dir-ltr block mt-0.5">
                          {apiUrl}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="teal"
                      size="sm"
                      onClick={() => handleCopyText(apiUrl, "api")}
                      className="flex items-center gap-1.5"
                    >
                      {copiedLink === "api" ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedLink === "api" ? "کپی شد" : "کپی آدرس API"}</span>
                    </Button>
                  </div>

                  <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 leading-6">
                    تمامی درخواست‌های وب‌سرویس با آدرس فوق آغاز می‌شوند. ارتباطات با فرمت JSON بوده و الزامی است هدر امنیتی{" "}
                    <code className="text-teal font-mono font-bold" dir="ltr">Authorization: Bearer &lt;TOKEN&gt;</code>{" "}
                    در تمام متدهای اختصاصی فرستاده شود.
                  </p>
                </div>
              </StickerCard>

              {/* کارت راهنمای ساختار و نحوه ارسال هدرها (HTTP Request Headers) */}
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink/5 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-teal/10 text-teal rounded-xl">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-navy dark:text-white">
                          ساختار هدرهای الزامی جهت ارسال درخواست (HTTP Request Headers)
                        </h4>
                        <p className="text-xs text-ink-subtle dark:text-slate-400 mt-0.5">
                          مشخصات هدرهایی که باید در درخواست‌های وب‌سرویس به همراه توکن احراز هویت ارسال شوند
                        </p>
                      </div>
                    </div>

                    {token && (
                      <Button
                        variant="teal"
                        size="sm"
                        onClick={() => handleCopyText(`Authorization: Bearer ${token}`, "copy_full_auth")}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        {copiedLink === "copy_full_auth" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        <span>{copiedLink === "copy_full_auth" ? "کپی شد" : "کپی هدر احراز هویت شما"}</span>
                      </Button>
                    )}
                  </div>

                  {/* جدول و کارت‌های تفکیکی هدرها با دکمه‌های کپی مستقیم */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* هدر ۱: Authorization */}
                    <div className="p-4 rounded-xl border-2 border-teal/20 bg-teal/5 dark:bg-slate-900/60 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge color="teal">هدر ۱ (امنیتی و الزامی)</Badge>
                          <span className="text-xs font-black text-navy dark:text-white">Authorization</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText("Authorization", "h_auth_key")}
                          className="text-[11px] font-bold text-teal hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLink === "h_auth_key" ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          <span>کپی کلید (Key)</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs">
                        <span className="text-ink-subtle dark:text-slate-400 font-bold">فرمت مقدار (Value):</span>
                        <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded-lg border border-teal/20 font-mono text-xs dir-ltr">
                          <span className="truncate text-teal font-bold select-all">
                            Bearer {token ? `${token.substring(0, 16)}...` : "<YOUR_TOKEN>"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(`Bearer ${token || "YOUR_TOKEN"}`, "h_auth_val")}
                            className="text-xs text-ink-subtle hover:text-teal shrink-0 ml-2 cursor-pointer p-1"
                            title="کپی مقدار کامل"
                          >
                            {copiedLink === "h_auth_val" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-ink-subtle dark:text-slate-400 leading-5">
                        ⚠️ <strong>نکته مهم:</strong> حتماً باید کلمه <code className="text-teal font-mono font-bold" dir="ltr">Bearer</code> با یک فاصله انگلیسی قبل از رشته توکن قرار گیرد.
                      </p>
                    </div>

                    {/* هدر ۲: Content-Type */}
                    <div className="p-4 rounded-xl border-2 border-ink/10 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge color="blue">هدر ۲ (فرمت داده‌ها)</Badge>
                          <span className="text-xs font-black text-navy dark:text-white">Content-Type</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText("Content-Type", "h_ct_key")}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLink === "h_ct_key" ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          <span>کپی کلید (Key)</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs">
                        <span className="text-ink-subtle dark:text-slate-400 font-bold">فرمت مقدار (Value):</span>
                        <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded-lg border border-ink/10 dark:border-slate-800 font-mono text-xs dir-ltr">
                          <span className="text-blue-600 dark:text-blue-400 font-bold select-all">
                            application/json
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText("application/json", "h_ct_val")}
                            className="text-xs text-ink-subtle hover:text-blue-600 shrink-0 ml-2 cursor-pointer p-1"
                            title="کپی مقدار"
                          >
                            {copiedLink === "h_ct_val" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-ink-subtle dark:text-slate-400 leading-5">
                        برای درخواست‌های متد <code className="font-bold text-navy dark:text-slate-200">POST</code> و <code className="font-bold text-navy dark:text-slate-200">PUT</code> که دارای بدنه (Body) با فرمت JSON هستند.
                      </p>
                    </div>
                  </div>

                  {/* راهنمای Postman و Insomnia */}
                  <div className="p-4 rounded-xl bg-blue-500/5 dark:bg-blue-950/20 border-2 border-blue-500/20 flex flex-col gap-2.5 text-xs text-ink-subtle dark:text-slate-300">
                    <span className="font-black text-navy dark:text-blue-300 flex items-center gap-1.5">
                      <Sparkles size={15} className="text-blue-500" />
                      <span>راهنمای تنظیم توکن در Postman / Insomnia / Thunder Client:</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-blue-500/20 leading-6">
                        <strong className="text-navy dark:text-slate-100 block mb-1">روش اول (تب Headers دستی):</strong>
                        ۱. در نرم‌افزار به تب <strong>Headers</strong> بروید.<br />
                        ۲. در ستون Key مقدار <code className="text-teal font-mono font-bold" dir="ltr">Authorization</code> را بنویسید.<br />
                        ۳. در ستون Value مقدار <code className="text-teal font-mono font-bold" dir="ltr">Bearer &lt;TOKEN&gt;</code> را قرار دهید.
                      </div>
                      <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-blue-500/20 leading-6">
                        <strong className="text-navy dark:text-slate-100 block mb-1">روش دوم (تب Auth خودکار):</strong>
                        ۱. به تب <strong>Auth</strong> یا <strong>Authorization</strong> بروید.<br />
                        ۲. نوع Type را روی <strong className="text-teal">Bearer Token</strong> بگذارید.<br />
                        ۳. فقط توکن خود را در فیلد Token وارد کنید (نرم‌افزار خودش کلمه Bearer را اضافه می‌کند).
                      </div>
                    </div>
                  </div>
                </div>
              </StickerCard>

              {/* نمونه کدهای آماده */}
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink/5 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Code2 size={18} className="text-teal" />
                      <span className="text-sm font-black text-navy dark:text-white">
                        نمونه کدهای آماده اتصال (با توکن شما):
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-pill-md">
                      {[
                        { id: "curl", label: "cURL" },
                        { id: "javascript", label: "JavaScript" },
                        { id: "python", label: "Python" },
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => setSelectedLang(lang.id)}
                          className={`px-3.5 py-1 rounded-pill-sm text-xs font-extrabold transition-all cursor-pointer ${
                            selectedLang === lang.id
                              ? "bg-teal text-white shadow-xs"
                              : "text-ink-subtle hover:text-navy dark:hover:text-white"
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs dir-ltr text-left overflow-x-auto">
                    <button
                      onClick={() => handleCopySnippet(codeSnippets[selectedLang])}
                      className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
                    >
                      {copiedSnippet ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copiedSnippet ? "کپی شد" : "کپی کد"}</span>
                    </button>

                    <pre className="pr-20 whitespace-pre">{codeSnippets[selectedLang]}</pre>
                  </div>
                </div>
              </StickerCard>

              {/* جدول جامع اندپوینت‌ها */}
              <StickerCard theme="white">
                <div className="p-5 sm:p-6 flex flex-col gap-4">
                  <h4 className="text-sm font-black text-navy dark:text-white flex items-center gap-2">
                    <Layers size={18} className="text-teal" />
                    <span>جدول اندپوینت‌های اصلی سامانه پرس‌کاد:</span>
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="border-b-2 border-ink/10 dark:border-slate-800 text-ink-subtle dark:text-slate-400 font-black">
                          <th className="py-3 px-3">متد</th>
                          <th className="py-3 px-3 font-mono dir-ltr text-left">مسیر (Endpoint)</th>
                          <th className="py-3 px-3">توضیحات و عملکرد</th>
                          <th className="py-3 px-3 text-center">احراز هویت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/5 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                        <tr>
                          <td className="py-3 px-3"><Badge color="blue">GET</Badge></td>
                          <td className="py-3 px-3 font-mono dir-ltr text-left text-teal font-bold">/api/v1/forms</td>
                          <td className="py-3 px-3">دریافت لیست فرم‌های ساخته شده توسط شما</td>
                          <td className="py-3 px-3 text-center"><Badge color="teal">توکن لازم</Badge></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3"><Badge color="green">POST</Badge></td>
                          <td className="py-3 px-3 font-mono dir-ltr text-left text-teal font-bold">/api/v1/forms</td>
                          <td className="py-3 px-3">ایجاد فرم جدید با فیلدها و سوالات دلخواه</td>
                          <td className="py-3 px-3 text-center"><Badge color="teal">توکن لازم</Badge></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3"><Badge color="blue">GET</Badge></td>
                          <td className="py-3 px-3 font-mono dir-ltr text-left text-teal font-bold">/api/v1/forms/:id</td>
                          <td className="py-3 px-3">دریافت مشخصات کامل یک فرم بر اساس شناسه</td>
                          <td className="py-3 px-3 text-center"><Badge color="teal">توکن لازم</Badge></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3"><Badge color="orange">PUT</Badge></td>
                          <td className="py-3 px-3 font-mono dir-ltr text-left text-teal font-bold">/api/v1/forms/:id</td>
                          <td className="py-3 px-3">ویرایش عنوان، توضیحات یا تنظیمات یک فرم</td>
                          <td className="py-3 px-3 text-center"><Badge color="teal">توکن لازم</Badge></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3"><Badge color="red">DELETE</Badge></td>
                          <td className="py-3 px-3 font-mono dir-ltr text-left text-teal font-bold">/api/v1/forms/:id</td>
                          <td className="py-3 px-3">حذف کامل یک فرم و داده‌های مرتبط</td>
                          <td className="py-3 px-3 text-center"><Badge color="teal">توکن لازم</Badge></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3"><Badge color="blue">GET</Badge></td>
                          <td className="py-3 px-3 font-mono dir-ltr text-left text-teal font-bold">/api/v1/forms/:id/responses</td>
                          <td className="py-3 px-3">دریافت پاسخ‌ها و ورودی‌های ثبت‌شده یک فرم</td>
                          <td className="py-3 px-3 text-center"><Badge color="teal">توکن لازم</Badge></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3"><Badge color="green">POST</Badge></td>
                          <td className="py-3 px-3 font-mono dir-ltr text-left text-teal font-bold">/api/v1/forms/:id/responses</td>
                          <td className="py-3 px-3">ثبت پاسخ جدید برای یک فرم (ارسال فرم)</td>
                          <td className="py-3 px-3 text-center"><Badge color="gray">عمومی</Badge></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3"><Badge color="blue">GET</Badge></td>
                          <td className="py-3 px-3 font-mono dir-ltr text-left text-teal font-bold">/api/v1/system/health</td>
                          <td className="py-3 px-3">بررسی سلامت سرور، زمان کارکرد و وضعیت دیتابیس</td>
                          <td className="py-3 px-3 text-center"><Badge color="gray">عمومی</Badge></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </StickerCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
