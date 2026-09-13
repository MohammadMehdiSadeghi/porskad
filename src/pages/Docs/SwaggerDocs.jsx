import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Code2, ArrowRight, Copy, Check, Download, ExternalLink, ShieldCheck, Terminal, BookOpen, Layers } from "lucide-react";
import SEO from "../../components/ui/SEO";

export default function SwaggerDocs() {
  const containerRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [specLoading, setSpecLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("swagger"); // "swagger" | "guide"

  const openApiUrl = `${window.location.origin}/openapi.json`;

  useEffect(() => {
    let isMounted = true;

    // بارگذاری CSS سوئگر
    const existingCss = document.getElementById("swagger-ui-css");
    if (!existingCss) {
      const link = document.createElement("link");
      link.id = "swagger-ui-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
      document.head.appendChild(link);
    }

    // بارگذاری اسکریپت Swagger UI Bundle
    function initSwagger() {
      if (window.SwaggerUIBundle && containerRef.current && isMounted) {
        window.SwaggerUIBundle({
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
            if (isMounted) setSpecLoading(false);
          },
        });
      }
    }

    if (window.SwaggerUIBundle) {
      initSwagger();
    } else {
      const existingScript = document.getElementById("swagger-ui-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "swagger-ui-script";
        script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
        script.async = true;
        script.onload = () => {
          initSwagger();
        };
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener("load", initSwagger);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  function handleCopySpecUrl() {
    navigator.clipboard.writeText(openApiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <SEO
        title="مستندات OpenAPI و Swagger — وب‌سرویس پرس‌کاد"
        description="مستندات جامع وب‌سرویس استاندارد پرس‌کاد برای توسعه‌دهندگان، ساخت و مدیریت فرم‌ها و ثبت پاسخ‌ها."
      />

      {/* هدر بالای صفحه مستندات */}
      <header className="sticky top-0 z-50 bg-navy dark:bg-[#0E1526] text-white border-b border-white/10 px-4 lg:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
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
                Swagger v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === "swagger" ? "guide" : "swagger")}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === "guide"
                  ? "bg-teal text-white"
                  : "bg-white/10 text-white/90 hover:bg-white/20"
              }`}
            >
              {activeTab === "guide" ? <Code2 size={14} /> : <BookOpen size={14} />}
              <span>{activeTab === "guide" ? "نمایش کنسول Swagger" : "راهنمای فارسی وب‌سرویس"}</span>
            </button>

            <button
              onClick={handleCopySpecUrl}
              className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
              title="کپی لینک مستقیم فایل openapi.json برای Postman یا Insomnia"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? "کپی شد!" : "کپی لینک OpenAPI JSON"}</span>
            </button>

            <a
              href="/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              download="porskad-openapi.json"
              className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all"
              title="دانلود فایل JSON مستندات"
            >
              <Download size={15} />
            </a>
          </div>
        </div>
      </header>

      {/* بنر راهنمای سریع */}
      <div className="bg-gradient-to-r from-teal/15 via-indigo-500/10 to-teal/10 border-b border-teal/20 px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-teal shrink-0" />
            <span>
              <strong>راهنمای تست:</strong> برای امتحان اندپوینت‌ها (Try it out)، روی دکمه سبز{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">Authorize</strong> کلیک کرده و توکن حساب کاربری
              خود را در قالب <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded text-teal">Bearer &lt;TOKEN&gt;</code> وارد کنید.
            </span>
          </div>
          <Link
            to="/admin/api-docs"
            className="text-teal hover:underline font-bold flex items-center gap-1 shrink-0"
          >
            <span>مشاهده و کپی توکن من در پنل</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* محتوای تب راهنما یا سوئگر */}
      {activeTab === "guide" ? (
        <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-black text-navy dark:text-white mb-3 flex items-center gap-2">
              <Terminal size={20} className="text-teal" />
              <span>راهنمای اتصال پلتفرم شما به پرس‌کاد</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              با استفاده از وب‌سرویس RESTful پرس‌کاد، می‌توانید بدون درگیر شدن با ساختار پایگاه داده و به‌صورت کاملاً امن و محرمانه،
              تمامی فرآیندهای فرم‌ساز را در اپلیکیشن اختصاصی یا وب‌سایت خود داشته باشید.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-sm text-navy dark:text-white mb-1">۱. احراز هویت با Bearer Token</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  تمامی درخواست‌های مدیریتی نیاز به هدر <code className="text-teal font-mono">Authorization: Bearer &lt;TOKEN&gt;</code> دارند.
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-sm text-navy dark:text-white mb-1">۲. ساخت و ویرایش فرم‌ها (CRUD)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  با متدهای <code className="text-emerald-600 font-bold">GET</code>, <code className="text-blue-600 font-bold">POST</code>, <code className="text-amber-600 font-bold">PUT</code>, <code className="text-rose-600 font-bold">DELETE</code> فرم‌ها و سوالات خود را مدیریت کنید.
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-sm text-navy dark:text-white mb-1">۳. ثبت پاسخ و کدهای امبد</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  پاسخ‌های کاربران را دریافت کرده یا از کدهای Iframe و اسکریپت آماده برای تعبیه فرم استفاده نمایید.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-base font-black text-navy dark:text-white mb-3 flex items-center gap-2">
              <Layers size={18} className="text-teal" />
              <span>نمونه درخواست دریافت لیست فرم‌ها (cURL)</span>
            </h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto text-left dir-ltr">
{`curl -X GET "${window.location.origin}/api/v1/forms" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Accept: application/json"`}
            </pre>
          </div>
        </div>
      ) : null}

      {/* کانتینر رندر Swagger UI */}
      <main className={`flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 ${activeTab === "guide" ? "hidden" : ""}`}>
        {specLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold">در حال بارگذاری مستندات تعاملی Swagger...</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="swagger-ui-custom-container bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm overflow-hidden"
        />
      </main>

      {/* استایل‌های سفارشی برای سازگاری سوئگر با ظاهر برنامه */}
      <style>{`
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui { font-family: inherit !important; }
        .swagger-ui .info { margin: 20px 0 !important; }
        .swagger-ui .info .title { font-size: 24px !important; color: #1e293b !important; }
        .dark .swagger-ui .info .title { color: #f8fafc !important; }
        .dark .swagger-ui { filter: invert(0.88) hue-rotate(180deg); }
        .dark .swagger-ui img { filter: invert(1) hue-rotate(180deg); }
        .swagger-ui .scheme-container { background: transparent !important; box-shadow: none !important; padding: 10px 0 !important; }
      `}</style>
    </div>
  );
}
