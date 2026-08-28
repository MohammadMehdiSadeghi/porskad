// ══════════════════════════════════════════════════════════════
// SuperAdmin — پنل مدیریت کامل با دسترسی مستقیم به دیتابیس و ورسل
// طراحی: IBM Carbon Design System
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { faNum } from "../../lib/utils";
import SEO from "../../components/ui/SEO";

// ─── توکن‌های IBM Carbon ───
const IBM = {
  blue: "#0f62fe", blueHover: "#0353e9", blueDark: "#002d9c",
  coolGray10: "#f4f4f4", coolGray20: "#e0e0e0", coolGray30: "#c6c6c6",
  coolGray50: "#8d8d8d", coolGray60: "#6f6f6f", coolGray80: "#393939",
  coolGray100: "#161616", coolGray110: "#000000",
  red60: "#da1e28", red30: "#fff1f1",
  green50: "#24a148", green30: "#defbe6",
  yellow: "#f1c21b", yellow30: "#fdf6dd",
  cyan10: "#e5f6ff", cyan: "#0072c3",
  white: "#ffffff",
};

// ─── آیکون‌ها ───
function I({ d, size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>; }
const ICONS = {
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  database: "M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zM2 6.5C2 4.02 6.48 2 12 2s10 2.02 10 4.5M2 12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5",
  vercel: "M12 2L2 22h20L12 2z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  terminal: "M4 17l6-6-6-6M12 19h8",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
};

// ─── تب‌ها ───
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "database", label: "Database", icon: "database" },
  { id: "vercel", label: "Vercel", icon: "vercel" },
  { id: "users", label: "Users", icon: "users" },
  { id: "admins", label: "Admins", icon: "shield" },
  { id: "query", label: "SQL Query", icon: "terminal" },
  { id: "activity", label: "Activity", icon: "activity" },
];

// ─── کارت آمار ───
function Stat({ label, value, sub, color = IBM.blue, icon }) {
  return (
    <div className="bg-white border border-cool-gray-20 rounded-lg p-4 flex flex-col gap-1.5 hover:border-cool-gray-30 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] font-semibold text-cool-gray-50 uppercase tracking-wider">{label}</span>
        {icon && <span style={{ color }}>{icon}</span>}
      </div>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-[0.6rem] text-cool-gray-50">{sub}</span>}
    </div>
  );
}

