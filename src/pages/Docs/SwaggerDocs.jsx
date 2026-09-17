import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SEO from "../../components/ui/SEO";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  Key,
  Layers,
  Terminal,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import PasswordToggle from "../../components/ui/PasswordToggle";

const QUESTION_TYPES_LIST = [
  { key: "choice", label: "Multiple Choice", category: "Choice & Rating", desc: "Select 1 to N choices from a predefined list." },
  { key: "picture_choice", label: "Picture Choice", category: "Choice & Rating", desc: "Visual choices with images and labels." },
  { key: "dropdown", label: "Dropdown Select", category: "Choice & Rating", desc: "Compact single-select dropdown menu." },
  { key: "yes_no", label: "Yes / No", category: "Choice & Rating", desc: "Binary true/false decision." },
  { key: "likert", label: "Likert Scale", category: "Choice & Rating", desc: "Agreement scale (strongly agree to disagree)." },
  { key: "nps", label: "NPS (0 to 10)", category: "Choice & Rating", desc: "Net promoter loyalty score from 0 to 10." },
  { key: "rating", label: "Star Rating (1 to 5)", category: "Choice & Rating", desc: "Star score from 1 to 5." },
  { key: "matrix", label: "Matrix Table", category: "Choice & Rating", desc: "Multi-row evaluation grid with common options." },
  { key: "ranking", label: "Ranking / Ordering", category: "Choice & Rating", desc: "Drag and drop or sort options by priority." },
  { key: "short_text", label: "Short Text", category: "Text & Contact", desc: "Single-line text input." },
  { key: "long_text", label: "Long Text / Paragraph", category: "Text & Contact", desc: "Multi-line detailed feedback input." },
  { key: "number", label: "Numeric Input", category: "Text & Contact", desc: "Numbers only with min/max validation." },
  { key: "email", label: "Email Address", category: "Text & Contact", desc: "Email format validation." },
  { key: "phone_ir", label: "Iran Mobile Number", category: "Text & Contact", desc: "09xxxxxxxxx Iranian phone validation." },
  { key: "link", label: "Website URL", category: "Text & Contact", desc: "Valid http/https web link." },
  { key: "telegram_id", label: "Telegram Username", category: "Text & Contact", desc: "@username validation." },
  { key: "statement", label: "Informational Text", category: "Advanced & Media", desc: "Static instruction or text block with no input." },
  { key: "group", label: "Section Group", category: "Advanced & Media", desc: "Structural separator and section header." },
  { key: "file_upload", label: "File Upload", category: "Advanced & Media", desc: "File and media upload with size limits." },
  { key: "payment", label: "Payment Gateway", category: "Advanced & Media", desc: "Online payment checkout and amount." },
];

