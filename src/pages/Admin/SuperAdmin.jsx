// ══════════════════════════════════════════════════════════════
// SuperAdmin — حالت خدایی: دسترسی کامل به تمامی بخش‌ها
// طراحی: IBM Carbon Design System
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { faNum } from "../../lib/utils";
import SEO from "../../components/ui/SEO";
import Modal from "../../components/ui/Modal";

// ─── توکن‌های IBM Carbon ───
const IBM = {
  blue: "#0f62fe", blueHover: "#0353e9", blueDark: "#002d9c",
  coolGray10: "#f4f4f4", coolGray20: "#e0e0e0", coolGray30: "#c6c6c6",
  coolGray50: "#8d8d8d", coolGray60: "#6f6f6f", coolGray80: "#393939",
  coolGray100: "#1616100", coolGray110: "#000000",
  red60: "#da1e28", red30: "#fff1f1", green50: "#24a148", green30: "#defbe6",
  yellow: "#f1c21b", yellow30: "#fdf6dd", cyan10: "#e5f6ff", cyan: "#0072c3",
  white: "#ffffff",
};

// ─── آیکون ساده ───
function I({ d, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

// ─── تب‌ها ───
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { id: "database", label: "Database", icon: "M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2z" },
  { id: "users", label: "Users", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { id: "admins", label: "Admins", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { id: "vercel", label: "Vercel", icon: "M12 2L2 22h20L12 2z" },
  { id: "logs", label: "Logs", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" },
  { id: "query", label: "SQL", icon: "M4 17l6-6-6-6M12 19h8" },
];

// ─── کارت آمار ───
function Stat({ label, value, sub, color = IBM.blue }) {
  return (
    <div className="bg-white border border-cool-gray-20 rounded-lg p-3 sm:p-4 flex flex-col gap-1">
      <span className="text-[0.6rem] font-semibold text-cool-gray-50 uppercase tracking-wider">{label}</span>
      <span className="text-xl sm:text-2xl font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-[0.55rem] text-cool-gray-50">{sub}</span>}
    </div>
  );
}

// ─── جدول ───
function Table({ columns, rows, onRowClick, empty = "No data" }) {
  if (!rows?.length) return <div className="text-sm text-cool-gray-50 py-10 text-center border border-cool-gray-20 rounded-lg bg-white">{empty}</div>;
  return (
    <div className="overflow-x-auto border border-cool-gray-20 rounded-lg bg-white">
      <table className="w-full text-sm">
        <thead><tr className="bg-cool-gray-10 border-b border-cool-gray-20">
          {columns.map((c) => <th key={c.key} className="text-right py-2 px-3 text-[0.6rem] font-semibold text-cool-gray-60 uppercase tracking-wider whitespace-nowrap">{c.label}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} onClick={() => onRowClick?.(r)}
              className={`border-b border-cool-gray-20 last:border-0 transition-colors ${onRowClick ? "cursor-pointer hover:bg-cyan-10" : "hover:bg-cool-gray-10"}`}>
              {columns.map((c) => <td key={c.key} className="py-2 px-3 text-cool-gray-80">{c.render ? c.render(r) : String(r[c.key] ?? "—")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── وضعیت ───
function Status({ ok, label }) {
  return <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ok ? IBM.green50 : IBM.red60 }} /><span className="text-[0.65rem]">{label}</span></div>;
}

// ══════════════════════════════════════════════════════════════
// God-Mode SuperAdmin
// ══════════════════════════════════════════════════════════════
export default function SuperAdmin() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const refreshRef = useRef(null);

  // ─── داده‌ها ───
  const [dbStats, setDbStats] = useState({});
  const [tables] = useState(["forms", "questions", "responses", "answers", "profiles", "user_roles", "user_permissions", "logic_rules", "activity_log", "error_log"]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableCols, setTableCols] = useState([]);
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [errorLog, setErrorLog] = useState([]);
  const [vercelToken, setVercelToken] = useState(() => localStorage.getItem("sa_vxt") || "");
  const [vercelData, setVercelData] = useState({ deployments: [], projects: [] });
  const [vercelLoading, setVercelLoading] = useState(false);

  // ─── مودال‌ها ───
  const [editModal, setEditModal] = useState(null); // { table, row, isNew }
  const [editForm, setEditForm] = useState({});
  const [detailModal, setDetailModal] = useState(null); // user detail
  const [impersonateModal, setImpersonateModal] = useState(null);
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlError, setSqlError] = useState(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [toast, setToast] = useState(null);

  // ─── بارگذاری ───
  useEffect(() => { loadAll(); return () => { if (refreshRef.current) clearInterval(refreshRef.current); }; }, []);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadDbStats(), loadUsers(), loadAdmins(), loadActivity(), loadErrors()]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
    // Auto-refresh every 30s
    refreshRef.current = setInterval(() => {
      loadDbStats(); loadActivity(); loadErrors();
    }, 30000);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Database Stats ───
  async function loadDbStats() {
    try {
      const { data } = await supabase.rpc("get_db_stats");
      setDbStats(data || {});
    } catch {
      // Fallback: count each table
      const stats = {};
      for (const t of tables) {
        try {
          const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
          stats[t] = count ?? 0;
        } catch { stats[t] = 0; }
      }
      setDbStats(stats);
    }
  }

  // ─── Table Browser ───
  async function browseTable(tableName) {
    setSelectedTable(tableName);
    try {
      const { data, error } = await supabase.from(tableName).select("*").limit(100);
      if (error) throw error;
      setTableData(data || []);
      setTableCols(data?.length ? Object.keys(data[0]) : []);
    } catch (err) {
      setTableData([]); setTableCols([]);
      showToast("Error loading table: " + err.message, "error");
    }
  }

  // ─── CRUD ───
  function openCreate(table) {
    setEditModal({ table, row: null, isNew: true });
    setEditForm(getDefaultForm(table));
  }

  function openEdit(table, row) {
    setEditModal({ table, row, isNew: false });
    setEditForm({ ...row });
  }

  function getDefaultForm(table) {
    const defaults = {
      forms: { title: "", slug: "", description: "", published: false, form_type: "step_by_step" },
      questions: { title: "", type: "short_text", description: "", required: true, options: [], position: 0 },
      responses: { form_id: "", is_complete: true, device: "", browser: "" },
      answers: { response_id: "", question_id: "", value: "" },
      profiles: { full_name: "", email: "", is_active: true },
      user_roles: { user_id: "", role_id: "manager", active: true },
      user_permissions: { user_id: "", permission_id: "create_form" },
      logic_rules: { name: "", enabled: true, priority: 0 },
    };
    return defaults[table] || {};
  }

  async function saveRecord() {
    if (!editModal) return;
    const { table, row, isNew } = editModal;
    try {
      if (isNew) {
        const { error } = await supabase.from(table).insert(editForm);
        if (error) throw error;
        showToast(`Record created in ${table}`);
      } else {
        const { error } = await supabase.from(table).update(editForm).eq("id", row.id);
        if (error) throw error;
        showToast(`Record updated in ${table}`);
      }
      setEditModal(null);
      if (selectedTable === table) browseTable(table);
      loadDbStats();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  }

  async function deleteRecord(table, id) {
    if (!confirm(`Delete record from ${table}?`)) return;
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      showToast("Record deleted");
      if (selectedTable === table) browseTable(table);
      loadDbStats();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  }

  // ─── Users ───
  async function loadUsers() {
    try {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role_id, active");
      const { data: perms } = await supabase.from("user_permissions").select("user_id, permission_id");
      const roleMap = {}; const permMap = {};
      (roles || []).forEach((r) => { roleMap[r.user_id] = { role: r.role_id, roleActive: r.active }; });
      (perms || []).forEach((p) => { if (!permMap[p.user_id]) permMap[p.user_id] = []; permMap[p.user_id].push(p.permission_id); });
      setUsers((profiles || []).map((p) => ({ ...p, ...(roleMap[p.id] || {}), permissions: permMap[p.id] || [] })));
    } catch (err) { console.error(err); }
  }

  // ─── Admins ───
  async function loadAdmins() {
    try {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role_id, active");
      const { data: perms } = await supabase.from("user_permissions").select("user_id, permission_id");
      const roleMap = {}; const permMap = {};
      (roles || []).forEach((r) => { roleMap[r.user_id] = { role: r.role_id, roleActive: r.active }; });
      (perms || []).forEach((p) => { if (!permMap[p.user_id]) permMap[p.user_id] = []; permMap[p.user_id].push(p.permission_id); });
      setAdmins((profiles || []).map((p) => ({ ...p, ...(roleMap[p.id] || {}), permissions: permMap[p.id] || [] })));
    } catch (err) { console.error(err); }
  }

  // ─── Activity Log ───
  async function loadActivity() {
    try {
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100);
      setActivityLog(data || []);
    } catch { setActivityLog([]); }
  }

  // ─── Error Log ───
  async function loadErrors() {
    try {
      const { data } = await supabase.from("error_log").select("*").order("created_at", { ascending: false }).limit(100);
      setErrorLog(data || []);
    } catch { setErrorLog([]); }
  }

  // ─── Vercel ───
  async function loadVercel() {
    if (!vercelToken) return;
    setVercelLoading(true);
    try {
      const [depRes, projRes] = await Promise.all([
        fetch("https://api.vercel.com/v6/deployments?limit=20&target=production", { headers: { Authorization: `Bearer ${vercelToken}` } }),
        fetch("https://api.vercel.com/v9/projects", { headers: { Authorization: `Bearer ${vercelToken}` } }),
      ]);
      if (depRes.ok) { const d = await depRes.json(); setVercelData((p) => ({ ...p, deployments: d.deployments || [] })); }
      if (projRes.ok) { const p = await projRes.json(); setVercelData((prev) => ({ ...prev, projects: p.projects || [] })); }
      localStorage.setItem("sa_vxt", vercelToken);
      showToast("Vercel connected");
    } catch (err) { showToast("Vercel error: " + err.message, "error"); }
    finally { setVercelLoading(false); }
  }

  // ─── SQL ───
  async function runSql() {
    if (!sqlQuery.trim()) return;
    setSqlRunning(true); setSqlError(null); setSqlResult(null);
    try {
      // Try RPC first
      const { data, error } = await supabase.rpc("exec_sql", { query: sqlQuery.trim() });
      if (error) throw error;
      setSqlResult(data);
    } catch (err) {
      // Fallback: parse table name
      const m = sqlQuery.match(/from\s+(\w+)/i);
      if (m) {
        const { data, error } = await supabase.from(m[1]).select("*").limit(100);
        if (error) setSqlError(error.message);
        else setSqlResult(data);
      } else setSqlError(err.message);
    } finally { setSqlRunning(false); }
  }

  // ─── Impersonate ───
  async function doImpersonate(targetUserId) {
    try {
      const { data, error } = await supabase.rpc("impersonate_user", { p_target_user_id: targetUserId });
      if (error) throw error;
      showToast(`Impersonating ${data.email}`);
      setImpersonateModal(null);
      // In a real app, you'd switch the auth session here
    } catch (err) {
      showToast("Impersonation failed: " + err.message, "error");
    }
  }

  // ─── Admin Permission Editor ───
  async function toggleAdminPermission(userId, permId, currentPerms) {
    const newPerms = currentPerms.includes(permId)
      ? currentPerms.filter((p) => p !== permId)
      : [...currentPerms, permId];
    try {
      const { error } = await supabase.rpc("set_user_permissions", {
        p_user_id: userId,
        p_permission_ids: newPerms,
      });
      if (error) throw error;
      showToast("Permissions updated");
      loadAdmins();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  }

  // ─── Purge ───
  async function purgeResponses(formId = null) {
    if (!confirm(formId ? "Delete all responses for this form?" : "DELETE ALL RESPONSES? This cannot be undone!")) return;
    try {
      const { data, error } = await supabase.rpc("purge_responses", { p_form_id: formId });
      if (error) throw error;
      showToast(`Purged ${data} records`);
      loadDbStats();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  }

  // ─── Export ───
  async function exportTable(tableName) {
    try {
      const { data, error } = await supabase.rpc("export_table_data", { p_table_name: tableName });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${tableName}_export.json`; a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${tableName}`);
    } catch (err) {
      showToast("Export error: " + err.message, "error");
    }
  }

  // ─── آمار ───
  const stats = useMemo(() => ({
    forms: dbStats.forms || 0, responses: dbStats.responses || 0,
    questions: dbStats.questions || 0, answers: dbStats.answers || 0,
    users: users.length, activeUsers: users.filter((u) => u.is_active).length,
    admins: admins.length, errors: errorLog.length,
    activities: activityLog.length,
  }), [dbStats, users, admins, errorLog, activityLog]);

  // ─── فیلتر ───
  const filteredData = useMemo(() => {
    if (!search || !tableData.length) return tableData;
    const q = search.toLowerCase();
    return tableData.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(q)));
  }, [tableData, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cool-gray-20 border-t-[#0f62fe] rounded-full animate-spin" />
          <span className="text-sm text-cool-gray-60">Loading god-mode...</span>
        </div>
      </div>
    );
  }

  // فقط اکانت superadmin (هر دو نسخه ایمیل) اجازه دسترسی دارد
  const isSuperAdmin = user?.email === "superadmin@gmail.com" || user?.email === "superadmin@gmailc.com";
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
        <div className="text-center p-8 rounded-lg border border-cool-gray-20 bg-white max-w-sm">
          <div className="text-3xl mb-3">🚫</div>
          <h2 className="text-lg font-bold text-cool-gray-80 mb-2">دسترسی غیرمجاز</h2>
          <p className="text-sm text-cool-gray-60">فقط اکانت superadmin اجازه دسترسی به این بخش را دارد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif" }}>
      <SEO title="Super Admin — God Mode" noIndex />

      {/* ─── Toast ─── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all ${
          toast.type === "error" ? "bg-red-60 text-white" : "bg-green-50 text-white"
        }`}>{toast.msg}</div>
      )}

      {/* ─── هدر ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b-2 border-cool-gray-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-60 text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-cool-gray-100">Super Admin <span className="text-red-60">God Mode</span></h1>
            <p className="text-[0.55rem] text-cool-gray-50">Full access · CRUD · Impersonate · Monitor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Status ok label="Online" />
          <span className="text-[0.55rem] text-cool-gray-50">Auto-refresh: 30s</span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.55rem] font-bold" style={{ backgroundColor: IBM.red60 }}>
            {profile?.full_name?.[0]?.toUpperCase() || "G"}
          </div>
        </div>
      </div>

      {/* ─── تب‌ها ─── */}
      <div className="flex gap-0 border-b-2 border-cool-gray-20 mb-3 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-2.5 py-2 text-[0.65rem] font-semibold whitespace-nowrap transition-all border-b-2 -mb-[2px] ${
              tab === t.id ? "border-ibm-blue text-ibm-blue" : "border-transparent text-cool-gray-60 hover:text-cool-gray-100 hover:bg-cool-gray-10"
            }`}>
            <I d={t.icon} size={12} />{t.label}
          </button>
        ))}
      </div>

      {/* ─── جستجو + اکشن‌ها ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
          className="flex-1 min-w-[150px] max-w-xs border border-cool-gray-30 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-ibm-blue" />
        {selectedTable && (
          <div className="flex gap-1">
            <button onClick={() => openCreate(selectedTable)} className="px-2.5 py-1.5 bg-ibm-blue text-white text-[0.6rem] font-semibold rounded hover:bg-ibm-blue-hover transition-colors">+ Create</button>
            <button onClick={() => exportTable(selectedTable)} className="px-2.5 py-1.5 border border-cool-gray-30 text-[0.6rem] font-semibold rounded hover:bg-cool-gray-10 transition-colors">Export</button>
            {selectedTable === "responses" && <button onClick={() => purgeResponses()} className="px-2.5 py-1.5 bg-red-60 text-white text-[0.6rem] font-semibold rounded hover:bg-red-70 transition-colors">Purge All</button>}
          </div>
        )}
      </div>

      {/* ═══════════ Dashboard ═══════════ */}
      {tab === "dashboard" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <Stat label="Forms" value={faNum(stats.forms)} color={IBM.blue} />
            <Stat label="Responses" value={faNum(stats.responses)} color={IBM.green50} />
            <Stat label="Users" value={faNum(stats.users)} sub={`${stats.activeUsers} active`} color={IBM.cyan} />
            <Stat label="Errors" value={faNum(stats.errors)} color={stats.errors > 0 ? IBM.red60 : IBM.green50} />
            <Stat label="Activities" value={faNum(stats.activities)} color={IBM.coolGray80} />
          </div>
          {/* Quick table access */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {tables.map((t) => (
              <button key={t} onClick={() => { setTab("database"); browseTable(t); }}
                className="p-2.5 bg-white border border-cool-gray-20 rounded-lg text-center hover:border-ibm-blue transition-colors">
                <div className="text-[0.55rem] text-cool-gray-50 uppercase">{t}</div>
                <div className="text-sm font-bold">{typeof dbStats[t] === "number" ? faNum(dbStats[t]) : "—"}</div>
              </button>
            ))}
          </div>
          {/* Recent errors */}
          {errorLog.length > 0 && (
            <div className="bg-white border border-cool-gray-20 rounded-lg">
              <div className="px-3 py-2 border-b border-cool-gray-20 flex items-center justify-between">
                <h3 className="text-xs font-bold text-red-60">Recent Errors ({errorLog.length})</h3>
                <button onClick={() => setTab("logs")} className="text-[0.55rem] text-ibm-blue hover:underline">View All</button>
              </div>
              <div className="p-2 flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                {errorLog.slice(0, 5).map((e, i) => (
                  <div key={e.id || i} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-red-30 text-xs">
                    <span className="text-red-60 font-mono text-[0.55rem]">{e.source}</span>
                    <span className="flex-1 truncate text-cool-gray-80">{e.message}</span>
                    <span className="text-cool-gray-50 text-[0.55rem]">{e.created_at ? new Date(e.created_at).toLocaleTimeString("fa-IR") : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Database ═══════════ */}
      {tab === "database" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {tables.map((t) => (
              <button key={t} onClick={() => browseTable(t)}
                className={`p-2.5 rounded-lg border text-center transition-all ${selectedTable === t ? "border-ibm-blue bg-cyan-10" : "border-cool-gray-20 bg-white hover:border-cool-gray-30"}`}>
                <div className="text-[0.55rem] text-cool-gray-50 uppercase tracking-wider">{t}</div>
                <div className="text-base font-bold">{typeof dbStats[t] === "number" ? faNum(dbStats[t]) : "—"}</div>
              </button>
            ))}
          </div>
          {selectedTable && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold">{selectedTable} <span className="text-cool-gray-50 font-normal">({filteredData.length} rows)</span></h3>
                <button onClick={() => browseTable(selectedTable)} className="text-[0.55rem] text-ibm-blue hover:underline">Refresh</button>
              </div>
              <Table
                columns={[
                  ...tableCols.map((c) => ({
                    key: c, label: c,
                    render: (r) => {
                      const v = r[c];
                      if (v === null || v === undefined) return <span className="text-cool-gray-30">null</span>;
                      if (typeof v === "boolean") return <span className={v ? "text-green-60" : "text-red-60"}>{v ? "✓" : "✕"}</span>;
                      if (typeof v === "object") return <span className="text-[0.55rem] font-mono max-w-[120px] truncate block">{JSON.stringify(v).slice(0, 40)}</span>;
                      return <span className="text-xs">{String(v).slice(0, 60)}</span>;
                    },
                  })),
                  { key: "_actions", label: "", render: (r) => (
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(selectedTable, r); }} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-cool-gray-10 hover:bg-cool-gray-20">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteRecord(selectedTable, r.id); }} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-red-60/10 text-red-60 hover:bg-red-60/20">Del</button>
                    </div>
                  )},
                ]}
                rows={filteredData}
                onRowClick={(r) => openEdit(selectedTable, r)}
              />
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Users ═══════════ */}
      {tab === "users" && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold">All Users ({users.length})</h3>
          <Table
            columns={[
              { key: "name", label: "Name", render: (r) => <span className="font-semibold">{r.full_name || "—"}</span> },
              { key: "email", label: "Email", render: (r) => <span className="text-[0.65rem] font-mono" dir="ltr">{r.email}</span> },
              { key: "role", label: "Role", render: (r) => <span className={`text-[0.6rem] px-1.5 py-0.5 rounded ${r.role === "admin" ? "bg-ibm-blue/10 text-ibm-blue" : "bg-cool-gray-10 text-cool-gray-60"}`}>{r.role || "—"}</span> },
              { key: "owner", label: "Owner", render: (r) => r.is_owner ? <span className="text-[0.55rem] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">OWNER</span> : "—" },
              { key: "active", label: "Active", render: (r) => <Status ok={r.is_active} label={r.is_active ? "Yes" : "No"} /> },
              { key: "joined", label: "Joined", render: (r) => <span className="text-[0.6rem]">{r.created_at ? new Date(r.created_at).toLocaleDateString("fa-IR") : "—"}</span> },
              { key: "actions", label: "", render: (r) => (
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setDetailModal(r); }} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-cool-gray-10 hover:bg-cool-gray-20">Detail</button>
                  <button onClick={(e) => { e.stopPropagation(); setImpersonateModal(r); }} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-ibm-blue/10 text-ibm-blue hover:bg-ibm-blue/20">Login As</button>
                </div>
              )},
            ]}
            rows={users.filter((u) => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase()))}
            onRowClick={(r) => setDetailModal(r)}
          />
        </div>
      )}

      {/* ═══════════ Admins ═══════════ */}
      {tab === "admins" && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold">Admins & Managers ({admins.length})</h3>
          {admins.map((a) => (
            <div key={a.id} className="bg-white border border-cool-gray-20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.55rem] font-bold text-white" style={{ backgroundColor: a.is_owner ? IBM.blueDark : IBM.blue }}>
                    {a.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <span className="text-xs font-bold">{a.full_name || "—"}</span>
                    {a.is_owner && <span className="text-[0.5rem] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold mr-1">OWNER</span>}
                    <div className="text-[0.55rem] text-cool-gray-50" dir="ltr">{a.email}</div>
                  </div>
                </div>
                <Status ok={a.is_active} label={a.is_active ? "Active" : "Inactive"} />
              </div>
              {!a.is_owner && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {["create_form", "edit_form", "delete_form", "publish_form", "view_responses", "view_analytics", "export_excel", "manage_managers", "manage_sms"].map((perm) => {
                    const has = a.permissions?.includes(perm);
                    return (
                      <button key={perm} onClick={() => toggleAdminPermission(a.id, perm, a.permissions || [])}
                        className={`text-[0.55rem] px-1.5 py-0.5 rounded transition-colors ${has ? "bg-green-50 text-green-60 border border-green-50/30" : "bg-cool-gray-10 text-cool-gray-50 border border-cool-gray-20 hover:bg-cool-gray-20"}`}>
                        {perm.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ Vercel ═══════════ */}
      {tab === "vercel" && (
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-cool-gray-20 rounded-lg p-3">
            <div className="flex gap-2">
              <input type="password" value={vercelToken} onChange={(e) => setVercelToken(e.target.value)} placeholder="Vercel API Token (vxt_...)"
                className="flex-1 border border-cool-gray-30 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-ibm-blue" dir="ltr" />
              <button onClick={loadVercel} disabled={vercelLoading || !vercelToken}
                className="px-3 py-1.5 bg-ibm-blue text-white text-[0.6rem] font-semibold rounded hover:bg-ibm-blue-hover disabled:opacity-50 transition-colors">
                {vercelLoading ? "..." : "Connect"}
              </button>
            </div>
          </div>
          {vercelData.projects.length > 0 && (
            <div className="bg-white border border-cool-gray-20 rounded-lg p-3">
              <h3 className="text-xs font-bold mb-2">Projects</h3>
              {vercelData.projects.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-cool-gray-20 last:border-0">
                  <span className="text-xs font-semibold flex-1">{p.name}</span>
                  <Status ok={p.latestDeployments?.[0]?.state === "READY"} label={p.latestDeployments?.[0]?.state || "—"} />
                </div>
              ))}
            </div>
          )}
          {vercelData.deployments.length > 0 && (
            <Table
              columns={[
                { key: "name", label: "Project", render: (r) => <span className="font-semibold text-xs">{r.name}</span> },
                { key: "state", label: "State", render: (r) => <Status ok={r.state === "READY"} label={r.state} /> },
                { key: "created", label: "Time", render: (r) => <span className="text-[0.6rem]">{new Date(r.created).toLocaleString("fa-IR")}</span> },
                { key: "url", label: "URL", render: (r) => <a href={`https://${r.url}`} target="_blank" rel="noreferrer" className="text-[0.6rem] text-ibm-blue hover:underline" dir="ltr">{r.url}</a> },
              ]}
              rows={vercelData.deployments}
            />
          )}
          {!vercelToken && <div className="bg-cyan-10 border rounded-lg p-6 text-center text-xs text-cool-gray-60">Enter Vercel API token to monitor deployments</div>}
        </div>
      )}

      {/* ═══════════ Logs ═══════════ */}
      {tab === "logs" && (
        <div className="flex flex-col gap-4">
          {/* Activity */}
          <div className="bg-white border border-cool-gray-20 rounded-lg">
            <div className="px-3 py-2 border-b border-cool-gray-20 flex items-center justify-between">
              <h3 className="text-xs font-bold">Activity Log ({activityLog.length})</h3>
              <button onClick={loadActivity} className="text-[0.55rem] text-ibm-blue hover:underline">Refresh</button>
            </div>
            <Table
              columns={[
                { key: "action", label: "Action", render: (r) => <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded bg-cool-gray-10">{r.action}</span> },
                { key: "target", label: "Target", render: (r) => <span className="text-xs">{r.target_type}/{r.target_id}</span> },
                { key: "details", label: "Details", render: (r) => <span className="text-[0.55rem] font-mono max-w-[200px] truncate block">{r.details ? JSON.stringify(r.details).slice(0, 50) : "—"}</span> },
                { key: "time", label: "Time", render: (r) => <span className="text-[0.6rem]">{r.created_at ? new Date(r.created_at).toLocaleString("fa-IR") : "—"}</span> },
              ]}
              rows={activityLog}
            />
          </div>
          {/* Errors */}
          <div className="bg-white border border-cool-gray-20 rounded-lg">
            <div className="px-3 py-2 border-b border-cool-gray-20 flex items-center justify-between">
              <h3 className="text-xs font-bold text-red-60">Error Log ({errorLog.length})</h3>
              <button onClick={loadErrors} className="text-[0.55rem] text-ibm-blue hover:underline">Refresh</button>
            </div>
            <Table
              columns={[
                { key: "source", label: "Source", render: (r) => <span className="text-[0.6rem] font-mono">{r.source}</span> },
                { key: "message", label: "Message", render: (r) => <span className="text-xs truncate block max-w-[300px]">{r.message}</span> },
                { key: "url", label: "URL", render: (r) => <span className="text-[0.55rem] text-cool-gray-50 truncate block max-w-[150px]" dir="ltr">{r.url || "—"}</span> },
                { key: "time", label: "Time", render: (r) => <span className="text-[0.6rem]">{r.created_at ? new Date(r.created_at).toLocaleString("fa-IR") : "—"}</span> },
              ]}
              rows={errorLog}
            />
          </div>
        </div>
      )}

      {/* ═══════════ SQL ═══════════ */}
      {tab === "query" && (
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-cool-gray-20 rounded-lg p-3">
            <textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} rows={3} placeholder="SELECT * FROM forms LIMIT 10;"
              className="w-full border border-cool-gray-30 rounded px-2.5 py-2 text-xs font-mono focus:outline-none focus:border-ibm-blue resize-y" dir="ltr" />
            <div className="flex gap-2 mt-2">
              <button onClick={runSql} disabled={sqlRunning || !sqlQuery.trim()}
                className="px-3 py-1.5 bg-ibm-blue text-white text-[0.6rem] font-semibold rounded hover:bg-ibm-blue-hover disabled:opacity-50 transition-colors">
                {sqlRunning ? "Running..." : "Execute"}
              </button>
              <button onClick={() => { setSqlQuery(""); setSqlResult(null); setSqlError(null); }}
                className="px-3 py-1.5 border border-cool-gray-30 text-[0.6rem] font-semibold rounded hover:bg-cool-gray-10 transition-colors">Clear</button>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {tables.map((t) => (
                <button key={t} onClick={() => setSqlQuery(`SELECT * FROM ${t} LIMIT 20;`)}
                  className="text-[0.55rem] px-1.5 py-0.5 rounded bg-cool-gray-10 text-cool-gray-60 hover:bg-cool-gray-20 transition-colors">{t}</button>
              ))}
            </div>
          </div>
          {sqlError && <div className="bg-red-30 border border-red-60/20 rounded-lg p-2 text-xs text-red-60 font-mono">{sqlError}</div>}
          {sqlResult && Array.isArray(sqlResult) && sqlResult.length > 0 && (
            <Table
              columns={Object.keys(sqlResult[0]).map((k) => ({
                key: k, label: k,
                render: (r) => {
                  const v = r[k];
                  if (v === null) return <span className="text-cool-gray-30">null</span>;
                  if (typeof v === "object") return <span className="text-[0.55rem] font-mono max-w-[120px] truncate block">{JSON.stringify(v).slice(0, 40)}</span>;
                  return String(v).slice(0, 60);
                },
              }))}
              rows={sqlResult}
            />
          )}
          {sqlResult && !Array.isArray(sqlResult) && (
            <pre className="bg-cool-gray-10 rounded p-3 text-xs font-mono overflow-auto max-h-[400px]">{JSON.stringify(sqlResult, null, 2)}</pre>
          )}
        </div>
      )}

      {/* ═══════════ مودال ویرایش ═══════════ */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`${editModal?.isNew ? "Create" : "Edit"} ${editModal?.table || ""}`}>
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          {Object.entries(editForm).map(([key, val]) => {
            if (key === "id" || key === "created_at") return null;
            return (
              <div key={key}>
                <label className="block text-[0.6rem] font-bold text-cool-gray-60 mb-1 uppercase">{key.replace(/_/g, " ")}</label>
                {typeof val === "boolean" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={val} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.checked })} className="w-4 h-4 accent-[#0f62fe]" />
                    <span className="text-xs">{val ? "True" : "False"}</span>
                  </label>
                ) : typeof val === "object" ? (
                  <textarea value={JSON.stringify(val, null, 2)} onChange={(e) => { try { setEditForm({ ...editForm, [key]: JSON.parse(e.target.value) }); } catch {} }}
                    rows={3} className="w-full border border-cool-gray-30 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-ibm-blue resize-y" />
                ) : (
                  <input type="text" value={val ?? ""} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    className="w-full border border-cool-gray-30 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-ibm-blue" />
                )}
              </div>
            );
          })}
          <div className="flex gap-2 justify-end pt-2 border-t border-cool-gray-20">
            <button onClick={saveRecord} className="px-4 py-1.5 bg-ibm-blue text-white text-xs font-semibold rounded hover:bg-ibm-blue-hover transition-colors">Save</button>
            <button onClick={() => setEditModal(null)} className="px-4 py-1.5 border border-cool-gray-30 text-xs font-semibold rounded hover:bg-cool-gray-10 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* ═══════════ مودال جزئیات کاربر ═══════════ */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={`User: ${detailModal?.full_name || detailModal?.email || ""}`}>
        {detailModal && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-[0.6rem] text-cool-gray-50">ID</span><div className="text-xs font-mono break-all">{detailModal.id}</div></div>
              <div><span className="text-[0.6rem] text-cool-gray-50">Email</span><div className="text-xs" dir="ltr">{detailModal.email}</div></div>
              <div><span className="text-[0.6rem] text-cool-gray-50">Name</span><div className="text-xs">{detailModal.full_name || "—"}</div></div>
              <div><span className="text-[0.6rem] text-cool-gray-50">Role</span><div className="text-xs">{detailModal.role || "—"}</div></div>
              <div><span className="text-[0.6rem] text-cool-gray-50">Owner</span><div className="text-xs">{detailModal.is_owner ? "Yes" : "No"}</div></div>
              <div><span className="text-[0.6rem] text-cool-gray-50">Active</span><div className="text-xs">{detailModal.is_active ? "Yes" : "No"}</div></div>
              <div><span className="text-[0.6rem] text-cool-gray-50">Joined</span><div className="text-xs">{detailModal.created_at ? new Date(detailModal.created_at).toLocaleString("fa-IR") : "—"}</div></div>
              <div><span className="text-[0.6rem] text-cool-gray-50">Hidden From</span><div className="text-xs">{detailModal.hidden_from?.length || 0} users</div></div>
            </div>
            {detailModal.permissions?.length > 0 && (
              <div>
                <span className="text-[0.6rem] text-cool-gray-50">Permissions</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {detailModal.permissions.map((p) => <span key={p} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-green-50 text-green-60">{p}</span>)}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-cool-gray-20">
              <button onClick={() => { setImpersonateModal(detailModal); setDetailModal(null); }}
                className="px-3 py-1.5 bg-ibm-blue text-white text-[0.6rem] font-semibold rounded hover:bg-ibm-blue-hover transition-colors">Login As This User</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════ مودال Login As ═══════════ */}
      <Modal open={!!impersonateModal} onClose={() => setImpersonateModal(null)} title="Login As User">
        {impersonateModal && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-cool-gray-60">You will be logged in as:</p>
            <div className="bg-cool-gray-10 rounded-lg p-3">
              <div className="text-sm font-bold">{impersonateModal.full_name || "—"}</div>
              <div className="text-xs text-cool-gray-50" dir="ltr">{impersonateModal.email}</div>
            </div>
            <p className="text-[0.6rem] text-red-60">⚠️ This action is logged in the activity log.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => doImpersonate(impersonateModal.id)}
                className="px-4 py-1.5 bg-ibm-blue text-white text-xs font-semibold rounded hover:bg-ibm-blue-hover transition-colors">Confirm Login As</button>
              <button onClick={() => setImpersonateModal(null)}
                className="px-4 py-1.5 border border-cool-gray-30 text-xs font-semibold rounded hover:bg-cool-gray-10 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
