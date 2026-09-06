import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

const ALL_PERMISSIONS = [
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
];

const DEFAULT_MANAGER_PERMISSIONS = [
  "create_form",
  "edit_form",
  "delete_form",
  "publish_form",
  "view_responses",
  "view_analytics",
  "export_excel",
  "manage_telegram",
];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async (uid) => {
    if (!supabase || !uid) return null;
    try {
      // اول با is_owner و فیلدهای سهمیه سعی کن
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, is_active, is_owner, created_by, max_forms, max_responses_per_month, plan, can_use_telegram, can_export_excel")
        .eq("id", uid)
        .maybeSingle();

      if (!error && data) {
        if (!('is_owner' in data)) data.is_owner = false;
        data.max_forms = data.is_owner ? 999999 : (data.max_forms ?? 5);
        data.max_responses_per_month = data.is_owner ? 999999 : (data.max_responses_per_month ?? 100);
        data.plan = data.is_owner ? 'enterprise' : (data.plan ?? 'free');
        data.can_use_telegram = data.can_use_telegram ?? true;
        data.can_export_excel = data.can_export_excel ?? true;
        return data;
      }

      // اگه خطا بود، فالبک بدون فیلدهای جدید
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, is_active, created_by")
        .eq("id", uid)
        .maybeSingle();

      if (fallbackError) {
        console.error("Error fetching profile:", fallbackError);
        return null;
      }
      if (fallbackData) {
        fallbackData.is_owner = false;
        fallbackData.max_forms = 5;
        fallbackData.max_responses_per_month = 100;
        fallbackData.plan = 'free';
        fallbackData.can_use_telegram = true;
        fallbackData.can_export_excel = true;
      }
      return fallbackData;
    } catch (err) {
      console.error("fetchProfile error:", err);
      return null;
    }
  }, []);

  // ─── Timeout wrapper: جلوگیری از آویزان ماندن فچ‌ها ───
  function withTimeout(promise, ms = 10000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
  }

  const fetchRole = useCallback(async (uid) => {
    if (!supabase || !uid) return null;
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role_id, active")
        .eq("user_id", uid)
        .eq("active", true)
        .maybeSingle();
      if (error) {
        console.error("Error fetching role:", error);
        return null;
      }
      return data?.role_id ?? null;
    } catch (err) {
      console.error("fetchRole error:", err);
      return null;
    }
  }, []);

  const fetchPermissions = useCallback(async (uid, userRole) => {
    if (!supabase || !uid) return [];
    try {
      const { data, error } = await supabase.rpc("get_user_permissions", {
        p_user_id: uid,
      });
      if (error) {
        console.error("Error fetching permissions:", error);
        // Fallback: اگه RPC خطا داد، بر اساس نقش مجوز بده
        if (userRole === "admin") return [...ALL_PERMISSIONS];
        return [...DEFAULT_MANAGER_PERMISSIONS];
      }
      const perms = data?.map((p) => p.permission_id) ?? [];
      // اگه هیچ مجوزی برنگشت ولی نقش admin هست، fallback بده
      if (perms.length === 0 && userRole === "admin") return [...ALL_PERMISSIONS];
      if (perms.length === 0) return [...DEFAULT_MANAGER_PERMISSIONS];
      return perms;
    } catch (err) {
      console.error("fetchPermissions error:", err);
      if (userRole === "admin") return [...ALL_PERMISSIONS];
      return [...DEFAULT_MANAGER_PERMISSIONS];
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        try {
          const uid = newSession.user.id;
          const [profileData, roleData] = await Promise.allSettled([
            withTimeout(fetchProfile(uid), 10000),
            withTimeout(fetchRole(uid), 10000),
          ]);
          const pProfile = profileData.status === 'fulfilled' ? profileData.value : null;
          const pRole = roleData.status === 'fulfilled' ? roleData.value : null;
          const permsData = await fetchPermissions(uid, pRole);
          setUser({ id: uid, email: newSession.user.email });
          setProfile(pProfile);
          setRole(pRole);
          setPermissions(permsData);
          setError(null);
        } catch (err) {
          console.error("handleAuthChange error:", err);
          setError(err.message || "Authentication error");
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setRole(null);
        setPermissions([]);
        setProfile(null);
        setError(null);
        setLoading(false);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("getSession error:", err);
      setError(err.message || "Session error");
      setLoading(false);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchProfile, fetchRole, fetchPermissions]);

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async function register(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName?.trim() || email.split("@")[0],
        },
      },
    });
    if (error) throw error;

    // ثبت لاگ فعالیت
    try {
      if (data?.user) {
        await supabase.from("profiles").update({
          full_name: fullName?.trim() || email.split("@")[0],
          max_forms: 5,
          max_responses_per_month: 100,
          plan: 'free',
        }).eq("id", data.user.id);
      }
    } catch {}

    return data;
  }

  async function updateUserQuota(userId, { maxForms, maxResponses, plan }) {
    try {
      const { error } = await supabase.rpc("set_user_quotas", {
        p_user_id: userId,
        p_max_forms: maxForms,
        p_max_responses: maxResponses,
        p_plan: plan,
      });
      if (error) throw error;
    } catch (rpcErr) {
      const { error } = await supabase
        .from("profiles")
        .update({
          max_forms: maxForms,
          max_responses_per_month: maxResponses,
          plan: plan,
        })
        .eq("id", userId);
      if (error) throw error;
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function changePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function updateProfile(updates) {
    if (!user?.id) throw new Error("کاربر لاگین نیست");
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (error) throw error;
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  async function createManager({
    email,
    password,
    fullName,
    permissionIds = null,
  }) {
    // ساخت کاربر از طریق Edge Function (امن و سازگار با همه نسخه‌ها)
    const response = await fetch(
      `${supabase.supabaseUrl}/functions/v1/admin-user-management`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          apikey: supabase.supabaseKey,
        },
        body: JSON.stringify({
          action: "create_user",
          email: email.trim(),
          password,
          full_name: fullName ?? email.split("@")[0],
        }),
      }
    );

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || "ایجاد مدیر ناموفق بود");
    }

    const userId = result.user_id;

    if (Array.isArray(permissionIds) && userId) {
      const { error: permError } = await supabase.rpc("set_user_permissions", {
        p_user_id: userId,
        p_permission_ids: permissionIds,
      });
      if (permError) throw permError;
    }

    return userId;
  }

  async function updateManager(managerId, { fullName, isActive, permissions } = {}) {
    // بررسی سمت کلاینت: owner فقط نامش قابل تغییر است
    let isOwnerTarget = false;
    try {
      const { data: tp } = await supabase
        .from("profiles")
        .select("is_owner")
        .eq("id", managerId)
        .single();
      isOwnerTarget = tp?.is_owner === true;
    } catch { /* ستون is_owner ممکنه وجود نداشته باشه */ }

    if (isOwnerTarget) {
      // owner فقط نامش قابل تغییر است، مجوز و وضعیتش غیرقابل تغییر
      if (fullName !== undefined) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: fullName })
          .eq("id", managerId);
        if (error) throw error;
      }
      return;
    }

    const updates = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", managerId);
      if (error) throw error;
    }

    if (Array.isArray(permissions)) {
      const { error } = await supabase.rpc("set_user_permissions", {
        p_user_id: managerId,
        p_permission_ids: permissions,
      });
      if (error) throw error;
    }
  }

  async function setManagerActive(managerId, active) {
    // بررسی سمت کلاینت: owner قابل غیرفعال کردن نیست
    if (profile?.is_owner && managerId === user?.id) {
      throw new Error("امکان غیرفعال کردن صاحب اصلی سایت وجود ندارد.");
    }
    try {
      // استفاده از تابع محافظت‌شده سمت سرور
      const { error } = await supabase.rpc("set_manager_active", {
        p_user_id: managerId,
        p_active: active,
      });
      if (error) throw error;
    } catch (err) {
      console.error("setManagerActive error:", err);
      throw err;
    }
  }

  async function deleteManager(managerId) {
    // بررسی سمت کلاینت: owner قابل حذف نیست
    if (profile?.is_owner && managerId === user?.id) {
      throw new Error("امکان حذف صاحب اصلی سایت وجود ندارد.");
    }
    // حذف auth user سمت سرور انجام می‌شود و پروفایل/نقش‌ها cascade می‌شوند
    const { error } = await supabase.rpc("delete_manager", {
      p_user_id: managerId,
    });
    if (error) throw error;
  }

  async function listManagers({ includeHidden = false } = {}) {
    try {
      // سعی کن با is_owner select کنی، اگه نشد بدون اون
      let profilesData = null;
      let profilesError = null;
      try {
        const res = await supabase
          .from("profiles")
          .select("id, email, full_name, is_active, is_owner, created_at, created_by, hidden_from, max_forms, max_responses_per_month, plan")
          .order("created_at", { ascending: true });
        profilesData = res.data;
        profilesError = res.error;
      } catch {
        const res = await supabase
          .from("profiles")
          .select("id, email, full_name, is_active, created_at, created_by")
          .order("created_at", { ascending: true });
        profilesData = res.data;
        profilesError = res.error;
      }
      if (profilesError) throw profilesError;
      let data = profilesData;
      // فیلتر کردن مدیران مخفی‌شده (فقط برای غیر owner)
      if (!includeHidden && profile?.is_owner !== true && data) {
        data = data.filter((m) => {
          const hf = m.hidden_from;
          if (!hf) return true;
          // hidden_from یک آرایه از user_idهایی هست که این مدیر ازشون مخفیه
          if (Array.isArray(hf)) return !hf.includes(user?.id);
          return true;
        });
      }

      const { data: userRoles } = await supabase.from("user_roles").select("user_id, role_id, active");

      let overrides = [];
      if (data?.length) {
        const res = await supabase
          .from("user_permissions")
          .select("user_id, permission_id")
          .in(
            "user_id",
            data.map((p) => p.id)
          );
        overrides = res.data ?? [];
      }

      return data.map((p) => {
        const roleData = userRoles?.find((ur) => ur.user_id === p.id);
        const roleId = roleData?.role_id ?? "manager";
        const ownOverrides = overrides
          .filter((o) => o.user_id === p.id)
          .map((o) => o.permission_id);
        const effectivePermissions = ownOverrides.length
          ? ownOverrides
          : roleId === "admin"
            ? [...ALL_PERMISSIONS]
            : [...DEFAULT_MANAGER_PERMISSIONS];
        return {
          ...p,
          is_owner: p.is_owner ?? false,
          max_forms: p.is_owner ? 999999 : (p.max_forms ?? 5),
          max_responses_per_month: p.is_owner ? 999999 : (p.max_responses_per_month ?? 100),
          plan: p.is_owner ? 'enterprise' : (p.plan ?? 'free'),
          role: roleId,
          roleActive: roleData?.active ?? true,
          permissions: effectivePermissions,
        };
      });
    } catch (err) {
      console.error("listManagers error:", err);
      throw err;
    }
  }

  const value = {
    session,
    user,
    role,
    permissions,
    profile,
    loading,
    error,
    configured: isSupabaseConfigured,
    hasPermission: (permissionId) => {
      if (profile?.is_owner === true || role === "admin") return true;
      if (permissions && permissions.length > 0) {
        return permissions.includes(permissionId);
      }
      return DEFAULT_MANAGER_PERMISSIONS.includes(permissionId);
    },
    canManage: () => role === "admin",
    isOwner: () => profile?.is_owner === true,
    login,
    register,
    updateUserQuota,
    logout,
    changePassword,
    updateProfile,
    createManager,
    updateManager,
    deactivateManager: (id) => setManagerActive(id, false),
    activateManager: (id) => setManagerActive(id, true),
    deleteManager,
    listManagers,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth باید داخل AuthProvider استفاده شود");
  return ctx;
}

export { ALL_PERMISSIONS, DEFAULT_MANAGER_PERMISSIONS };
