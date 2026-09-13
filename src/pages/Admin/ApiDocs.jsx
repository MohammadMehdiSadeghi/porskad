import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/Toast";
import SEO from "../../components/ui/SEO";
import { QUESTION_TYPES, QUESTION_CATEGORIES } from "../../lib/questionTypes";
import {
  Code2,
  Copy,
  Check,
  ExternalLink,
  Key,
  Shield,
  Layers,
  Terminal,
  FileJson,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff
} from "lucide-react";

export default function ApiDocs() {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [token, setToken] = useState("");
  const [tokenLoading, setTokenLoading] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [selectedLang, setSelectedLang] = useState("curl"); // "curl" | "js" | "python" | "php"
  const [selectedCategory, setSelectedCategory] = useState("all");

  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "https://porskad.ir/api/v1";
  const openApiUrl = typeof window !== "undefined" ? `${window.location.origin}/openapi.json` : "https://porskad.ir/openapi.json";

  useEffect(() => {
    async function loadToken() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
        }
      } catch (err) {
        console.error("Error fetching session token:", err);
      } finally {
        setTokenLoading(false);
      }
    }
    loadToken();
  }, []);

  function handleCopyToken() {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast.success("توکن احراز هویت با موفقیت کپی شد.");
    setTimeout(() => setCopiedToken(false), 2500);
  }

  function handleCopyCurl(snippet) {
    navigator.clipboard.writeText(snippet);
    setCopiedCurl(true);
    toast.success("نمونه کد کپی شد.");
    setTimeout(() => setCopiedCurl(false), 2500);
  }

  const maskedToken = token
    ? `${token.substring(0, 12)}••••••••••••••••••••••••••••••••••••••••••••${token.substring(token.length - 8)}`
    : "در حال دریافت توکن...";

  const codeSnippets = {
    curl: `# ۱. دریافت لیست فرم‌های شما
curl -X GET "${baseUrl}/forms" \\
  -H "Authorization: Bearer ${token ? "${YOUR_TOKEN}" : "YOUR_ACCESS_TOKEN"}" \\
  -H "Accept: application/json"

# ۲. ایجاد یک فرم جدید
curl -X POST "${baseUrl}/forms" \\
  -H "Authorization: Bearer ${token ? "${YOUR_TOKEN}" : "YOUR_ACCESS_TOKEN"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "فرم نظرسنجی جدید",
    "form_type": "step_by_step",
    "description": "ایجاد شده از طریق REST API"
  }'

# ۳. دریافت متادیتای تمام ۲۰ نوع سوال
curl -X GET "${baseUrl}/question-types"`,

    js: `// ارسال درخواست در جاوااسکریپت (Fetch API)
const TOKEN = "${token ? token.substring(0, 20) + "..." : "YOUR_ACCESS_TOKEN"}";

// دریافت لیست فرم‌ها
async function getMyForms() {
  const response = await fetch("${baseUrl}/forms", {
    method: "GET",
    headers: {
      "Authorization": \`Bearer \${TOKEN}\`,
      "Accept": "application/json"
    }
  });
  const data = await response.json();
  console.log("فرم‌های من:", data.forms);
}

getMyForms();`,

    python: `# فراخوانی وب‌سرویس با پایتون (requests)
import requests

TOKEN = "${token ? token.substring(0, 20) + "..." : "YOUR_ACCESS_TOKEN"}"
BASE_URL = "${baseUrl}"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json"
}

# دریافت لیست فرم‌ها
response = requests.get(f"{BASE_URL}/forms", headers=headers)
if response.status_code == 200:
    print("فرم‌ها:", response.json())
else:
    print("خطا:", response.status_code, response.text)`,

    php: `<?php
// فراخوانی در PHP با cURL
$token = "${token ? token.substring(0, 20) + "..." : "YOUR_ACCESS_TOKEN"}";
$ch = curl_init("${baseUrl}/forms");

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . $token,
    "Accept: application/json"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);
?>`
  };

  // فیلتر انواع سوالات بر اساس دسته‌بندی
  const questionTypeEntries = Object.entries(QUESTION_TYPES).filter(([key, meta]) => {
    if (selectedCategory === "all") return true;
    return meta.category === selectedCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <SEO
        title="مستندات API و توسعه‌دهندگان — پنل مدیریت پرس‌کاد"
        description="مستندات وب‌سرویس RESTful و توکن احراز هویت برای اتصال اپلیکیشن‌های جانبی به پرس‌کاد."
      />

      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-navy dark:text-white">
              مستندات وب‌سرویس و توسعه‌دهندگان (REST API)
            </h1>
            <Badge variant="teal" className="gap-1 font-mono text-xs">
              <Sparkles size={12} />
              v1.0.0
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-ink-subtle dark:text-slate-400">
            با استفاده از این وب‌سرویس استاندارد، می‌توانید تمامی قابلیت‌های پرس‌کاد را در پلتفرم و اپلیکیشن اختصاصی خود پیاده‌سازی کنید.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-teal hover:bg-teal-text text-white font-bold text-xs px-4 py-2.5 rounded-pill-md flex items-center gap-2 shadow-sm transition-all"
          >
            <span>کنسول تعاملی Swagger</span>
            <ArrowUpRight size={15} />
          </a>
        </div>
      </div>

      {/* کارت توکن احراز هویت اختصاصی کاربر */}
      <StickerCard color="teal" className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal/15 text-teal">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-navy dark:text-white">توکن اختصاصی احراز هویت شما (Bearer Token)</h2>
              <p className="text-xs text-ink-subtle dark:text-slate-400">
                این توکن برای شناسایی حساب شما در وب‌سرویس استفاده می‌شود. آن را محرمانه نگه دارید.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowToken(!showToken)}
              className="p-2 text-ink-subtle hover:text-navy dark:hover:text-white rounded-lg bg-bg-neutral dark:bg-slate-800 transition-colors"
              title={showToken ? "مخفی کردن توکن" : "نمایش کامل توکن"}
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <Button
              variant="teal"
              size="sm"
              onClick={handleCopyToken}
              disabled={tokenLoading || !token}
              className="gap-1.5 text-xs font-bold"
            >
              {copiedToken ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedToken ? "کپی شد" : "کپی توکن"}</span>
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-ink/10 dark:border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all flex items-center justify-between gap-2">
          <span>{showToken ? token : maskedToken}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-subtle dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Shield size={13} className="text-teal" />
            <span>نحوه ارسال در هدر:</span>
            <code className="bg-teal/10 text-teal px-1.5 py-0.5 rounded font-mono">Authorization: Bearer &lt;TOKEN&gt;</code>
          </div>
          <div className="h-3 w-px bg-ink/15 dark:bg-slate-700 hidden sm:block" />
          <div>
            <span>آدرس پایه وب‌سرویس:</span>
            <code className="mr-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-navy dark:text-slate-200">{baseUrl}</code>
          </div>
        </div>
      </StickerCard>

      {/* تب‌های نمونه کد */}
      <StickerCard color="navy" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-teal" />
            <h2 className="text-sm font-black text-navy dark:text-white">نمونه کدهای فراخوانی وب‌سرویس</h2>
          </div>

          <div className="flex items-center gap-1 bg-bg-neutral dark:bg-slate-800 p-1 rounded-xl">
            {[
              { key: "curl", label: "cURL" },
              { key: "js", label: "JavaScript" },
              { key: "python", label: "Python" },
              { key: "php", label: "PHP" },
            ].map((lang) => (
              <button
                key={lang.key}
                onClick={() => setSelectedLang(lang.key)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedLang === lang.key
                    ? "bg-teal text-white shadow-xs"
                    : "text-ink-subtle dark:text-slate-400 hover:text-navy dark:hover:text-white"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => handleCopyCurl(codeSnippets[selectedLang])}
            className="absolute top-3 left-3 z-10 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
          >
            {copiedCurl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedCurl ? "کپی شد" : "کپی کد"}</span>
          </button>

          <pre className="bg-slate-900 text-slate-100 p-4 pt-10 rounded-xl text-xs font-mono overflow-x-auto text-left dir-ltr leading-relaxed">
            {codeSnippets[selectedLang]}
          </pre>
        </div>
      </StickerCard>

      {/* بخش متادیتای انواع سوالات پرس‌کاد */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-navy dark:text-white flex items-center gap-2">
              <Layers size={18} className="text-teal" />
              <span>متادیتا و راهنمای ساخت ۲۰ نوع سوال در API</span>
            </h2>
            <p className="text-xs text-ink-subtle dark:text-slate-400">
              هنگام ارسال درخواست ایجاد سوال (<code className="text-teal">POST /api/v1/forms/:id/questions</code>)، فیلد <code className="text-teal">type</code> باید یکی از مقادیر زیر باشد:
            </p>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === "all" ? "bg-navy text-white dark:bg-teal" : "bg-white dark:bg-slate-800 text-ink-subtle"
              }`}
            >
              همه ({Object.keys(QUESTION_TYPES).length})
            </button>
            {QUESTION_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedCategory === cat.key ? "bg-navy text-white dark:bg-teal" : "bg-white dark:bg-slate-800 text-ink-subtle"
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {questionTypeEntries.map(([typeKey, meta]) => (
            <div
              key={typeKey}
              className="bg-white dark:bg-[#0E1526] border border-ink/10 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2 shadow-2xs hover:border-teal/50 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-xs text-navy dark:text-white">{meta.label}</span>
                  <code className="bg-teal/10 text-teal px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                    {typeKey}
                  </code>
                </div>
                <p className="text-[11px] text-ink-subtle dark:text-slate-400 line-clamp-2">
                  {meta.hint || "پشتیبانی شده در فرم‌ساز"}
                </p>
              </div>

              <div className="pt-2 border-t border-ink/5 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                <span className="text-ink-subtle dark:text-slate-500">
                  {meta.hasOptions ? "نیاز به گزینه‌ها (options)" : "بدون نیاز به options"}
                </span>
                {meta.hasMaxSelections && (
                  <span className="text-teal font-medium">پشتیبانی از max_selections</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* بخش اندپوینت‌های کلیدی REST */}
      <StickerCard color="orange" className="p-5">
        <h2 className="text-sm font-black text-navy dark:text-white mb-3 flex items-center gap-2">
          <FileJson size={18} className="text-amber-500" />
          <span>خلاصه اندپوینت‌های وب‌سرویس پرس‌کاد</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="border-b border-ink/10 dark:border-slate-800 text-ink-subtle dark:text-slate-400">
                <th className="py-2 px-3 font-bold">متد</th>
                <th className="py-2 px-3 font-bold">مسیر (Route)</th>
                <th className="py-2 px-3 font-bold">شرح عملیات</th>
                <th className="py-2 px-3 font-bold">احراز هویت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 dark:divide-slate-800/60 font-medium text-ink dark:text-slate-200">
              <tr>
                <td className="py-2 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold font-mono">GET</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/me</td>
                <td className="py-2 px-3">اطلاعات حساب، نقش و سهمیه فرم‌ها</td>
                <td className="py-2 px-3 text-teal">الزامی (Bearer)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold font-mono">GET</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/question-types</td>
                <td className="py-2 px-3">فهرست ۲۰ نوع سوال همراه با گزینه‌ها و شروط</td>
                <td className="py-2 px-3 text-ink-subtle">عمومی (اختیاری)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold font-mono">GET</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/forms</td>
                <td className="py-2 px-3">دریافت لیست تمام فرم‌های شما</td>
                <td className="py-2 px-3 text-teal">الزامی (Bearer)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold font-mono">POST</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/forms</td>
                <td className="py-2 px-3">ساخت فرم جدید با تنظیمات دلخواه</td>
                <td className="py-2 px-3 text-teal">الزامی (Bearer)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold font-mono">GET</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/forms/:id</td>
                <td className="py-2 px-3">دریافت مشخصات و سوالات یک فرم</td>
                <td className="py-2 px-3 text-teal">الزامی (Bearer)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold font-mono">PUT</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/forms/:id</td>
                <td className="py-2 px-3">ویرایش تنظیمات، پیام‌ها و انتشار فرم</td>
                <td className="py-2 px-3 text-teal">الزامی (Bearer)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold font-mono">DELETE</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/forms/:id</td>
                <td className="py-2 px-3">حذف فرم و تمامی سوالات و پاسخ‌ها</td>
                <td className="py-2 px-3 text-teal">الزامی (Bearer)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold font-mono">POST</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/forms/:id/questions</td>
                <td className="py-2 px-3">افزودن سوال جدید به فرم</td>
                <td className="py-2 px-3 text-teal">الزامی (Bearer)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold font-mono">GET</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/forms/:id/responses</td>
                <td className="py-2 px-3">دریافت لیست پاسخ‌های ثبت شده کاربران</td>
                <td className="py-2 px-3 text-teal">الزامی (Bearer)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold font-mono">POST</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/forms/:id/responses</td>
                <td className="py-2 px-3">ثبت پاسخ شرکت‌کننده از اپلیکیشن جانبی</td>
                <td className="py-2 px-3 text-ink-subtle">عمومی (بدون نیاز به توکن)</td>
              </tr>
              <tr>
                <td className="py-2 px-3"><span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold font-mono">GET</span></td>
                <td className="py-2 px-3 font-mono dir-ltr text-right">/api/v1/forms/:id/embed</td>
                <td className="py-2 px-3">دریافت کدهای آماده Iframe، SDK و React</td>
                <td className="py-2 px-3 text-ink-subtle">عمومی (اختیاری)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </StickerCard>
    </div>
  );
}
