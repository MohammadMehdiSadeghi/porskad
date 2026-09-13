import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import { isValidIranPhone, normalizeIranPhone, isValidEmail } from "../../lib/validators";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";
import SEO from "../../components/ui/SEO";
import { faNum, faDate } from "../../lib/utils";
import {
  Crown,
  Lock,
  Key,
  Mail,
  Eye,
  EyeOff,
  User,
  Code2,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  FileJson,
  Layers,
  ShieldCheck,
  Globe,
  ArrowRight,
  Download,
  BookOpen,
  CheckCircle2,
  Code,
} from "lucide-react";

// ─── کامپوننت رندر تعاملی کنسول Swagger در صفحه ───
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
    <div className="relative w-full rounded-2xl overflow-hidden border border-ink/10 dark:border-slate-800 bg-white dark:bg-[#0E1526] p-3 sm:p-5 min-h-[550px]">
      <style>{`
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui { font-family: ui-sans-serif, system-ui, sans-serif !important; }
        .swagger-ui .info { margin: 10px 0 20px !important; }
        .swagger-ui .info .title { font-size: 20px !important; color: #0f172a !important; font-weight: 800 !important; }
        .dark .swagger-ui .info .title { color: #f8fafc !important; }
        .dark .swagger-ui { filter: invert(0.88) hue-rotate(180deg); }
        .dark .swagger-ui img { filter: invert(1) hue-rotate(180deg); }
        .swagger-ui .scheme-container { background: transparent !important; box-shadow: none !important; padding: 5px 0 !important; }
        .swagger-ui .opblock { border-radius: 12px !important; margin: 0 0 12px !important; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05) !important; }
        .swagger-ui .opblock-summary { border-radius: 12px !important; }
      `}</style>
      {loading && (
        <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
          <div className="w-8 h-8 border-3 border-teal/20 border-t-teal rounded-full animate-spin" />
          <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">در حال راه‌اندازی کنسول تعاملی Swagger...</span>
        </div>
      )}
      <div dir="ltr" ref={containerRef} className="swagger-ui-embedded text-left" />
    </div>
  );
}

