import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { QUESTION_TYPES, QUESTION_CATEGORIES } from "../../lib/questionTypes";
import SEO from "../../components/ui/SEO";
import {
  Code2,
  ArrowRight,
  Copy,
  Check,
  Download,
  Key,
  Layers,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  FileJson,
  Eye,
  EyeOff
} from "lucide-react";

export default function SwaggerDocs() {
  const containerRef = useRef(null);
  const swaggerInstanceRef = useRef(null);

  // وضعیت توکن و احراز هویت
  const [token, setToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [specLoading, setSpecLoading] = useState(true);

  // باز/بسته بودن بخش‌های کمکی (برای اینکه صفحه شلوغ نشود)
  const [showSnippets, setShowSnippets] = useState(false);
  const [showQuestionTypes, setShowQuestionTypes] = useState(false);
  const [selectedLang, setSelectedLang] = useState("curl"); // "curl" | "js" | "python"

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const baseUrl = `${origin}/api/v1`;

  // ۱. دریافت توکن نشست کاربر (در صورت لاگین بودن)
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
          setUserEmail(session.user?.email || "کاربر لاگین‌شده");

          // اگر قبلاً سوئیگر لود شده بود، توکن را تزریق کن
          if (swaggerInstanceRef.current) {
            swaggerInstanceRef.current.preauthorizeApiKey("BearerAuth", `Bearer ${session.access_token}`);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    }
    checkAuth();
  }, []);

  // ۲. راه‌اندازی کتابخانه رسمی Swagger UI
  useEffect(() => {
    let isMounted = true;

    // بارگذاری استایل Swagger
    if (!document.getElementById("swagger-ui-css")) {
      const link = document.createElement("link");
      link.id = "swagger-ui-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
      document.head.appendChild(link);
    }

    function initSwagger() {
      if (window.SwaggerUIBundle && containerRef.current && isMounted) {
        const ui = window.SwaggerUIBundle({
          url: "/openapi.json",
          domNode: containerRef.current,
          deepLinking: true,
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIStandalonePreset || window.SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: "BaseLayout",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          docExpansion: "list",
          filter: true,
          showExtensions: true,
          showCommonExtensions: true,
          tryItOutEnabled: true,
          persistAuthorization: true,
          onComplete: () => {
            if (isMounted) {
              setSpecLoading(false);
              swaggerInstanceRef.current = ui;
              // اعمال خودکار توکن در صورت وجود
              if (token) {
                ui.preauthorizeApiKey("BearerAuth", `Bearer ${token}`);
              }
            }
          },
        });
      }
    }

    if (window.SwaggerUIBundle) {
      initSwagger();
    } else {
      const script = document.createElement("script");
      script.id = "swagger-ui-script";
      script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
      script.async = true;
      script.onload = () => {
        initSwagger();
      };
      document.body.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  function handleCopyToken() {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }

  function handleCopySnippet(code) {
    navigator.clipboard.writeText(code);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  }

  const codeSnippets = {
    curl: `# دریافت لیست فرم‌ها
curl -X GET "${baseUrl}/forms" \\
  -H "Authorization: Bearer ${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}" \\
  -H "Accept: application/json"

# ساخت یک فرم جدید
curl -X POST "${baseUrl}/forms" \\
  -H "Authorization: Bearer ${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "فرم تست پلتفرم", "form_type": "step_by_step"}'`,

    js: `// ارسال درخواست در جاوااسکریپت (Fetch)
const TOKEN = "${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}";

async function getMyForms() {
  const res = await fetch("${baseUrl}/forms", {
    headers: {
      "Authorization": \`Bearer \${TOKEN}\`,
      "Accept": "application/json"
    }
  });
  const data = await res.json();
  console.log("فرم‌ها:", data.forms);
}

getMyForms();`,

    python: `# فراخوانی در پایتون (requests)
import requests

TOKEN = "${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}"
headers = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}

res = requests.get("${baseUrl}/forms", headers=headers)
print(res.json())`
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <SEO
        title="مستندات یکپارچه Swagger و وب‌سرویس — پرس‌کاد"
        description="تمامی مستندات، تست زنده، توکن احراز هویت و انواع سوالات در یک صفحه واحد."
      />

      {/* هدر بالای صفحه */}
      <header className="sticky top-0 z-50 bg-navy dark:bg-[#0E1526] text-white border-b border-white/10 px-4 lg:px-8 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
            >
              <ArrowRight size={15} />
              <span>بازگشت به پنل</span>
            </Link>

            <div className="h-5 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xl font-black rotate-[-2deg] select-none text-white">
                پرس<span className="text-teal">کاد</span>
              </span>
              <span className="text-xs font-bold bg-teal/25 text-teal border border-teal/40 px-2.5 py-0.5 rounded-full">
                مستندات جامع REST API
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              download="porskad-openapi.json"
              className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
              title="دانلود فایل JSON جهت ایمپورت در Postman"
            >
              <Download size={14} />
              <span className="hidden sm:inline">دانلود فایل OpenAPI JSON</span>
            </a>
          </div>
        </div>
      </header>

      {/* بخش وضعیت توکن و احراز هویت (در بالای همین صفحه) */}
      <div className="bg-white dark:bg-[#0E1526] border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <div className="p-1.5 bg-teal/15 text-teal rounded-lg">
              <Key size={16} />
            </div>
            {token ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200">توکن حساب شما ({userEmail}):</span>
                <span className="font-mono bg-slate-100 dark:bg-slate-800 text-teal px-2 py-0.5 rounded border border-teal/20 text-xs select-all">
                  {showToken ? token : `${token.substring(0, 16)}••••••••••••••••`}
                </span>
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  title={showToken ? "مخفی کردن" : "نمایش کامل"}
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={handleCopyToken}
                  className="bg-teal text-white hover:bg-teal-text px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all"
                >
                  {copiedToken ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedToken ? "کپی شد" : "کپی توکن"}</span>
                </button>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={12} />
                  توکن به صورت خودکار در سوئیگر فعال شد
                </span>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                شما لاگین نیستید. برای تست زنده ریکوئست‌ها، می‌توانید در پنل لاگین کنید یا روی دکمه سبز رنگ <strong>Authorize</strong> کلیک کنید.
              </span>
            )}
          </div>

          {/* دکمه‌های آکاردئونی برای نمایش نمونه کدها و انواع سوال */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowSnippets(!showSnippets);
                if (showQuestionTypes) setShowQuestionTypes(false);
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                showSnippets
                  ? "bg-navy text-white dark:bg-teal"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <Terminal size={14} />
              <span>نمونه کدهای اتصال</span>
              {showSnippets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              onClick={() => {
                setShowQuestionTypes(!showQuestionTypes);
                if (showSnippets) setShowSnippets(false);
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                showQuestionTypes
                  ? "bg-navy text-white dark:bg-teal"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <Layers size={14} />
              <span>راهنمای ۲۰ نوع سوال</span>
              {showQuestionTypes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* بخش آکاردئونی بازشونده: نمونه کدها */}
      {showSnippets && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black text-navy dark:text-white flex items-center gap-2">
                <Terminal size={16} className="text-teal" />
                <span>نمونه کد فراخوانی در پلتفرم شما</span>
              </h3>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                {["curl", "js", "python"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setSelectedLang(l)}
                    className={`px-2.5 py-1 text-xs font-bold rounded ${
                      selectedLang === l ? "bg-teal text-white" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => handleCopySnippet(codeSnippets[selectedLang])}
                className="absolute top-2.5 left-2.5 bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-all"
              >
                {copiedCurl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedCurl ? "کپی شد" : "کپی"}</span>
              </button>
              <pre className="bg-slate-900 text-slate-100 p-4 pt-8 rounded-xl text-xs font-mono overflow-x-auto text-left dir-ltr">
                {codeSnippets[selectedLang]}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* بخش آکاردئونی بازشونده: متادیتای ۲۰ نوع سوال */}
      {showQuestionTypes && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="text-sm font-black text-navy dark:text-white mb-3 flex items-center gap-2">
              <Layers size={16} className="text-teal" />
              <span>فهرست و نام‌های سیستمی ۲۰ نوع سوال پرس‌کاد</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
              {Object.entries(QUESTION_TYPES).map(([key, item]) => (
                <div key={key} className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-navy dark:text-white mb-0.5">{item.label}</div>
                  <code className="text-[11px] font-mono text-teal font-bold">{key}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* بدنه اصلی: کنسول زنده Swagger UI */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6">
        {specLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold">در حال بارگذاری کنسول Swagger...</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="swagger-ui-custom-container bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm overflow-hidden"
        />
      </main>

      {/* استایل‌های سفارشی سوئگر */}
      <style>{`
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui { font-family: inherit !important; }
        .swagger-ui .info { margin: 15px 0 !important; }
        .swagger-ui .info .title { font-size: 22px !important; color: #1e293b !important; }
        .dark .swagger-ui .info .title { color: #f8fafc !important; }
        .dark .swagger-ui { filter: invert(0.88) hue-rotate(180deg); }
        .dark .swagger-ui img { filter: invert(1) hue-rotate(180deg); }
        .swagger-ui .scheme-container { background: transparent !important; box-shadow: none !important; padding: 5px 0 !important; }
      `}</style>
    </div>
  );
}
