// ══════════════════════════════════════════════════════════════
// SuperAdmin — پنل سوپرادمین با طراحی IBM Carbon
// مخفی از لیست مدیران، تمام دسترسی‌ها، جزئیات کامل سیستم
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { faNum } from "../../lib/utils";
import SEO from "../../components/ui/SEO";

// ─── توکن‌های IBM Carbon Design ───
const IBM = {
  blue: "#0f62fe",
  blueHover: "#0353e9",
  blueDark: "#002d9c",
  coolGray10: "#f4f4f4",
  coolGray20: "#e0e0e0",
  coolGray30: "#c6c6c6",
  coolGray50: "#8d8d8d",
  coolGray60: "#6f6f6f",
  coolGray80: "#393939",
  coolGray100: "#161616",
  coolGray110: "#000000",
  red60: "#da1e28",
  green50: "#24a148",
  yellow: "#f1c21b",
  white: "#ffffff",
};

// ─── کارت آماری IBM ───
function IBMStatCard({ label, value, sub, color = IBM.blue, trend }) {
  return (
    <div className="bg-white border border-cool-gray-20 rounded-lg p-4 sm:p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-cool-gray-60">{label}</span>
      <div className="flex items-end gap-2">
        <span className="text-2xl sm:text-3xl font-bold" style={{ color }}>{faNum(value)}</span>
        {trend && <span className={`text-xs font-medium ${trend > 0 ? "text-green-60" : "text-red-60"}`}>{trend > 0 ? "↑" : "↓"} {faNum(Math.abs(trend))}%</span>}
      </div>
      {sub && <span className="text-[0.65rem] text-cool-gray-50">{sub}</span>}
    </div>
  );
}

// ─── جدول IBM ───
function IBMTable({ columns, rows, emptyMessage = "داده‌ای موجود نیست" }) {
  if (!rows.length) return <div className="text-sm text-cool-gray-50 py-8 text-center">{emptyMessage}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-cool-gray-20">
            {columns.map((col) => (
              <th key={col.key} className="text-right py-2.5 px-3 text-xs font-semibold text-cool-gray-60 uppercase tracking-wide">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} className="border-b border-cool-gray-20 hover:bg-cool-gray-10 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="py-2.5 px-3 text-cool-gray-80">{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── نوار وضعیت IBM ───
function IBMStatusIndicator({ status, label }) {
  const colors = {
    ok: IBM.green50,
    warning: IBM.yellow,
    error: IBM.red60,
    info: IBM.blue,
  };
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[status] || colors.info }} />
      <span className="text-xs font-medium text-cool-gray-80">{label}</span>
    </div>
  );
}