export default function Profile() {
  const { user, profile, changePassword, updateProfile } = useAuth();
  const { push } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "developer" || searchParams.get("tab") === "docs" ? "developer" : "profile";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSection, setActiveSection] = useState(() => {
    const s = searchParams.get("section");
    return ["swagger", "openapi", "api"].includes(s) ? s : null;
  });

  const currentEmail = user?.email || profile?.email || "";
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // توکن و ابزارهای وب‌سرویس
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const [selectedLang, setSelectedLang] = useState("curl");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [openApiJsonText, setOpenApiJsonText] = useState("");
  const [loadingOpenApiJson, setLoadingOpenApiJson] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const docsUrl = `${origin}/docs`;
  const openApiUrl = `${origin}/openapi.json`;
  const apiUrl = `${origin}/api/v1`;

  function handleNavigateSection(sectionKey) {
    setActiveSection(sectionKey);
    const newParams = { tab: "developer" };
    if (sectionKey) {
      newParams.section = sectionKey;
    }
    setSearchParams(newParams);
  }

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "developer" || tabParam === "docs") {
      setActiveTab("developer");
      const secParam = searchParams.get("section");
      if (["swagger", "openapi", "api"].includes(secParam)) {
        setActiveSection(secParam);
      } else if (!secParam) {
        setActiveSection(null);
      }
    } else if (tabParam === "profile") {
      setActiveTab("profile");
      setActiveSection(null);
    }
  }, [searchParams]);

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

  const codeSnippets = {
    curl: `curl -X GET "${apiUrl}/forms" \\
  -H "Authorization: Bearer ${token || "YOUR_TOKEN"}" \\
  -H "Content-Type: application/json"`,

    javascript: `// دریافت لیست فرم‌ها با fetch در JavaScript یا Node.js (18+)
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
    push("کد نمونه با موفقیت در کلیپ‌بورد کپی شد", "success");
    setTimeout(() => setCopiedSnippet(false), 2000);
  }

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
    if (user?.email || profile?.email) {
      setEmail(user?.email || profile?.email || "");
    }
  }, [profile, user]);

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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  async function handleSaveProfile() {
    if (!fullName.trim()) {
      push("نام نمی‌تواند خالی باشد", "error");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      push("ایمیل نمی‌تواند خالی باشد", "error");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      push("فرمت ایمیل نامعتبر است", "error");
      return;
    }

    const cleanPhone = phone ? normalizeIranPhone(phone) : "";
    if (phone && !isValidIranPhone(cleanPhone)) {
      push("شماره موبایل نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹)", "error");
      return;
    }

    setSavingProfile(true);
    try {
      const emailChanged = trimmedEmail.toLowerCase() !== currentEmail.toLowerCase();

      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (authError) throw authError;
      }

      await updateProfile({
        full_name: fullName.trim(),
        phone: cleanPhone || null,
        email: trimmedEmail,
      });

      if (emailChanged) {
        push("پروفایل به‌روزرسانی شد. در صورت نیاز لینک تایید به ایمیل جدید ارسال می‌شود.");
      } else {
        push("پروفایل با موفقیت به‌روزرسانی شد");
      }
    } catch (err) {
      push("خطا در ذخیره تغییرات: " + (err.message || "مشکلی رخ داد"), "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("رمز فعلی را وارد کنید.");
      return;
    }
    if (!newPassword) {
      setPasswordError("رمز جدید را وارد کنید.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("رمز جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("رمز جدید و تکرار آن یکسان نیستند.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user?.email || profile?.email,
        password: currentPassword,
      });
      if (loginError) {
        setPasswordError("رمز فعلی اشتباه است.");
        return;
      }

      await changePassword(newPassword);
      push("رمز عبور تغییر کرد");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "تغییر رمز ناموفق بود.");
    } finally {
      setSavingPassword(false);
    }
  }

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
    push("با موفقیت در حافظه کپی شد.");
  }

  return (
    <div className={`flex flex-col gap-6 w-full ${activeTab === "developer" && activeSection ? "max-w-5xl" : "max-w-3xl"}`}>
      {profile?.is_owner && (
        <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
          <Crown size={24} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">حساب صاحب اصلی سایت</p>
            <p className="text-xs text-amber-600">این حساب غیرقابل حذف و غیرفعال شدن است و به تمام بخش‌های سایت دسترسی کامل دارد.</p>
          </div>
        </div>
      )}

      <SEO
        title={activeTab === "developer" ? "مستندات وب سرویس — پرس‌کاد" : "پروفایل و تنظیمات کاربری — پرس‌کاد"}
        description="اطلاعات حساب کاربری، امنیت و مستندات وب سرویس — پرس‌کاد"
        url="/admin/profile"
        noIndex
      />

      <div>
        <h1 className="text-xl sm:text-3xl font-black text-navy dark:text-white">
          {activeTab === "developer" ? "مستندات وب سرویس" : "پروفایل من"}
        </h1>
        <p className="text-sm text-ink/50 dark:text-slate-400 mt-0.5">
          {activeTab === "developer"
            ? "کنسول Swagger، فایل نقشه OpenAPI 3.0 و ابزارهای توسعه‌دهندگان"
            : "اطلاعات حساب کاربری، امنیت و تنظیمات سامانه"}
        </p>
      </div>

      {/* تب‌های انتخاب بخش */}
      <div className="flex items-center gap-2 border-b border-ink/10 dark:border-slate-800 pb-1">
        <button
          onClick={() => {
            setActiveTab("profile");
            setSearchParams({ tab: "profile" });
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-extrabold transition-all border-b-2 -mb-1.5 cursor-pointer ${
            activeTab === "profile"
              ? "border-teal text-teal bg-teal/5"
              : "border-transparent text-ink-subtle hover:text-navy dark:hover:text-white"
          }`}
        >
          <User size={16} />
          <span>مشخصات و امنیت حساب</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("developer");
            setSearchParams({ tab: "developer", ...(activeSection ? { section: activeSection } : {}) });
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-extrabold transition-all border-b-2 -mb-1.5 cursor-pointer ${
            activeTab === "developer"
              ? "border-teal text-teal bg-teal/5"
              : "border-transparent text-ink-subtle hover:text-navy dark:hover:text-white"
          }`}
        >
          <Code2 size={16} />
          <span>مستندات وب سرویس</span>
          <span className="text-[10px] bg-teal/15 text-teal px-1.5 py-0.5 rounded-full font-mono font-bold">API</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* تب ۲: مستندات وب سرویس (۳ بخش اصلی همراه با کارکرد روی همین صفحه) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "developer" ? (
        <div className="flex flex-col gap-6">
          {/* کارت توکن احراز هویت */}
          <div className="-rotate-[0.3deg]">
            <StickerCard theme="teal" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
              <div className="p-5 sm:p-6 flex flex-col gap-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-teal/20 text-teal rounded-xl shrink-0">
                      <Key size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-navy dark:text-white">توکن اختصاصی شما (Bearer Token)</h2>
                      <p className="text-xs text-ink-subtle dark:text-slate-400">
                        کلید امنیتی جهت احراز هویت حساب شما در درخواست‌های وب‌سرویس
                      </p>
                    </div>
                  </div>
                </div>

                {/* ردیف فیلد توکن: نیم‌عرض، بدون تغییر اندازه و کشیدگی، همراه با دکمه کپی اختصاصی */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full pt-1">
                  <div className="relative w-full sm:w-1/2 max-w-md min-w-0 bg-white/95 dark:bg-slate-900 border border-teal/30 rounded-xl px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300 dir-ltr text-left flex items-center justify-between select-all">
                    <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis block min-w-0 flex-1">
                      {token
                        ? (showToken ? token : `${token.substring(0, 16)}••••••••••••••••••••${token.substring(token.length - 8)}`)
                        : "در حال بارگذاری توکن..."}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="p-1 text-ink-subtle hover:text-navy dark:hover:text-white rounded transition-colors shrink-0 ml-1.5 cursor-pointer"
                      title={showToken ? "مخفی کردن" : "نمایش کامل"}
                    >
                      {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyText(token, "token")}
                    disabled={!token}
                    className="bg-teal text-white hover:bg-teal-text px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {copiedToken ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                    <span>{copiedToken ? "کپی شد" : "کپی توکن"}</span>
                  </button>
                </div>

                <div className="text-[11px] text-ink-subtle dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <ShieldCheck size={14} className="text-teal shrink-0" />
                  <span>
                    این توکن را در هدر درخواست‌های خود بفرستید: <code className="bg-teal/10 text-teal px-1.5 py-0.5 rounded font-mono" dir="ltr">Authorization: Bearer &lt;TOKEN&gt;</code>
                  </span>
                </div>
              </div>
            </StickerCard>
          </div>

          {/* بررسی وضعیت نمایش: آیا در ۳ بخش اصلی هستیم یا داخل یکی از بخش‌ها؟ */}
          {!activeSection ? (
            /* ───────────────────────────────────────────────────────── */
            /* نمای اول: نمایش ۳ بخش اصلی با توضیحات و دکمه ورود روی صفحه */
            /* ───────────────────────────────────────────────────────── */
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-black text-navy dark:text-white flex items-center gap-2">
                  <BookOpen size={18} className="text-teal" />
                  <span>بخش‌های مستندات وب سرویس</span>
                </h3>
                <p className="text-xs text-ink-subtle dark:text-slate-400 mt-0.5">
                  برای مشاهده جزییات و کار با هر بخش، روی آن کلیک کنید (توضیحات و عملکرد کامل روی همین صفحه نمایش داده می‌شوند):
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* بخش ۱: کنسول تعاملی Swagger */}
                <div className="bg-white dark:bg-[#0E1526] border-2 border-ink/10 dark:border-slate-800 hover:border-teal/50 rounded-2xl p-5 shadow-2xs transition-all flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                          <Globe size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-navy dark:text-white">
                            ۱. کنسول مستندات تعاملی Swagger
                          </h4>
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-mono dir-ltr block">
                            {docsUrl}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
                        کنسول تعاملی و تست زنده
                      </span>
                    </div>

                    <p className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed pt-1">
                      <strong>توضیح:</strong> صفحه گرافیکی و کنسول استاندارد Swagger برای مشاهده تمام اندپوینت‌ها و تست زنده درخواست‌ها (GET, POST, PUT, DELETE). با ورود به این بخش، توکن حساب شما به صورت خودکار متصل می‌شود و می‌توانید متدهای وب‌سرویس را بدون نیاز به کدنویسی روی همین صفحه تست و بررسی نمایید.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-ink/5 dark:border-slate-800">
                    <button
                      onClick={() => handleNavigateSection("swagger")}
                      className="bg-teal hover:bg-teal-text text-white px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <span>ورود و استفاده روی همین صفحه</span>
                      <ArrowRight size={14} className="rotate-180" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyText(docsUrl, "docs")}
                        className="p-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-ink-subtle flex items-center gap-1 transition-all cursor-pointer"
                        title="کپی لینک داکس"
                      >
                        {copiedLink === "docs" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copiedLink === "docs" ? "کپی شد" : "کپی آدرس"}</span>
                      </button>
                      <a
                        href="/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-ink-subtle hover:text-navy dark:hover:text-white flex items-center gap-1 p-2 transition-colors"
                      >
                        <span>تب جدید</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* بخش ۲: فایل نقشه استاندارد سامانه OpenAPI 3.0 */}
                <div className="bg-white dark:bg-[#0E1526] border-2 border-ink/10 dark:border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-2xs transition-all flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                          <FileJson size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-navy dark:text-white">
                            ۲. فایل نقشه استاندارد سامانه (OpenAPI 3.0)
                          </h4>
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-mono dir-ltr block">
                            {openApiUrl}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
                        استاندارد جهانی JSON
                      </span>
                    </div>

                    <p className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed pt-1">
                      <strong>توضیح:</strong> فایل استاندارد بین‌المللی JSON شامل مشخصات فنی تمام اندپوینت‌ها، متدها و الگوهای هر ۲۰ نوع سوال پرس‌کاد. این فایل را می‌توانید مستقیماً در نرم‌افزارهایی مانند <strong>Postman</strong> یا <strong>Insomnia</strong> وارد (Import) کنید تا تمام درخواست‌ها آماده شوند.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-ink/5 dark:border-slate-800">
                    <button
                      onClick={() => handleNavigateSection("openapi")}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <span>ورود و استفاده روی همین صفحه</span>
                      <ArrowRight size={14} className="rotate-180" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyText(openApiUrl, "openapi")}
                        className="p-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-ink-subtle flex items-center gap-1 transition-all cursor-pointer"
                        title="کپی لینک فایل"
                      >
                        {copiedLink === "openapi" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copiedLink === "openapi" ? "کپی شد" : "کپی آدرس"}</span>
                      </button>
                      <a
                        href="/openapi.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        download="porskad-openapi.json"
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 p-2"
                      >
                        <Download size={13} />
                        <span>دانلود JSON</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* بخش ۳: وب‌سرویس و کدهای نمونه REST API */}
                <div className="bg-white dark:bg-[#0E1526] border-2 border-ink/10 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-2xs transition-all flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                          <Terminal size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-navy dark:text-white">
                            ۳. وب‌سرویس و کدهای نمونه (REST API)
                          </h4>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono dir-ltr block">
                            {apiUrl}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                        نمونه کدهای cURL، JS و Python
                      </span>
                    </div>

                    <p className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed pt-1">
                      <strong>توضیح:</strong> آدرس پایه و ریشه سرور برای ارسال درخواست‌ها از طریق کدهای برنامه شما، به همراه نمونه کدهای آماده برای cURL و JavaScript و Python و جدول کامل اندپوینت‌ها برای دریافت فرم‌ها و ثبت پاسخ‌ها.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-ink/5 dark:border-slate-800">
                    <button
                      onClick={() => handleNavigateSection("api")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <span>ورود و استفاده روی همین صفحه</span>
                      <ArrowRight size={14} className="rotate-180" />
                    </button>

                    <button
                      onClick={() => handleCopyText(apiUrl, "api")}
                      className="p-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-ink-subtle flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedLink === "api" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span>{copiedLink === "api" ? "کپی شد" : "کپی آدرس API"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────── */
            /* نمای جزئیات بخش انتخاب شده (روی همین صفحه) */
            /* ───────────────────────────────────────────────────────── */
            <div className="flex flex-col gap-5">
              {/* نوار ناوبری و تب‌های دسترسی سریع بین ۳ بخش */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0E1526] border border-ink/10 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
                <button
                  onClick={() => handleNavigateSection(null)}
                  className="flex items-center gap-2 text-xs font-extrabold text-ink-subtle hover:text-teal bg-slate-50 dark:bg-slate-800/80 hover:bg-teal/10 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <ArrowRight size={16} />
                  <span>بازگشت به ۳ بخش اصلی مستندات</span>
                </button>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => handleNavigateSection("swagger")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeSection === "swagger"
                        ? "bg-teal text-white shadow-xs"
                        : "text-ink-subtle hover:text-navy dark:hover:text-white"
                    }`}
                  >
                    ۱. کنسول Swagger
                  </button>
                  <button
                    onClick={() => handleNavigateSection("openapi")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeSection === "openapi"
                        ? "bg-teal text-white shadow-xs"
                        : "text-ink-subtle hover:text-navy dark:hover:text-white"
                    }`}
                  >
                    ۲. نقشه OpenAPI 3.0
                  </button>
                  <button
                    onClick={() => handleNavigateSection("api")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeSection === "api"
                        ? "bg-teal text-white shadow-xs"
                        : "text-ink-subtle hover:text-navy dark:hover:text-white"
                    }`}
                  >
                    ۳. کدهای نمونه و REST API
                  </button>
                </div>
              </div>

              {/* محتوای بخش ۱: کنسول تعاملی Swagger */}
              {activeSection === "swagger" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-white dark:bg-[#0E1526] border-2 border-ink/10 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                          <Globe size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-navy dark:text-white">
                            کنسول مستندات تعاملی Swagger (Swagger UI)
                          </h3>
                          <p className="text-xs text-ink-subtle dark:text-slate-400">
                            تست آنلاین و زنده تمام درخواست‌ها مستقیماً در همین صفحه
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyText(docsUrl, "docs")}
                          className="p-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-ink-subtle flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedLink === "docs" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          <span>{copiedLink === "docs" ? "کپی شد" : "کپی لینک"}</span>
                        </button>
                        <a
                          href="/docs"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-navy hover:bg-navy-light dark:bg-slate-800 dark:hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <span>مشاهده تمام‌صفحه در تب جداگانه</span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>

                    <div className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl p-4 flex flex-col gap-2">
                      <p className="font-bold text-navy dark:text-blue-200">
                        💡 راهنمای کار با کنسول Swagger:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          <strong>احراز هویت خودکار:</strong> توکن کاربری شما به صورت خودکار به کنسول Swagger متصل شده است و نیازی به کپی یا پیست مجدد توکن در کادر Authorize ندارید.
                        </li>
                        <li>
                          <strong>ارسال تست زنده:</strong> روی هر متد (مثلاً <code className="font-mono text-teal">GET /api/v1/forms</code>) کلیک کرده و دکمه <strong>Try it out</strong> را بزنید.
                        </li>
                        <li>
                          سپس دکمه <strong>Execute</strong> را بزنید تا پاسخ واقعی و زنده سرور به همراه Status Code و خروجی JSON زیر آن نمایش یابد.
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* رندر زنده کامپوننت Swagger */}
                  <EmbeddedSwaggerUI token={token} />
                </div>
              )}

              {/* محتوای بخش ۲: فایل نقشه استاندارد سامانه OpenAPI 3.0 */}
              {activeSection === "openapi" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-white dark:bg-[#0E1526] border-2 border-ink/10 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                          <FileJson size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-navy dark:text-white">
                            فایل نقشه استاندارد سامانه (OpenAPI 3.0 Specification)
                          </h3>
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-mono dir-ltr block">
                            {openApiUrl}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyText(openApiUrl, "openapi")}
                          className="p-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-ink-subtle flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedLink === "openapi" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          <span>{copiedLink === "openapi" ? "کپی شد" : "کپی لینک"}</span>
                        </button>
                        <a
                          href="/openapi.json"
                          target="_blank"
                          rel="noopener noreferrer"
                          download="porskad-openapi.json"
                          className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <Download size={14} />
                          <span>دانلود فایل JSON</span>
                        </a>
                      </div>
                    </div>

                    <div className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-4 flex flex-col gap-2">
                      <p className="font-bold text-navy dark:text-amber-200">
                        📥 راهنمای وارد کردن در Postman یا Insomnia:
                      </p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>نرم‌افزار <strong>Postman</strong> را باز کرده و دکمه <strong>Import</strong> را در بالای پنل کلیک کنید.</li>
                        <li>آدرس فایل JSON بالا را پیست کنید یا فایل دانلود شده را در پنجره بکشید.</li>
                        <li>تمامی متدها، پارامترها و الگوهای هر ۲۰ نوع فیلد پرس‌کاد به همراه نمونه درخواست‌ها اضافه خواهند شد.</li>
                      </ol>
                    </div>
                  </div>

                  {/* نمایش و پیش‌نمایش فایل JSON همراه با دکمه کپی متن */}
                  <div className="bg-white dark:bg-[#0E1526] border border-ink/10 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-navy dark:text-white flex items-center gap-2">
                        <Code size={15} className="text-amber-500" />
                        <span>پیش‌نمایش محتوای OpenAPI JSON</span>
                      </span>

                      <button
                        onClick={() => handleCopyText(openApiJsonText, "openapi_raw")}
                        disabled={!openApiJsonText}
                        className="p-1.5 px-3 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-ink-subtle flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedLink === "openapi_raw" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        <span>{copiedLink === "openapi_raw" ? "کپی شد" : "کپی تمام JSON"}</span>
                      </button>
                    </div>

                    <div className="relative bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs dir-ltr text-left overflow-auto max-h-[500px]">
                      {loadingOpenApiJson ? (
                        <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span>در حال دریافت نقشه OpenAPI...</span>
                        </div>
                      ) : (
                        <pre className="whitespace-pre">{openApiJsonText || "فایل در دسترس نیست"}</pre>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* محتوای بخش ۳: وب‌سرویس و کدهای نمونه REST API */}
              {activeSection === "api" && (
                <div className="flex flex-col gap-5">
                  <div className="bg-white dark:bg-[#0E1526] border-2 border-ink/10 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <Terminal size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-navy dark:text-white">
                            آدرس ریشه وب‌سرویس (Base API URL)
                          </h3>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono dir-ltr block">
                            {apiUrl}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyText(apiUrl, "api")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        {copiedLink === "api" ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedLink === "api" ? "کپی شد" : "کپی آدرس API"}</span>
                      </button>
                    </div>

                    <p className="text-xs text-ink-subtle dark:text-slate-400 leading-relaxed">
                      کلیه درخواست‌های وب‌سرویس پرس‌کاد با آدرس فوق شروع می‌شوند. ساختار تمامی پاسخ‌ها JSON بوده و برای احراز هویت الزامی است هدر <code className="text-emerald-600 font-mono" dir="ltr">Authorization: Bearer &lt;TOKEN&gt;</code> را به همراه هر درخواست ارسال نمایید.
                    </p>
                  </div>

                  {/* نمونه کدهای آماده به تفکیک زبان‌ها */}
                  <div className="bg-white dark:bg-[#0E1526] border border-ink/10 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Code2 size={16} className="text-teal" />
                        <span className="text-xs font-black text-navy dark:text-white">
                          نمونه کدهای آماده اتصال (با توکن شما):
                        </span>
                      </div>

                      {/* انتخاب زبان */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {[
                          { id: "curl", label: "cURL" },
                          { id: "javascript", label: "JavaScript" },
                          { id: "python", label: "Python" },
                        ].map((lang) => (
                          <button
                            key={lang.id}
                            onClick={() => setSelectedLang(lang.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              selectedLang === lang.id
                                ? "bg-white dark:bg-slate-700 text-navy dark:text-white shadow-xs"
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
                        className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedSnippet ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedSnippet ? "کپی شد" : "کپی کد"}</span>
                      </button>

                      <pre className="pr-20 whitespace-pre">{codeSnippets[selectedLang]}</pre>
                    </div>
                  </div>

                  {/* جدول راهنمای سریع اندپوینت‌ها */}
                  <div className="bg-white dark:bg-[#0E1526] border border-ink/10 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
                    <h4 className="text-xs font-black text-navy dark:text-white flex items-center gap-2">
                      <Layers size={16} className="text-teal" />
                      <span>جدول اندپوینت‌های اصلی وب‌سرویس پرس‌کاد:</span>
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="border-b border-ink/10 dark:border-slate-800 text-ink-subtle dark:text-slate-400 font-bold">
                            <th className="py-2.5 px-3">متد</th>
                            <th className="py-2.5 px-3 font-mono dir-ltr text-left">مسیر (Endpoint)</th>
                            <th className="py-2.5 px-3">توضیحات و عملکرد</th>
                            <th className="py-2.5 px-3 text-center">احراز هویت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink/5 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                          <tr>
                            <td className="py-2.5 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded font-mono">GET</span></td>
                            <td className="py-2.5 px-3 font-mono dir-ltr text-left text-teal font-semibold">/api/v1/forms</td>
                            <td className="py-2.5 px-3">دریافت لیست فرم‌های ساخته شده توسط شما</td>
                            <td className="py-2.5 px-3 text-center"><span className="text-[10px] bg-teal/15 text-teal font-bold px-2 py-0.5 rounded-full">توکن لازم</span></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3"><span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded font-mono">POST</span></td>
                            <td className="py-2.5 px-3 font-mono dir-ltr text-left text-teal font-semibold">/api/v1/forms</td>
                            <td className="py-2.5 px-3">ایجاد فرم جدید با فیلدها و سوالات دلخواه</td>
                            <td className="py-2.5 px-3 text-center"><span className="text-[10px] bg-teal/15 text-teal font-bold px-2 py-0.5 rounded-full">توکن لازم</span></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded font-mono">GET</span></td>
                            <td className="py-2.5 px-3 font-mono dir-ltr text-left text-teal font-semibold">/api/v1/forms/:id</td>
                            <td className="py-2.5 px-3">دریافت مشخصات کامل یک فرم بر اساس شناسه</td>
                            <td className="py-2.5 px-3 text-center"><span className="text-[10px] bg-teal/15 text-teal font-bold px-2 py-0.5 rounded-full">توکن لازم</span></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3"><span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded font-mono">PUT</span></td>
                            <td className="py-2.5 px-3 font-mono dir-ltr text-left text-teal font-semibold">/api/v1/forms/:id</td>
                            <td className="py-2.5 px-3">ویرایش عنوان، توضیحات یا تنظیمات یک فرم</td>
                            <td className="py-2.5 px-3 text-center"><span className="text-[10px] bg-teal/15 text-teal font-bold px-2 py-0.5 rounded-full">توکن لازم</span></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3"><span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded font-mono">DELETE</span></td>
                            <td className="py-2.5 px-3 font-mono dir-ltr text-left text-teal font-semibold">/api/v1/forms/:id</td>
                            <td className="py-2.5 px-3">حذف کامل یک فرم و داده‌های مرتبط</td>
                            <td className="py-2.5 px-3 text-center"><span className="text-[10px] bg-teal/15 text-teal font-bold px-2 py-0.5 rounded-full">توکن لازم</span></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded font-mono">GET</span></td>
                            <td className="py-2.5 px-3 font-mono dir-ltr text-left text-teal font-semibold">/api/v1/forms/:id/responses</td>
                            <td className="py-2.5 px-3">دریافت پاسخ‌ها و ورودی‌های ثبت‌شده یک فرم</td>
                            <td className="py-2.5 px-3 text-center"><span className="text-[10px] bg-teal/15 text-teal font-bold px-2 py-0.5 rounded-full">توکن لازم</span></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3"><span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded font-mono">POST</span></td>
                            <td className="py-2.5 px-3 font-mono dir-ltr text-left text-teal font-semibold">/api/v1/forms/:id/responses</td>
                            <td className="py-2.5 px-3">ثبت پاسخ جدید برای یک فرم (ارسال فرم)</td>
                            <td className="py-2.5 px-3 text-center"><span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full">عمومی</span></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded font-mono">GET</span></td>
                            <td className="py-2.5 px-3 font-mono dir-ltr text-left text-teal font-semibold">/api/v1/system/health</td>
                            <td className="py-2.5 px-3">بررسی سلامت سرور، زمان کارکرد و وضعیت دیتابیس</td>
                            <td className="py-2.5 px-3 text-center"><span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full">عمومی</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════ */
        /* تب ۱: مشخصات و امنیت حساب (مشخصات، سهمیه‌ها و تغییر رمز)   */
        /* ══════════════════════════════════════════════════════════════ */
        <div className="flex flex-col gap-6">
          {/* اطلاعات حساب */}
          <div className="-rotate-[0.3deg]">
            <StickerCard theme="navy" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
              <div className="p-5 sm:p-6 flex flex-col gap-4">
                <h2 className="text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                  اطلاعات حساب
                </h2>

                <div className="flex items-center gap-3 mb-2">
                  <div className="w-11 h-11 bg-teal rounded-full flex items-center justify-center text-white font-extrabold text-base rotate-[3deg]">
                    {fullName?.[0]?.toUpperCase() ?? currentEmail?.[0]?.toUpperCase() ?? "A"}
                  </div>
                  <div>
                    <p className="font-bold text-navy dark:text-white">{fullName || "—"}</p>
                    <p className="text-sm text-ink-subtle" dir="ltr">{currentEmail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-y border-ink/10 dark:border-slate-700/60 py-2.5">
                  <span className="text-sm font-bold text-ink-subtle">شماره موبایل:</span>
                  <span className="text-sm font-mono font-bold text-navy dark:text-slate-200" dir="ltr">
                    {profile?.phone || "ثبت نشده"}
                  </span>
                </div>

                {/* سهمیه و وضعیت امکانات */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white/80 dark:bg-slate-800/80 border border-ink/10 dark:border-slate-700 rounded-xl p-3 text-center">
                    <span className="text-xs font-semibold text-ink-subtle dark:text-slate-400 block">سقف فرم‌های فعال</span>
                    <span className="text-base font-black text-navy dark:text-slate-100 mt-1 block">
                      {profile?.is_owner || profile?.max_forms >= 999999 || profile?.plan === "unlimited"
                        ? "نامحدود ✨"
                        : `${faNum(profile?.max_forms ?? 5)} فرم`}
                    </span>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 border border-ink/10 dark:border-slate-700 rounded-xl p-3 text-center">
                    <span className="text-xs font-semibold text-ink-subtle dark:text-slate-400 block">ورودی‌های ماه جاری</span>
                    <span className="text-base font-black text-navy dark:text-slate-100 mt-1 block">
                      {profile?.is_owner || profile?.max_responses_per_month >= 999999 || profile?.plan === "unlimited"
                        ? "نامحدود ✨"
                        : `${faNum(profile?.monthly_responses_used ?? 0)} از ${faNum(profile?.max_responses_per_month ?? 100)}`}
                    </span>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 border border-ink/10 dark:border-slate-700 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                    <span className="text-xs font-semibold text-ink-subtle dark:text-slate-400 block">ارسال به تلگرام</span>
                    <span className="text-base font-black text-teal mt-1 block">
                      {profile?.is_owner || profile?.can_use_telegram === true ? "فعال" : "غیرفعال"}
                    </span>
                  </div>
                </div>

                {!profile?.is_owner && profile?.quota_reset_at && (
                  <div className="text-[11px] font-semibold text-ink-subtle dark:text-slate-400 text-center bg-navy/5 dark:bg-slate-800/50 py-1.5 px-3 rounded-lg">
                    🔄 تاریخ تمدید خودکار سهمیه ماهانه: <span className="font-bold text-navy dark:text-slate-200">{faDate(profile.quota_reset_at)}</span>
                  </div>
                )}
              </div>
            </StickerCard>
          </div>

          {/* ویرایش نام، ایمیل و شماره موبایل */}
          <div className="rotate-[0.3deg]">
            <StickerCard theme="white" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
              <div className="p-5 sm:p-6 flex flex-col gap-4">
                <h2 className="text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                  ویرایش اطلاعات حساب
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">نام و نام خانوادگی</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink dark:text-white focus:outline-none transition-all"
                      placeholder="نام و نام خانوادگی"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">ایمیل</span>
                    <input
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                      placeholder="example@mail.com"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">شماره موبایل</span>
                    <input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    />
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="teal"
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? "در حال ذخیره..." : "ذخیره تغییرات"}
                  </Button>
                </div>
              </div>
            </StickerCard>
          </div>

          {/* تغییر رمز عبور */}
          <div className="-rotate-[0.3deg]">
            <StickerCard theme="white" radius="rounded-tl-[1.75rem] rounded-br-[1.75rem] rounded-tr-none rounded-bl-none">
              <div className="p-5 sm:p-6 flex flex-col gap-4">
                <h2 className="text-lg font-extrabold text-navy dark:text-white flex items-center gap-2">
                  تغییر رمز عبور
                </h2>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-extrabold text-navy dark:text-slate-200">رمز عبور فعلی</span>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      dir="ltr"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                      placeholder="رمز عبور فعلی"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">رمز جدید</span>
                    <div className="relative">
                      <input
                        type={showNewPass ? "text" : "password"}
                        dir="ltr"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                        placeholder="حداقل ۶ کاراکتر"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-extrabold text-navy dark:text-slate-200">تکرار رمز جدید</span>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        dir="ltr"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-3.5 py-2.5 pl-10 font-semibold text-ink dark:text-white focus:outline-none transition-all text-left"
                        placeholder="تکرار رمز جدید"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                </div>

                {passwordError && (
                  <div className="bg-magenta/10 border-2 border-magenta rounded-pill-md px-3.5 py-2 text-sm font-bold text-magenta-text">
                    {passwordError}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="navy"
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={savingPassword}
                  >
                    <Key size={13} className="ml-1" />
                    {savingPassword ? "در حال تغییر..." : "تغییر رمز"}
                  </Button>
                </div>
              </div>
            </StickerCard>
          </div>
        </div>
      )}
    </div>
  );
}