// ─── جدول ───
function Table({ columns, rows, empty = "No data" }) {
  if (!rows.length) return <div className="text-sm text-cool-gray-50 py-12 text-center border border-cool-gray-20 rounded-lg bg-white">{empty}</div>;
  return (
    <div className="overflow-x-auto border border-cool-gray-20 rounded-lg bg-white">
      <table className="w-full text-sm">
        <thead><tr className="bg-cool-gray-10 border-b border-cool-gray-20">
          {columns.map((c) => <th key={c.key} className="text-right py-2.5 px-3 text-[0.6rem] font-semibold text-cool-gray-60 uppercase tracking-wider whitespace-nowrap">{c.label}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} className="border-b border-cool-gray-20 last:border-0 hover:bg-cool-gray-10 transition-colors">
              {columns.map((c) => <td key={c.key} className="py-2.5 px-3 text-cool-gray-80">{c.render ? c.render(r) : String(r[c.key] ?? "—")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── وضعیت ───
function Status({ ok, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ok ? IBM.green50 : IBM.red60 }} />
      <span className="text-xs text-cool-gray-80">{label}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SuperAdmin
// ══════════════════════════════════════════════════════════════
export default function SuperAdmin() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ─── داده‌ها ───
  const [dbStats, setDbStats] = useState({});
  const [tables, setTables] = useState([]);
  const [tableRows, setTableRows] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [vercelData, setVercelData] = useState({ deployments: [], projects: [] });
  const [vercelToken, setVercelToken] = useState(() => localStorage.getItem("sa_vercel_token") || "");
  const [vercelLoading, setVercelLoading] = useState(false);
  const [authUsers, setAuthUsers] = useState([]);
  const [adminData, setAdminData] = useState([]);
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlError, setSqlError] = useState(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [activityLog, setActivityLog] = useState([]);

  // ─── بارگذاری اولیه ───
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([
        loadDatabaseStats(),
        loadUsers(),
        loadAdmins(),
        loadActivity(),
      ]);
    } catch (err) { console.error("SA load:", err); }
    finally { setLoading(false); }
  }

  // ─── دیتابیس ───
  async function loadDatabaseStats() {
    const tableList = ["forms", "questions", "responses", "answers", "profiles", "user_roles", "user_permissions", "logic_rules"];
    const stats = {};
    const rows = {};
    for (const t of tableList) {
      try {
        const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
        stats[t] = count ?? 0;
        // Sample rows
        const { data } = await supabase.from(t).select("*").limit(3);
        rows[t] = data || [];
      } catch { stats[t] = "N/A"; rows[t] = []; }
    }
    setDbStats(stats);
    setTables(tableList);
    setTableRows(rows);
  }

  async function loadTableData(tableName) {
    setSelectedTable(tableName);
    try {
      const { data, error } = await supabase.from(tableName).select("*").limit(50);
      if (error) throw error;
      setTableData(data || []);
      setTableColumns(data?.length ? Object.keys(data[0]) : []);
    } catch (err) {
      console.error(err);
      setTableData([]);
      setTableColumns([]);
    }
  }

  // ─── ورسل ───
  async function loadVercelDeployments() {
    if (!vercelToken) return;
    setVercelLoading(true);
    try {
      const res = await fetch("https://api.vercel.com/v6/deployments?limit=20&target=production", {
        headers: { Authorization: `Bearer ${vercelToken}` },
      });
      if (!res.ok) throw new Error(`Vercel API ${res.status}`);
      const data = await res.json();
      setVercelData((prev) => ({ ...prev, deployments: data.deployments || [] }));

      // Projects
      const res2 = await fetch("https://api.vercel.com/v9/projects", {
        headers: { Authorization: `Bearer ${vercelToken}` },
      });
      if (res2.ok) {
        const pData = await res2.json();
        setVercelData((prev) => ({ ...prev, projects: pData.projects || [] }));
      }
      localStorage.setItem("sa_vercel_token", vercelToken);
    } catch (err) {
      console.error("Vercel error:", err);
    } finally { setVercelLoading(false); }
  }

  // ─── کاربران ───
  async function loadUsers() {
    try {
      const { data: profiles } = await supabase.from("profiles").select("id, email, full_name, is_active, is_owner, created_at, hidden_from").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role_id, active");
      const roleMap = {};
      (roles || []).forEach((r) => { roleMap[r.user_id] = { role: r.role_id, active: r.active }; });
      setAuthUsers((profiles || []).map((p) => ({ ...p, ...(roleMap[p.id] || { role: "unknown", active: true }) })));
    } catch (err) { console.error(err); }
  }

  // ─── ادمین‌ها ───
  async function loadAdmins() {
    try {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role_id, active");
      const { data: perms } = await supabase.from("user_permissions").select("user_id, permission_id");
      const roleMap = {}; const permMap = {};
      (roles || []).forEach((r) => { roleMap[r.user_id] = { role: r.role_id, active: r.active }; });
      (perms || []).forEach((p) => { if (!permMap[p.user_id]) permMap[p.user_id] = []; permMap[p.user_id].push(p.permission_id); });
      setAdminData((profiles || []).map((p) => ({
        ...p,
        ...(roleMap[p.id] || { role: "unknown", active: true }),
        permissions: permMap[p.id] || [],
      })));
    } catch (err) { console.error(err); }
  }

  // ─── فعالیت‌ها ───
  async function loadActivity() {
    try {
      // آخرین پاسخ‌ها به‌عنوان فعالیت
      const { data: resps } = await supabase.from("responses").select("id, form_id, is_complete, submitted_at, device, browser, os").order("submitted_at", { ascending: false }).limit(30);
      const { data: forms } = await supabase.from("forms").select("id, title");
      const formMap = {};
      (forms || []).forEach((f) => { formMap[f.id] = f.title; });
      setActivityLog((resps || []).map((r) => ({
        ...r,
        formTitle: formMap[r.form_id] || "Unknown",
        type: "response",
      })));
    } catch (err) { console.error(err); }
  }

  // ─── اجرای SQL ───
  async function runSqlQuery() {
    if (!sqlQuery.trim()) return;
    setSqlRunning(true); setSqlError(null); setSqlResult(null);
    try {
      // استفاده از RPC برای اجرای query امن
      const { data, error } = await supabase.rpc("exec_sql", { query: sqlQuery.trim() });
      if (error) throw error;
      setSqlResult(data);
    } catch (err) {
      // اگه RPC وجود نداشت، سعی کن مستقیم
      try {
        const tableMatch = sqlQuery.match(/from\s+(\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const { data, error } = await supabase.from(tableName).select("*").limit(100);
          if (error) throw error;
          setSqlResult(data);
        } else {
          setSqlError(err.message || "Query failed");
        }
      } catch (e2) {
        setSqlError(e2.message || "Query failed");
      }
    } finally { setSqlRunning(false); }
  }

  // ─── آمار ───
  const stats = useMemo(() => ({
    totalForms: dbStats.forms || 0,
    totalResponses: dbStats.responses || 0,
    totalQuestions: dbStats.questions || 0,
    totalAnswers: dbStats.answers || 0,
    totalUsers: authUsers.length,
    activeUsers: authUsers.filter((u) => u.is_active).length,
    totalAdmins: adminData.length,
    activeAdmins: adminData.filter((a) => a.is_active).length,
  }), [dbStats, authUsers, adminData]);

  // ─── فیلتر ───
  const filteredTableData = useMemo(() => {
    if (!search || !tableData.length) return tableData;
    const q = search.toLowerCase();
    return tableData.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(q)));
  }, [tableData, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cool-gray-20 border-t-[#0f62fe] rounded-full animate-spin" />
          <span className="text-sm text-cool-gray-60">Loading system...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif" }}>
      <SEO title="Super Admin" noIndex />

      {/* ─── هدر ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b-2 border-cool-gray-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: IBM.blueDark }}>
            <I d={ICONS.shield} size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-cool-gray-100">Super Admin</h1>
            <p className="text-[0.6rem] text-cool-gray-50">Database · Vercel · Users · Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Status ok label="System Online" />
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.6rem] font-bold" style={{ backgroundColor: IBM.blue }}>
            {profile?.full_name?.[0]?.toUpperCase() || "SA"}
          </div>
        </div>
      </div>

      {/* ─── تب‌ها ─── */}
      <div className="flex gap-0 border-b-2 border-cool-gray-20 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-[2px] ${
              tab === t.id ? "border-ibm-blue text-ibm-blue" : "border-transparent text-cool-gray-60 hover:text-cool-gray-100 hover:bg-cool-gray-10"
            }`}>
            <I d={ICONS[t.icon]} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── جستجو ─── */}
      <div className="mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
          className="w-full max-w-xs border border-cool-gray-30 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-ibm-blue transition-colors" />
      </div>

      {/* ═══════════ Dashboard ═══════════ */}
      {tab === "dashboard" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Forms" value={faNum(stats.totalForms)} color={IBM.blue} />
            <Stat label="Responses" value={faNum(stats.totalResponses)} color={IBM.green50} />
            <Stat label="Users" value={faNum(stats.totalUsers)} sub={`${stats.activeUsers} active`} color={IBM.cyan} />
            <Stat label="Admins" value={faNum(stats.totalAdmins)} sub={`${stats.activeAdmins} active`} color={IBM.blueDark} />
          </div>
          <div className="grid lg:grid-cols-3 gap-3">
            <Stat label="Questions" value={faNum(stats.totalQuestions)} color={IBM.coolGray80} />
            <Stat label="Answers" value={faNum(stats.totalAnswers)} color={IBM.coolGray60} />
            <Stat label="Tables" value={faNum(tables.length)} sub="Monitored" color={IBM.coolGray50} />
          </div>
          {/* Recent activity */}
          <div className="bg-white border border-cool-gray-20 rounded-lg">
            <div className="px-4 py-3 border-b border-cool-gray-20 flex items-center justify-between">
              <h3 className="text-xs font-bold text-cool-gray-100">Recent Activity</h3>
              <button onClick={loadActivity} className="text-[0.6rem] text-ibm-blue hover:underline">Refresh</button>
            </div>
            <div className="p-3 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
              {activityLog.slice(0, 15).map((a, i) => (
                <div key={a.id || i} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-cool-gray-10 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.is_complete ? IBM.green50 : IBM.yellow }} />
                  <span className="font-semibold text-cool-gray-80 flex-1 truncate">{a.formTitle}</span>
                  <span className="text-cool-gray-50">{a.device || "—"}</span>
                  <span className="text-cool-gray-50">{a.submitted_at ? new Date(a.submitted_at).toLocaleTimeString("fa-IR") : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Database ═══════════ */}
      {tab === "database" && (
        <div className="flex flex-col gap-4">
          {/* جدول‌ها */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {tables.map((t) => (
              <button key={t} onClick={() => loadTableData(t)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  selectedTable === t ? "border-ibm-blue bg-cyan-10" : "border-cool-gray-20 bg-white hover:border-cool-gray-30"
                }`}>
                <div className="text-[0.6rem] text-cool-gray-50 uppercase tracking-wider mb-1">{t}</div>
                <div className="text-lg font-bold text-cool-gray-100">{typeof dbStats[t] === "number" ? faNum(dbStats[t]) : "—"}</div>
                <div className="text-[0.55rem] text-cool-gray-50">rows</div>
              </button>
            ))}
          </div>

          {/* جدول انتخاب شده */}
          {selectedTable && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-cool-gray-100">{selectedTable} <span className="text-cool-gray-50 font-normal">({filteredTableData.length} rows)</span></h3>
                <button onClick={() => loadTableData(selectedTable)} className="text-[0.6rem] text-ibm-blue hover:underline">Refresh</button>
              </div>
              <Table
                columns={tableColumns.map((c) => ({
                  key: c, label: c,
                  render: (r) => {
                    const v = r[c];
                    if (v === null || v === undefined) return <span className="text-cool-gray-30">null</span>;
                    if (typeof v === "boolean") return <span className={v ? "text-green-60" : "text-red-60"}>{v ? "true" : "false"}</span>;
                    if (typeof v === "object") return <span className="text-[0.6rem] font-mono text-cool-gray-60 max-w-[200px] truncate block">{JSON.stringify(v).slice(0, 60)}</span>;
                    if (String(v).length > 50) return <span className="text-xs truncate block max-w-[200px]">{String(v).slice(0, 50)}...</span>;
                    return String(v);
                  },
                }))}
                rows={filteredTableData}
                empty={`No data in ${selectedTable}`}
              />
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Vercel ═══════════ */}
      {tab === "vercel" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-cool-gray-20 rounded-lg p-4">
            <h3 className="text-xs font-bold text-cool-gray-60 uppercase tracking-wider mb-3">Vercel API Token</h3>
            <div className="flex gap-2">
              <input type="password" value={vercelToken} onChange={(e) => setVercelToken(e.target.value)}
                placeholder="vxt_xxxxxxxxxxxx"
                className="flex-1 border border-cool-gray-30 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-ibm-blue" dir="ltr" />
              <button onClick={loadVercelDeployments} disabled={vercelLoading || !vercelToken}
                className="px-4 py-1.5 bg-ibm-blue text-white text-xs font-semibold rounded hover:bg-ibm-blue-hover disabled:opacity-50 transition-colors">
                {vercelLoading ? "Loading..." : "Connect"}
              </button>
            </div>
            <p className="text-[0.6rem] text-cool-gray-50 mt-2">Get token from: vercel.com/account/tokens</p>
          </div>

          {/* Projects */}
          {vercelData.projects.length > 0 && (
            <div className="bg-white border border-cool-gray-20 rounded-lg">
              <div className="px-4 py-3 border-b border-cool-gray-20">
                <h3 className="text-xs font-bold text-cool-gray-100">Projects</h3>
              </div>
              <div className="p-3 flex flex-col gap-2">
                {vercelData.projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded hover:bg-cool-gray-10">
                    <div className="w-8 h-8 rounded bg-cool-gray-100 flex items-center justify-center">
                      <I d={ICONS.vercel} size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-[0.6rem] text-cool-gray-50">{p.framework || "—"}</div>
                    </div>
                    <Status ok={p.latestDeployments?.[0]?.state === "READY"} label={p.latestDeployments?.[0]?.state || "Unknown"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deployments */}
          {vercelData.deployments.length > 0 && (
            <div className="bg-white border border-cool-gray-20 rounded-lg">
              <div className="px-4 py-3 border-b border-cool-gray-20">
                <h3 className="text-xs font-bold text-cool-gray-100">Recent Deployments</h3>
              </div>
              <Table
                columns={[
                  { key: "name", label: "Project", render: (r) => <span className="font-semibold">{r.name}</span> },
                  { key: "state", label: "State", render: (r) => <Status ok={r.state === "READY"} label={r.state} /> },
                  { key: "created", label: "Created", render: (r) => <span className="text-xs">{new Date(r.created).toLocaleString("fa-IR")}</span> },
                  { key: "url", label: "URL", render: (r) => <a href={`https://${r.url}`} target="_blank" rel="noreferrer" className="text-[0.65rem] text-ibm-blue hover:underline" dir="ltr">{r.url}</a> },
                  { key: "creator", label: "By", render: (r) => <span className="text-xs">{r.creator?.username || "—"}</span> },
                ]}
                rows={vercelData.deployments}
              />
            </div>
          )}

          {!vercelToken && (
            <div className="bg-cyan-10 border border-cool-gray-20 rounded-lg p-8 text-center">
              <I d={ICONS.vercel} size={32} />
              <p className="text-sm text-cool-gray-60 mt-3">Enter your Vercel API token to monitor deployments</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Users ═══════════ */}
      {tab === "users" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cool-gray-100">All Users ({authUsers.length})</h3>
          </div>
          <Table
            columns={[
              { key: "name", label: "Name", render: (r) => <span className="font-semibold">{r.full_name || "—"}</span> },
              { key: "email", label: "Email", render: (r) => <span className="text-xs font-mono" dir="ltr">{r.email}</span> },
              { key: "role", label: "Role", render: (r) => <span className={`text-xs px-1.5 py-0.5 rounded ${r.role === "admin" ? "bg-ibm-blue/10 text-ibm-blue" : "bg-cool-gray-10 text-cool-gray-60"}`}>{r.role}</span> },
              { key: "is_owner", label: "Owner", render: (r) => r.is_owner ? <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">OWNER</span> : <span className="text-cool-gray-30">—</span> },
              { key: "is_active", label: "Status", render: (r) => <Status ok={r.is_active} label={r.is_active ? "Active" : "Inactive"} /> },
              { key: "hidden_from", label: "Hidden From", render: (r) => r.hidden_from?.length ? <span className="text-xs">{r.hidden_from.length} users</span> : <span className="text-cool-gray-30">—</span> },
              { key: "created_at", label: "Joined", render: (r) => <span className="text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString("fa-IR") : "—"}</span> },
            ]}
            rows={authUsers.filter((u) => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase()))}
          />
        </div>
      )}

      {/* ═══════════ Admins ═══════════ */}
      {tab === "admins" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cool-gray-100">Admins & Managers ({adminData.length})</h3>
          </div>
          <Table
            columns={[
              { key: "name", label: "Name", render: (r) => (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.5rem] font-bold text-white" style={{ backgroundColor: r.is_owner ? IBM.blueDark : IBM.blue }}>
                    {r.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="font-semibold">{r.full_name || "—"}</span>
                  {r.is_owner && <span className="text-[0.5rem] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">OWNER</span>}
                </div>
              )},
              { key: "email", label: "Email", render: (r) => <span className="text-xs font-mono" dir="ltr">{r.email}</span> },
              { key: "role", label: "Role", render: (r) => <span className="text-xs font-semibold">{r.role}</span> },
              { key: "permissions", label: "Permissions", render: (r) => <span className="text-xs">{r.permissions?.length || 0} permissions</span> },
              { key: "is_active", label: "Status", render: (r) => <Status ok={r.is_active} label={r.is_active ? "Active" : "Inactive"} /> },
              { key: "created_at", label: "Joined", render: (r) => <span className="text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString("fa-IR") : "—"}</span> },
            ]}
            rows={adminData}
          />
        </div>
      )}

      {/* ═══════════ SQL Query ═══════════ */}
      {tab === "query" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-cool-gray-20 rounded-lg p-4">
            <h3 className="text-xs font-bold text-cool-gray-60 uppercase tracking-wider mb-3">SQL Query</h3>
            <textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} rows={4}
              placeholder="SELECT * FROM forms LIMIT 10;"
              className="w-full border border-cool-gray-30 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-ibm-blue resize-y" dir="ltr" />
            <div className="flex gap-2 mt-2">
              <button onClick={runSqlQuery} disabled={sqlRunning || !sqlQuery.trim()}
                className="px-4 py-1.5 bg-ibm-blue text-white text-xs font-semibold rounded hover:bg-ibm-blue-hover disabled:opacity-50 transition-colors">
                {sqlRunning ? "Running..." : "Execute"}
              </button>
              <button onClick={() => { setSqlQuery(""); setSqlResult(null); setSqlError(null); }}
                className="px-4 py-1.5 border border-cool-gray-30 text-xs font-semibold rounded hover:bg-cool-gray-10 transition-colors">
                Clear
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["forms", "questions", "responses", "answers", "profiles", "user_roles"].map((t) => (
                <button key={t} onClick={() => setSqlQuery(`SELECT * FROM ${t} LIMIT 20;`)}
                  className="text-[0.6rem] px-2 py-0.5 rounded bg-cool-gray-10 text-cool-gray-60 hover:bg-cool-gray-20 transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </div>

          {sqlError && (
            <div className="bg-red-30 border border-red-60/20 rounded-lg p-3 text-xs text-red-60 font-mono">{sqlError}</div>
          )}

          {sqlResult && (
            <div>
              <h4 className="text-xs font-bold text-cool-gray-60 mb-2">{Array.isArray(sqlResult) ? `${sqlResult.length} rows` : "Result"}</h4>
              {Array.isArray(sqlResult) && sqlResult.length > 0 ? (
                <Table
                  columns={Object.keys(sqlResult[0]).map((k) => ({
                    key: k, label: k,
                    render: (r) => {
                      const v = r[k];
                      if (v === null) return <span className="text-cool-gray-30">null</span>;
                      if (typeof v === "object") return <span className="text-[0.6rem] font-mono max-w-[150px] truncate block">{JSON.stringify(v).slice(0, 40)}</span>;
                      return String(v).slice(0, 60);
                    },
                  }))}
                  rows={sqlResult}
                />
              ) : (
                <pre className="bg-cool-gray-10 rounded p-3 text-xs font-mono overflow-auto">{JSON.stringify(sqlResult, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Activity ═══════════ */}
      {tab === "activity" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cool-gray-100">Activity Log ({activityLog.length})</h3>
            <button onClick={loadActivity} className="text-[0.6rem] text-ibm-blue hover:underline">Refresh</button>
          </div>
          <Table
            columns={[
              { key: "form", label: "Form", render: (r) => <span className="font-semibold">{r.formTitle}</span> },
              { key: "status", label: "Status", render: (r) => <Status ok={r.is_complete} label={r.is_complete ? "Complete" : "Partial"} /> },
              { key: "device", label: "Device", render: (r) => <span className="text-xs">{r.device || "—"}</span> },
              { key: "browser", label: "Browser", render: (r) => <span className="text-xs">{r.browser || "—"}</span> },
              { key: "os", label: "OS", render: (r) => <span className="text-xs">{r.os || "—"}</span> },
              { key: "time", label: "Time", render: (r) => <span className="text-xs">{r.submitted_at ? new Date(r.submitted_at).toLocaleString("fa-IR") : "—"}</span> },
            ]}
            rows={activityLog}
          />
        </div>
      )}
    </div>
  );
}