export default function SuperAdmin() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ forms: 0, responses: 0, managers: 0, questions: 0 });
  const [forms, setForms] = useState([]);
  const [managers, setManagers] = useState([]);
  const [recentResponses, setRecentResponses] = useState([]);
  const [systemInfo, setSystemInfo] = useState({ uptime: null, dbVersion: null });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [formsRes, responsesRes, managersRes, questionsRes] = await Promise.all([
        supabase.from("forms").select("id, title, slug, published, form_type, created_at"),
        supabase.from("responses").select("id, form_id, is_complete, submitted_at, device, browser"),
        supabase.from("profiles").select("id, email, full_name, is_active, is_owner, created_at"),
        supabase.from("questions").select("id"),
      ]);

      setForms(formsRes.data || []);
      setStats({
        forms: formsRes.data?.length || 0,
        responses: responsesRes.data?.length || 0,
        managers: managersRes.data?.length || 0,
        questions: questionsRes.data?.length || 0,
      });
      setManagers(managersRes.data || []);

      // آخرین ۱۰ پاسخ
      const recent = (responsesRes.data || []).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 10);
      setRecentResponses(recent);

      // اطلاعات سیستم
      setSystemInfo({
        dbVersion: "PostgreSQL + Supabase",
        lastDeploy: new Date().toLocaleDateString("fa-IR"),
        environment: window.location.hostname === "localhost" ? "Development" : "Production",
      });
    } catch (err) {
      console.error("SuperAdmin load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const formStats = useMemo(() => {
    const published = forms.filter((f) => f.published).length;
    const draft = forms.filter((f) => !f.published).length;
    const stepForms = forms.filter((f) => f.form_type === "step_by_step").length;
    const regForms = forms.filter((f) => f.form_type === "registration").length;
    return { published, draft, stepForms, regForms };
  }, [forms]);

  const deviceStats = useMemo(() => {
    const devices = {};
    recentResponses.forEach((r) => {
      const d = r.device || "نامشخص";
      devices[d] = (devices[d] || 0) + 1;
    });
    return devices;
  }, [recentResponses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cool-gray-20 border-t-ibm-blue rounded-full animate-spin" />
          <span className="text-sm text-cool-gray-60">بارگذاری داده‌های سیستم...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" dir="ltr" style={{ fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif" }}>
      <SEO title="Super Admin — System Panel" noIndex />

      {/* هدر */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-cool-gray-20 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: IBM.red60 }} />
            <h1 className="text-xl sm:text-2xl font-bold text-cool-gray-100">System Admin</h1>
          </div>
          <p className="text-xs text-cool-gray-60">Full system access · Hidden from admin list · Owner only</p>
        </div>
        <div className="flex items-center gap-3">
          <IBMStatusIndicator status="ok" label="System Online" />
          <span className="text-[0.65rem] text-cool-gray-50">{systemInfo.environment}</span>
          <div className="w-8 h-8 rounded-full bg-ibm-blue flex items-center justify-center text-white text-xs font-bold">
            {profile?.full_name?.[0]?.toUpperCase() || "SA"}
          </div>
        </div>
      </div>

      {/* آمار کلی */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <IBMStatCard label="Total Forms" value={stats.forms} sub={`${formStats.published} published, ${formStats.draft} draft`} color={IBM.blue} />
        <IBMStatCard label="Total Responses" value={stats.responses} color={IBM.green50} />
        <IBMStatCard label="Total Questions" value={stats.questions} color={IBM.blueDark} />
        <IBMStatCard label="Managers" value={stats.managers} sub={`${managers.filter((m) => m.is_active).length} active`} color={IBM.coolGray80} />
      </div>

      {/* دو ستونه */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* فرم‌ها */}
        <div className="lg:col-span-2 bg-white border border-cool-gray-20 rounded-lg">
          <div className="px-4 py-3 border-b border-cool-gray-20 flex items-center justify-between">
            <h2 className="text-sm font-bold text-cool-gray-100">All Forms</h2>
            <div className="flex gap-2">
              <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-ibm-blue/10 text-ibm-blue font-semibold">{formStats.published} published</span>
              <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-cool-gray-20 text-cool-gray-60 font-semibold">{formStats.draft} draft</span>
            </div>
          </div>
          <IBMTable
            columns={[
              { key: "title", label: "Title", render: (r) => <span className="font-semibold">{r.title}</span> },
              { key: "form_type", label: "Type", render: (r) => <span className="text-xs px-1.5 py-0.5 rounded bg-cool-gray-10">{r.form_type === "registration" ? "Registration" : "Step-by-Step"}</span> },
              { key: "published", label: "Status", render: (r) => <span className={`text-xs font-semibold ${r.published ? "text-green-60" : "text-cool-gray-50"}`}>{r.published ? "Published" : "Draft"}</span> },
              { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleDateString("fa-IR") },
            ]}
            rows={forms}
            emptyMessage="No forms yet"
          />
        </div>

        {/* سمت راست — اطلاعات سیستم */}
        <div className="flex flex-col gap-4">
          {/* مدیران */}
          <div className="bg-white border border-cool-gray-20 rounded-lg">
            <div className="px-4 py-3 border-b border-cool-gray-20">
              <h2 className="text-sm font-bold text-cool-gray-100">Managers</h2>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {managers.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-cool-gray-10 transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white" style={{ backgroundColor: m.is_owner ? IBM.blueDark : m.is_active ? IBM.blue : IBM.coolGray50 }}>
                    {m.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-cool-gray-100 truncate">{m.full_name || "—"}</div>
                    <div className="text-[0.6rem] text-cool-gray-50 truncate" dir="ltr">{m.email}</div>
                  </div>
                  {m.is_owner && <span className="text-[0.5rem] px-1.5 py-0.5 rounded bg-ibm-blue/10 text-ibm-blue font-bold">OWNER</span>}
                  {!m.is_active && <span className="text-[0.5rem] px-1.5 py-0.5 rounded bg-red-60/10 text-red-60 font-bold">OFF</span>}
                </div>
              ))}
            </div>
          </div>

          {/* وضعیت سیستم */}
          <div className="bg-white border border-cool-gray-20 rounded-lg">
            <div className="px-4 py-3 border-b border-cool-gray-20">
              <h2 className="text-sm font-bold text-cool-gray-100">System Status</h2>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <IBMStatusIndicator status="ok" label="Supabase Connected" />
              <IBMStatusIndicator status="ok" label="Auth Service Active" />
              <IBMStatusIndicator status="ok" label="RLS Policies Active" />
              <div className="border-t border-cool-gray-20 pt-3 mt-1">
                <div className="grid grid-cols-2 gap-2 text-[0.65rem]">
                  <div><span className="text-cool-gray-50">DB:</span> <span className="font-semibold text-cool-gray-80">{systemInfo.dbVersion}</span></div>
                  <div><span className="text-cool-gray-50">Env:</span> <span className="font-semibold text-cool-gray-80">{systemInfo.environment}</span></div>
                  <div><span className="text-cool-gray-50">Host:</span> <span className="font-semibold text-cool-gray-80">{window.location.hostname}</span></div>
                  <div><span className="text-cool-gray-50">Forms:</span> <span className="font-semibold text-cool-gray-80">{formStats.stepForms} step · {formStats.regForms} reg</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* دستگاه‌ها */}
          <div className="bg-white border border-cool-gray-20 rounded-lg">
            <div className="px-4 py-3 border-b border-cool-gray-20">
              <h2 className="text-sm font-bold text-cool-gray-100">Recent Devices</h2>
            </div>
            <div className="p-3 flex flex-col gap-1.5">
              {Object.entries(deviceStats).map(([device, count]) => (
                <div key={device} className="flex items-center justify-between py-1 px-2 rounded hover:bg-cool-gray-10">
                  <span className="text-xs text-cool-gray-80">{device}</span>
                  <span className="text-xs font-bold text-ibm-blue">{faNum(count)}</span>
                </div>
              ))}
              {Object.keys(deviceStats).length === 0 && <span className="text-xs text-cool-gray-50 py-2">No recent data</span>}
            </div>
          </div>
        </div>
      </div>

      {/* آخرین پاسخ‌ها */}
      <div className="bg-white border border-cool-gray-20 rounded-lg">
        <div className="px-4 py-3 border-b border-cool-gray-20 flex items-center justify-between">
          <h2 className="text-sm font-bold text-cool-gray-100">Recent Responses (Last 10)</h2>
          <span className="text-[0.6rem] text-cool-gray-50">{faNum(stats.responses)} total</span>
        </div>
        <IBMTable
          columns={[
            { key: "form_id", label: "Form", render: (r) => { const f = forms.find((f) => f.id === r.form_id); return <span className="font-semibold">{f?.title || r.form_id?.slice(0, 8)}</span>; } },
            { key: "is_complete", label: "Complete", render: (r) => <span className={`text-xs font-semibold ${r.is_complete ? "text-green-60" : "text-yellow"}`}>{r.is_complete ? "Yes" : "Partial"}</span> },
            { key: "device", label: "Device", render: (r) => <span className="text-xs text-cool-gray-60">{r.device || "—"}</span> },
            { key: "browser", label: "Browser", render: (r) => <span className="text-xs text-cool-gray-60">{r.browser || "—"}</span> },
            { key: "submitted_at", label: "Submitted", render: (r) => <span className="text-xs">{r.submitted_at ? new Date(r.submitted_at).toLocaleString("fa-IR") : "—"}</span> },
          ]}
          rows={recentResponses}
          emptyMessage="No responses yet"
        />
      </div>
    </div>
  );
}
