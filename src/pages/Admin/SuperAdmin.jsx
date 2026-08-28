// ══════════════════════════════════════════════════════════════
// SuperAdmin — پنل مدیریت کامل با طراحی IBM Carbon Design
// دسترسی کامل به تمامی بخش‌ها + تب‌های مجزا
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { faNum } from "../../lib/utils";
import SEO from "../../components/ui/SEO";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";

// ─── توکن‌های IBM Carbon ───
const IBM = {
  blue: "#0f62fe", blueHover: "#0353e9", blueDark: "#002d9c",
  coolGray10: "#f4f4f4", coolGray20: "#e0e0e0", coolGray30: "#c6c6c6",
  coolGray50: "#8d8d8d", coolGray60: "#6f6f6f", coolGray80: "#393939",
  coolGray100: "#161616", red60: "#da1e28", green50: "#24a148",
  yellow: "#f1c21b", white: "#ffffff", cyan10: "#e5f6ff",
};

// ─── آیکون‌های تب ───
function TabIcon({ name, size = 18 }) {
  const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    forms: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    responses: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    managers: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };
  return icons[name] || null;
}

// ─── تب‌ها ───
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "forms", label: "Forms", icon: "forms" },
  { id: "responses", label: "Responses", icon: "responses" },
  { id: "managers", label: "Managers", icon: "managers" },
  { id: "settings", label: "System", icon: "settings" },
];

// ─── کارت آمار ───
function StatCard({ label, value, sub, color = IBM.blue }) {
  return (
    <div className="bg-white border border-cool-gray-20 rounded-lg p-4 flex flex-col gap-1">
      <span className="text-[0.65rem] font-medium text-cool-gray-60 uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold" style={{ color }}>{faNum(value)}</span>
      {sub && <span className="text-[0.6rem] text-cool-gray-50">{sub}</span>}
    </div>
  );
}

