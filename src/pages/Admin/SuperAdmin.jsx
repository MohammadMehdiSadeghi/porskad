// ══════════════════════════════════════════════════════════════
// SuperAdmin — حالت خدایی: دسترسی کامل به تمامی بخش‌ها
// طراحی: بر اساس دیزاین سیستم پرسکاد
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { faNum } from "../../lib/utils";
import SEO from "../../components/ui/SEO";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import StickerCard from "../../components/ui/StickerCard";
import Badge from "../../components/ui/Badge";
import "./superadmin-ibm.css";

// ─── تب‌ها ───
import { LayoutDashboard, Database, Users, Shield, Cloud, FileText, Code } from "lucide-react";

const TABS = [
  { id: "dashboard", label: "داشبورد", icon: LayoutDashboard },
  { id: "database", label: "دیتابیس", icon: Database },
  { id: "users", label: "کاربران", icon: Users },
  { id: "admins", label: "ادمین‌ها", icon: Shield },
  { id: "vercel", label: "Vercel", icon: Cloud },
  { id: "logs", label: "لاگ‌ها", icon: FileText },
  { id: "query", label: "SQL", icon: Code },
];

// ══════════════════════════════════════════════════════════════
// God-Mode SuperAdmin
// ══════════════════════════════════════════════════════════════
export default function SuperAdmin() {
  const { user, profile, isOwner } = useAuth();
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
      // ابتدا سعی کن مستقیم بخونی
      const { data, error } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) {
        // اگه RLS جلوگیری کرد، از RPC استفاده کن
        const { data: rpcData } = await supabase.rpc("export_table_data", { p_table_name: "activity_log" });
        setActivityLog(Array.isArray(rpcData) ? rpcData.slice(0, 100) : []);
      } else {
        setActivityLog(data || []);
      }
    } catch { setActivityLog([]); }
  }

  // ─── Error Log ───
  async function loadErrors() {
    try {
      const { data, error } = await supabase.from("error_log").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) {
        const { data: rpcData } = await supabase.rpc("export_table_data", { p_table_name: "error_log" });
        setErrorLog(Array.isArray(rpcData) ? rpcData.slice(0, 100) : []);
      } else {
        setErrorLog(data || []);
      }
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
    return <Spinner label="بارگذاری سوپرادمین..." />;
  }

  // فقط اکانت superadmin (هر دو نسخه ایمیل) اجازه دسترسی دارد
  const isSuperAdmin = isOwner();
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 rounded-xl border-2 border-ink/10 bg-white max-w-sm">
          <div className="text-4xl mb-3">🚫</div>
          <h2 className="text-lg font-extrabold text-navy mb-2">دسترسی غیرمجاز</h2>
          <p className="text-sm font-semibold text-ink-subtle">فقط اکانت superadmin اجازه دسترسی به این بخش را دارد.</p>
        </div>
      </div>
    );
  }

    return (
    <div className="sa-root">
      <SEO title="Super Admin — God Mode" noIndex />

      {toast && (
        <div className={`sa-toast ${toast.type === 'error' ? 'error' : 'success'}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="sa-header">
        <div className="sa-header-left">
          <div className="sa-logo"><Shield size={18} /></div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Super Admin</h1>
            <p style={{ fontSize: '0.8rem', color: '#525252', margin: 0 }}>System administration · God Mode</p>
          </div>
        </div>
        <div className="sa-header-right">
          <span className="sa-badge-online">Online</span>
          <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>Auto-refresh: 30s</span>
          <div className="sa-avatar">{profile?.full_name?.[0]?.toUpperCase() || "G"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sa-tabs">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`sa-tab ${tab === t.id ? 'active' : ''}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Search + Actions */}
      <div className="sa-search">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
        {selectedTable && (
          <div className="sa-actions">
            <button className="sa-btn sa-btn-primary" onClick={() => openCreate(selectedTable)}>+ Create</button>
            <button className="sa-btn sa-btn-secondary" onClick={() => exportTable(selectedTable)}>Export</button>
            {selectedTable === "responses" && <button className="sa-btn sa-btn-danger" onClick={() => purgeResponses()}>Purge All</button>}
          </div>
        )}
      </div>

      {/* ═══════════ Dashboard ═══════════ */}
      {tab === "dashboard" && (
        <div>
          <div className="sa-stats">
            {[
              { label: "Forms", value: stats.forms },
              { label: "Responses", value: stats.responses },
              { label: "Users", value: stats.users, sub: `${stats.activeUsers} active` },
              { label: "Errors", value: stats.errors },
              { label: "Logs", value: stats.activities },
            ].map((s, i) => (
              <div key={i} className="sa-stat">
                <div className="sa-stat-label">{s.label}</div>
                <div className="sa-stat-value">{faNum(s.value)}</div>
                {s.sub && <div className="sa-stat-sub">{s.sub}</div>}
              </div>
            ))}
          </div>

          <div className="sa-section-title">Quick Access</div>
          <div className="sa-tiles">
            {tables.map((t) => (
              <button key={t} onClick={() => { setTab("database"); browseTable(t); }} className="sa-tile">
                <div className="sa-tile-name">{t}</div>
                <div className="sa-tile-count">{typeof dbStats[t] === "number" ? faNum(dbStats[t]) : "—"}</div>
              </button>
            ))}
          </div>

          {errorLog.length > 0 && (
            <div className="sa-card">
              <div className="sa-card-header">
                <span className="sa-section-title">Recent Errors ({errorLog.length})</span>
                <button className="sa-btn sa-btn-ghost" onClick={() => setTab("logs")}>View all</button>
              </div>
              <div className="sa-card-body" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {errorLog.slice(0, 5).map((e, i) => (
                  <div key={e.id || i} className="sa-error-item">
                    <span style={{ color: '#da1e28', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem' }}>{e.source}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.message}</span>
                    <span style={{ color: '#6f6f6f', fontSize: '0.7rem' }}>{e.created_at ? new Date(e.created_at).toLocaleTimeString() : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Database ═══════════ */}
      {tab === "database" && (
        <div>
          <div className="sa-tiles">
            {tables.map((t) => (
              <button key={t} onClick={() => browseTable(t)} className="sa-tile" style={{ background: selectedTable === t ? '#d0e2ff' : undefined }}>
                <div className="sa-tile-name">{t}</div>
                <div className="sa-tile-count">{typeof dbStats[t] === "number" ? faNum(dbStats[t]) : "—"}</div>
              </button>
            ))}
          </div>
          {selectedTable && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="sa-section-title" style={{ margin: 0 }}>{selectedTable} <span style={{ color: '#6f6f6f', fontWeight: 400 }}>({filteredData.length} rows)</span></span>
                <button className="sa-btn sa-btn-ghost" onClick={() => browseTable(selectedTable)}>Refresh</button>
              </div>
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead><tr>
                    {tableCols.map((c) => <th key={c}>{c}</th>)}
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {filteredData.map((r, i) => (
                      <tr key={r.id || i} onClick={() => openEdit(selectedTable, r)} style={{ cursor: 'pointer' }}>
                        {tableCols.map((c) => {
                          const v = r[c];
                          return <td key={c}>
                            {v === null || v === undefined ? <span style={{ color: '#c6c6c6' }}>—</span> :
                             typeof v === "boolean" ? <span style={{ color: v ? '#24a148' : '#da1e28' }}>{v ? '✓' : '✕'}</span> :
                             typeof v === "object" ? <span style={{ fontSize: '0.7rem', fontFamily: "'IBM Plex Mono', monospace", maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{JSON.stringify(v).slice(0, 40)}</span> :
                             String(v).slice(0, 60)}
                          </td>;
                        })}
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(selectedTable, r); }}>Edit</button>
                            <button className="sa-btn sa-btn-ghost sa-btn-sm" style={{ color: '#da1e28' }} onClick={(e) => { e.stopPropagation(); deleteRecord(selectedTable, r.id); }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Users ═══════════ */}
      {tab === "users" && (
        <div>
          <div className="sa-section-title">All Users ({users.length})</div>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead><tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Owner</th><th>Status</th><th>Joined</th><th></th>
              </tr></thead>
              <tbody>
                {users.filter((u) => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())).map((r) => (
                  <tr key={r.id} onClick={() => setDetailModal(r)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 700 }}>{r.full_name || '—'}</td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }} dir="ltr">{r.email}</td>
                    <td><span className={`sa-tag ${r.role === 'admin' ? 'sa-tag-blue' : 'sa-tag-green'}`}>{r.role || '—'}</span></td>
                    <td>{r.is_owner ? <span className="sa-tag sa-tag-orange">Owner</span> : '—'}</td>
                    <td><span className={`sa-tag ${r.is_active ? 'sa-tag-green' : 'sa-tag-gray'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={(e) => { e.stopPropagation(); setDetailModal(r); }}>Details</button>
                        <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={(e) => { e.stopPropagation(); setImpersonateModal(r); }}>Login as</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ Admins ═══════════ */}
      {tab === "admins" && (
        <div>
          <div className="sa-section-title">Admins & Managers ({admins.length})</div>
          {admins.map((a) => (
            <div key={a.id} className="sa-admin-card">
              <div className="sa-admin-header">
                <div className="sa-admin-left">
                  <div className={`sa-admin-avatar ${a.is_owner ? 'owner' : 'normal'}`}>{a.full_name?.[0]?.toUpperCase() || 'U'}</div>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.full_name || '—'}</span>
                    {a.is_owner && <span className="sa-tag sa-tag-orange" style={{ marginRight: '0.5rem' }}>Owner</span>}
                    <div className="sa-admin-email" dir="ltr">{a.email}</div>
                  </div>
                </div>
                <span className={`sa-tag ${a.is_active ? 'sa-tag-green' : 'sa-tag-gray'}`}>{a.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {!a.is_owner && (
                <div className="sa-perms">
                  {["create_form", "edit_form", "delete_form", "publish_form", "view_responses", "view_analytics", "export_excel", "manage_managers", "manage_sms"].map((perm) => {
                    const has = a.permissions?.includes(perm);
                    return (
                      <button key={perm} onClick={() => toggleAdminPermission(a.id, perm, a.permissions || [])} className={`sa-perm ${has ? 'active' : 'inactive'}`}>
                        {perm.replace(/_/g, ' ')}
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
        <div className="flex flex-col gap-4">
          <div className="sa-card">
            <div className="sa-card-body">
              <div className="flex gap-2">
                <input type="password" value={vercelToken} onChange={(e) => setVercelToken(e.target.value)} placeholder="Vercel API Token"
                  className="flex-1 bg-white border-2 border-ink/15 rounded-pill-md px-3 py-2 text-xs font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none" dir="ltr" />
                <button className="sa-btn sa-btn-primary" onClick={loadVercel} disabled={vercelLoading || !vercelToken}>
                  {vercelLoading ? "..." : "Connect"}
                </button>
              </div>
            </div>
          </div>
          {vercelData.projects.length > 0 && (
            <StickerCard theme="navy">
              <div className="p-3.5">
                <h3 className="text-xs font-extrabold text-navy mb-2">پروژه‌ها</h3>
                {vercelData.projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-ink/10 last:border-0">
                    <span className="text-xs font-bold text-white flex-1">{p.name}</span>
                    <Badge color={p.latestDeployments?.[0]?.state === "READY" ? "green" : "gray"}>{p.latestDeployments?.[0]?.state || "—"}</Badge>
                  </div>
                ))}
              </div>
            </StickerCard>
          )}
          {vercelData.deployments.length > 0 && (
            <div className="overflow-x-auto border-2 border-ink/10 rounded-pill-md bg-white">
              <table className="w-full text-xs">
                <thead><tr className="bg-bg-lavender border-b-2 border-ink/10">
                  <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">پروژه</th>
                  <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">وضعیت</th>
                  <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">زمان</th>
                  <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">آدرس</th>
                </tr></thead>
                <tbody>
                  {vercelData.deployments.map((r, i) => (
                    <tr key={r.id || i} className={`border-b border-ink/5 last:border-0 ${i % 2 ? "bg-bg-lavender/30" : ""}`}>
                      <td className="py-2 px-3 font-bold text-navy">{r.name}</td>
                      <td className="py-2 px-3"><Badge color={r.state === "READY" ? "green" : "gray"}>{r.state}</Badge></td>
                      <td className="py-2 px-3 text-[0.6rem] font-semibold text-ink-subtle">{new Date(r.created).toLocaleString("fa-IR")}</td>
                      <td className="py-2 px-3"><a href={`https://${r.url}`} target="_blank" rel="noreferrer" className="text-[0.6rem] font-bold text-teal-text hover:underline" dir="ltr">{r.url}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!vercelToken && <div className="bg-bg-lavender border-2 border-ink/10 rounded-pill-md p-6 text-center text-xs font-semibold text-ink-subtle">توکن Vercel API را وارد کنید تا دیپلوی‌ها مانیتور شوند</div>}
        </div>
      )}

      {/* ═══════════ Logs ═══════════ */}
      {tab === "logs" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="flex gap-2">
            <button className="sa-btn sa-btn-primary" onClick={() => { loadActivity(); loadErrors(); }}>Refresh All</button>
            <button className="sa-btn sa-btn-ghost" onClick={async () => {
              try {
                await supabase.rpc("log_activity", { p_action: "test_log", p_target_type: "system", p_details: { test: true } });
                showToast("لاگ تست ایجاد شد");
                loadActivity();
              } catch (err) { showToast("Error: " + err.message, "error"); }
            }}>+ Test Log</button>
          </div>

          {/* Activity */}
          <div className="sa-card">
            <div className="sa-card-header">
              <span className="sa-section-title" style={{ margin: 0 }}>Activity Log ({activityLog.length})</span>
              <button className="sa-btn sa-btn-ghost" onClick={loadActivity}>Refresh</button>
            </div>
            <div className="sa-card-body">
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead><tr><th>Action</th><th>Target</th><th>Details</th><th>Time</th></tr></thead>
                  <tbody>
                    {activityLog.map((r, i) => (
                      <tr key={r.id || i}>
                        <td><span className="sa-tag sa-tag-blue">{r.action}</span></td>
                        <td>{r.target_type}/{r.target_id}</td>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.details ? JSON.stringify(r.details).slice(0, 50) : '—'}</td>
                        <td style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className="sa-card" style={{ borderColor: '#a2191f' }}>
            <div className="sa-card-header">
              <span className="sa-section-title" style={{ margin: 0, color: '#da1e28' }}>Error Log ({errorLog.length})</span>
              <button className="sa-btn sa-btn-ghost" onClick={loadErrors}>Refresh</button>
            </div>
            <div className="sa-card-body">
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead><tr><th>Source</th><th>Message</th><th>URL</th><th>Time</th></tr></thead>
                  <tbody>
                    {errorLog.map((r, i) => (
                      <tr key={r.id || i}>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 600, color: '#da1e28' }}>{r.source}</td>
                        <td style={{ fontWeight: 600 }}>{r.message}</td>
                        <td style={{ fontSize: '0.75rem', color: '#6f6f6f', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">{r.url || '—'}</td>
                        <td style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ SQL ═══════════ */}
      {tab === "query" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="sa-card">
            <div className="sa-card-body sa-sql">
              <textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} rows={3} placeholder="SELECT * FROM forms LIMIT 10;" dir="ltr" />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="sa-btn sa-btn-primary" onClick={runSql} disabled={sqlRunning || !sqlQuery.trim()}>{sqlRunning ? 'Running...' : 'Run'}</button>
                <button className="sa-btn sa-btn-secondary" onClick={() => { setSqlQuery(''); setSqlResult(null); setSqlError(null); }}>Clear</button>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {tables.map((t) => (
                  <button key={t} onClick={() => setSqlQuery(`SELECT * FROM ${t} LIMIT 20;`)} className="sa-perm inactive">{t}</button>
                ))}
              </div>
            </div>
          </div>
          {sqlError && <div style={{ background: '#fff1f1', border: '1px solid #a2191f', padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: '#a2191f', fontFamily: "'IBM Plex Mono', monospace" }}>{sqlError}</div>}
          {sqlResult && Array.isArray(sqlResult) && sqlResult.length > 0 && (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead><tr>
                  {Object.keys(sqlResult[0]).map((k) => <th key={k}>{k}</th>)}
                </tr></thead>
                <tbody>
                  {sqlResult.map((r, i) => (
                    <tr key={i}>
                      {Object.keys(sqlResult[0]).map((k) => {
                        const v = r[k];
                        return <td key={k}>
                          {v === null ? <span style={{ color: '#c6c6c6' }}>—</span> :
                           typeof v === "object" ? <span style={{ fontSize: '0.7rem', fontFamily: "'IBM Plex Mono', monospace", maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{JSON.stringify(v).slice(0, 40)}</span> :
                           String(v).slice(0, 60)}
                        </td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sqlResult && !Array.isArray(sqlResult) && (
            <pre style={{ background: '#f4f4f4', border: '1px solid #e0e0e0', padding: '0.75rem', fontSize: '0.8rem', fontFamily: "'IBM Plex Mono', monospace", overflow: 'auto', maxHeight: 400, color: '#161616' }}>{JSON.stringify(sqlResult, null, 2)}</pre>
          )}
        </div>
      )}

      {/* ═══════════ مودال ویرایش ═══════════ */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`${editModal?.isNew ? 'Create' : 'Edit'} ${editModal?.table || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {Object.entries(editForm).map(([key, val]) => {
            if (key === 'id' || key === 'created_at') return null;
            const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #c6c6c6', fontSize: '0.8rem', fontFamily: "'IBM Plex Sans', sans-serif", outline: 'none' };
            return (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#525252', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</label>
                {typeof val === 'boolean' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={val} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.checked })} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: '0.8rem' }}>{val ? 'Active' : 'Inactive'}</span>
                  </label>
                ) : typeof val === 'object' ? (
                  <textarea value={JSON.stringify(val, null, 2)} onChange={(e) => { try { setEditForm({ ...editForm, [key]: JSON.parse(e.target.value) }); } catch {} }} rows={3} style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", resize: 'vertical' }} />
                ) : (
                  <input type="text" value={val ?? ''} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} style={inputStyle} />
                )}
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #e0e0e0' }}>
            <button className="sa-btn sa-btn-primary" onClick={saveRecord}>Save</button>
            <button className="sa-btn sa-btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* ═══════════ مودال جزئیات کاربر + ویرایش دسترسی ═══════════ */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={`User: ${detailModal?.full_name || detailModal?.email || ''}`}>
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '80vh', overflowY: 'auto', fontSize: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[['ID', detailModal.id], ['Email', detailModal.email], ['Name', detailModal.full_name || '—'], ['Role', detailModal.role || '—'], ['Owner', detailModal.is_owner ? 'Yes' : 'No'], ['Status', detailModal.is_active ? 'Active' : 'Inactive'], ['Joined', detailModal.created_at ? new Date(detailModal.created_at).toLocaleString() : '—'], ['Hidden from', `${detailModal.hidden_from?.length || 0} users`]].map(([label, value]) => (
                <div key={label}><span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6f6f6f' }}>{label}</span><div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{value}</div></div>
              ))}
            </div>

            {/* ─── ویرایش نقش ─── */}
            {!detailModal.is_owner && (
              <div style={{ border: '1px solid #e0e0e0', padding: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#525252', textTransform: 'uppercase' }}>Role</span>
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                  {["manager", "admin"].map((r) => (
                    <button key={r}
                      onClick={async () => {
                        try {
                          const { error } = await supabase.from("user_roles").upsert({ user_id: detailModal.id, role_id: r, active: true }, { onConflict: "user_id" });
                          if (error) throw error;
                          showToast(`Role changed to ${r}`);
                          setDetailModal({ ...detailModal, role: r });
                          loadUsers();
                        } catch (err) { showToast("Error: " + err.message, "error"); }
                      }}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid', borderColor: detailModal.role === r ? '#0f62fe' : '#c6c6c6', background: detailModal.role === r ? '#0f62fe' : '#f4f4f4', color: detailModal.role === r ? '#fff' : '#161616', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                      {r === "admin" ? "Admin" : "Manager"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!detailModal.is_owner && (
              <div style={{ border: '1px solid #e0e0e0', padding: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#525252', textTransform: 'uppercase' }}>Status</span>
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await supabase.from("profiles").update({ is_active: !detailModal.is_active }).eq("id", detailModal.id);
                        if (error) throw error;
                        showToast(detailModal.is_active ? 'Deactivated' : 'Activated');
                        setDetailModal({ ...detailModal, is_active: !detailModal.is_active });
                        loadUsers();
                      } catch (err) { showToast("Error: " + err.message, "error"); }
                    }}
                    className={`sa-btn ${detailModal.is_active ? 'sa-btn-danger' : 'sa-btn-primary'}`}>
                    {detailModal.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ border: '1px solid #e0e0e0', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#525252', textTransform: 'uppercase' }}>Permissions</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0f62fe' }}>{detailModal.permissions?.length || 0} active</span>
              </div>
              <div className="sa-perms">
                {["create_form", "edit_form", "delete_form", "publish_form", "view_responses", "view_analytics", "export_excel", "manage_managers", "manage_sms", "view_admins"].map((perm) => {
                  const has = detailModal.permissions?.includes(perm);
                  return (
                    <button key={perm}
                      onClick={async () => {
                        const newPerms = has
                          ? (detailModal.permissions || []).filter((p) => p !== perm)
                          : [...(detailModal.permissions || []), perm];
                        try {
                          const { error } = await supabase.rpc("set_user_permissions", {
                            p_user_id: detailModal.id,
                            p_permission_ids: newPerms,
                          });
                          if (error) throw error;
                          showToast(`Permission ${perm} ${has ? 'removed' : 'added'}`);
                          setDetailModal({ ...detailModal, permissions: newPerms });
                        } catch (err) { showToast("Error: " + err.message, "error"); }
                      }}
                      className={`sa-perm ${has ? 'active' : 'inactive'}`}>
                      {perm.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ border: '1px solid #e0e0e0', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#525252', textTransform: 'uppercase' }}>Visibility</span>
                <span style={{ fontSize: '0.7rem', color: '#6f6f6f' }}>Hidden from {detailModal.hidden_from?.length || 0} users</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: '#6f6f6f', marginBottom: '0.5rem' }}>Admins this user is hidden from:</p>
              <div className="sa-perms">
                {admins.filter((a) => !a.is_owner && a.id !== detailModal.id).map((a) => {
                  const isHidden = detailModal.hidden_from?.includes(a.id);
                  return (
                    <button key={a.id}
                      onClick={async () => {
                        const newHF = isHidden
                          ? (detailModal.hidden_from || []).filter((id) => id !== a.id)
                          : [...(detailModal.hidden_from || []), a.id];
                        const val = newHF.length > 0 ? newHF : null;
                        try {
                          const { error } = await supabase.from("profiles").update({ hidden_from: val }).eq("id", detailModal.id);
                          if (error) throw error;
                          showToast(`Visibility updated for ${a.full_name || a.email}`);
                          setDetailModal({ ...detailModal, hidden_from: val });
                        } catch (err) { showToast("Error: " + err.message, "error"); }
                      }}
                      className={`sa-perm ${isHidden ? 'active' : 'inactive'}`}>
                      {a.full_name || a.email} {isHidden ? '(hidden)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #e0e0e0' }}>
              <button className="sa-btn sa-btn-primary" onClick={() => { setImpersonateModal(detailModal); setDetailModal(null); }}>
                Login as this user
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════ مودال Login As ═══════════ */}
      <Modal open={!!impersonateModal} onClose={() => setImpersonateModal(null)} title="Login as User">
        {impersonateModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#6f6f6f' }}>You will be logged in as:</p>
            <div style={{ background: '#f4f4f4', padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{impersonateModal.full_name || '—'}</div>
              <div style={{ fontSize: '0.8rem', color: '#6f6f6f' }} dir="ltr">{impersonateModal.email}</div>
            </div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#da1e28' }}>⚠ This action will be logged.</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="sa-btn sa-btn-primary" onClick={() => doImpersonate(impersonateModal.id)}>Confirm</button>
              <button className="sa-btn sa-btn-secondary" onClick={() => setImpersonateModal(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
