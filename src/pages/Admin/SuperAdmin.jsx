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
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";

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
  const isSuperAdmin = user?.email === "superadmin@gmail.com" || user?.email === "superadmin@gmailc.com";
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
    <div className="flex flex-col gap-5">
      <SEO title="Super Admin — God Mode" noIndex />

      {/* ─── Toast ─── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded-pill-md text-xs font-bold shadow-lg transition-all ${
          toast.type === "error" ? "bg-magenta text-white" : "bg-teal text-white"
        }`}>{toast.msg}</div>
      )}

      {/* ─── هدر ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-1 border-b-2 border-ink/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-pill-md flex items-center justify-center bg-magenta text-white">
            <Shield size={18} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-navy">سوپرادمین <span className="text-magenta-text">God Mode</span></h1>
            <p className="text-[0.6rem] font-semibold text-ink-subtle">دسترسی کامل · مدیریت · مانیتورینگ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[0.6rem] font-bold text-teal-text"><span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" /> آنلاین</span>
          <span className="text-[0.6rem] font-semibold text-ink-subtle">بروزرسانی خودکار: ۳۰ ثانیه</span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.6rem] font-extrabold bg-magenta">
            {profile?.full_name?.[0]?.toUpperCase() || "G"}
          </div>
        </div>
      </div>

      {/* ─── تب‌ها ─── */}
      <div className="flex gap-1 bg-white border-2 border-ink/10 rounded-pill-md p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold whitespace-nowrap rounded-pill-sm transition-all ${
              tab === t.id ? "bg-teal text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]" : "text-ink-subtle hover:text-ink hover:bg-bg-lavender"
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ─── جستجو + اکشن‌ها ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..."
          className="flex-1 min-w-[150px] max-w-xs bg-white border-2 border-ink/15 rounded-pill-md px-3 py-2 text-xs font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none" />
        {selectedTable && (
          <div className="flex gap-1.5">
            <Button variant="teal" size="sm" onClick={() => openCreate(selectedTable)}>+ ایجاد</Button>
            <Button variant="ghost" size="sm" onClick={() => exportTable(selectedTable)}>خروجی</Button>
            {selectedTable === "responses" && <Button variant="red" size="sm" onClick={() => purgeResponses()}>حذف همه</Button>}
          </div>
        )}
      </div>

      {/* ═══════════ Dashboard ═══════════ */}
      {tab === "dashboard" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
            {[
              { label: "فرم‌ها", value: stats.forms, color: "teal" },
              { label: "پاسخ‌ها", value: stats.responses, color: "navy" },
              { label: "کاربران", value: stats.users, color: "orange", sub: `${stats.activeUsers} فعال` },
              { label: "خطاها", value: stats.errors, color: stats.errors > 0 ? "magenta" : "teal" },
              { label: "لاگ‌ها", value: stats.activities, color: "navy" },
            ].map((s, i) => (
              <StickerCard key={i} theme={s.color}>
                <div className="p-3 text-center">
                  <div className="text-[0.65rem] font-bold text-ink-subtle mb-0.5">{s.label}</div>
                  <div className="text-lg font-extrabold text-navy">{faNum(s.value)}</div>
                  {s.sub && <div className="text-[0.55rem] font-semibold text-ink-subtle">{s.sub}</div>}
                </div>
              </StickerCard>
            ))}
          </div>

          {/* Quick table access */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {tables.map((t) => (
              <button key={t} onClick={() => { setTab("database"); browseTable(t); }}
                className="p-2.5 bg-white border-2 border-ink/10 rounded-pill-md text-center hover:border-teal transition-colors">
                <div className="text-[0.6rem] font-bold text-ink-subtle uppercase">{t}</div>
                <div className="text-sm font-extrabold text-navy">{typeof dbStats[t] === "number" ? faNum(dbStats[t]) : "—"}</div>
              </button>
            ))}
          </div>

          {/* Recent errors */}
          {errorLog.length > 0 && (
            <StickerCard theme="magenta">
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-extrabold text-magenta-text">خطاهای اخیر ({errorLog.length})</h3>
                  <button onClick={() => setTab("logs")} className="text-[0.6rem] font-bold text-teal-text hover:underline">مشاهده همه</button>
                </div>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                  {errorLog.slice(0, 5).map((e, i) => (
                    <div key={e.id || i} className="flex items-center gap-2 py-1.5 px-2 rounded-pill-sm hover:bg-female-light text-xs">
                      <span className="text-magenta-text font-mono text-[0.6rem]">{e.source}</span>
                      <span className="flex-1 truncate text-navy font-semibold">{e.message}</span>
                      <span className="text-ink-subtle text-[0.55rem] font-semibold">{e.created_at ? new Date(e.created_at).toLocaleTimeString("fa-IR") : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </StickerCard>
          )}
        </div>
      )}

      {/* ═══════════ Database ═══════════ */}
      {tab === "database" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {tables.map((t) => (
              <button key={t} onClick={() => browseTable(t)}
                className={`p-2.5 rounded-pill-md border-2 text-center transition-all ${
                  selectedTable === t ? "border-teal bg-teal/10" : "border-ink/10 bg-white hover:border-ink/20"
                }`}>
                <div className="text-[0.6rem] font-bold text-ink-subtle uppercase">{t}</div>
                <div className="text-sm font-extrabold text-navy">{typeof dbStats[t] === "number" ? faNum(dbStats[t]) : "—"}</div>
              </button>
            ))}
          </div>
          {selectedTable && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold text-navy">{selectedTable} <span className="text-ink-subtle font-semibold">({filteredData.length} ردیف)</span></h3>
                <button onClick={() => browseTable(selectedTable)} className="text-[0.6rem] font-bold text-teal-text hover:underline">بروزرسانی</button>
              </div>
              <div className="overflow-x-auto border-2 border-ink/10 rounded-pill-md bg-white">
                <table className="w-full text-xs">
                  <thead><tr className="bg-bg-lavender border-b-2 border-ink/10">
                    {tableCols.map((c) => <th key={c} className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase whitespace-nowrap">{c}</th>)}
                    <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase"></th>
                  </tr></thead>
                  <tbody>
                    {filteredData.map((r, i) => (
                      <tr key={r.id || i} onClick={() => openEdit(selectedTable, r)}
                        className={`border-b border-ink/5 last:border-0 transition-colors cursor-pointer hover:bg-bg-lavender/50 ${
                          i % 2 ? "bg-bg-lavender/30" : ""
                        }`}>
                        {tableCols.map((c) => {
                          const v = r[c];
                          return <td key={c} className="py-2 px-3 text-ink font-semibold">
                            {v === null || v === undefined ? <span className="text-ink/30">—</span> :
                             typeof v === "boolean" ? <span className={v ? "text-teal-text" : "text-magenta-text"}>{v ? "✓" : "✕"}</span> :
                             typeof v === "object" ? <span className="text-[0.55rem] font-mono max-w-[120px] truncate block">{JSON.stringify(v).slice(0, 40)}</span> :
                             String(v).slice(0, 60)}
                          </td>;
                        })}
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); openEdit(selectedTable, r); }} className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-pill-sm bg-bg-lavender hover:bg-teal/10 text-navy">ویرایش</button>
                            <button onClick={(e) => { e.stopPropagation(); deleteRecord(selectedTable, r.id); }} className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-pill-sm bg-magenta/10 text-magenta-text hover:bg-magenta/20">حذف</button>
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
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-extrabold text-navy">همه کاربران ({users.length})</h3>
          <div className="overflow-x-auto border-2 border-ink/10 rounded-pill-md bg-white">
            <table className="w-full text-xs">
              <thead><tr className="bg-bg-lavender border-b-2 border-ink/10">
                <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">نام</th>
                <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">ایمیل</th>
                <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">نقش</th>
                <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">مالک</th>
                <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">وضعیت</th>
                <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase">تاریخ</th>
                <th className="text-right py-2 px-3 text-[0.6rem] font-extrabold text-navy uppercase"></th>
              </tr></thead>
              <tbody>
                {users.filter((u) => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())).map((r, i) => (
                  <tr key={r.id} onClick={() => setDetailModal(r)} className={`border-b border-ink/5 last:border-0 transition-colors cursor-pointer hover:bg-bg-lavender/50 ${i % 2 ? "bg-bg-lavender/30" : ""}`}>
                    <td className="py-2 px-3 font-extrabold text-navy">{r.full_name || "—"}</td>
                    <td className="py-2 px-3 text-[0.65rem] font-mono text-ink" dir="ltr">{r.email}</td>
                    <td className="py-2 px-3"><Badge color={r.role === "admin" ? "navy" : "teal"}>{r.role || "—"}</Badge></td>
                    <td className="py-2 px-3">{r.is_owner ? <Badge color="orange">مالک</Badge> : "—"}</td>
                    <td className="py-2 px-3"><Badge color={r.is_active ? "green" : "gray"}>{r.is_active ? "فعال" : "غیرفعال"}</Badge></td>
                    <td className="py-2 px-3 text-[0.6rem] font-semibold text-ink-subtle">{r.created_at ? new Date(r.created_at).toLocaleDateString("fa-IR") : "—"}</td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setDetailModal(r); }} className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-pill-sm bg-bg-lavender hover:bg-teal/10 text-navy">جزئیات</button>
                        <button onClick={(e) => { e.stopPropagation(); setImpersonateModal(r); }} className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-pill-sm bg-teal/10 text-teal-text hover:bg-teal/20">ورود</button>
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
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-extrabold text-navy">ادمین‌ها و مدیران ({admins.length})</h3>
          {admins.map((a) => (
            <StickerCard key={a.id} theme={a.is_owner ? "orange" : "white"}>
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.6rem] font-extrabold text-white ${
                      a.is_owner ? "bg-orange" : "bg-navy"
                    }`}>
                      {a.full_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-navy">{a.full_name || "—"}</span>
                      {a.is_owner && <Badge color="orange" className="mr-1">مالک</Badge>}
                      <div className="text-[0.55rem] font-semibold text-ink-subtle" dir="ltr">{a.email}</div>
                    </div>
                  </div>
                  <Badge color={a.is_active ? "green" : "gray"}>{a.is_active ? "فعال" : "غیرفعال"}</Badge>
                </div>
                {!a.is_owner && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {["create_form", "edit_form", "delete_form", "publish_form", "view_responses", "view_analytics", "export_excel", "manage_managers", "manage_sms"].map((perm) => {
                      const has = a.permissions?.includes(perm);
                      return (
                        <button key={perm} onClick={() => toggleAdminPermission(a.id, perm, a.permissions || [])}
                          className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-pill-sm transition-colors ${
                            has ? "bg-teal/15 text-teal-text border border-teal/30" : "bg-bg-lavender text-ink-subtle border border-ink/10 hover:bg-bg-lavender/80"
                          }`}>
                          {perm.replace(/_/g, " ")}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </StickerCard>
          ))}
        </div>
      )}

      {/* ═══════════ Vercel ═══════════ */}
      {tab === "vercel" && (
        <div className="flex flex-col gap-4">
          <StickerCard theme="white">
            <div className="p-3.5">
              <div className="flex gap-2">
                <input type="password" value={vercelToken} onChange={(e) => setVercelToken(e.target.value)} placeholder="Vercel API Token (vxt_.)"
                  className="flex-1 bg-white border-2 border-ink/15 rounded-pill-md px-3 py-2 text-xs font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none" dir="ltr" />
                <Button variant="teal" size="sm" onClick={loadVercel} disabled={vercelLoading || !vercelToken}>
                  {vercelLoading ? "..." : "اتصال"}
                </Button>
              </div>
            </div>
          </StickerCard>
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
        <div className="flex flex-col gap-5">
          <div className="flex gap-2">
            <Button variant="teal" size="sm" onClick={() => { loadActivity(); loadErrors(); }}>بروزرسانی همه</Button>
            <Button variant="ghost" size="sm" onClick={async () => {
              try {
                await supabase.rpc("log_activity", { p_action: "test_log", p_target_type: "system", p_details: { test: true } });
                showToast("لاگ تست ایجاد شد");
                loadActivity();
              } catch (err) { showToast("Error: " + err.message, "error"); }
            }}>+ لاگ تست</Button>
          </div>

          {/* Activity */}
          <StickerCard theme="white">
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold text-navy">لاگ فعالیت ({activityLog.length})</h3>
                <button onClick={loadActivity} className="text-[0.6rem] font-bold text-teal-text hover:underline">بروزرسانی</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b-2 border-ink/10">
                    <th className="text-right py-2 px-2 text-[0.6rem] font-extrabold text-navy">عملیات</th>
                    <th className="text-right py-2 px-2 text-[0.6rem] font-extrabold text-navy">هدف</th>
                    <th className="text-right py-2 px-2 text-[0.6rem] font-extrabold text-navy">جزئیات</th>
                    <th className="text-right py-2 px-2 text-[0.6rem] font-extrabold text-navy">زمان</th>
                  </tr></thead>
                  <tbody>
                    {activityLog.map((r, i) => (
                      <tr key={r.id || i} className={`border-b border-ink/5 last:border-0 ${i % 2 ? "bg-bg-lavender/30" : ""}`}>
                        <td className="py-2 px-2"><span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-pill-sm bg-bg-lavender text-navy">{r.action}</span></td>
                        <td className="py-2 px-2 font-semibold text-ink">{r.target_type}/{r.target_id}</td>
                        <td className="py-2 px-2 text-[0.55rem] font-mono max-w-[200px] truncate text-ink-subtle">{r.details ? JSON.stringify(r.details).slice(0, 50) : "—"}</td>
                        <td className="py-2 px-2 text-[0.6rem] font-semibold text-ink-subtle">{r.created_at ? new Date(r.created_at).toLocaleString("fa-IR") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </StickerCard>

          {/* Errors */}
          <StickerCard theme="magenta">
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold text-magenta-text">لاگ خطاها ({errorLog.length})</h3>
                <button onClick={loadErrors} className="text-[0.6rem] font-bold text-teal-text hover:underline">بروزرسانی</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b-2 border-ink/10">
                    <th className="text-right py-2 px-2 text-[0.6rem] font-extrabold text-navy">منبع</th>
                    <th className="text-right py-2 px-2 text-[0.6rem] font-extrabold text-navy">پیام</th>
                    <th className="text-right py-2 px-2 text-[0.6rem] font-extrabold text-navy">آدرس</th>
                    <th className="text-right py-2 px-2 text-[0.6rem] font-extrabold text-navy">زمان</th>
                  </tr></thead>
                  <tbody>
                    {errorLog.map((r, i) => (
                      <tr key={r.id || i} className={`border-b border-ink/5 last:border-0 ${i % 2 ? "bg-female-light/30" : ""}`}>
                        <td className="py-2 px-2 text-[0.6rem] font-mono font-bold text-magenta-text">{r.source}</td>
                        <td className="py-2 px-2 font-semibold text-navy truncate max-w-[300px]">{r.message}</td>
                        <td className="py-2 px-2 text-[0.55rem] font-semibold text-ink-subtle truncate max-w-[150px]" dir="ltr">{r.url || "—"}</td>
                        <td className="py-2 px-2 text-[0.6rem] font-semibold text-ink-subtle">{r.created_at ? new Date(r.created_at).toLocaleString("fa-IR") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </StickerCard>
        </div>
      )}

      {/* ═══════════ SQL ═══════════ */}
      {tab === "query" && (
        <div className="flex flex-col gap-4">
          <StickerCard theme="white">
            <div className="p-3.5">
              <textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} rows={3} placeholder="SELECT * FROM forms LIMIT 10;"
                className="w-full bg-white border-2 border-ink/15 rounded-pill-md px-3 py-2 text-xs font-mono text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none resize-y" dir="ltr" />
              <div className="flex gap-2 mt-2">
                <Button variant="teal" size="sm" onClick={runSql} disabled={sqlRunning || !sqlQuery.trim()}>
                  {sqlRunning ? "در حال اجرا..." : "اجرا"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setSqlQuery(""); setSqlResult(null); setSqlError(null); }}>پاک کردن</Button>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {tables.map((t) => (
                  <button key={t} onClick={() => setSqlQuery(`SELECT * FROM ${t} LIMIT 20;`)}
                    className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-pill-sm bg-bg-lavender text-navy hover:bg-teal/10 transition-colors">{t}</button>
                ))}
              </div>
            </div>
          </StickerCard>
          {sqlError && <div className="bg-magenta/10 border-2 border-magenta/30 rounded-pill-md p-2 text-xs font-bold text-magenta-text font-mono">{sqlError}</div>}
          {sqlResult && Array.isArray(sqlResult) && sqlResult.length > 0 && (
            <div className="overflow-x-auto border-2 border-ink/10 rounded-pill-md bg-white">
              <table className="w-full text-xs">
                <thead><tr className="bg-bg-lavender border-b-2 border-ink/10">
                  {Object.keys(sqlResult[0]).map((k) => <th key={k} className="text-right py-2 px-2 text-[0.6rem] font-extrabold text-navy uppercase whitespace-nowrap">{k}</th>)}
                </tr></thead>
                <tbody>
                  {sqlResult.map((r, i) => (
                    <tr key={i} className={`border-b border-ink/5 last:border-0 ${i % 2 ? "bg-bg-lavender/30" : ""}`}>
                      {Object.keys(sqlResult[0]).map((k) => {
                        const v = r[k];
                        return <td key={k} className="py-2 px-2 text-ink font-semibold">
                          {v === null ? <span className="text-ink/30">—</span> :
                           typeof v === "object" ? <span className="text-[0.55rem] font-mono max-w-[120px] truncate block">{JSON.stringify(v).slice(0, 40)}</span> :
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
            <pre className="bg-bg-lavender border-2 border-ink/10 rounded-pill-md p-3 text-xs font-mono overflow-auto max-h-[400px] text-navy">{JSON.stringify(sqlResult, null, 2)}</pre>
          )}
        </div>
      )}

      {/* ═══════════ مودال ویرایش ═══════════ */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`${editModal?.isNew ? "ایجاد" : "ویرایش"} ${editModal?.table || ""}`}>
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          {Object.entries(editForm).map(([key, val]) => {
            if (key === "id" || key === "created_at") return null;
            return (
              <div key={key}>
                <label className="block text-[0.6rem] font-extrabold text-navy mb-1 uppercase">{key.replace(/_/g, " ")}</label>
                {typeof val === "boolean" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={val} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.checked })} className="w-4 h-4 accent-teal" />
                    <span className="text-xs font-semibold text-ink">{val ? "فعال" : "غیرفعال"}</span>
                  </label>
                ) : typeof val === "object" ? (
                  <textarea value={JSON.stringify(val, null, 2)} onChange={(e) => { try { setEditForm({ ...editForm, [key]: JSON.parse(e.target.value) }); } catch {} }}
                    rows={3} className="w-full bg-white border-2 border-ink/15 rounded-pill-md px-3 py-2 text-xs font-mono text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none resize-y" />
                ) : (
                  <input type="text" value={val ?? ""} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    className="w-full bg-white border-2 border-ink/15 rounded-pill-md px-3 py-2 text-xs font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none" />
                )}
              </div>
            );
          })}
          <div className="flex gap-2 justify-end pt-2 border-t border-ink/10">
            <Button variant="teal" size="sm" onClick={saveRecord}>ذخیره</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditModal(null)}>انصراف</Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════ مودال جزئیات کاربر + ویرایش دسترسی ═══════════ */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={`کاربر: ${detailModal?.full_name || detailModal?.email || ""}`}>
        {detailModal && (
          <div className="flex flex-col gap-3 text-sm max-h-[80vh] overflow-y-auto">
            {/* اطلاعات پایه */}
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-[0.6rem] font-bold text-ink-subtle">شناسه</span><div className="text-[0.6rem] font-mono break-all text-navy">{detailModal.id}</div></div>
              <div><span className="text-[0.6rem] font-bold text-ink-subtle">ایمیل</span><div className="text-xs font-semibold text-navy" dir="ltr">{detailModal.email}</div></div>
              <div><span className="text-[0.6rem] font-bold text-ink-subtle">نام</span><div className="text-xs font-bold text-navy">{detailModal.full_name || "—"}</div></div>
              <div><span className="text-[0.6rem] font-bold text-ink-subtle">نقش</span><div className="text-xs font-semibold text-navy">{detailModal.role || "—"}</div></div>
              <div><span className="text-[0.6rem] font-bold text-ink-subtle">مالک</span><div className="text-xs font-semibold text-navy">{detailModal.is_owner ? "بله" : "خیر"}</div></div>
              <div><span className="text-[0.6rem] font-bold text-ink-subtle">وضعیت</span><div className="text-xs font-semibold text-navy">{detailModal.is_active ? "فعال" : "غیرفعال"}</div></div>
              <div><span className="text-[0.6rem] font-bold text-ink-subtle">تاریخ عضویت</span><div className="text-xs font-semibold text-navy">{detailModal.created_at ? new Date(detailModal.created_at).toLocaleString("fa-IR") : "—"}</div></div>
              <div><span className="text-[0.6rem] font-bold text-ink-subtle">مخفی از</span><div className="text-xs font-semibold text-navy">{detailModal.hidden_from?.length || 0} کاربر</div></div>
            </div>

            {/* ─── ویرایش نقش ─── */}
            {!detailModal.is_owner && (
              <div className="border-2 border-ink/10 rounded-pill-md p-2.5">
                <span className="text-[0.6rem] font-extrabold text-navy uppercase">نقش</span>
                <div className="flex gap-1 mt-1.5">
                  {["manager", "admin"].map((r) => (
                    <button key={r}
                      onClick={async () => {
                        try {
                          const { error } = await supabase.from("user_roles").upsert({ user_id: detailModal.id, role_id: r, active: true }, { onConflict: "user_id" });
                          if (error) throw error;
                          showToast(`نقش به ${r} تغییر کرد`);
                          setDetailModal({ ...detailModal, role: r });
                          loadUsers();
                        } catch (err) { showToast("Error: " + err.message, "error"); }
                      }}
                      className={`text-[0.6rem] font-bold px-2 py-1 rounded-pill-sm transition-colors ${
                        detailModal.role === r ? "bg-teal text-white" : "bg-bg-lavender text-navy hover:bg-teal/10"
                      }`}>
                      {r === "admin" ? "ادمین" : "مدیر"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── تغییر وضعیت فعال/غیرفعال ─── */}
            {!detailModal.is_owner && (
              <div className="border-2 border-ink/10 rounded-pill-md p-2.5">
                <span className="text-[0.6rem] font-extrabold text-navy uppercase">وضعیت</span>
                <div className="flex gap-1 mt-1.5">
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await supabase.from("profiles").update({ is_active: !detailModal.is_active }).eq("id", detailModal.id);
                        if (error) throw error;
                        showToast(detailModal.is_active ? "غیرفعال شد" : "فعال شد");
                        setDetailModal({ ...detailModal, is_active: !detailModal.is_active });
                        loadUsers();
                      } catch (err) { showToast("Error: " + err.message, "error"); }
                    }}
                    className={`text-[0.6rem] font-bold px-2 py-1 rounded-pill-sm transition-colors ${
                      detailModal.is_active ? "bg-magenta text-white hover:bg-magenta-text" : "bg-teal text-white hover:bg-teal-text"
                    }`}>
                    {detailModal.is_active ? "غیرفعال کردن" : "فعال کردن"}
                  </button>
                </div>
              </div>
            )}

            {/* ─── ویرایش مجوزها ─── */}
            <div className="border-2 border-ink/10 rounded-pill-md p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.6rem] font-extrabold text-navy uppercase">مجوزها</span>
                <span className="text-[0.55rem] font-bold text-teal-text">{detailModal.permissions?.length || 0} فعال</span>
              </div>
              <div className="flex flex-wrap gap-1">
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
                          showToast(`مجوز ${perm} ${has ? "حذف" : "اضافه"} شد`);
                          setDetailModal({ ...detailModal, permissions: newPerms });
                        } catch (err) { showToast("Error: " + err.message, "error"); }
                      }}
                      className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-pill-sm transition-colors ${
                        has ? "bg-teal/15 text-teal-text border border-teal/30" : "bg-bg-lavender text-ink-subtle border border-ink/10 hover:bg-bg-lavender/80"
                      }`}>
                      {perm.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── نمایش/مخفی‌سازی از مدیران ─── */}
            <div className="border-2 border-ink/10 rounded-pill-md p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.6rem] font-extrabold text-navy uppercase">نمایش</span>
                <span className="text-[0.55rem] font-bold text-ink-subtle">مخفی از {detailModal.hidden_from?.length || 0} کاربر</span>
              </div>
              <p className="text-[0.55rem] font-semibold text-ink-subtle mb-1.5">ادمین‌هایی که این کاربر از آن‌ها مخفی است:</p>
              <div className="flex flex-wrap gap-1">
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
                      className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-pill-sm transition-colors ${
                        isHidden ? "bg-magenta/10 text-magenta-text border border-magenta/20" : "bg-bg-lavender text-navy border border-ink/10 hover:bg-teal/10"
                      }`}>
                      {a.full_name || a.email} {isHidden ? "(مخفی)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-ink/10">
              <Button variant="teal" size="sm" onClick={() => { setImpersonateModal(detailModal); setDetailModal(null); }}>
                ورود به عنوان این کاربر
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════ مودال Login As ═══════════ */}
      <Modal open={!!impersonateModal} onClose={() => setImpersonateModal(null)} title="ورود به عنوان کاربر">
        {impersonateModal && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-ink-subtle">شما به عنوان این کاربر وارد خواهید شد:</p>
            <div className="bg-bg-lavender rounded-pill-md p-3">
              <div className="text-sm font-extrabold text-navy">{impersonateModal.full_name || "—"}</div>
              <div className="text-xs font-semibold text-ink-subtle" dir="ltr">{impersonateModal.email}</div>
            </div>
            <p className="text-[0.6rem] font-bold text-magenta-text">⚠️ این عملیات در لاگ فعالیت ثبت می‌شود.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="teal" size="sm" onClick={() => doImpersonate(impersonateModal.id)}>تأیید ورود</Button>
              <Button variant="ghost" size="sm" onClick={() => setImpersonateModal(null)}>انصراف</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
