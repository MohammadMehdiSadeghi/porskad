// ══════════════════════════════════════════════════════════════
// SuperAdmin — God Mode: Full system access (100% English)
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth, isPrimaryGodEmail, PRIMARY_GOD_EMAILS } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import SEO from "../../components/ui/SEO";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import { TableSkeleton } from "../../components/ui/Skeleton";
import StickerCard from "../../components/ui/StickerCard";
import Badge from "../../components/ui/Badge";
import "./superadmin-ibm.css";

// ─── Icons ───
import {
  LayoutDashboard,
  Database,
  Users,
  Shield,
  Cloud,
  FileText,
  Code,
  Eye,
  EyeOff,
  HardDrive,
  FolderTree,
  RefreshCw,
  Copy,
  Check,
  Search,
  Download,
  ListOrdered,
  Settings,
  RotateCcw,
  Save,
  AlertTriangle,
  Crown,
  Key,
  Mail,
  Dices,
  Zap,
  Ban,
  X,
  Lock,
  Globe,
  Activity,
  Smartphone,
  Monitor,
  Tablet,
  Radio,
  MapPin,
  ExternalLink,
  History,
  UserPlus,
  LogIn,
  LogOut,
  Edit3,
  Power,
  Layers,
} from "lucide-react";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_ORDER,
  QUESTION_CATEGORIES,
  getQuestionTypesConfig,
  saveQuestionTypesConfig,
  resetQuestionTypesConfig,
  loadQuestionTypesConfigFromDb,
  getEffectiveQuestionType,
} from "../../lib/questionTypes";
import { QUESTION_TYPE_ICONS } from "../../lib/questionIcons";