// ─── جدول IBM ───
function IBMTable({ columns, rows, emptyMessage = "No data" }) {
  if (!rows.length) return <div className="text-sm text-cool-gray-50 py-12 text-center border border-cool-gray-20 rounded-lg">{emptyMessage}</div>;
  return (
    <div className="overflow-x-auto border border-cool-gray-20 rounded-lg">
      <table className="w-full text-sm">
        <thead><tr className="bg-cool-gray-10 border-b border-cool-gray-20">
          {columns.map((col) => <th key={col.key} className="text-right py-3 px-4 text-[0.65rem] font-semibold text-cool-gray-60 uppercase tracking-wider">{col.label}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} className="border-b border-cool-gray-20 last:border-0 hover:bg-cool-gray-10 transition-colors">
              {columns.map((col) => <td key={col.key} className="py-3 px-4 text-cool-gray-80">{col.render ? col.render(row) : row[col.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SuperAdmin Component
// ══════════════════════════════════════════════════════════════
export default function SuperAdmin() {
  const { user, profile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  // ─── داده‌ها ───
  const [forms, setForms] = useState([]);
  const [responses, setResponses] = useState([]);
  const [managers, setManagers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);

  // ─── state‌های ویرایش ───
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", published: false });
  const [editManager, setEditManager] = useState({ full_name: "", is_active: true });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [formsRes, responsesRes, managersRes, questionsRes, answersRes] = await Promise.all([
        supabase.from("forms").select("*").order("created_at", { ascending: false }),
        supabase.from("responses").select("*, forms!inner(title)").order("submitted_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("id, email, full_name, is_active, is_owner, created_at"),
        supabase.from("questions").select("id, form_id, type, title"),
        supabase.from("answers").select("id, response_id, question_id, value").limit(500),
      ]);
      setForms(formsRes.data || []);
      setResponses(responsesRes.data || []);
      setManagers(managersRes.data || []);
      setQuestions(questionsRes.data || []);
      setAnswers(answersRes.data || []);
    } catch (err) { console.error("SuperAdmin load:", err); }
    finally { setLoading(false); }
  }

  // ─── آمار ───
  const stats = useMemo(() => ({
    forms: forms.length,
    published: forms.filter((f) => f.published).length,
    responses: responses.length,
    managers: managers.length,
    activeManagers: managers.filter((m) => m.is_active).length,
    questions: questions.length,
    answers: answers.length,
  }), [forms, responses, managers, questions, answers]);

  // ─── CRUD Operations ───
  async function toggleFormPublish(form) {
    try {
      await supabase.from("forms").update({ published: !form.published }).eq("id", form.id);
      loadAll();
    } catch (err) { console.error(err); }
  }

  async function deleteForm(formId) {
    if (!confirm("Delete this form and all its data?")) return;
    try {
      await supabase.from("questions").delete().eq("form_id", formId);
      await supabase.from("forms").delete().eq("id", formId);
      loadAll();
    } catch (err) { console.error(err); }
  }

  async function saveFormEdit() {
    if (!editTarget) return;
    try {
      await supabase.from("forms").update({ title: editForm.title, description: editForm.description, published: editForm.published }).eq("id", editTarget.id);
      setEditTarget(null);
      loadAll();
    } catch (err) { console.error(err); }
  }

  async function toggleManagerActive(m) {
    try {
      await supabase.from("profiles").update({ is_active: !m.is_active }).eq("id", m.id);
      loadAll();
    } catch (err) { console.error(err); }
  }

  async function deleteResponse(responseId) {
    if (!confirm("Delete this response?")) return;
    try {
      await supabase.from("answers").delete().eq("response_id", responseId);
      await supabase.from("responses").delete().eq("id", responseId);
      loadAll();
    } catch (err) { console.error(err); }
  }

  // ─── فیلتر جستجو ───
  const filteredForms = useMemo(() => {
    if (!searchQuery) return forms;
    const q = searchQuery.toLowerCase();
    return forms.filter((f) => f.title?.toLowerCase().includes(q) || f.slug?.toLowerCase().includes(q));
  }, [forms, searchQuery]);

  const filteredResponses = useMemo(() => {
    if (!searchQuery) return responses;
    const q = searchQuery.toLowerCase();
    return responses.filter((r) => r.forms?.title?.toLowerCase().includes(q) || r.device?.toLowerCase().includes(q));
  }, [responses, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cool-gray-20 border-t-[#0f62fe] rounded-full animate-spin" />
          <span className="text-sm text-cool-gray-60">Loading system data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif" }}>
      <SEO title="Super Admin Panel" noIndex />

      {/* ─── هدر ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b-2 border-cool-gray-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: IBM.blueDark }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-cool-gray-100">Super Admin Panel</h1>
            <p className="text-[0.65rem] text-cool-gray-50">Full system access · IBM Carbon Design</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-50 animate-pulse" />
          <span className="text-[0.65rem] text-cool-gray-60">Online</span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: IBM.blue }}>
            {profile?.full_name?.[0]?.toUpperCase() || "SA"}
          </div>
        </div>
      </div>

      {/* ─── تب‌ها ─── */}
      <div className="flex gap-0 border-b-2 border-cool-gray-20 mb-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-[2px] ${
              activeTab === tab.id
                ? "border-ibm-blue text-ibm-blue"
                : "border-transparent text-cool-gray-60 hover:text-cool-gray-100 hover:bg-cool-gray-10"
            }`}
          >
            <TabIcon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── جستجو ─── */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full max-w-sm border border-cool-gray-30 rounded-lg px-3 py-2 text-sm text-cool-gray-100 placeholder:text-cool-gray-50 focus:outline-none focus:border-ibm-blue focus:ring-1 focus:ring-ibm-blue/30 transition-all"
        />
      </div>

      {/* ─── محتوای تب‌ها ─── */}
      <div className="flex-1">
        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Total Forms" value={stats.forms} sub={`${stats.published} published`} color={IBM.blue} />
              <StatCard label="Responses" value={stats.responses} color={IBM.green50} />
              <StatCard label="Questions" value={stats.questions} color={IBM.blueDark} />
              <StatCard label="Managers" value={stats.managers} sub={`${stats.activeManagers} active`} color={IBM.coolGray80} />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Forms overview */}
              <div className="bg-white border border-cool-gray-20 rounded-lg">
                <div className="px-4 py-3 border-b border-cool-gray-20">
                  <h3 className="text-sm font-bold text-cool-gray-100">Recent Forms</h3>
                </div>
                <div className="p-3 flex flex-col gap-1.5">
                  {forms.slice(0, 5).map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-cool-gray-10">
                      <span className="text-xs font-semibold text-cool-gray-80 truncate">{f.title}</span>
                      <span className={`text-[0.6rem] px-1.5 py-0.5 rounded ${f.published ? "bg-green-50/20 text-green-60" : "bg-cool-gray-20 text-cool-gray-60"}`}>
                        {f.published ? "Published" : "Draft"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Managers overview */}
              <div className="bg-white border border-cool-gray-20 rounded-lg">
                <div className="px-4 py-3 border-b border-cool-gray-20">
                  <h3 className="text-sm font-bold text-cool-gray-100">Managers</h3>
                </div>
                <div className="p-3 flex flex-col gap-1.5">
                  {managers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-cool-gray-10">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.5rem] font-bold text-white" style={{ backgroundColor: m.is_owner ? IBM.blueDark : m.is_active ? IBM.blue : IBM.coolGray50 }}>
                        {m.full_name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <span className="text-xs font-semibold text-cool-gray-80 flex-1 truncate">{m.full_name || m.email}</span>
                      {m.is_owner && <span className="text-[0.5rem] px-1 py-0.5 rounded bg-ibm-blue/10 text-ibm-blue font-bold">OWNER</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forms */}
        {activeTab === "forms" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-cool-gray-100">All Forms ({filteredForms.length})</h2>
            </div>
            <IBMTable
              columns={[
                { key: "title", label: "Title", render: (r) => <span className="font-semibold">{r.title}</span> },
                { key: "slug", label: "Slug", render: (r) => <span className="text-xs font-mono text-cool-gray-60">{r.slug}</span> },
                { key: "form_type", label: "Type", render: (r) => <span className="text-xs px-2 py-0.5 rounded bg-cool-gray-10">{r.form_type === "registration" ? "Registration" : "Step"}</span> },
                { key: "published", label: "Status", render: (r) => <span className={`text-xs font-semibold ${r.published ? "text-green-60" : "text-cool-gray-50"}`}>{r.published ? "Published" : "Draft"}</span> },
                { key: "created_at", label: "Created", render: (r) => <span className="text-xs">{new Date(r.created_at).toLocaleDateString("fa-IR")}</span> },
                { key: "actions", label: "", render: (r) => (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditTarget(r); setEditForm({ title: r.title, description: r.description || "", published: r.published }); }} className="text-[0.6rem] px-2 py-1 rounded bg-cool-gray-10 text-cool-gray-80 hover:bg-cool-gray-20 transition-colors">Edit</button>
                    <button onClick={() => toggleFormPublish(r)} className="text-[0.6rem] px-2 py-1 rounded bg-cool-gray-10 text-cool-gray-80 hover:bg-cool-gray-20 transition-colors">{r.published ? "Unpublish" : "Publish"}</button>
                    <button onClick={() => deleteForm(r.id)} className="text-[0.6rem] px-2 py-1 rounded bg-red-60/10 text-red-60 hover:bg-red-60/20 transition-colors">Delete</button>
                  </div>
                )},
              ]}
              rows={filteredForms}
              emptyMessage="No forms found"
            />
          </div>
        )}

        {/* Responses */}
        {activeTab === "responses" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-cool-gray-100">Responses ({filteredResponses.length})</h2>
            </div>
            <IBMTable
              columns={[
                { key: "form", label: "Form", render: (r) => <span className="font-semibold text-xs">{r.forms?.title || "—"}</span> },
                { key: "is_complete", label: "Complete", render: (r) => <span className={`text-xs font-semibold ${r.is_complete ? "text-green-60" : "text-yellow"}`}>{r.is_complete ? "Yes" : "Partial"}</span> },
                { key: "device", label: "Device", render: (r) => <span className="text-xs text-cool-gray-60">{r.device || "—"}</span> },
                { key: "browser", label: "Browser", render: (r) => <span className="text-xs text-cool-gray-60">{r.browser || "—"}</span> },
                { key: "duration_seconds", label: "Duration", render: (r) => <span className="text-xs">{r.duration_seconds ? `${r.duration_seconds}s` : "—"}</span> },
                { key: "submitted_at", label: "Submitted", render: (r) => <span className="text-xs">{r.submitted_at ? new Date(r.submitted_at).toLocaleString("fa-IR") : "—"}</span> },
                { key: "actions", label: "", render: (r) => (
                  <button onClick={() => deleteResponse(r.id)} className="text-[0.6rem] px-2 py-1 rounded bg-red-60/10 text-red-60 hover:bg-red-60/20 transition-colors">Delete</button>
                )},
              ]}
              rows={filteredResponses}
              emptyMessage="No responses yet"
            />
          </div>
        )}

        {/* Managers */}
        {activeTab === "managers" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-cool-gray-100">Managers ({managers.length})</h2>
            </div>
            <IBMTable
              columns={[
                { key: "name", label: "Name", render: (r) => (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.5rem] font-bold text-white" style={{ backgroundColor: r.is_owner ? IBM.blueDark : IBM.blue }}>{r.full_name?.[0]?.toUpperCase() || "U"}</div>
                    <span className="font-semibold">{r.full_name || "—"}</span>
                    {r.is_owner && <span className="text-[0.5rem] px-1 py-0.5 rounded bg-ibm-blue/10 text-ibm-blue font-bold">OWNER</span>}
                  </div>
                )},
                { key: "email", label: "Email", render: (r) => <span className="text-xs font-mono" dir="ltr">{r.email}</span> },
                { key: "is_active", label: "Status", render: (r) => <span className={`text-xs font-semibold ${r.is_active ? "text-green-60" : "text-red-60"}`}>{r.is_active ? "Active" : "Inactive"}</span> },
                { key: "created_at", label: "Joined", render: (r) => <span className="text-xs">{new Date(r.created_at).toLocaleDateString("fa-IR")}</span> },
                { key: "actions", label: "", render: (r) => !r.is_owner && (
                  <div className="flex gap-1">
                    <button onClick={() => toggleManagerActive(r)} className="text-[0.6rem] px-2 py-1 rounded bg-cool-gray-10 text-cool-gray-80 hover:bg-cool-gray-20 transition-colors">{r.is_active ? "Deactivate" : "Activate"}</button>
                  </div>
                )},
              ]}
              rows={managers}
              emptyMessage="No managers"
            />
          </div>
        )}

        {/* Settings / System */}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-cool-gray-100">System Information</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-white border border-cool-gray-20 rounded-lg p-4">
                <h3 className="text-xs font-bold text-cool-gray-60 uppercase tracking-wider mb-3">Database</h3>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-cool-gray-60">Engine</span><span className="font-semibold">PostgreSQL + Supabase</span></div>
                  <div className="flex justify-between"><span className="text-cool-gray-60">Forms</span><span className="font-semibold">{faNum(stats.forms)}</span></div>
                  <div className="flex justify-between"><span className="text-cool-gray-60">Questions</span><span className="font-semibold">{faNum(stats.questions)}</span></div>
                  <div className="flex justify-between"><span className="text-cool-gray-60">Responses</span><span className="font-semibold">{faNum(stats.responses)}</span></div>
                  <div className="flex justify-between"><span className="text-cool-gray-60">Answers</span><span className="font-semibold">{faNum(stats.answers)}</span></div>
                </div>
              </div>
              <div className="bg-white border border-cool-gray-20 rounded-lg p-4">
                <h3 className="text-xs font-bold text-cool-gray-60 uppercase tracking-wider mb-3">Environment</h3>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-cool-gray-60">Host</span><span className="font-semibold font-mono text-xs">{window.location.hostname}</span></div>
                  <div className="flex justify-between"><span className="text-cool-gray-60">Protocol</span><span className="font-semibold">{window.location.protocol}</span></div>
                  <div className="flex justify-between"><span className="text-cool-gray-60">User Agent</span><span className="font-semibold text-[0.6rem] truncate max-w-[200px]">{navigator.userAgent.slice(0, 50)}...</span></div>
                  <div className="flex justify-between"><span className="text-cool-gray-60">Platform</span><span className="font-semibold">{navigator.platform}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── مودال ویرایش فرم ─── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Form">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-cool-gray-60 mb-1">Title</label>
            <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full border border-cool-gray-30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ibm-blue" />
          </div>
          <div>
            <label className="block text-xs font-bold text-cool-gray-60 mb-1">Description</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3}
              className="w-full border border-cool-gray-30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ibm-blue resize-y" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={editForm.published} onChange={(e) => setEditForm({ ...editForm, published: e.target.checked })} className="w-4 h-4 accent-[#0f62fe]" />
            <span className="text-sm font-semibold">Published</span>
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={saveFormEdit} className="px-4 py-2 bg-ibm-blue text-white text-sm font-semibold rounded-lg hover:bg-ibm-blue-hover transition-colors">Save</button>
            <button onClick={() => setEditTarget(null)} className="px-4 py-2 border border-cool-gray-30 text-sm font-semibold rounded-lg hover:bg-cool-gray-10 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