export default function SwaggerDocs() {
  const containerRef = useRef(null);
  const swaggerInstanceRef = useRef(null);

  const [token, setToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [specLoading, setSpecLoading] = useState(true);

  const [showSnippets, setShowSnippets] = useState(false);
  const [showQuestionTypes, setShowQuestionTypes] = useState(false);
  const [selectedLang, setSelectedLang] = useState("curl");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const baseUrl = `${origin}/api/v1`;

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
          setUserEmail(session.user?.email || "Authenticated User");
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

  useEffect(() => {
    let isMounted = true;

    if (!document.getElementById("swagger-ui-css")) {
      const link = document.createElement("link");
      link.id = "swagger-ui-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
      document.head.appendChild(link);
    }

    function initSwagger() {
      if (!isMounted) return;
      try {
        if (window.SwaggerUIBundle && containerRef.current) {
          const presets = [window.SwaggerUIBundle.presets.apis];
          if (window.SwaggerUIStandalonePreset) {
            presets.push(window.SwaggerUIStandalonePreset);
          } else if (window.SwaggerUIBundle.SwaggerUIStandalonePreset) {
            presets.push(window.SwaggerUIBundle.SwaggerUIStandalonePreset);
          }

          const ui = window.SwaggerUIBundle({
            url: "/openapi.json",
            domNode: containerRef.current,
            deepLinking: true,
            presets,
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
                if (token) {
                  try {
                    ui.preauthorizeApiKey("BearerAuth", `Bearer ${token}`);
                  } catch {
                    // ignore
                  }
                }
              }
            },
          });
        }
      } catch (err) {
        console.error("Swagger init error:", err);
        if (isMounted) setSpecLoading(false);
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
      script.onerror = () => {
        if (isMounted) setSpecLoading(false);
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

  function handleCopyCode(snippet) {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  }

  const codeSnippets = {
    curl: `# 1. List user forms
curl -X GET "${baseUrl}/forms" \\
  -H "Authorization: Bearer ${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}" \\
  -H "Accept: application/json"

# 2. Get form details, all questions & logic rules
curl -X GET "${baseUrl}/forms/YOUR_FORM_SLUG_OR_ID" \\
  -H "Accept: application/json"

# 3. Get all questions of a form
curl -X GET "${baseUrl}/forms/YOUR_FORM_SLUG_OR_ID/questions"

# 4. Get a specific question by ID
curl -X GET "${baseUrl}/forms/YOUR_FORM_SLUG_OR_ID/questions/QUESTION_ID"

# 5. Get form analytics & response stats
curl -X GET "${baseUrl}/forms/YOUR_FORM_SLUG_OR_ID/stats" \\
  -H "Authorization: Bearer ${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}"

# 6. Submit a response to a form
curl -X POST "${baseUrl}/forms/YOUR_FORM_SLUG_OR_ID/responses" \\
  -H "Content-Type: application/json" \\
  -d '{
    "duration_seconds": 30,
    "answers": [
      { "question_id": "QUESTION_UUID", "value": "پاسخ نمونه" }
    ]
  }'

# 7. Send SMS via Amoot SMS Web Service
curl -X POST "${origin}/api/amoot-proxy" \\
  -H "Authorization: Bearer ${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "send_sms",
    "mobiles": ["09123456789"],
    "text": "سلام! کد پیگیری سفارش: ۱۲۳۴۵",
    "lineNumber": "98"
  }'

# 8. Dispatch Telegram Notification
curl -X POST "${baseUrl}/telegram/send" \\
  -H "Authorization: Bearer ${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "form_id": "YOUR_FORM_UUID",
    "response_id": "YOUR_RESPONSE_UUID",
    "force": true
  }'

# 9. Get all 20 question types metadata
curl -X GET "${baseUrl}/question-types"`,

    js: `// JavaScript (Fetch API / async-await)
const TOKEN = "${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}";
const BASE = "${baseUrl}";

// 1. Fetch form with all questions and rules
async function getFormWithQuestions(formSlugOrId) {
  const res = await fetch(\`\${BASE}/forms/\${formSlugOrId}\`, {
    headers: { "Accept": "application/json" }
  });
  const { form, questions, logic_rules } = await res.json();
  console.log("Form:", form.title);
  console.log("Questions (" + questions.length + "):", questions);
  return { form, questions, logic_rules };
}

// 2. Fetch responses list
async function getResponses(formSlugOrId) {
  const res = await fetch(\`\${BASE}/forms/\${formSlugOrId}/responses?limit=50\`, {
    headers: { "Authorization": \`Bearer \${TOKEN}\` }
  });
  const data = await res.json();
  console.log("Total responses:", data.total, data.responses);
}

// 3. Send SMS via Amoot Proxy
async function sendSms(mobiles, text) {
  const res = await fetch("${origin}/api/amoot-proxy", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${TOKEN}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action: "send_sms", mobiles, text, lineNumber: "98" })
  });
  return await res.json();
}

// 4. Submit response
async function submitAnswers(formSlugOrId, answers) {
  const res = await fetch(\`\${BASE}/forms/\${formSlugOrId}/responses\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, duration_seconds: 25 })
  });
  const result = await res.json();
  console.log("Submit result:", result);
}`,

    python: `# Python 3 (requests)
import requests

TOKEN = "${token ? token.substring(0, 15) + "..." : "YOUR_ACCESS_TOKEN"}"
BASE_URL = "${baseUrl}"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json"
}

# 1. Get form details and all questions
def get_form(form_id):
    resp = requests.get(f"{BASE_URL}/forms/{form_id}", headers=headers)
    data = resp.json()
    print("Form Title:", data.get("form", {}).get("title"))
    print("Questions Count:", len(data.get("questions", [])))
    return data

# 2. Send SMS
def send_sms(mobiles, text):
    payload = {
        "action": "send_sms",
        "mobiles": mobiles,
        "text": text,
        "lineNumber": "98"
    }
    resp = requests.post("${origin}/api/amoot-proxy", json=payload, headers=headers)
    return resp.json()

# 3. Submit response
def submit_response(form_id, answers):
    payload = {
        "duration_seconds": 45,
        "answers": answers
    }
    resp = requests.post(f"{BASE_URL}/forms/{form_id}/responses", json=payload)
    print("Submit status:", resp.json())`
  };

  return (
    <div dir="ltr" className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <SEO
        title="Porskad REST API & Swagger Documentation"
        description="Comprehensive interactive API documentation, schemas, and live test console for Porskad."
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-white/10 px-4 lg:px-8 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-teal px-3 py-1.5 rounded-lg border border-white/20 transition-all"
            >
              <ArrowLeft size={14} />
              <span>Back to App</span>
            </Link>

            <div className="h-5 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight select-none text-white">
                PORS<span className="text-teal-400">KAD</span>
              </span>
              <span className="text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                REST API v1
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              download="porskad-openapi.json"
              className="text-xs font-semibold bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white px-3 py-1.5 rounded-lg border border-amber-500/40 flex items-center gap-1.5 transition-all"
              title="Download OpenAPI 3.0 JSON specification"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download OpenAPI JSON</span>
            </a>
          </div>
        </div>
      </header>

      {/* Authentication & Quick Action Bar */}
      <div className="bg-white dark:bg-[#0E1526] border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <div className="p-1.5 bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-lg">
              <Key size={15} />
            </div>
            {token ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Your Token ({userEmail}):
                </span>
                <span className="font-mono bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded border border-teal-500/20 text-xs select-all max-w-[220px] sm:max-w-xs truncate inline-block align-middle">
                  {showToken ? token : `${token.substring(0, 16)}••••••••••••••••`}
                </span>
                <PasswordToggle
                  visible={showToken}
                  onToggle={() => setShowToken(!showToken)}
                  size={14}
                  ariaLabel={showToken ? "Hide token" : "Show full token"}
                />
                <button
                  onClick={handleCopyToken}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  {copiedToken ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedToken ? "Copied!" : "Copy"}</span>
                </button>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck size={12} />
                  Auto-authorized in Swagger
                </span>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                You are not logged in. Click the green <strong>Authorize</strong> button below to test endpoints with your token.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowSnippets(!showSnippets);
                if (showQuestionTypes) setShowQuestionTypes(false);
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                showSnippets
                  ? "bg-teal text-white shadow-xs"
                  : "bg-teal/10 hover:bg-teal hover:text-white text-teal dark:text-teal-300 border border-teal-500/30"
              }`}
            >
              <Terminal size={14} />
              <span>Code Snippets</span>
              {showSnippets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              onClick={() => {
                setShowQuestionTypes(!showQuestionTypes);
                if (showSnippets) setShowSnippets(false);
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                showQuestionTypes
                  ? "bg-purple text-white shadow-xs"
                  : "bg-purple/10 hover:bg-purple hover:text-white text-purple dark:text-purple-300 border border-purple/30"
              }`}
            >
              <Layers size={14} />
              <span>20 Question Types</span>
              {showQuestionTypes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* HTTP Header Guide Callout */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">HTTP Header:</span>
            <code className="bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              Authorization: Bearer &lt;TOKEN&gt;
            </code>
            <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hidden sm:inline-block">
              Content-Type: application/json
            </code>
          </div>
          {token && (
            <button
              onClick={() => handleCopyCode(`Authorization: Bearer ${token}`)}
              className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy size={11} />
              <span>Copy Full Header String</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Snippets Drawer */}
      {showSnippets && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal size={16} className="text-teal-500" />
                <span>Quickstart Code Examples</span>
              </h3>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                {["curl", "js", "python"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setSelectedLang(l)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                      selectedLang === l ? "bg-teal-600 text-white" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => handleCopyCode(codeSnippets[selectedLang])}
                className="absolute top-2.5 right-2.5 bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-all"
              >
                {copiedSnippet ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedSnippet ? "Copied" : "Copy"}</span>
              </button>
              <pre className="bg-slate-950 text-slate-100 p-4 pt-8 rounded-xl text-xs font-mono overflow-x-auto text-left leading-relaxed">
                {codeSnippets[selectedLang]}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Expandable 20 Question Types Drawer */}
      {showQuestionTypes && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-teal-500" />
                <span>All 20 Supported Question Types</span>
              </h3>
              <span className="text-xs text-slate-500">
                Pass these values in <code className="text-teal-600 font-mono">type</code> when creating questions.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              {QUESTION_TYPES_LIST.map((q) => (
                <div
                  key={q.key}
                  className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{q.label}</span>
                    <code className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold bg-teal-500/10 px-1.5 py-0.5 rounded">
                      {q.key}
                    </code>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{q.desc}</p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                    {q.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Swagger UI Explorer */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6">
        {specLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold">Loading Swagger UI...</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="swagger-ui-custom-container bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm overflow-hidden"
        />
      </main>

      {/* Swagger Custom Clean Styles */}
      <style>{`
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui { font-family: "IRANSansX", "Montserrat", Tahoma, sans-serif !important; }
        .swagger-ui code, .swagger-ui pre, .swagger-ui .microlight { font-family: ui-monospace, monospace !important; }
        .swagger-ui .info { margin: 15px 0 25px !important; }
        .swagger-ui .info .title { font-size: 22px !important; color: #0f172a !important; font-weight: 800 !important; }
        .dark .swagger-ui .info .title { color: #f8fafc !important; }
        .dark .swagger-ui { filter: invert(0.88) hue-rotate(180deg); }
        .dark .swagger-ui img { filter: invert(1) hue-rotate(180deg); }
        .swagger-ui .scheme-container { background: transparent !important; box-shadow: none !important; padding: 5px 0 !important; }
        .swagger-ui .wrapper { padding: 0 !important; max-width: 100% !important; }
        .swagger-ui .col-12 { padding: 0 !important; }
        .swagger-ui .opblock { border-radius: 12px !important; margin: 0 0 12px !important; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05) !important; }
        .swagger-ui .opblock-summary { border-radius: 12px !important; }
        .swagger-ui .btn.authorize { background-color: #0d9488 !important; border-color: #0d9488 !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; box-shadow: 2.75px 2.75px 0 #2e7068 !important; }
        .swagger-ui .btn.authorize svg { fill: white !important; }
        .swagger-ui .btn.execute { background-color: #202A5A !important; border-color: #202A5A !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; box-shadow: 2.75px 2.75px 0 #0b0f1f !important; }
        .swagger-ui .btn.try-out__btn { background-color: #59BBAF !important; border-color: #347e75 !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; box-shadow: 2.75px 2.75px 0 #2e7068 !important; }
        .swagger-ui .btn.cancel { background-color: #E0195B !important; border-color: #ce1754 !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; box-shadow: 2.75px 2.75px 0 #ce1754 !important; }
        .swagger-ui .btn.download-url { background-color: #F8A41D !important; border-color: #C57A07 !important; color: white !important; font-weight: 700 !important; border-radius: 8px !important; }
        .swagger-ui select { border-radius: 8px !important; border: 2px solid #58bdaf !important; }
        .swagger-ui input[type=text] { border-radius: 8px !important; border: 2px solid #cbd5e1 !important; }
      `}</style>
    </div>
  );
}