const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "question_types", label: "Form Questions", icon: ListOrdered },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "database", label: "Database", icon: Database },
  { id: "users", label: "Users", icon: Users },
  { id: "admins", label: "Admins", icon: Shield },
  { id: "auth_logs", label: "Auth & Activity Logs", icon: Activity },
  { id: "vercel", label: "Vercel", icon: Cloud },
  { id: "logs", label: "System Logs", icon: FileText },
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

  const isCallerGod = Boolean(isOwner() || profile?.is_owner || isPrimaryGodEmail(user?.email));

  // ─── State ───
  const [dbStats, setDbStats] = useState({});
  const [tables] = useState([
    "forms",
    "questions",
    "responses",
    "answers",
    "profiles",
    "user_roles",
    "user_permissions",
    "logic_rules",
    "system_settings",
    "support_tickets",
    "auth_logs",
    "activity_log",
    "error_log",
  ]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableCols, setTableCols] = useState([]);
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [errorLog, setErrorLog] = useState([]);
  const [vercelToken, setVercelToken] = useState(() => localStorage.getItem("sa_vxt") || "");
  const [showVercelToken, setShowVercelToken] = useState(false);
  const [vercelData, setVercelData] = useState({ deployments: [], projects: [] });
  const [vercelLoading, setVercelLoading] = useState(false);
  const [storageData, setStorageData] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // ─── Auth Logs & Activity State ───
  const [authLogs, setAuthLogs] = useState([]);
  const [authLogsLoading, setAuthLogsLoading] = useState(false);
  const [authLogsSearch, setAuthLogsSearch] = useState("");
  const [authLogsFilter, setAuthLogsFilter] = useState("all");
  const [authLogsTimeframe, setAuthLogsTimeframe] = useState("all");
  const [authLogsViewMode, setAuthLogsViewMode] = useState("stream");
  const [userLogsTab, setUserLogsTab] = useState("all");

  // ─── System Settings State ───
  const [sysSettings, setSysSettings] = useState({
    site_title: "Porskad",
    telegram_support_id: "porskad_support",
    default_max_active_forms: 5,
    default_max_monthly_responses: 100,
    registration_enabled: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ─── Question Types Management State ───
  const [qConfig, setQConfig] = useState(() => getQuestionTypesConfig());
  const [qSearch, setQSearch] = useState("");
  const [qCategoryFilter, setQCategoryFilter] = useState("all");
  const [qEditModal, setQEditModal] = useState(null);
  const [qEditForm, setQEditForm] = useState({ label: "", hint: "", category: "choice", enabled: true, hidden: false });
  const [qSaving, setQSaving] = useState(false);

  // ─── Modals ───
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [detailModal, setDetailModal] = useState(null);
  const [impersonateModal, setImpersonateModal] = useState(null);
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlError, setSqlError] = useState(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [toast, setToast] = useState(null);

  // ─── Dedicated User Activity & Auth Logs Modal State ───
  const [userLogsModal, setUserLogsModal] = useState(false);
  const [selectedUserForLogs, setSelectedUserForLogs] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  const [userLogsLoading, setUserLogsLoading] = useState(false);
  const [userLogsSearch, setUserLogsSearch] = useState("");

  // ─── User Detail Password, Email, Quota & Activity States ───
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [detailMaxForms, setDetailMaxForms] = useState(5);
  const [detailMaxResponses, setDetailMaxResponses] = useState(100);
  const [detailResponsesUsed, setDetailResponsesUsed] = useState(0);
  const [detailQuotaSaving, setDetailQuotaSaving] = useState(false);
  const [detailActivityHistory, setDetailActivityHistory] = useState([]);
  const [detailActivityLoading, setDetailActivityLoading] = useState(false);

  useEffect(() => {
    if (detailModal) {
      setNewEmail(detailModal.email || "");
      setNewPassword("");
      setPasswordVisible(false);
      setDetailMaxForms(detailModal.max_forms ?? 5);
      setDetailMaxResponses(detailModal.max_responses_per_month ?? 100);
      setDetailResponsesUsed(detailModal.monthly_responses_used ?? 0);

      setDetailActivityLoading(true);
      supabase
        .from("auth_logs")
        .select("*")
        .or(`user_id.eq.${detailModal.id},email.eq.${detailModal.email}`)
        .order("created_at", { ascending: false })
        .limit(60)
        .then(({ data }) => {
          setDetailActivityHistory(data || []);
        })
        .catch(() => setDetailActivityHistory([]))
        .finally(() => setDetailActivityLoading(false));
    } else {
      setDetailActivityHistory([]);
    }
  }, [detailModal?.id]);

  // ─── Init ───
  useEffect(() => {
    loadAll();
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([
        loadDbStats(),
        loadSystemSettings(),
        loadUsers(),
        loadAdmins(),
        loadAuthLogs(),
        loadActivity(),
        loadErrors(),
        loadStorageStats(),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
    // Auto-refresh every 30s
    refreshRef.current = setInterval(() => {
      loadDbStats();
      loadAuthLogs();
      loadActivity();
      loadErrors();
      loadStorageStats();
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
      const stats = {};
      for (const t of tables) {
        try {
          const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
          stats[t] = count ?? 0;
        } catch {
          stats[t] = 0;
        }
      }
      setDbStats(stats);
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // ─── Storage Stats ───
  async function loadStorageStats() {
    setStorageLoading(true);
    let projectData = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/system-storage", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.database?.db_size_bytes > 0) {
          setStorageData(data);
          setStorageLoading(false);
          return;
        }
        if (data?.project) {
          projectData = data.project;
        }
      }
    } catch {}

    try {
      const { data: dbStatsData, error: dbErr } = await supabase.rpc("get_database_storage_stats");
      if (!dbErr && dbStatsData && dbStatsData.total_db_bytes !== undefined) {
        const tablesList = (dbStatsData.tables || []).map((t) => ({
          table_name: t.name || t.table_name,
          row_count: t.rows ?? t.row_count ?? 0,
          bytes: t.bytes ?? 0,
          pretty: t.pretty || formatBytes(t.bytes ?? 0),
        }));

        setStorageData({
          database: {
            db_size_bytes: dbStatsData.total_db_bytes,
            db_size_pretty: dbStatsData.total_db_pretty || formatBytes(dbStatsData.total_db_bytes),
            tables: tablesList,
            estimated: false,
          },
          project: projectData || {
            source_bytes: 4200000,
            source_pretty: "4.2 MB",
            source_files: 142,
            full_bytes: 285000000,
            full_pretty: "285 MB",
            full_files: 28400,
            breakdown: [
              { name: "Frontend Source (src/)", pretty: "2.1 MB", files: 78 },
              { name: "Static Assets (public/)", pretty: "1.4 MB", files: 12 },
              { name: "Supabase Migrations", pretty: "280 KB", files: 52 },
              { name: "Serverless API Routes (api/)", pretty: "120 KB", files: 8 },
              { name: "Build Output (dist/)", pretty: "2.8 MB", files: 14 },
              { name: "Dependencies (node_modules/)", pretty: "280 MB", files: 28200 },
            ],
          },
        });
        setStorageLoading(false);
        return;
      }
    } catch {}

    let totalApproxBytes = 0;
    const fallbackTables = [];
    for (const t of tables) {
      const count = dbStats[t] || 0;
      const approxBytes = count * 640 + 8192;
      totalApproxBytes += approxBytes;
      fallbackTables.push({
        table_name: t,
        row_count: count,
        bytes: approxBytes,
        pretty: formatBytes(approxBytes),
      });
    }

    setStorageData({
      database: {
        db_size_bytes: totalApproxBytes,
        db_size_pretty: formatBytes(totalApproxBytes),
        tables: fallbackTables,
        estimated: true,
      },
      project: projectData || {
        source_bytes: 4200000,
        source_pretty: "4.2 MB",
        source_files: 142,
        full_bytes: 285000000,
        full_pretty: "285 MB",
        full_files: 28400,
        breakdown: [
          { name: "Frontend Source (src/)", pretty: "2.1 MB", files: 78 },
          { name: "Static Assets (public/)", pretty: "1.4 MB", files: 12 },
          { name: "Supabase Migrations", pretty: "280 KB", files: 52 },
          { name: "Serverless API Routes (api/)", pretty: "120 KB", files: 8 },
          { name: "Build Output (dist/)", pretty: "2.8 MB", files: 14 },
          { name: "Dependencies (node_modules/)", pretty: "280 MB", files: 28200 },
        ],
      },
    });
    setStorageLoading(false);
  }

  // ─── System Settings ───
  async function loadSystemSettings() {
    setSettingsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_system_settings");
      if (!error && data) {
        setSysSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Failed to load system settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveSystemSettings(e) {
    if (e) e.preventDefault();
    setSettingsSaving(true);
    try {
      const { data, error } = await supabase.rpc("update_system_settings", {
        p_settings: sysSettings,
      });
      if (error) throw error;
      if (data) setSysSettings(data);
      showToast("System settings saved successfully");
    } catch (err) {
      showToast("Error saving settings: " + err.message, "error");
    } finally {
      setSettingsSaving(false);
    }
  }

  // ─── Question Types Management Handlers ───
  async function handleToggleQField(typeKey, field) {
    const current = getEffectiveQuestionType(typeKey, qConfig);
    const updated = {
      ...qConfig,
      [typeKey]: {
        ...(qConfig[typeKey] || {}),
        [field]: !current[field],
      },
    };
    setQConfig(updated);
    await saveQuestionTypesConfig(updated);
    showToast(`Question type '${typeKey}' updated (${field}: ${!current[field]})`);
  }

  function handleOpenQEdit(typeKey) {
    const current = getEffectiveQuestionType(typeKey, qConfig);
    setQEditModal(typeKey);
    setQEditForm({
      label: current.label || "",
      hint: current.hint || "",
      category: current.category || "choice",
      enabled: current.enabled !== false,
      hidden: current.hidden === true,
    });
  }

  async function handleSaveQEdit() {
    if (!qEditModal) return;
    setQSaving(true);
    try {
      const updated = {
        ...qConfig,
        [qEditModal]: {
          ...(qConfig[qEditModal] || {}),
          label: qEditForm.label.trim(),
          hint: qEditForm.hint.trim(),
          category: qEditForm.category,
          enabled: qEditForm.enabled,
          hidden: qEditForm.hidden,
        },
      };
      setQConfig(updated);
      await saveQuestionTypesConfig(updated);
      setQEditModal(null);
      showToast(`Question type '${qEditModal}' saved successfully`);
    } catch (err) {
      showToast("Failed to save question config: " + err.message, "error");
    } finally {
      setQSaving(false);
    }
  }

  async function handleDeleteQType(typeKey) {
    const isAlreadyDisabled = qConfig[typeKey]?.enabled === false;
    const confirmMsg = isAlreadyDisabled
      ? `Re-enable question type '${typeKey}'?`
      : `Disable / delete question type '${typeKey}' from form builders?`;
    if (!confirm(confirmMsg)) return;

    const updated = {
      ...qConfig,
      [typeKey]: {
        ...(qConfig[typeKey] || {}),
        enabled: isAlreadyDisabled,
        hidden: !isAlreadyDisabled,
      },
    };
    setQConfig(updated);
    await saveQuestionTypesConfig(updated);
    showToast(isAlreadyDisabled ? `Question type '${typeKey}' re-enabled` : `Question type '${typeKey}' disabled & hidden`);
  }

  async function handleResetAllQ() {
    if (!confirm("Are you sure you want to reset ALL 20 question types to factory defaults?")) return;
    await resetQuestionTypesConfig();
    setQConfig({});
    showToast("All question types reset to factory defaults");
  }

  async function handleResetUserQuota(targetUserId, targetUserName) {
    if (
      !confirm(
        `Reset monthly response quota for ${
          targetUserName || targetUserId
        }? Consumed tokens will reset to 0 and cycle will reset to 30 days.`
      )
    )
      return;
    try {
      const { error } = await supabase.rpc("reset_user_monthly_quota", {
        p_user_id: targetUserId,
      });
      if (error) throw error;
      showToast("User quota reset successfully");
      await loadUsers();
    } catch (err) {
      showToast("Failed to reset quota: " + err.message, "error");
    }
  }

  async function handleSaveDetailQuota() {
    if (!detailModal) return;
    setDetailQuotaSaving(true);
    try {
      const maxF = Math.max(1, Number(detailMaxForms) || 1);
      const maxR = Math.max(1, Number(detailMaxResponses) || 1);
      const usedR = Math.max(0, Number(detailResponsesUsed) || 0);

      const { error } = await supabase
        .from("profiles")
        .update({
          max_forms: maxF,
          max_responses_per_month: maxR,
          monthly_responses_used: usedR,
        })
        .eq("id", detailModal.id);

      if (error) throw error;

      showToast(`User quotas updated: ${maxF} forms, ${maxR} responses/month`);
      setDetailModal((prev) =>
        prev
          ? {
              ...prev,
              max_forms: maxF,
              max_responses_per_month: maxR,
              monthly_responses_used: usedR,
            }
          : null
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === detailModal.id
            ? {
                ...u,
                max_forms: maxF,
                max_responses_per_month: maxR,
                monthly_responses_used: usedR,
              }
            : u
        )
      );
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === detailModal.id
            ? {
                ...a,
                max_forms: maxF,
                max_responses_per_month: maxR,
                monthly_responses_used: usedR,
              }
            : a
        )
      );
    } catch (err) {
      showToast("Error updating user quota: " + err.message, "error");
    } finally {
      setDetailQuotaSaving(false);
    }
  }

  // ─── Users (Non-admins only) ───
  async function loadUsers() {
    try {
      const { data: allProfiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, is_active, is_owner, created_at, hidden_from, max_forms, max_responses_per_month, monthly_responses_used, quota_reset_at, can_use_telegram")
        .order("created_at", { ascending: false });
      if (profErr) throw profErr;

      const { data: roles } = await supabase.from("user_roles").select("user_id, role_id");
      const roleMap = {};
      roles?.forEach((r) => {
        roleMap[r.user_id] = r.role_id;
      });

      let nonAdmins = (allProfiles || []).filter((p) => {
        if (p.is_owner) return false;
        const r = roleMap[p.id];
        if (r === "admin" || r === "superadmin") return false;
        return true;
      });

      if (!isCallerGod) {
        nonAdmins = nonAdmins.filter((u) => !isPrimaryGodEmail(u.email));
      }

      setUsers(nonAdmins.map((p) => ({ ...p, role: roleMap[p.id] || "manager" })));
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Admins ───
  async function loadAdmins() {
    try {
      const { data: allProfiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, is_active, is_owner, created_at, hidden_from")
        .order("created_at", { ascending: false });
      if (profErr) throw profErr;

      const { data: roles } = await supabase.from("user_roles").select("user_id, role_id");
      const roleMap = {};
      roles?.forEach((r) => {
        roleMap[r.user_id] = r.role_id;
      });

      const { data: perms } = await supabase.from("user_permissions").select("user_id, permission_id");
      const permMap = {};
      perms?.forEach((p) => {
        if (!permMap[p.user_id]) permMap[p.user_id] = [];
        permMap[p.user_id].push(p.permission_id);
      });

      let adminProfiles = (allProfiles || []).filter((p) => {
        if (p.is_owner) return true;
        const r = roleMap[p.id];
        return r === "admin" || r === "superadmin";
      });

      if (!isCallerGod) {
        adminProfiles = adminProfiles.filter((a) => !isPrimaryGodEmail(a.email));
      }

      setAdmins(
        adminProfiles.map((p) => ({
          ...p,
          role: p.is_owner ? "owner" : roleMap[p.id] || "admin",
          permissions: permMap[p.id] || [],
        }))
      );
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Auth & IP Logs ───
  async function loadAuthLogs() {
    setAuthLogsLoading(true);
    try {
      let data = null;

      // ۱. تلاش برای دریافت از طریق RPC بهینه‌شده get_all_auth_logs
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_all_auth_logs", { p_limit: 350 });
        if (!rpcErr && rpcData && Array.isArray(rpcData)) {
          data = rpcData;
        }
      } catch {}

      // ۲. فالبک به کوئری مستقیم جدول auth_logs
      if (!data || data.length === 0) {
        const { data: tableData, error: tableErr } = await supabase
          .from("auth_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300);
        if (!tableErr && tableData) {
          data = tableData;
        }
      }

      // ۳. فالبک استخراج لاگ‌های احراز هویت از activity_log در صورت نیاز
      if (!data || data.length === 0) {
        const { data: actLogs } = await supabase
          .from("activity_log")
          .select("*")
          .eq("target_type", "auth")
          .order("created_at", { ascending: false })
          .limit(100);
        if (actLogs && actLogs.length > 0) {
          data = actLogs.map((a) => ({
            id: String(a.id),
            user_id: a.user_id,
            email: a.details?.email,
            ip_address: a.ip_address || a.details?.ip,
            action: a.action,
            device: a.details?.device || "Desktop",
            browser: a.details?.browser || "Browser",
            os: a.details?.os || "OS",
            created_at: a.created_at,
            details: a.details,
          }));
        }
      }

      let finalLogs = data || [];
      if (!isCallerGod) {
        finalLogs = finalLogs.filter((l) => !isPrimaryGodEmail(l.email));
      }

      setAuthLogs(finalLogs);
    } catch (err) {
      console.error("loadAuthLogs error:", err);
    } finally {
      setAuthLogsLoading(false);
    }
  }

  // ─── Activity Log ───
  async function loadActivity() {
    try {
      let q = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!isCallerGod) {
        const { data: godUsers } = await supabase
          .from("profiles")
          .select("id")
          .in("email", PRIMARY_GOD_EMAILS);
        const godIds = godUsers?.map((u) => u.id) || [];
        if (godIds.length > 0) {
          godIds.forEach((gid) => {
            q = q.neq("user_id", gid).neq("target_id", gid);
          });
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      setActivityLog(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Error Log ───
  async function loadErrors() {
    try {
      const { data, error } = await supabase
        .from("error_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setErrorLog(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Open User Logs & Activity History Modal ───
  async function openUserLogs(userObj) {
    if (!userObj) return;
    setSelectedUserForLogs(userObj);
    setUserLogsModal(true);
    setUserLogsLoading(true);
    setUserLogsSearch("");

    try {
      // 1. Authentication logs
      const { data: aLogs } = await supabase
        .from("auth_logs")
        .select("*")
        .or(`user_id.eq.${userObj.id},email.eq.${userObj.email}`)
        .order("created_at", { ascending: false })
        .limit(100);

      // 2. System activity logs
      const { data: actLogs } = await supabase
        .from("activity_log")
        .select("*")
        .or(`user_id.eq.${userObj.id},target_id.eq.${userObj.id}`)
        .order("created_at", { ascending: false })
        .limit(100);

      const combined = [
        ...(aLogs || []).map((l) => ({ ...l, _type: "auth" })),
        ...(actLogs || []).map((l) => ({ ...l, _type: "activity" })),
      ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      setUserLogs(combined);
    } catch (err) {
      console.error("Error loading user logs:", err);
    } finally {
      setUserLogsLoading(false);
    }
  }

  function exportUserLogs(userObj, logs) {
    try {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user_${userObj.email?.split("@")[0] || userObj.id}_activity_logs.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Activity logs exported successfully");
    } catch (err) {
      showToast("Export failed: " + err.message, "error");
    }
  }

  // ─── Table Browser ───
  const KNOWN_COLUMNS = {
    forms: ["id", "title", "slug", "published", "form_type", "default_theme", "created_at"],
    questions: ["id", "form_id", "type", "title", "position", "required", "created_at"],
    responses: ["id", "form_id", "is_complete", "duration_seconds", "device", "created_at"],
    answers: ["id", "response_id", "question_id", "value", "created_at"],
    profiles: ["id", "email", "full_name", "phone", "is_active", "is_owner", "created_at"],
    user_roles: ["id", "user_id", "role_id", "active", "created_at"],
    user_permissions: ["id", "user_id", "permission_id", "created_at"],
    logic_rules: ["id", "form_id", "action_type", "priority", "created_at"],
    system_settings: ["key", "value", "updated_at"],
    support_tickets: ["id", "user_id", "subject", "status", "created_at"],
    auth_logs: ["id", "user_id", "email", "action", "ip_address", "created_at"],
    activity_log: ["id", "user_id", "action", "target_type", "created_at"],
    error_log: ["id", "source", "message", "created_at"],
  };

  async function browseTable(tableName) {
    setSelectedTable(tableName);
    try {
      let q = supabase.from(tableName).select("*").limit(200);

      if (!isCallerGod) {
        if (tableName === "profiles") {
          q = q.not("email", "in", `(${PRIMARY_GOD_EMAILS.map((e) => `"${e}"`).join(",")})`);
        } else if (tableName === "activity_log") {
          const { data: godUsers } = await supabase
            .from("profiles")
            .select("id")
            .in("email", PRIMARY_GOD_EMAILS);
          godUsers?.forEach((gu) => {
            q = q.neq("user_id", gu.id).neq("target_id", gu.id);
          });
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      setTableData(rows);
      if (rows.length > 0) {
        setTableCols(Object.keys(rows[0]));
      } else {
        setTableCols(KNOWN_COLUMNS[tableName] || ["id", "created_at"]);
      }
    } catch (err) {
      console.error("browseTable error:", err);
      showToast("Error loading table: " + err.message, "error");
    }
  }

  // ─── Edit Record ───
  function openEdit(tableName, row = null) {
    setEditModal({ table: tableName, row, isNew: !row });
    if (row) {
      setEditForm({ ...row });
    } else {
      const empty = {};
      tableCols.forEach((c) => {
        if (c !== "id" && c !== "created_at") empty[c] = "";
      });
      setEditForm(empty);
    }
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
      browseTable(table);
      loadDbStats();
    } catch (err) {
      showToast("Save error: " + err.message, "error");
    }
  }

  async function deleteRecord(tableName, id) {
    if (!confirm(`Are you sure you want to delete this record from ${tableName}?`)) return;
    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
      showToast(`Record deleted from ${tableName}`);
      browseTable(tableName);
      loadDbStats();
    } catch (err) {
      showToast("Delete error: " + err.message, "error");
    }
  }

  // ─── SQL Query Runner ───
  async function runSql() {
    if (!sqlQuery.trim()) return;
    setSqlRunning(true);
    setSqlResult(null);
    setSqlError(null);
    try {
      const { data, error } = await supabase.rpc("exec_sql", { query: sqlQuery });
      if (error) throw error;
      setSqlResult(data);
      showToast("Query executed successfully");
    } catch (err) {
      setSqlError(err.message);
      showToast("Query failed: " + err.message, "error");
    } finally {
      setSqlRunning(false);
    }
  }

  // ─── Vercel API ───
  async function loadVercel() {
    if (!vercelToken) return;
    setVercelLoading(true);
    try {
      localStorage.setItem("sa_vxt", vercelToken);
      const [depRes, projRes] = await Promise.all([
        fetch("https://api.vercel.com/v6/deployments?limit=10", {
          headers: { Authorization: `Bearer ${vercelToken}` },
        }),
        fetch("https://api.vercel.com/v9/projects", {
          headers: { Authorization: `Bearer ${vercelToken}` },
        }),
      ]);
      const depData = depRes.ok ? await depRes.json() : { deployments: [] };
      const projData = projRes.ok ? await projRes.json() : { projects: [] };
      setVercelData({
        deployments: depData.deployments || [],
        projects: projData.projects || [],
      });
      showToast("Vercel data synchronized");
    } catch (err) {
      showToast("Vercel error: " + err.message, "error");
    } finally {
      setVercelLoading(false);
    }
  }

  // ─── Admin Action Proxy ───
  async function adminAction(action, payload = {}) {
    // 1. Try serverless API (/api/admin-user-management)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin-user-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({ action, ...payload }),
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
      const errJson = await res.json().catch(() => ({}));
      if (errJson.error && res.status !== 501 && res.status !== 404) {
        throw new Error(errJson.error);
      }
    } catch (e) {
      if (
        e.message &&
        !e.message.includes("501") &&
        !e.message.includes("404") &&
        !e.message.includes("Failed to fetch")
      ) {
        throw e;
      }
    }

    // 2. RPC fallback for impersonation
    if (action === "impersonate" && payload.target_user_id) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("impersonate_user", {
          p_target_user_id: payload.target_user_id,
        });
        if (!rpcErr && rpcData) {
          return { success: true, user: rpcData };
        }
      } catch (rpcErr) {
        console.warn("RPC impersonate fallback error:", rpcErr);
      }
    }

    // 3. Fallback to Supabase Edge Function if deployed
    const { data, error } = await supabase.functions.invoke("superadmin-action", {
      body: { action, ...payload },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  // ─── Impersonate User ───
  async function doImpersonate(targetUserId) {
    try {
      showToast("Generating impersonation session...");
      const res = await adminAction("impersonate", { target_user_id: targetUserId });
      if (res?.redirect_url || res?.magic_link) {
        const url = res.redirect_url || res.magic_link;
        window.open(url, "_blank");
        showToast("Logged in as user in a new tab");
      } else if (res?.user) {
        showToast(`Impersonating ${res.user.full_name || res.user.email}`);
      } else {
        showToast("Impersonation link generated");
      }
      setImpersonateModal(null);
    } catch (err) {
      showToast("Impersonation failed: " + err.message, "error");
    }
  }

  // ─── Admin Permission Editor ───
  async function toggleAdminPermission(userId, permId, currentPerms) {
    if (!isCallerGod) {
      showToast("Only Primary God Owner can modify administrator permissions.", "error");
      return;
    }
    const newPerms = currentPerms.includes(permId)
      ? currentPerms.filter((p) => p !== permId)
      : [...currentPerms, permId];
    try {
      const { error } = await supabase.rpc("set_user_permissions", {
        p_user_id: userId,
        p_permission_ids: newPerms,
      });
      if (error) throw error;
      showToast("Administrator permissions updated successfully");
      loadAdmins();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  }

  // ─── Purge ───
  async function purgeResponses(formId = null) {
    if (
      !confirm(
        formId
          ? "Delete all responses for this form?"
          : "DELETE ALL RESPONSES? This action cannot be undone!"
      )
    )
      return;
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
      a.href = url;
      a.download = `${tableName}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${tableName}`);
    } catch (err) {
      showToast("Export error: " + err.message, "error");
    }
  }

  // ─── Stats & Metrics ───
  // ─── Grouped by User (تفکیک فعالیت‌های هر کاربر به صورت یکپارچه) ───
  const authLogsGroupedByUser = useMemo(() => {
    const map = {};
    authLogs.forEach((l) => {
      const userKey = l.email || l.user_id || "Anonymous";
      if (!map[userKey]) {
        map[userKey] = {
          userKey,
          userId: l.user_id,
          email: l.email,
          fullName: l.full_name,
          phone: l.phone || l.details?.phone,
          count: 0,
          first_seen: l.created_at,
          last_seen: l.created_at,
          devices: new Set(),
          browsers: new Set(),
          actions: new Set(),
        };
      }
      map[userKey].count += 1;
      if (new Date(l.created_at) < new Date(map[userKey].first_seen)) map[userKey].first_seen = l.created_at;
      if (new Date(l.created_at) > new Date(map[userKey].last_seen)) map[userKey].last_seen = l.created_at;
      if (l.device) map[userKey].devices.add(l.device);
      if (l.browser) map[userKey].browsers.add(l.browser);
      if (l.action) map[userKey].actions.add(l.action);
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        devicesList: Array.from(item.devices),
        browsersList: Array.from(item.browsers),
        actionsList: Array.from(item.actions),
      }))
      .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
  }, [authLogs]);

  const activeLast24hCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return authLogs.filter((l) => new Date(l.created_at).getTime() >= cutoff).length;
  }, [authLogs]);

  const stats = useMemo(
    () => ({
      forms: dbStats.forms || 0,
      responses: dbStats.responses || 0,
      questions: dbStats.questions || 0,
      answers: dbStats.answers || 0,
      users: users.length,
      activeUsers: users.filter((u) => u.is_active).length,
      admins: admins.length,
      errors: errorLog.length,
      activities: activityLog.length,
      authEvents: authLogs.length,
      active24h: activeLast24hCount,
    }),
    [dbStats, users, admins, errorLog, activityLog, authLogs, activeLast24hCount]
  );

  // ─── Filtered Auth Logs (Global) ───
  const filteredAuthLogs = useMemo(() => {
    let list = authLogs;

    // فیلتر بازه زمانی
    if (authLogsTimeframe !== "all") {
      const now = Date.now();
      const cutoffMap = {
        "24h": now - 24 * 60 * 60 * 1000,
        "7d": now - 7 * 24 * 60 * 60 * 1000,
        "30d": now - 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = cutoffMap[authLogsTimeframe] || 0;
      list = list.filter((l) => new Date(l.created_at).getTime() >= cutoff);
    }

    // فیلتر عملیات
    if (authLogsFilter !== "all") {
      if (authLogsFilter === "login") {
        list = list.filter((l) => l.action?.includes("login"));
      } else if (authLogsFilter === "register") {
        list = list.filter((l) => l.action === "register");
      } else if (authLogsFilter === "logout") {
        list = list.filter((l) => l.action === "logout");
      }
    }

    if (!authLogsSearch) return list;
    const q = authLogsSearch.toLowerCase();
    return list.filter((l) =>
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.full_name && l.full_name.toLowerCase().includes(q)) ||
      (l.phone && l.phone.toLowerCase().includes(q)) ||
      (l.ip_address && l.ip_address.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.browser && l.browser.toLowerCase().includes(q)) ||
      (l.os && l.os.toLowerCase().includes(q)) ||
      (l.device && l.device.toLowerCase().includes(q)) ||
      (l.details?.city && String(l.details.city).toLowerCase().includes(q)) ||
      (l.details?.country && String(l.details.country).toLowerCase().includes(q)) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(q)
    );
  }, [authLogs, authLogsTimeframe, authLogsFilter, authLogsSearch]);

  // ─── Filtered User Logs Modal (Per User) ───
  const filteredUserLogs = useMemo(() => {
    let list = userLogs;
    if (userLogsTab === "auth") {
      list = list.filter((l) => l._type === "auth" || l.action === "login" || l.action === "register" || l.action === "logout");
    } else if (userLogsTab === "activity") {
      list = list.filter((l) => l._type === "activity" && l.action !== "login" && l.action !== "register" && l.action !== "logout");
    }

    if (!userLogsSearch) return list;
    const q = userLogsSearch.toLowerCase();
    return list.filter(
      (l) =>
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.target_type && l.target_type.toLowerCase().includes(q)) ||
        (l.ip_address && l.ip_address.toLowerCase().includes(q)) ||
        (l.browser && l.browser.toLowerCase().includes(q)) ||
        (l.os && l.os.toLowerCase().includes(q)) ||
        (l.device && l.device.toLowerCase().includes(q)) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(q)
    );
  }, [userLogs, userLogsTab, userLogsSearch]);

  // ─── Filtered Table Data for Database Tab ───
  const filteredData = useMemo(() => {
    if (!search) return tableData;
    const q = search.toLowerCase();
    return tableData.filter((r) =>
      Object.values(r).some((v) =>
        v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      )
    );
  }, [tableData, search]);

  if (loading) {
    return <TableSkeleton rows={8} cols={5} />;
  }

  // Access check
  if (!isOwner()) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="ltr">
        <div className="text-center p-8 rounded-xl border-2 border-ink/10 bg-white max-w-sm">
          <div className="flex justify-center mb-3 text-rose-500">
            <Ban size={44} />
          </div>
          <h2 className="text-lg font-extrabold text-navy mb-2">Unauthorized Access</h2>
          <p className="text-sm font-semibold text-ink-subtle">
            Only superadmin accounts have access to this section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-root" dir="ltr">
      <SEO title="Super Admin — God Mode" noIndex />

      {toast && (
        <div className={`sa-toast ${toast.type === "error" ? "error" : "success"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="sa-header">
        <div className="sa-header-left">
          <div className="sa-logo">
            <Shield size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Super Admin</h1>
            <p style={{ fontSize: "0.8rem", color: "#525252", margin: 0 }}>
              System administration · God Mode
            </p>
          </div>
        </div>
        <div className="sa-header-right">
          <span className="sa-badge-online">Online</span>
          <span style={{ fontSize: "0.85rem", color: "#6f6f6f" }}>Auto-refresh: 30s</span>
          <div className="sa-avatar">{profile?.full_name?.[0]?.toUpperCase() || "G"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sa-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (t.id === "database" && !selectedTable) {
                browseTable("forms");
              }
            }}
            className={`sa-tab ${tab === t.id ? "active" : ""}`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + Actions */}
      <div className="sa-search">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search records, users, logs..."
        />
        {selectedTable && (
          <div className="sa-actions">
            <button className="sa-btn sa-btn-primary" onClick={() => openEdit(selectedTable)}>
              + Create
            </button>
            <button className="sa-btn sa-btn-secondary" onClick={() => exportTable(selectedTable)}>
              Export
            </button>
            {selectedTable === "responses" && (
              <button className="sa-btn sa-btn-danger" onClick={() => purgeResponses()}>
                Purge All
              </button>
            )}
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
              {
                label: "Auth & IP Logs",
                value: stats.authEvents,
                sub: `${stats.uniqueIps} unique IPs`,
                highlight: "#8a3ffc",
                onClick: () => setTab("auth_logs"),
              },
              { label: "Errors", value: stats.errors },
              { label: "System Logs", value: stats.activities, onClick: () => setTab("logs") },
              {
                label: "Database Size",
                value: storageData?.database?.db_size_pretty || "—",
                sub: storageData?.database?.tables
                  ? `${storageData.database.tables.length} tables`
                  : "Postgres DB",
                highlight: "#0f62fe",
                onClick: () => setTab("storage"),
              },
              {
                label: "Project Root Size",
                value:
                  storageData?.project?.full_pretty ||
                  storageData?.project?.source_pretty ||
                  "—",
                sub: storageData?.project?.source_pretty
                  ? `${storageData.project.source_pretty} (source)`
                  : "Filesystem",
                highlight: "#198038",
                onClick: () => setTab("storage"),
              },
            ].map((s, i) => (
              <div
                key={i}
                className="sa-stat"
                onClick={s.onClick}
                style={
                  s.onClick
                    ? {
                        cursor: "pointer",
                        borderTop: s.highlight ? `3px solid ${s.highlight}` : undefined,
                      }
                    : undefined
                }
                title={s.onClick ? "Click to view storage details" : undefined}
              >
                <div className="sa-stat-label">{s.label}</div>
                <div
                  className="sa-stat-value"
                  style={s.highlight ? { color: s.highlight, fontSize: "1.75rem" } : undefined}
                >
                  {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                </div>
                {s.sub && <div className="sa-stat-sub">{s.sub}</div>}
              </div>
            ))}
          </div>

          <div className="sa-section-title">Quick Table Access</div>
          <div className="sa-tiles">
            {tables.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab("database");
                  browseTable(t);
                }}
                className="sa-tile"
              >
                <div className="sa-tile-name">{t}</div>
                <div className="sa-tile-count">
                  {typeof dbStats[t] === "number" ? dbStats[t].toLocaleString() : "—"}
                </div>
              </button>
            ))}
          </div>

          {errorLog.length > 0 && (
            <div className="sa-card">
              <div className="sa-card-header">
                <span className="sa-section-title">Recent System Errors ({errorLog.length})</span>
                <button className="sa-btn sa-btn-ghost" onClick={() => setTab("logs")}>
                  View all
                </button>
              </div>
              <div className="sa-card-body" style={{ maxHeight: 200, overflowY: "auto" }}>
                {errorLog.slice(0, 5).map((e, i) => (
                  <div key={e.id || i} className="sa-error-item">
                    <span
                      style={{
                        color: "#da1e28",
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "0.85rem",
                      }}
                    >
                      {e.source}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.message}
                    </span>
                    <span style={{ color: "#6f6f6f", fontSize: "0.85rem" }}>
                      {e.created_at ? new Date(e.created_at).toLocaleTimeString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ System Settings & Global Limits ═══════════ */}
      {tab === "settings" && (
        <div style={{ maxWidth: 840, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div>
              <div className="sa-section-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                System Settings & Global Limits
              </div>
              <div style={{ fontSize: "0.8rem", color: "#525252" }}>
                Configure platform defaults, Telegram support username, and quota caps.
              </div>
            </div>
            <button
              className="sa-btn sa-btn-primary"
              onClick={saveSystemSettings}
              disabled={settingsSaving}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <Save size={14} />
              {settingsSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          <div className="sa-card" style={{ padding: "1.25rem" }}>
            <form onSubmit={saveSystemSettings} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#161616", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Platform Title / Brand Name
                </label>
                <input
                  type="text"
                  value={sysSettings.site_title || ""}
                  onChange={(e) => setSysSettings({ ...sysSettings, site_title: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #c6c6c6", fontSize: "0.85rem", outline: "none" }}
                  placeholder="Porskad"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#161616", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Telegram Support Username
                </label>
                <input
                  type="text"
                  value={sysSettings.telegram_support_id || ""}
                  onChange={(e) => setSysSettings({ ...sysSettings, telegram_support_id: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #c6c6c6", fontSize: "0.85rem", fontFamily: "'IBM Plex Mono', monospace", outline: "none" }}
                  placeholder="porskad_support"
                />
                <div style={{ fontSize: "0.85rem", color: "#6f6f6f", marginTop: "0.25rem" }}>
                  Used across the app to redirect client questions to your Telegram support.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#161616", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                    Default Max Active Forms
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={sysSettings.default_max_active_forms ?? 5}
                    onChange={(e) => setSysSettings({ ...sysSettings, default_max_active_forms: parseInt(e.target.value) || 5 })}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #c6c6c6", fontSize: "0.85rem", outline: "none" }}
                  />
                  <div style={{ fontSize: "0.85rem", color: "#6f6f6f", marginTop: "0.25rem" }}>
                    Global cap: max 5 active (published) forms per user at the same time.
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#161616", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                    Default Monthly Responses Limit
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50000}
                    value={sysSettings.default_max_monthly_responses ?? 100}
                    onChange={(e) => setSysSettings({ ...sysSettings, default_max_monthly_responses: parseInt(e.target.value) || 100 })}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #c6c6c6", fontSize: "0.85rem", outline: "none" }}
                  />
                  <div style={{ fontSize: "0.85rem", color: "#6f6f6f", marginTop: "0.25rem" }}>
                    100 responses per month per user. Consumed tokens are permanent upon delete.
                  </div>
                </div>
              </div>

              <div className="sa-card" style={{ padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                    Allow Public User Registrations
                  </div>
                  <div className="sa-stat-sub" style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
                    When disabled, only admins can register new users.
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={sysSettings.registration_enabled !== false}
                    onChange={(e) => setSysSettings({ ...sysSettings, registration_enabled: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {sysSettings.registration_enabled !== false ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  className="sa-btn sa-btn-primary"
                  disabled={settingsSaving}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <Save size={14} />
                  {settingsSaving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ Question Types & Fields Manager ═══════════ */}
      {tab === "question_types" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div>
              <div className="sa-section-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                Form Field & Question Types Manager
              </div>
              <div style={{ fontSize: "0.8rem", color: "#525252" }}>
                Enable, disable, hide, rename, and customize all 20 question types across the platform.
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="sa-btn sa-btn-secondary"
                onClick={handleResetAllQ}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                title="Reset all customized labels and visibilities back to default"
              >
                <RotateCcw size={14} />
                Reset All to Defaults
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          {(() => {
            const allTypes = QUESTION_TYPE_ORDER.map((k) => getEffectiveQuestionType(k, qConfig));
            const totalCount = allTypes.length;
            const activeCount = allTypes.filter((t) => t.enabled !== false && t.hidden !== true).length;
            const hiddenCount = allTypes.filter((t) => t.hidden === true).length;
            const disabledCount = allTypes.filter((t) => t.enabled === false).length;

            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                <div className="sa-card" style={{ padding: "0.85rem 1rem" }}>
                  <div className="sa-stat-label">Total Field Types</div>
                  <div className="sa-stat-value" style={{ fontSize: "1.5rem" }}>{totalCount}</div>
                  <div className="sa-stat-sub">Across 3 categories</div>
                </div>

                <div className="sa-card" style={{ padding: "0.85rem 1rem" }}>
                  <div className="sa-stat-label">Active & Available</div>
                  <div className="sa-stat-value" style={{ fontSize: "1.5rem", color: "#198038" }}>
                    {activeCount}
                  </div>
                  <div className="sa-stat-sub">Visible in Form Builder</div>
                </div>

                <div className="sa-card" style={{ padding: "0.85rem 1rem" }}>
                  <div className="sa-stat-label">Hidden Fields</div>
                  <div className="sa-stat-value" style={{ fontSize: "1.5rem", color: "#f1c21b" }}>
                    {hiddenCount}
                  </div>
                  <div className="sa-stat-sub">Hidden from new questions</div>
                </div>

                <div className="sa-card" style={{ padding: "0.85rem 1rem" }}>
                  <div className="sa-stat-label">Disabled / Inactive</div>
                  <div className="sa-stat-value" style={{ fontSize: "1.5rem", color: "#da1e28" }}>
                    {disabledCount}
                  </div>
                  <div className="sa-stat-sub">Completely disabled</div>
                </div>
              </div>
            );
          })()}

          {/* Search & Category Filter Toolbar */}
          <div
            className="sa-card"
            style={{
              padding: "0.75rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            {/* Search */}
            <div style={{ position: "relative", minWidth: 260, flex: 1 }}>
              <Search
                size={14}
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8d8d8d" }}
              />
              <input
                type="text"
                value={qSearch}
                onChange={(e) => setQSearch(e.target.value)}
                placeholder="Search question types, keys, labels..."
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem 0.45rem 2rem",
                  fontSize: "0.8rem",
                  border: "1px solid #c6c6c6",
                  outline: "none",
                }}
              />
              {qSearch && (
                <button
                  onClick={() => setQSearch("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#8d8d8d",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {[
                { id: "all", label: "All (20)" },
                { id: "choice", label: "Choice & Scale" },
                { id: "text", label: "Text & Inputs" },
                { id: "advanced", label: "Advanced" },
                { id: "active", label: "Active Only" },
                { id: "hidden", label: "Hidden" },
                { id: "disabled", label: "Disabled" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setQCategoryFilter(f.id)}
                  className={`sa-btn ${qCategoryFilter === f.id ? "sa-btn-primary" : "sa-btn-secondary"}`}
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Question Types */}
          {(() => {
            const filteredKeys = QUESTION_TYPE_ORDER.filter((key) => {
              const meta = getEffectiveQuestionType(key, qConfig);
              const qTerm = qSearch.toLowerCase().trim();

              // Search match
              const matchSearch =
                !qTerm ||
                key.toLowerCase().includes(qTerm) ||
                meta.label.toLowerCase().includes(qTerm) ||
                (meta.hint && meta.hint.toLowerCase().includes(qTerm)) ||
                meta.category.toLowerCase().includes(qTerm);

              if (!matchSearch) return false;

              // Filter match
              if (qCategoryFilter === "choice") return meta.category === "choice";
              if (qCategoryFilter === "text") return meta.category === "text";
              if (qCategoryFilter === "advanced") return meta.category === "advanced";
              if (qCategoryFilter === "active") return meta.enabled !== false && meta.hidden !== true;
              if (qCategoryFilter === "hidden") return meta.hidden === true;
              if (qCategoryFilter === "disabled") return meta.enabled === false;

              return true;
            });

            if (filteredKeys.length === 0) {
              return (
                <div className="sa-card" style={{ padding: "3rem 1rem", textAlign: "center", color: "#6f6f6f" }}>
                  <ListOrdered size={36} style={{ margin: "0 auto 0.5rem", opacity: 0.4 }} />
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>No Question Types Match Your Filters</div>
                  <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    Try adjusting your search query or category filter above.
                  </div>
                </div>
              );
            }

            return (
              <div className="sa-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="sa-table" style={{ width: "100%", textAlign: "left" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 45 }}>#</th>
                        <th style={{ minWidth: 200 }}>Question Type / Key</th>
                        <th style={{ minWidth: 220 }}>Persian Display Name</th>
                        <th style={{ minWidth: 140 }}>Category</th>
                        <th style={{ width: 120, textAlign: "center" }}>Status</th>
                        <th style={{ width: 120, textAlign: "center" }}>Visibility</th>
                        <th style={{ width: 150, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeys.map((key, index) => {
                        const meta = getEffectiveQuestionType(key, qConfig);
                        const defaultMeta = QUESTION_TYPES[key] || {};
                        const Icon = QUESTION_TYPE_ICONS[key];
                        const isCustomized = qConfig[key] && Object.keys(qConfig[key]).length > 0;
                        const isEnabled = meta.enabled !== false;
                        const isHidden = meta.hidden === true;

                        return (
                          <tr
                            key={key}
                            style={{
                              opacity: !isEnabled ? 0.6 : 1,
                              background: isHidden ? "rgba(241, 194, 27, 0.04)" : !isEnabled ? "rgba(218, 30, 40, 0.04)" : undefined,
                            }}
                          >
                            <td style={{ color: "#8d8d8d", fontSize: "0.75rem", fontFamily: "monospace" }}>
                              {index + 1}
                            </td>

                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 4,
                                    background: "#f4f4f4",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 800,
                                    fontSize: "0.75rem",
                                    color: "#0f62fe",
                                  }}
                                >
                                  {Icon ? <Icon size={16} /> : meta.icon}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "0.85rem", fontFamily: "'IBM Plex Mono', monospace" }}>
                                    {key}
                                  </div>
                                  <div style={{ fontSize: "0.72rem", color: "#6f6f6f", maxWidth: 260 }} title={meta.hint}>
                                    {meta.hint}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{meta.label}</span>
                                {isCustomized && (
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      fontWeight: 800,
                                      padding: "1px 4px",
                                      background: "#edf5ff",
                                      color: "#0f62fe",
                                      borderRadius: 2,
                                      border: "1px solid #d0e2ff",
                                    }}
                                  >
                                    Custom
                                  </span>
                                )}
                              </div>
                              {defaultMeta.label !== meta.label && (
                                <div style={{ fontSize: "0.72rem", color: "#8d8d8d" }}>
                                  Default: {defaultMeta.label}
                                </div>
                              )}
                            </td>

                            <td>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  padding: "2px 6px",
                                  borderRadius: 2,
                                  background:
                                    meta.category === "choice"
                                      ? "#f6f2ff"
                                      : meta.category === "text"
                                      ? "#e5f6ff"
                                      : "#defbe6",
                                  color:
                                    meta.category === "choice"
                                      ? "#6929c4"
                                      : meta.category === "text"
                                      ? "#0043ce"
                                      : "#0e6027",
                                }}
                              >
                                {meta.category}
                              </span>
                            </td>

                            <td style={{ textAlign: "center" }}>
                              <button
                                onClick={() => handleToggleQField(key, "enabled")}
                                style={{
                                  border: "none",
                                  background: isEnabled ? "#defbe6" : "#ffd7d9",
                                  color: isEnabled ? "#0e6027" : "#da1e28",
                                  padding: "2px 8px",
                                  borderRadius: 12,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                }}
                                title={isEnabled ? "Click to Disable" : "Click to Enable"}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: isEnabled ? "#198038" : "#da1e28",
                                  }}
                                />
                                {isEnabled ? "Active" : "Disabled"}
                              </button>
                            </td>

                            <td style={{ textAlign: "center" }}>
                              <button
                                onClick={() => handleToggleQField(key, "hidden")}
                                style={{
                                  border: "none",
                                  background: !isHidden ? "#e5f6ff" : "#fcf4d6",
                                  color: !isHidden ? "#0043ce" : "#8a6d10",
                                  padding: "2px 8px",
                                  borderRadius: 12,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                }}
                                title={!isHidden ? "Click to Hide from Builder" : "Click to Show in Builder"}
                              >
                                {!isHidden ? <Eye size={11} /> : <EyeOff size={11} />}
                                {!isHidden ? "Visible" : "Hidden"}
                              </button>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                                <button
                                  className="sa-btn sa-btn-secondary"
                                  onClick={() => handleOpenQEdit(key)}
                                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                                  title="Edit name, hint, and category"
                                >
                                  <Edit3 size={12} />
                                  Edit
                                </button>
                                <button
                                  className={`sa-btn ${isEnabled ? "sa-btn-danger" : "sa-btn-secondary"}`}
                                  onClick={() => handleDeleteQType(key)}
                                  style={{ padding: "0.25rem 0.45rem", fontSize: "0.75rem" }}
                                  title={isEnabled ? "Disable field" : "Restore field"}
                                >
                                  {isEnabled ? <Ban size={12} /> : <RotateCcw size={12} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════ Storage & System ═══════════ */}
      {tab === "storage" && (

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div>
              <div className="sa-section-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                System & Storage Usage
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#525252" }}>
                Comprehensive breakdown of Supabase PostgreSQL database size and total project root filesystem
              </p>
            </div>
            <button
              className="sa-btn sa-btn-secondary"
              onClick={loadStorageStats}
              disabled={storageLoading}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <RefreshCw size={14} className={storageLoading ? "animate-spin" : ""} />
              {storageLoading ? "Loading..." : "Refresh Storage"}
            </button>
          </div>

          <div className="sa-storage-grid">
            {/* Card 1: Database Storage */}
            <div className="sa-storage-card">
              <div className="sa-storage-header">
                <div className="sa-storage-title">
                  <Database size={18} color="#0f62fe" />
                  <span>PostgreSQL Database Storage</span>
                </div>
                <span className="sa-tag sa-tag-blue">
                  {storageData?.database?.estimated ? "Estimated metadata" : "Accurate (Postgres)"}
                </span>
              </div>

              <div className="sa-storage-body">
                <div className="sa-storage-metric">
                  <div className="sa-storage-num">
                    {storageData?.database?.db_size_pretty || "—"}
                  </div>
                  <div className="sa-storage-desc">
                    Total disk space occupied by PostgreSQL database
                  </div>
                </div>

                <div
                  className="sa-card"
                  style={{
                    fontSize: "0.8rem",
                    lineHeight: 1.6,
                    padding: "0.75rem",
                    borderLeft: "3px solid #0f62fe",
                  }}
                >
                  Includes all tables, B-tree indexes, system catalogs, activity logs, and metadata on Supabase database cluster.
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Tables Size Breakdown ({storageData?.database?.tables?.length || 0} tables):
                  </div>
                  <div className="sa-table-wrap" style={{ maxHeight: 280, overflowY: "auto" }}>
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Table Name</th>
                          <th>Row Count</th>
                          <th>Disk Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storageData?.database?.tables?.map((tbl) => (
                          <tr key={tbl.table_name}>
                            <td
                              style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
                            >
                              {tbl.table_name}
                            </td>
                            <td>{(tbl.row_count ?? 0).toLocaleString()}</td>
                            <td
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                color: "#0f62fe",
                                fontWeight: 600,
                              }}
                            >
                              {tbl.pretty || formatBytes(tbl.bytes)}
                            </td>
                          </tr>
                        ))}
                        {(!storageData?.database?.tables ||
                          storageData.database.tables.length === 0) && (
                          <tr>
                            <td
                              colSpan={3}
                              style={{ textAlign: "center", color: "#6f6f6f", padding: "1rem" }}
                            >
                              Fetching table metrics...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Project Root Storage */}
            <div className="sa-storage-card">
              <div className="sa-storage-header">
                <div className="sa-storage-title">
                  <FolderTree size={18} color="#198038" />
                  <span>Project Root Storage</span>
                </div>
                <span className="sa-tag sa-tag-green">Filesystem</span>
              </div>

              <div className="sa-storage-body">
                <div className="sa-storage-metric">
                  <div className="sa-storage-num" style={{ color: "#198038" }}>
                    {storageData?.project?.full_pretty ||
                      storageData?.project?.source_pretty ||
                      "—"}
                  </div>
                  <div className="sa-storage-desc">
                    Total root workspace directory (
                    {(storageData?.project?.full_files || 0).toLocaleString()} files)
                  </div>
                </div>

                <div
                  className="sa-card"
                  style={{
                    padding: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                      Source code & assets (excluding node_modules):
                    </span>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#0f62fe",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {storageData?.project?.source_pretty || "—"}
                    </span>
                  </div>
                  <div className="sa-stat-sub" style={{ fontSize: "0.8rem" }}>
                    Contains pages, components, stylesheets, media assets, and API routes (
                    {(storageData?.project?.source_files || 0).toLocaleString()} files)
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Workspace Breakdown:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {storageData?.project?.breakdown?.map((item, idx) => (
                      <div
                        key={idx}
                        className="sa-card"
                        style={{
                          padding: "0.6rem 0.75rem",
                          marginBottom: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                            {item.name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              fontFamily: "'IBM Plex Mono', monospace",
                            }}
                          >
                            {item.pretty}
                          </span>
                        </div>
                        {item.files !== undefined && (
                          <div className="sa-stat-sub" style={{ fontSize: "0.8rem" }}>
                            {item.files.toLocaleString()} files
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Database Explorer ═══════════ */}
      {tab === "database" && (
        <div>
          <div className="sa-tiles">
            {tables.map((t) => (
              <button
                key={t}
                onClick={() => browseTable(t)}
                className="sa-tile"
                style={{ background: selectedTable === t ? "#d0e2ff" : undefined }}
              >
                <div className="sa-tile-name">{t}</div>
                <div className="sa-tile-count">
                  {typeof dbStats[t] === "number" ? dbStats[t].toLocaleString() : "—"}
                </div>
              </button>
            ))}
          </div>

          {selectedTable && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span className="sa-section-title" style={{ margin: 0 }}>
                  {selectedTable}{" "}
                  <span style={{ color: "#6f6f6f", fontWeight: 400 }}>
                    ({filteredData.length.toLocaleString()} rows)
                  </span>
                </span>
                <button className="sa-btn sa-btn-ghost" onClick={() => browseTable(selectedTable)}>
                  Refresh
                </button>
              </div>
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      {tableCols.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((r, i) => (
                      <tr
                        key={r.id || i}
                        onClick={() => openEdit(selectedTable, r)}
                        style={{ cursor: "pointer" }}
                      >
                        {tableCols.map((c) => {
                          const v = r[c];
                          return (
                            <td key={c}>
                              {v === null || v === undefined ? (
                                <span style={{ color: "#c6c6c6" }}>—</span>
                              ) : typeof v === "boolean" ? (
                                <span style={{ color: v ? "#24a148" : "#da1e28", display: "inline-flex", alignItems: "center" }}>
                                  {v ? <Check size={13} /> : <X size={13} />}
                                </span>
                              ) : typeof v === "object" ? (
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    maxWidth: 120,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    display: "block",
                                  }}
                                >
                                  {JSON.stringify(v).slice(0, 40)}
                                </span>
                              ) : (
                                String(v).slice(0, 60)
                              )}
                            </td>
                          );
                        })}
                        <td>
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button
                              className="sa-btn sa-btn-ghost sa-btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(selectedTable, r);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="sa-btn sa-btn-ghost sa-btn-sm"
                              style={{ color: "#da1e28" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecord(selectedTable, r.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td
                          colSpan={Math.max(1, tableCols.length + 1)}
                          style={{ textAlign: "center", color: "#8d8d8d", padding: "2.5rem 1rem" }}
                        >
                          No records found in table "{selectedTable}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Users (No password column, No plan column, + Dedicated User Logs) ═══════════ */}
      {tab === "users" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <div className="sa-section-title" style={{ margin: 0 }}>
              System Users ({users.length.toLocaleString()})
            </div>
            <div style={{ fontSize: "0.85rem", color: "#6f6f6f" }}>
              Standard system users and managers. Permissions restricted from accessing peer records.
            </div>
          </div>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Monthly Quota</th>
                  <th>Reset Date</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(
                    (u) =>
                      !search ||
                      u.email?.toLowerCase().includes(search.toLowerCase()) ||
                      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                      (u.phone && u.phone.includes(search))
                  )
                  .map((r) => (
                    <tr key={r.id} onClick={() => setDetailModal(r)} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: 700 }}>{r.full_name || "—"}</td>
                      <td
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.85rem" }}
                      >
                        {r.email}
                      </td>
                      <td
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "0.85rem",
                          color: "#0f62fe",
                          fontWeight: 600,
                        }}
                      >
                        {r.phone || "—"}
                      </td>
                      <td>
                        {r.is_owner ? (
                          <span className="sa-tag sa-tag-yellow" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <Crown size={12} /> Owner
                          </span>
                        ) : r.role === "admin" ? (
                          <span className="sa-tag sa-tag-yellow" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <Shield size={12} /> SuperAdmin
                          </span>
                        ) : (
                          <span className="sa-tag sa-tag-blue">Manager</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`sa-tag ${r.is_active ? "sa-tag-green" : "sa-tag-gray"}`}
                        >
                          {r.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color:
                              (r.monthly_responses_used || 0) >= (r.max_responses_per_month || 100)
                                ? "#da1e28"
                                : "#161616",
                          }}
                        >
                          {r.monthly_responses_used || 0} / {r.max_responses_per_month || 100}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "#525252", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {r.quota_reset_at ? new Date(r.quota_reset_at).toLocaleDateString("en-US") : "30 days"}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "#6f6f6f" }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("en-US") : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="sa-btn sa-btn-ghost sa-btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailModal(r);
                            }}
                          >
                            Details
                          </button>
                          {/* Dedicated User Activity Logs Button */}
                          <button
                            className="sa-btn sa-btn-secondary sa-btn-sm"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontWeight: 700,
                              color: "#0f62fe",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openUserLogs(r);
                            }}
                            title="View activity timeline & logs for this user"
                          >
                            <Activity size={12} />
                            Activity & Logs
                          </button>
                          <button
                            className="sa-btn sa-btn-ghost sa-btn-sm"
                            style={{ color: "#da1e28", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResetUserQuota(r.id, r.full_name || r.email);
                            }}
                            title="Reset consumed response quota to 0 and start new 30-day cycle"
                          >
                            <RotateCcw size={12} />
                            Reset Quota
                          </button>
                          <button
                            className="sa-btn sa-btn-ghost sa-btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImpersonateModal(r);
                            }}
                          >
                            Login as
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ Admins (No password display) ═══════════ */}
      {tab === "admins" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <div className="sa-section-title" style={{ margin: 0 }}>
              Super Administrators ({admins.length.toLocaleString()})
            </div>
            <div style={{ fontSize: "0.85rem", color: "#6f6f6f" }}>
              Administrators with full platform privileges. Primary god account is stealth-isolated.
            </div>
          </div>
          {admins.map((a) => (
            <div key={a.id} className="sa-admin-card">
              <div className="sa-admin-header">
                <div className="sa-admin-left">
                  <div className={`sa-admin-avatar ${a.is_owner ? "owner" : "normal"}`}>
                    {a.full_name?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                        {a.full_name || "—"}
                      </span>
                      {isPrimaryGodEmail(a.email) ? (
                        <span className="sa-tag sa-tag-orange" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          <Crown size={11} /> Primary Owner (God Mode)
                        </span>
                      ) : (
                        <span className="sa-tag sa-tag-blue" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          <Shield size={11} /> Secondary SuperAdmin
                        </span>
                      )}
                    </div>
                    <div className="sa-admin-email">{a.email}</div>
                    {a.phone && (
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#0f62fe",
                          fontWeight: 600,
                          marginTop: "0.15rem",
                        }}
                      >
                        {a.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    className={`sa-tag ${a.is_active ? "sa-tag-green" : "sa-tag-gray"}`}
                  >
                    {a.is_active ? "Active" : "Inactive"}
                  </span>
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      className="sa-btn sa-btn-secondary sa-btn-sm"
                      style={{ color: "#0f62fe", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 700 }}
                      onClick={() => openUserLogs(a)}
                      title="View activity timeline & logs"
                    >
                      <Activity size={12} />
                      Activity & Logs
                    </button>
                    <button
                      className="sa-btn sa-btn-ghost sa-btn-sm"
                      style={{ color: "#0f62fe" }}
                      onClick={() => {
                        setDetailModal(a);
                        setPasswordVisible(true);
                      }}
                    >
                      Edit / Change Role
                    </button>
                    {isCallerGod && !a.is_owner && (
                      <button
                        className="sa-btn sa-btn-danger sa-btn-sm"
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to demote "${a.email}" from SuperAdmin back to regular user?`)) return;
                          try {
                            try {
                              await adminAction("update_role", {
                                target_user_id: a.id,
                                new_role: "manager",
                              });
                            } catch {
                              await supabase.from("user_roles").delete().eq("user_id", a.id);
                              const { error } = await supabase
                                .from("user_roles")
                                .insert({ user_id: a.id, role_id: "manager", active: true });
                              if (error) throw error;
                              await supabase.from("profiles").update({ max_forms: 5, max_responses_per_month: 100, plan: "free" }).eq("id", a.id);
                            }
                            showToast(`User "${a.email}" has been demoted to regular user.`);
                            loadAdmins();
                            loadUsers();
                          } catch (err) {
                            showToast("Error demoting admin: " + err.message, "error");
                          }
                        }}
                      >
                        Demote Admin
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {!a.is_owner && (
                <div className="sa-perms">
                  {[
                    "create_form",
                    "edit_form",
                    "delete_form",
                    "publish_form",
                    "view_responses",
                    "view_analytics",
                    "export_excel",
                    "manage_managers",
                    "manage_sms",
                    "manage_telegram",
                  ].map((perm) => {
                    const has = a.role === "admin"
                      ? (!a.permissions || a.permissions.length === 0 || a.permissions.includes(perm))
                      : a.permissions?.includes(perm);
                    return (
                      <button
                        key={perm}
                        disabled={!isCallerGod}
                        title={!isCallerGod ? "Only Primary God Owner can modify administrator permissions" : undefined}
                        onClick={() =>
                          toggleAdminPermission(a.id, perm, a.permissions && a.permissions.length > 0 ? a.permissions : [
                            "create_form", "edit_form", "delete_form", "publish_form",
                            "view_responses", "view_analytics", "export_excel",
                            "manage_managers", "manage_sms", "manage_telegram"
                          ])
                        }
                        className={`sa-perm ${has ? "active" : "inactive"} ${!isCallerGod ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
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

      {/* ═══════════ Auth & Activity Logs (God Mode) ═══════════ */}
      {tab === "auth_logs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Top Bar with Metrics & Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div>
              <div className="sa-section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Activity size={18} color="#0f62fe" />
                Authentication & Activity Audit Trail ({filteredAuthLogs.length.toLocaleString()})
              </div>
              <div style={{ fontSize: "0.8rem", color: "#525252", marginTop: "0.2rem" }}>
                Comprehensive security monitor: Track user sign-ins, device footprints, security actions, and timestamps.
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <button
                className="sa-btn sa-btn-primary"
                onClick={loadAuthLogs}
                disabled={authLogsLoading}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <RefreshCw size={12} className={authLogsLoading ? "animate-spin" : ""} />
                {authLogsLoading ? "Refreshing..." : "Refresh"}
              </button>

              {/* CSV Export */}
              <button
                className="sa-btn sa-btn-secondary"
                onClick={() => {
                  try {
                    const headers = ["ID", "Email", "Full Name", "Phone", "Action", "Device", "OS", "Browser", "Country", "City", "Timestamp"];
                    const rows = filteredAuthLogs.map((l) => [
                      `"${l.id || ""}"`,
                      `"${l.email || ""}"`,
                      `"${l.full_name || ""}"`,
                      `"${l.phone || l.details?.phone || ""}"`,
                      `"${l.action || ""}"`,
                      `"${l.device || ""}"`,
                      `"${l.os || ""}"`,
                      `"${l.browser || ""}"`,
                      `"${l.details?.country || ""}"`,
                      `"${l.details?.city || ""}"`,
                      `"${l.created_at ? new Date(l.created_at).toISOString() : ""}"`,
                    ]);
                    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `auth_activity_logs_${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast("Exported auth logs CSV");
                  } catch (err) {
                    showToast("Export CSV error: " + err.message, "error");
                  }
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <Download size={12} />
                Export CSV
              </button>

              {/* JSON Export */}
              <button
                className="sa-btn sa-btn-ghost"
                onClick={() => {
                  try {
                    const blob = new Blob([JSON.stringify(filteredAuthLogs, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `auth_activity_logs_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast("Exported auth logs JSON");
                  } catch (err) {
                    showToast("Export JSON error: " + err.message, "error");
                  }
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <Download size={12} />
                Export JSON
              </button>
            </div>
          </div>

          {/* Metric Badges Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="sa-card" style={{ padding: "0.75rem 1rem", borderTop: "3px solid #0f62fe" }}>
              <div style={{ fontSize: "0.75rem", color: "#525252", fontWeight: 700, textTransform: "uppercase" }}>
                Total Recorded Events
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#161616", marginTop: "0.2rem" }}>
                {authLogs.length.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6f6f6f", marginTop: "0.15rem" }}>
                All auth sessions captured
              </div>
            </div>

            <div className="sa-card" style={{ padding: "0.75rem 1rem", borderTop: "3px solid #8a3ffc" }}>
              <div style={{ fontSize: "0.75rem", color: "#525252", fontWeight: 700, textTransform: "uppercase" }}>
                Unique Users
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#8a3ffc", marginTop: "0.2rem" }}>
                {authLogsGroupedByUser.length.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6f6f6f", marginTop: "0.15rem" }}>
                Active user accounts
              </div>
            </div>

            <div className="sa-card" style={{ padding: "0.75rem 1rem", borderTop: "3px solid #1192e8" }}>
              <div style={{ fontSize: "0.75rem", color: "#525252", fontWeight: 700, textTransform: "uppercase" }}>
                Active in 24 Hours
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1192e8", marginTop: "0.2rem" }}>
                {activeLast24hCount.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6f6f6f", marginTop: "0.15rem" }}>
                Recent authentications
              </div>
            </div>

            <div className="sa-card" style={{ padding: "0.75rem 1rem", borderTop: "3px solid #198038" }}>
              <div style={{ fontSize: "0.75rem", color: "#525252", fontWeight: 700, textTransform: "uppercase" }}>
                Total Logins
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#198038", marginTop: "0.2rem" }}>
                {authLogs.filter((l) => l.action?.includes("login")).length.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6f6f6f", marginTop: "0.15rem" }}>
                Successful logins
              </div>
            </div>

            <div className="sa-card" style={{ padding: "0.75rem 1rem", borderTop: "3px solid #da1e28" }}>
              <div style={{ fontSize: "0.75rem", color: "#525252", fontWeight: 700, textTransform: "uppercase" }}>
                Registrations
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#da1e28", marginTop: "0.2rem" }}>
                {authLogs.filter((l) => l.action === "register").length.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6f6f6f", marginTop: "0.15rem" }}>
                New account signups
              </div>
            </div>

            <div className="sa-card" style={{ padding: "0.75rem 1rem", borderTop: "3px solid #ff832b" }}>
              <div style={{ fontSize: "0.75rem", color: "#525252", fontWeight: 700, textTransform: "uppercase" }}>
                Logouts
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ff832b", marginTop: "0.2rem" }}>
                {authLogs.filter((l) => l.action === "logout").length.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6f6f6f", marginTop: "0.15rem" }}>
                Signout events
              </div>
            </div>
          </div>

          {/* View Mode Tabs & Filter Controls */}
          <div className="sa-card" style={{ padding: "0.75rem 1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Row 1: View Mode Switcher */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.35rem", background: "#f4f4f4", padding: "0.25rem", border: "1px solid #e0e0e0" }}>
                  <button
                    onClick={() => setAuthLogsViewMode("stream")}
                    style={{
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      background: authLogsViewMode === "stream" ? "#0f62fe" : "transparent",
                      color: authLogsViewMode === "stream" ? "#ffffff" : "#525252",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <ListOrdered size={13} />
                    Live Stream ({filteredAuthLogs.length})
                  </button>
                  <button
                    onClick={() => setAuthLogsViewMode("user_grouped")}
                    style={{
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      background: authLogsViewMode === "user_grouped" ? "#0f62fe" : "transparent",
                      color: authLogsViewMode === "user_grouped" ? "#ffffff" : "#525252",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <Users size={13} />
                    Grouped by User ({authLogsGroupedByUser.length})
                  </button>
                </div>

                {/* Timeframe selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#525252" }}>Timeframe:</span>
                  {[
                    { id: "all", label: "All Time" },
                    { id: "24h", label: "Last 24h" },
                    { id: "7d", label: "Last 7 Days" },
                    { id: "30d", label: "Last 30 Days" },
                  ].map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => setAuthLogsTimeframe(tf.id)}
                      className={`sa-perm ${authLogsTimeframe === tf.id ? "active" : "inactive"}`}
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Action Filters & Search Box */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: "All Actions" },
                    { id: "login", label: "Logins Only" },
                    { id: "register", label: "Registrations Only" },
                    { id: "logout", label: "Logouts" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setAuthLogsFilter(f.id)}
                      className={`sa-perm ${authLogsFilter === f.id ? "active" : "inactive"}`}
                      style={{ fontSize: "0.78rem", padding: "0.3rem 0.55rem" }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ flex: 1, minWidth: "240px", marginLeft: "auto" }}>
                  <div style={{ position: "relative" }}>
                    <Search size={13} color="#8d8d8d" style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      placeholder="Filter by Email, Name, Browser, OS, City..."
                      value={authLogsSearch}
                      onChange={(e) => setAuthLogsSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.4rem 0.65rem 0.4rem 1.8rem",
                        border: "1px solid #c6c6c6",
                        fontSize: "0.8rem",
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VIEW 1: Stream View (Timeline Table) */}
          {authLogsViewMode === "stream" && (
            <div className="sa-card">
              <div className="sa-card-header">
                <span className="sa-section-title" style={{ margin: 0 }}>
                  Authentication Stream ({filteredAuthLogs.length})
                </span>
                <span style={{ fontSize: "0.8rem", color: "#6f6f6f" }}>
                  Click User Timeline to inspect complete activity history
                </span>
              </div>
              <div className="sa-card-body">
                {filteredAuthLogs.length === 0 ? (
                  <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#6f6f6f" }}>
                    <Activity size={28} color="#a8a8a8" style={{ margin: "0 auto 0.5rem auto" }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>No auth records match the criteria</p>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem" }}>
                      Logins and registrations will appear here automatically with their device details.
                    </p>
                  </div>
                ) : (
                  <div className="sa-table-wrap">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>User / Account</th>
                          <th>Action</th>
                          <th>Device & OS</th>
                          <th>Browser</th>
                          <th>Location</th>
                          <th>Timestamp</th>
                          <th>Inspect</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAuthLogs.map((r, i) => {
                          const isReg = r.action === "register";
                          const isLogin = r.action?.includes("login");
                          const isLogout = r.action === "logout";
                          const isPhone = r.phone || r.details?.phone;
                          const hasGeo = r.details?.city || r.details?.country;

                          return (
                            <tr key={r.id || i}>
                              {/* User */}
                              <td>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#161616" }}>
                                    {r.email || (r.user_id ? `User: ${String(r.user_id).slice(0, 8)}...` : "Anonymous")}
                                  </div>
                                  {r.full_name && (
                                    <div style={{ fontSize: "0.75rem", color: "#525252" }}>
                                      {r.full_name}
                                    </div>
                                  )}
                                  {isPhone && (
                                    <div style={{ fontSize: "0.72rem", color: "#0f62fe", fontWeight: 600 }}>
                                      {isPhone}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Action Badge */}
                              <td>
                                <span
                                  className={`sa-tag ${
                                    isReg
                                      ? "sa-tag-purple"
                                      : isLogin
                                      ? "sa-tag-green"
                                      : isLogout
                                      ? "sa-tag-gray"
                                      : "sa-tag-blue"
                                  }`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {isReg && <UserPlus size={11} />}
                                  {isLogin && <LogIn size={11} />}
                                  {isLogout && <LogOut size={11} />}
                                  {r.action}
                                </span>
                              </td>

                              {/* Device & OS */}
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
                                  {r.device === "Mobile" ? (
                                    <Smartphone size={13} color="#525252" />
                                  ) : r.device === "Tablet" ? (
                                    <Tablet size={13} color="#525252" />
                                  ) : (
                                    <Monitor size={13} color="#525252" />
                                  )}
                                  <span style={{ fontWeight: 600 }}>{r.device || "Desktop"}</span>
                                  <span style={{ color: "#8d8d8d" }}>•</span>
                                  <span style={{ color: "#525252" }}>{r.os || "—"}</span>
                                </div>
                              </td>

                              {/* Browser */}
                              <td style={{ fontSize: "0.85rem", color: "#161616", fontWeight: 600 }}>
                                {r.browser || "—"}
                              </td>

                              {/* Location */}
                              <td>
                                {hasGeo ? (
                                  <span style={{ fontSize: "0.8rem", color: "#161616", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                    <MapPin size={11} color="#0f62fe" />
                                    {[r.details.city, r.details.country].filter(Boolean).join(", ")}
                                  </span>
                                ) : (
                                  <span style={{ color: "#c6c6c6", fontSize: "0.8rem" }}>—</span>
                                )}
                              </td>

                              {/* Timestamp */}
                              <td style={{ fontSize: "0.82rem", color: "#525252", whiteSpace: "nowrap" }}>
                                {r.created_at ? new Date(r.created_at).toLocaleString("en-US") : "—"}
                              </td>

                              {/* Actions */}
                              <td>
                                <div style={{ display: "flex", gap: "0.25rem" }}>
                                  <button
                                    className="sa-btn sa-btn-ghost sa-btn-sm"
                                    style={{ color: "#0f62fe", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                                    onClick={() => {
                                      const matchingUser = users.find((u) => u.id === r.user_id || u.email === r.email) ||
                                        admins.find((a) => a.id === r.user_id || a.email === r.email) ||
                                        { id: r.user_id, email: r.email, full_name: r.full_name || r.email?.split("@")[0] };
                                      openUserLogs(matchingUser);
                                    }}
                                    title="View complete user activity history"
                                  >
                                    <History size={12} />
                                    Timeline
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: Grouped by User (List activity per user account) */}
          {authLogsViewMode === "user_grouped" && (
            <div className="sa-card">
              <div className="sa-card-header">
                <div>
                  <span className="sa-section-title" style={{ margin: 0 }}>
                    User Activity Profiles ({authLogsGroupedByUser.length} Users)
                  </span>
                  <div style={{ fontSize: "0.8rem", color: "#6f6f6f", marginTop: "0.15rem" }}>
                    Track all sessions and activity volume per user account.
                  </div>
                </div>
              </div>
              <div className="sa-card-body">
                {authLogsGroupedByUser.length === 0 ? (
                  <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#6f6f6f" }}>
                    No user auth data available.
                  </div>
                ) : (
                  <div className="sa-table-wrap">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>User Account</th>
                          <th>Total Activity Hits</th>
                          <th>Devices & Platforms</th>
                          <th>Last Active</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authLogsGroupedByUser.map((u) => {
                          const matchingUser = users.find((usr) => usr.id === u.userId || usr.email === u.email) ||
                            admins.find((adm) => adm.id === u.userId || adm.email === u.email) ||
                            { id: u.userId, email: u.email, full_name: u.fullName || u.email?.split("@")[0] };

                          return (
                            <tr key={u.userKey}>
                              {/* User Info */}
                              <td>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#161616" }}>
                                    {u.email || u.userKey}
                                  </div>
                                  {u.fullName && (
                                    <div style={{ fontSize: "0.75rem", color: "#525252" }}>
                                      {u.fullName}
                                    </div>
                                  )}
                                  {u.phone && (
                                    <div style={{ fontSize: "0.72rem", color: "#0f62fe", fontWeight: 600 }}>
                                      {u.phone}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Total hits */}
                              <td>
                                <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "#161616" }}>
                                  {u.count.toLocaleString()}
                                </span>
                              </td>

                              {/* Devices */}
                              <td>
                                <div style={{ fontSize: "0.78rem", color: "#525252" }}>
                                  <div>{u.devicesList.join(", ") || "Desktop"}</div>
                                  <div style={{ color: "#8d8d8d" }}>{u.browsersList.join(", ") || "—"}</div>
                                </div>
                              </td>

                              {/* Last Active */}
                              <td style={{ fontSize: "0.8rem", color: "#161616", fontWeight: 600, whiteSpace: "nowrap" }}>
                                {new Date(u.last_seen).toLocaleString("en-US")}
                              </td>

                              {/* Actions */}
                              <td>
                                <button
                                  className="sa-btn sa-btn-ghost sa-btn-sm"
                                  onClick={() => openUserLogs(matchingUser)}
                                  style={{ color: "#0f62fe", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem" }}
                                >
                                  <History size={12} />
                                  User Timeline
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Vercel ═══════════ */}
      {tab === "vercel" && (
        <div className="flex flex-col gap-4">
          <div className="sa-card">
            <div className="sa-card-body">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showVercelToken ? "text" : "password"}
                    value={vercelToken}
                    onChange={(e) => setVercelToken(e.target.value)}
                    placeholder="Vercel API Token"
                    className="w-full bg-white border-2 border-ink/15 rounded-pill-md px-3 py-2 pl-9 text-xs font-semibold text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowVercelToken(!showVercelToken)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-navy transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    aria-label={showVercelToken ? "Hide token" : "Show token"}
                  >
                    {showVercelToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  className="sa-btn sa-btn-primary"
                  onClick={loadVercel}
                  disabled={vercelLoading || !vercelToken}
                >
                  {vercelLoading ? "..." : "Connect"}
                </button>
              </div>
            </div>
          </div>
          {vercelData.projects.length > 0 && (
            <StickerCard theme="navy">
              <div className="p-3.5">
                <h3 className="text-xs font-extrabold text-navy mb-2">Projects</h3>
                {vercelData.projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 py-1.5 border-b border-ink/10 last:border-0"
                  >
                    <span className="text-xs font-bold text-white flex-1">{p.name}</span>
                    <Badge
                      color={
                        p.latestDeployments?.[0]?.state === "READY" ? "green" : "gray"
                      }
                    >
                      {p.latestDeployments?.[0]?.state || "—"}
                    </Badge>
                  </div>
                ))}
              </div>
            </StickerCard>
          )}
          {vercelData.deployments.length > 0 && (
            <div className="overflow-x-auto border-2 border-ink/10 rounded-pill-md bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-bg-lavender border-b-2 border-ink/10">
                    <th className="text-left py-2 px-3 text-xs font-extrabold text-navy uppercase">
                      Project
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-extrabold text-navy uppercase">
                      Status
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-extrabold text-navy uppercase">
                      Time
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-extrabold text-navy uppercase">
                      URL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vercelData.deployments.map((r, i) => (
                    <tr
                      key={r.id || i}
                      className={`border-b border-ink/5 last:border-0 ${
                        i % 2 ? "bg-bg-lavender/30" : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-navy">{r.name}</td>
                      <td className="py-2 px-3">
                        <Badge color={r.state === "READY" ? "green" : "gray"}>
                          {r.state}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-xs font-semibold text-ink-subtle">
                        {new Date(r.created).toLocaleString()}
                      </td>
                      <td className="py-2 px-3">
                        <a
                          href={`https://${r.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-teal-text hover:underline"
                        >
                          {r.url}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!vercelToken && (
            <div className="bg-bg-lavender border-2 border-ink/10 rounded-pill-md p-6 text-center text-xs font-semibold text-ink-subtle">
              Enter your Vercel API token to monitor deployments
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Logs ═══════════ */}
      {tab === "logs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="flex gap-2">
            <button
              className="sa-btn sa-btn-primary"
              onClick={() => {
                loadActivity();
                loadErrors();
              }}
            >
              Refresh All
            </button>
            <button
              className="sa-btn sa-btn-ghost"
              onClick={async () => {
                try {
                  await supabase.rpc("log_activity", {
                    p_action: "test_log",
                    p_target_type: "system",
                    p_details: { test: true },
                  });
                  showToast("Test log created");
                  loadActivity();
                } catch (err) {
                  showToast("Error: " + err.message, "error");
                }
              }}
            >
              + Test Log
            </button>
          </div>

          {/* Activity */}
          <div className="sa-card">
            <div className="sa-card-header">
              <span className="sa-section-title" style={{ margin: 0 }}>
                System Activity Log ({activityLog.length.toLocaleString()})
              </span>
              <button className="sa-btn sa-btn-ghost" onClick={loadActivity}>
                Refresh
              </button>
            </div>
            <div className="sa-card-body">
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Target</th>
                      <th>Details</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLog.map((r, i) => (
                      <tr key={r.id || i}>
                        <td>
                          <span className="sa-tag sa-tag-blue">{r.action}</span>
                        </td>
                        <td>
                          {r.target_type}/{r.target_id || "—"}
                        </td>
                        <td
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "0.85rem",
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.details ? JSON.stringify(r.details).slice(0, 50) : "—"}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "#6f6f6f" }}>
                          {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className="sa-card" style={{ borderColor: "#a2191f" }}>
            <div className="sa-card-header">
              <span className="sa-section-title" style={{ margin: 0, color: "#da1e28" }}>
                Error Log ({errorLog.length.toLocaleString()})
              </span>
              <button className="sa-btn sa-btn-ghost" onClick={loadErrors}>
                Refresh
              </button>
            </div>
            <div className="sa-card-body">
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Message</th>
                      <th>URL</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorLog.map((r, i) => (
                      <tr key={r.id || i}>
                        <td
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "#da1e28",
                          }}
                        >
                          {r.source}
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.message}</td>
                        <td
                          style={{
                            fontSize: "0.85rem",
                            color: "#6f6f6f",
                            maxWidth: 150,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.url || "—"}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "#6f6f6f" }}>
                          {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ SQL Runner ═══════════ */}
      {tab === "query" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="sa-card">
            <div className="sa-card-body sa-sql">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={3}
                placeholder="SELECT * FROM forms LIMIT 10;"
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  className="sa-btn sa-btn-primary"
                  onClick={runSql}
                  disabled={sqlRunning || !sqlQuery.trim()}
                >
                  {sqlRunning ? "Running..." : "Run Query"}
                </button>
                <button
                  className="sa-btn sa-btn-secondary"
                  onClick={() => {
                    setSqlQuery("");
                    setSqlResult(null);
                    setSqlError(null);
                  }}
                >
                  Clear
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.25rem",
                  marginTop: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                {tables.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSqlQuery(`SELECT * FROM ${t} LIMIT 20;`)}
                    className="sa-perm inactive"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {sqlError && (
            <div
              style={{
                background: "#fff1f1",
                border: "1px solid #a2191f",
                padding: "0.5rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#a2191f",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {sqlError}
            </div>
          )}
          {sqlResult && Array.isArray(sqlResult) && sqlResult.length > 0 && (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    {Object.keys(sqlResult[0]).map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sqlResult.map((r, i) => (
                    <tr key={i}>
                      {Object.keys(sqlResult[0]).map((k) => {
                        const v = r[k];
                        return (
                          <td key={k}>
                            {v === null ? (
                              <span style={{ color: "#c6c6c6" }}>—</span>
                            ) : typeof v === "object" ? (
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  maxWidth: 120,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "block",
                                }}
                              >
                                {JSON.stringify(v).slice(0, 40)}
                              </span>
                            ) : (
                              String(v).slice(0, 60)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sqlResult && !Array.isArray(sqlResult) && (
            <pre
              style={{
                background: "#f4f4f4",
                border: "1px solid #e0e0e0",
                padding: "0.75rem",
                fontSize: "0.8rem",
                fontFamily: "'IBM Plex Mono', monospace",
                overflow: "auto",
                maxHeight: 400,
                color: "#161616",
              }}
            >
              {JSON.stringify(sqlResult, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* ═══════════ Edit Table Record Modal ═══════════ */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={`${editModal?.isNew ? "Create" : "Edit"} Record: ${editModal?.table || ""}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Object.entries(editForm).map(([key, val]) => {
            if (key === "id" || key === "created_at") return null;
            const inputStyle = {
              width: "100%",
              padding: "0.5rem 0.75rem",
              border: "1px solid #c6c6c6",
              fontSize: "0.8rem",
              fontFamily: "'IBM Plex Sans', sans-serif",
              outline: "none",
            };
            return (
              <div key={key}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#525252",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                  }}
                >
                  {key.replace(/_/g, " ")}
                </label>
                {typeof val === "boolean" ? (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.checked })}
                      style={{ width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: "0.8rem" }}>{val ? "Active" : "Inactive"}</span>
                  </label>
                ) : typeof val === "object" ? (
                  <textarea
                    value={JSON.stringify(val, null, 2)}
                    onChange={(e) => {
                      try {
                        setEditForm({ ...editForm, [key]: JSON.parse(e.target.value) });
                      } catch {}
                    }}
                    rows={3}
                    style={{
                      ...inputStyle,
                      fontFamily: "'IBM Plex Mono', monospace",
                      resize: "vertical",
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={val ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    style={inputStyle}
                  />
                )}
              </div>
            );
          })}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "flex-end",
              paddingTop: "0.5rem",
              borderTop: "1px solid #e0e0e0",
            }}
          >
            <button className="sa-btn sa-btn-primary" onClick={saveRecord}>
              Save
            </button>
            <button className="sa-btn sa-btn-secondary" onClick={() => setEditModal(null)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══════════ User Details Modal (No password display, No plan row, with Logs button) ═══════════ */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={`${detailModal?.is_owner ? "Owner" : "User Details"}: ${
          detailModal?.full_name || detailModal?.email || ""
        }`}
      >
        {detailModal && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              fontSize: "0.85rem",
            }}
          >
            {/* Quick Actions at Top of Detail Modal */}
            <div
              className="sa-modal-box"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                User Audit & Diagnostics:
              </span>
              <button
                className="sa-btn sa-btn-primary sa-btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                onClick={() => {
                  const targetUser = detailModal;
                  setDetailModal(null);
                  openUserLogs(targetUser);
                }}
              >
                <FileText size={13} />
                View User Activity Logs
              </button>
            </div>

            {/* Basic Info (NO password, NO plan) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {[
                ["User ID", detailModal.id],
                ["Email", detailModal.email],
                ["Full Name", detailModal.full_name || "—"],
                ["Phone Number", detailModal.phone || "—"],
                ["System Role", detailModal.role || "manager"],
                ["Form Quota", (detailModal.is_owner || detailModal.max_forms >= 999999 || detailModal.plan === "unlimited") ? "Unlimited ✨" : `${detailModal.max_forms ?? 5} allowed`],
                ["SuperAdmin / Owner", detailModal.is_owner ? "Yes" : "No"],
                ["Account Status", detailModal.is_active ? "Active" : "Inactive"],
                ["Monthly Responses", (detailModal.is_owner || detailModal.max_responses_per_month >= 999999 || detailModal.plan === "unlimited") ? `${detailModal.monthly_responses_used ?? 0} used (Unlimited ✨)` : `${detailModal.monthly_responses_used ?? 0} / ${detailModal.max_responses_per_month ?? 100} used`],
                ["Quota Reset Date", detailModal.quota_reset_at ? new Date(detailModal.quota_reset_at).toLocaleDateString() : "—"],
                [
                  "Joined Date",
                  detailModal.created_at
                    ? new Date(detailModal.created_at).toLocaleString()
                    : "—",
                ],
                ["Hidden From", `${detailModal.hidden_from?.length || 0} admins`],
              ].map(([label, value]) => (
                <div key={label}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#6f6f6f" }}>
                    {label}
                  </span>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: label === "Phone Number" ? "#0f62fe" : "#161616",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Authentication & Security History */}
            <div className="sa-modal-box-blue">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f62fe", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                  <Activity size={14} /> Recent Authentication History ({detailActivityHistory.length})
                </span>
                <button
                  type="button"
                  className="sa-btn sa-btn-ghost sa-btn-sm"
                  style={{ fontSize: "0.75rem", color: "#0f62fe" }}
                  onClick={() => {
                    const targetUser = detailModal;
                    setDetailModal(null);
                    openUserLogs(targetUser);
                  }}
                >
                  Inspect Complete Audit Logs →
                </button>
              </div>

              {detailActivityLoading ? (
                <div style={{ fontSize: "0.8rem", color: "#6f6f6f", padding: "0.5rem 0" }}>Loading activity history...</div>
              ) : detailActivityHistory.length === 0 ? (
                <div className="sa-modal-box" style={{ fontSize: "0.8rem", borderStyle: "dashed" }}>
                  No dedicated auth logs recorded for this user yet.
                </div>
              ) : (
                <div className="sa-table-wrap" style={{ maxHeight: "160px", overflowY: "auto" }}>
                  <table className="sa-table" style={{ fontSize: "0.75rem" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "0.3rem 0.5rem" }}>Action</th>
                        <th style={{ padding: "0.3rem 0.5rem" }}>Device / Browser</th>
                        <th style={{ padding: "0.3rem 0.5rem" }}>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailActivityHistory.slice(0, 15).map((log, lIdx) => (
                        <tr key={log.id || lIdx}>
                          <td style={{ padding: "0.3rem 0.5rem" }}>
                            <span className={`sa-tag ${log.action === "register" ? "sa-tag-purple" : log.action?.includes("login") ? "sa-tag-green" : "sa-tag-blue"}`} style={{ fontSize: "0.7rem", padding: "0.1rem 0.35rem" }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: "0.3rem 0.5rem" }}>
                            {log.device || "Desktop"} · {log.browser || "—"} ({log.os || "—"})
                          </td>
                          <td style={{ padding: "0.3rem 0.5rem", whiteSpace: "nowrap" }}>
                            {log.created_at ? new Date(log.created_at).toLocaleString("en-US") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Edit Name & Phone */}
            <div className="sa-modal-box">
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Edit Profile Info
              </span>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  placeholder="Full Name"
                  value={detailModal.full_name || ""}
                  onChange={(e) =>
                    setDetailModal({ ...detailModal, full_name: e.target.value })
                  }
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.8rem",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    outline: "none",
                  }}
                />
                <input
                  type="tel"
                  placeholder="Phone (09xxxxxxxxx)"
                  value={detailModal.phone || ""}
                  onChange={(e) =>
                    setDetailModal({ ...detailModal, phone: e.target.value })
                  }
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.8rem",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    outline: "none",
                  }}
                />
                <button
                  className="sa-btn sa-btn-primary"
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from("profiles")
                        .update({
                          full_name: detailModal.full_name,
                          phone: detailModal.phone,
                        })
                        .eq("id", detailModal.id);
                      if (error) throw error;
                      showToast("Profile details updated successfully");
                      loadUsers();
                      loadAdmins();
                    } catch (err) {
                      showToast("Error: " + err.message, "error");
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            {/* User Quota & Limits (Forms & Responses) Editor */}
            <div className="sa-modal-box-blue">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#0f62fe",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <Zap size={13} /> Active Forms & Monthly Quotas (Manual Override)
                </span>
                <span className="sa-tag sa-tag-blue" style={{ fontSize: "0.85rem" }}>
                  SuperAdmin Limit Control
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <button
                  type="button"
                  className={`sa-btn sa-btn-sm ${
                    Number(detailMaxForms) >= 999999 && Number(detailMaxResponses) >= 999999
                      ? "sa-btn-primary"
                      : "sa-btn-secondary"
                  }`}
                  style={{ flex: 1, fontSize: "0.8rem" }}
                  onClick={() => {
                    setDetailMaxForms(999999);
                    setDetailMaxResponses(999999);
                  }}
                >
                  ⚡ Set Unlimited (Forms & Submissions)
                </button>
                <button
                  type="button"
                  className={`sa-btn sa-btn-sm ${
                    Number(detailMaxForms) === 5 && Number(detailMaxResponses) === 100
                      ? "sa-btn-primary"
                      : "sa-btn-secondary"
                  }`}
                  style={{ flex: 1, fontSize: "0.8rem" }}
                  onClick={() => {
                    setDetailMaxForms(5);
                    setDetailMaxResponses(100);
                  }}
                >
                  Standard Quota (5 forms / 100 resp)
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: "0.2rem",
                    }}
                  >
                    Max Active Forms
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999999"
                    value={detailMaxForms}
                    onChange={(e) => setDetailMaxForms(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.4rem 0.5rem",
                      fontSize: "0.8rem",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: "0.2rem",
                    }}
                  >
                    Max Monthly Responses
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999999"
                    step="10"
                    value={detailMaxResponses}
                    onChange={(e) => setDetailMaxResponses(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.4rem 0.5rem",
                      fontSize: "0.8rem",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: "0.2rem",
                    }}
                  >
                    Responses Consumed
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="9999999"
                    value={detailResponsesUsed}
                    onChange={(e) => setDetailResponsesUsed(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.4rem 0.5rem",
                      fontSize: "0.8rem",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "0.4rem",
                  borderTop: "1px solid rgba(140, 140, 140, 0.2)",
                }}
              >
                <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                  Next reset:{" "}
                  <b>
                    {detailModal.quota_reset_at
                      ? new Date(detailModal.quota_reset_at).toLocaleDateString()
                      : "30-day cycle"}
                  </b>
                </div>

                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    type="button"
                    className="sa-btn sa-btn-secondary sa-btn-sm"
                    style={{
                      color: "#da1e28",
                      borderColor: "#da1e28",
                      fontSize: "0.85rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                    onClick={async () => {
                      await handleResetUserQuota(
                        detailModal.id,
                        detailModal.full_name || detailModal.email
                      );
                      setDetailResponsesUsed(0);
                      setDetailModal({
                        ...detailModal,
                        monthly_responses_used: 0,
                        quota_reset_at: new Date(Date.now() + 30 * 86400000).toISOString(),
                      });
                    }}
                  >
                    <RotateCcw size={12} />
                    Reset to 0
                  </button>

                  <button
                    type="button"
                    className="sa-btn sa-btn-primary sa-btn-sm"
                    style={{ fontSize: "0.85rem" }}
                    disabled={detailQuotaSaving}
                    onClick={handleSaveDetailQuota}
                  >
                    {detailQuotaSaving ? "Saving..." : "Save Quotas"}
                  </button>
                </div>
              </div>
            </div>

            {/* Set New Password Form (Without displaying old passwords) */}
            <div className="sa-modal-box-blue">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.35rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#0f62fe",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <Key size={13} /> Set New Password (Admin Override)
                </span>
                <span className="sa-tag sa-tag-blue" style={{ fontSize: "0.85rem" }}>
                  SuperAdmin Control
                </span>
              </div>

              <p style={{ fontSize: "0.85rem", opacity: 0.8, margin: "0 0 0.5rem 0" }}>
                Enter a new password below to immediately overwrite and update the user's password.
              </p>

              <form
                onSubmit={(e) => e.preventDefault()}
                style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
              >
                <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
                  <input
                    type={passwordVisible ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password (min 6 characters)"
                    autoComplete="new-password"
                    style={{
                      width: "100%",
                      padding: "0.5rem 2rem 0.5rem 0.75rem",
                      fontSize: "0.8rem",
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    style={{
                      position: "absolute",
                      right: "0.5rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {passwordVisible ? (
                      <EyeOff size={14} color="#6f6f6f" />
                    ) : (
                      <Eye size={14} color="#6f6f6f" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  className="sa-btn sa-btn-secondary"
                  style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                  onClick={() => {
                    const randomPass = "Pk" + Math.floor(100000 + Math.random() * 900000);
                    setNewPassword(randomPass);
                    setPasswordVisible(true);
                    navigator.clipboard?.writeText?.(randomPass);
                    showToast(`Random password generated and copied: ${randomPass}`);
                  }}
                  title="Generate random secure password and copy to clipboard"
                >
                  <Dices size={13} /> Generate
                </button>

                <button
                  type="button"
                  className="sa-btn sa-btn-primary"
                  onClick={async () => {
                    if (!newPassword.trim() || newPassword.trim().length < 6) {
                      showToast("Password must be at least 6 characters", "error");
                      return;
                    }
                    if (
                      !confirm(
                        `Are you sure you want to change password for ${detailModal.email}?`
                      )
                    )
                      return;
                    try {
                      await adminAction("reset_password", {
                        target_user_id: detailModal.id,
                        new_password: newPassword.trim(),
                      });
                      showToast("User password updated successfully");
                      setNewPassword("");
                    } catch (err) {
                      showToast("Password reset error: " + err.message, "error");
                    }
                  }}
                >
                  Update Password
                </button>
              </form>
            </div>

            {/* Change Email */}
            <div className="sa-modal-box">
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Mail size={13} /> Change Email Address
              </span>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  type="email"
                  value={newEmail || detailModal.email || ""}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.8rem",
                    fontFamily: "'IBM Plex Sans', monospace",
                    outline: "none",
                  }}
                />
                <button
                  className="sa-btn sa-btn-primary"
                  onClick={async () => {
                    const emailToSet = newEmail.trim();
                    if (!emailToSet || !emailToSet.includes("@")) {
                      showToast("Invalid email address", "error");
                      return;
                    }
                    if (!confirm(`Change user email to ${emailToSet}?`)) return;
                    try {
                      await adminAction("update_email", {
                        target_user_id: detailModal.id,
                        new_email: emailToSet,
                      });
                      showToast("Email address updated successfully");
                      setDetailModal({ ...detailModal, email: emailToSet });
                      setNewEmail("");
                      loadUsers();
                      loadAdmins();
                    } catch (err) {
                      showToast("Error: " + err.message, "error");
                    }
                  }}
                >
                  Update Email
                </button>
              </div>
            </div>

            {/* Role Management (Promote / Demote SuperAdmin — God Only) */}
            {!detailModal.is_owner && (
              <div className="sa-modal-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <Shield size={14} color="#0f62fe" />
                    System Role
                  </span>
                  {isCallerGod ? (
                    <span style={{ fontSize: "0.8125rem", color: "#eb6200", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      <Crown size={14} /> Primary God Control
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.8125rem", opacity: 0.75, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      <Lock size={13} /> Role modification restricted to Primary God Owner
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                  {[
                    { id: "manager", label: "Regular User / Manager", desc: "Standard access to own forms & data" },
                    { id: "admin", label: "Super Administrator (SuperAdmin)", desc: "Full access to system management panel" },
                  ].map((r) => {
                    const isCurrent = detailModal.role === r.id;
                    return (
                      <button
                        key={r.id}
                        disabled={!isCallerGod}
                        onClick={async () => {
                          if (!isCallerGod) {
                            showToast("Only Primary God Owner can promote or demote SuperAdmins.", "error");
                            return;
                          }
                          try {
                            try {
                              await adminAction("update_role", {
                                target_user_id: detailModal.id,
                                new_role: r.id,
                              });
                            } catch {
                              await supabase.from("user_roles").delete().eq("user_id", detailModal.id);
                              const { error } = await supabase
                                .from("user_roles")
                                .insert({ user_id: detailModal.id, role_id: r.id, active: true });
                              if (error) throw error;
                              if (r.id === "admin") {
                                await supabase.from("profiles").update({ max_forms: 999999, max_responses_per_month: 999999, plan: "enterprise", can_use_telegram: true, can_export_excel: true }).eq("id", detailModal.id);
                              } else {
                                await supabase.from("profiles").update({ max_forms: 5, max_responses_per_month: 100, plan: "free" }).eq("id", detailModal.id);
                              }
                            }

                            showToast(r.id === "admin" ? `User "${detailModal.email}" promoted to SuperAdmin.` : `User role set to Manager.`);
                            setDetailModal({ ...detailModal, role: r.id });
                            loadUsers();
                            loadAdmins();
                          } catch (err) {
                            showToast("Error updating role: " + err.message, "error");
                          }
                        }}
                        className={`sa-btn ${isCurrent ? (r.id === "admin" ? "sa-btn-primary" : "sa-btn-primary") : "sa-btn-secondary"}`}
                        style={{
                          flex: 1,
                          minWidth: "160px",
                          padding: "0.5rem 0.85rem",
                          fontSize: "0.85rem",
                          cursor: isCallerGod ? "pointer" : "not-allowed",
                          opacity: !isCallerGod && !isCurrent ? 0.4 : 1,
                          textAlign: "left",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          {r.id === "admin" ? <Shield size={14} /> : <Users size={14} />}
                          <span>{r.label}</span>
                          {isCurrent && (
                            <span style={{ marginLeft: "auto", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                              <Check size={13} /> Current Role
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activate / Deactivate */}
            {!detailModal.is_owner && (
              <div className="sa-modal-box">
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Account Status
                </span>
                <div style={{ marginTop: "0.5rem" }}>
                  <button
                    onClick={async () => {
                      if (detailModal.is_owner) {
                        showToast("Cannot deactivate owner", "error");
                        return;
                      }
                      const newActive = !detailModal.is_active;
                      try {
                        const { error: profErr } = await supabase
                          .from("profiles")
                          .update({ is_active: newActive })
                          .eq("id", detailModal.id);
                        if (profErr) throw profErr;
                        const { error: roleErr } = await supabase
                          .from("user_roles")
                          .update({ active: newActive })
                          .eq("user_id", detailModal.id);
                        if (roleErr) throw roleErr;
                        showToast(newActive ? "Account Activated" : "Account Deactivated");
                        setDetailModal({ ...detailModal, is_active: newActive });
                        loadUsers();
                        loadAdmins();
                      } catch (err) {
                        showToast("Error: " + err.message, "error");
                      }
                    }}
                    className={`sa-btn ${
                      detailModal.is_active ? "sa-btn-danger" : "sa-btn-primary"
                    }`}
                  >
                    {detailModal.is_active ? "Deactivate Account" : "Activate Account"}
                  </button>
                </div>
              </div>
            )}

            {/* Permissions */}
            <div className="sa-modal-box">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Assigned Permissions
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f62fe" }}>
                  {detailModal.permissions?.length || 0} active
                </span>
              </div>
              <div className="sa-perms">
                {[
                  "create_form",
                  "edit_form",
                  "delete_form",
                  "publish_form",
                  "view_responses",
                  "view_analytics",
                  "export_excel",
                  "manage_managers",
                  "manage_sms",
                  "manage_telegram",
                  "view_admins",
                ].map((perm) => {
                  const has = detailModal.permissions?.includes(perm);
                  return (
                    <button
                      key={perm}
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
                          showToast(`Permission ${perm} ${has ? "removed" : "added"}`);
                          setDetailModal({ ...detailModal, permissions: newPerms });
                        } catch (err) {
                          showToast("Error: " + err.message, "error");
                        }
                      }}
                      className={`sa-perm ${has ? "active" : "inactive"}`}
                    >
                      {perm.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility Isolation */}
            <div className="sa-modal-box">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Visibility Restrictions
                </span>
                <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                  Hidden from {detailModal.hidden_from?.length || 0} administrators
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                Select administrators to hide this user profile from:
              </p>
              <div className="sa-perms">
                {admins
                  .filter((a) => !a.is_owner && a.id !== detailModal.id)
                  .map((a) => {
                    const isHidden = detailModal.hidden_from?.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={async () => {
                          const newHF = isHidden
                            ? (detailModal.hidden_from || []).filter((id) => id !== a.id)
                            : [...(detailModal.hidden_from || []), a.id];
                          const val = newHF.length > 0 ? newHF : null;
                          try {
                            const { error } = await supabase
                              .from("profiles")
                              .update({ hidden_from: val })
                              .eq("id", detailModal.id);
                            if (error) throw error;
                            showToast(`Visibility updated for ${a.full_name || a.email}`);
                            setDetailModal({ ...detailModal, hidden_from: val });
                          } catch (err) {
                            showToast("Error: " + err.message, "error");
                          }
                        }}
                        className={`sa-perm ${isHidden ? "active" : "inactive"}`}
                      >
                        {a.full_name || a.email} {isHidden ? "(hidden)" : ""}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div style={{ paddingTop: "0.5rem", borderTop: "1px solid rgba(140, 140, 140, 0.2)" }}>
              <button
                className="sa-btn sa-btn-primary"
                onClick={() => {
                  setImpersonateModal(detailModal);
                  setDetailModal(null);
                }}
              >
                Login as this user
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════ Dedicated User Activity & Auth Logs Modal ═══════════ */}
      <Modal
        open={userLogsModal}
        onClose={() => setUserLogsModal(false)}
        title={`Activity & Security History: ${selectedUserForLogs?.full_name || selectedUserForLogs?.email || "User"}`}
      >
        {selectedUserForLogs && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Header info bar */}
            <div
              className="sa-modal-box"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  {selectedUserForLogs.full_name || "—"} ({selectedUserForLogs.email})
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontFamily: "'IBM Plex Mono', monospace",
                    opacity: 0.75,
                  }}
                >
                  User ID: {selectedUserForLogs.id}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="sa-tag sa-tag-blue">
                  {userLogs.length} Total Events
                </span>
                <button
                  className="sa-btn sa-btn-ghost sa-btn-sm"
                  onClick={() => openUserLogs(selectedUserForLogs)}
                  disabled={userLogsLoading}
                >
                  <RefreshCw size={12} className={userLogsLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
                {userLogs.length > 0 && (
                  <button
                    className="sa-btn sa-btn-secondary sa-btn-sm"
                    onClick={() => exportUserLogs(selectedUserForLogs, userLogs)}
                  >
                    <Download size={12} />
                    Export JSON
                  </button>
                )}
              </div>
            </div>

            {/* Sub-tabs & Search Filter */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {[
                  { id: "all", label: `All (${userLogs.length})` },
                  { id: "auth", label: `Auth & Logins (${userLogs.filter((l) => l._type === "auth" || l.action === "login" || l.action === "register" || l.action === "logout").length})` },
                  { id: "activity", label: `Activities (${userLogs.filter((l) => l._type === "activity" && l.action !== "login" && l.action !== "register" && l.action !== "logout").length})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setUserLogsTab(st.id)}
                    className={`sa-perm ${userLogsTab === st.id ? "active" : "inactive"}`}
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, minWidth: "200px", marginLeft: "auto" }}>
                <input
                  type="text"
                  placeholder="Search user actions, details..."
                  value={userLogsSearch}
                  onChange={(e) => setUserLogsSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.35rem 0.55rem",
                    border: "1px solid #c6c6c6",
                    fontSize: "0.8rem",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Logs Table */}
            {userLogsLoading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6f6f6f" }}>
                Loading activity & auth logs...
              </div>
            ) : filteredUserLogs.length === 0 ? (
              <div
                className="sa-modal-box"
                style={{
                  padding: "2.5rem 1rem",
                  textAlign: "center",
                  borderStyle: "dashed",
                }}
              >
                <FileText size={24} style={{ margin: "0 auto 0.5rem auto", opacity: 0.6 }} />
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem" }}>
                  No logs found for this filter
                </p>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", opacity: 0.7 }}>
                  Try changing the search filter or sub-tab.
                </p>
              </div>
            ) : (
              <div className="sa-table-wrap" style={{ maxHeight: "380px", overflowY: "auto" }}>
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Target / Context</th>
                      <th>Device & Browser</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUserLogs.map((log, idx) => {
                      const isReg = log.action === "register";
                      const isLogin = log.action?.includes("login");
                      const isLogout = log.action === "logout";

                      return (
                        <tr key={log.id || idx}>
                          <td>
                            <span
                              className={`sa-tag ${
                                isReg
                                  ? "sa-tag-purple"
                                  : isLogin
                                  ? "sa-tag-green"
                                  : isLogout
                                  ? "sa-tag-gray"
                                  : "sa-tag-blue"
                              }`}
                              style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                            >
                              {isReg && <UserPlus size={10} />}
                              {isLogin && <LogIn size={10} />}
                              {isLogout && <LogOut size={10} />}
                              {log.action}
                            </span>
                          </td>
                          <td
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: "0.8rem",
                              maxWidth: "240px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={log.details ? JSON.stringify(log.details, null, 2) : (log.target_type || "")}
                          >
                            {log.details ? JSON.stringify(log.details) : (log.target_type ? `${log.target_type}/${log.target_id || ""}` : "—")}
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "#525252" }}>
                            {log.device || log.browser ? `${log.device || "Desktop"} · ${log.browser || ""}` : "—"}
                          </td>
                          <td
                            style={{
                              fontSize: "0.8rem",
                              color: "#525252",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {log.created_at ? new Date(log.created_at).toLocaleString("en-US") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ═══════════ Login As Modal ═══════════ */}
      <Modal
        open={!!impersonateModal}
        onClose={() => setImpersonateModal(null)}
        title="Login as User"
      >
        {impersonateModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#6f6f6f" }}>You will be logged in as:</p>
            <div className="sa-modal-box">
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                {impersonateModal.full_name || "—"}
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                {impersonateModal.email}
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#da1e28", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <AlertTriangle size={14} /> This action will be recorded in the security audit log.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                className="sa-btn sa-btn-primary"
                onClick={() => doImpersonate(impersonateModal.id)}
              >
                Confirm Login
              </button>
              <button className="sa-btn sa-btn-secondary" onClick={() => setImpersonateModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════ Edit Question Type Modal ═══════════ */}
      <Modal
        open={!!qEditModal}
        onClose={() => setQEditModal(null)}
        title={`Edit Question Type (${qEditModal})`}
      >

        {qEditModal && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveQEdit();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Type Key (Identifier)
              </label>
              <input
                type="text"
                disabled
                value={qEditModal}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  fontSize: "0.85rem",
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: "rgba(0,0,0,0.05)",
                  border: "1px solid #c6c6c6",
                  color: "#6f6f6f",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Persian Display Name (عنوان نمایشی فارسی)
              </label>
              <input
                type="text"
                value={qEditForm.label}
                onChange={(e) => setQEditForm({ ...qEditForm, label: e.target.value })}
                required
                placeholder="مثلاً: ماتریسی (جدول سوالات)"
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.85rem",
                  border: "1px solid #c6c6c6",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Description / Hint (توضیحات و راهنما)
              </label>
              <input
                type="text"
                value={qEditForm.hint}
                onChange={(e) => setQEditForm({ ...qEditForm, hint: e.target.value })}
                placeholder="مثلاً: چند سوال با گزینه‌های یکسان در جدول"
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.85rem",
                  border: "1px solid #c6c6c6",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Category (دسته‌بندی)
              </label>
              <select
                value={qEditForm.category}
                onChange={(e) => setQEditForm({ ...qEditForm, category: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.85rem",
                  border: "1px solid #c6c6c6",
                  outline: "none",
                }}
              >
                <option value="choice">سوالات گزینه‌ای و مقیاسی (choice)</option>
                <option value="text">سوالات متنی و اطلاعات تماس (text)</option>
                <option value="advanced">پیشرفته، رسانه و ساختار فرم (advanced)</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.25rem" }}>
              <label className="sa-card" style={{ padding: "0.65rem 0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={qEditForm.enabled !== false}
                  onChange={(e) => setQEditForm({ ...qEditForm, enabled: e.target.checked })}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                  {qEditForm.enabled !== false ? "✓ Field is Active" : "✕ Disabled"}
                </span>
              </label>

              <label className="sa-card" style={{ padding: "0.65rem 0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={qEditForm.hidden === true}
                  onChange={(e) => setQEditForm({ ...qEditForm, hidden: e.target.checked })}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                  {qEditForm.hidden === true ? "Hide from Form Builder" : "Visible in Form Builder"}
                </span>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="submit"
                className="sa-btn sa-btn-primary"
                disabled={qSaving}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <Save size={14} />
                {qSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="sa-btn sa-btn-secondary"
                onClick={() => setQEditModal(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

