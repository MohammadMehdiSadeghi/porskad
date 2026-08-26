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
];

const DEFAULT_MANAGER_PERMISSIONS = [
  "create_form",
  "edit_form",
  "publish_form",
  "view_responses",
  "view_analytics",
  "export_excel",
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
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, is_active, created_by")
        .eq("id", uid)
        .maybeSingle();
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data;
    } catch (err) {
      console.error("fetchProfile error:", err);
      return null;
    }
  }, []);

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

  const fetchPermissions = useCallback(async (uid) => {
    if (!supabase || !uid) return [];
    try {
      // fail-closed: در صورت خطا هیچ مجوزی برنمی‌گردد
      const { data, error } = await supabase.rpc("get_user_permissions", {
        p_user_id: uid,
      });
      if (error) {
        console.error("Error fetching permissions:", error);
        return [];
      }
      return data?.map((p) => p.permission_id) ?? [];
    } catch (err) {
      console.error("fetchPermissions error:", err);
      return [];
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
          const [profileData, roleData, permsData] = await Promise.all([
            fetchProfile(uid),
            fetchRole(uid),
            fetchPermissions(uid),
          ]);
          setUser({ id: uid, email: newSession.user.email });
          setProfile(profileData);
          setRole(roleData);
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
    // ساخت کاربر باید سمت سرور انجام شود (Admin API از مرورگر قابل استفاده نیست)
    const { data: userId, error } = await supabase.rpc("create_manager", {
      p_email: email.trim(),
      p_password: password,
      p_full_name: fullName ?? email.split("@")[0],
    });
    if (error) throw error;

    if (Array.isArray(permissionIds) && userId) {
      const { error: permError } = await supabase.rpc("set_user_permissions", {
        p_user_id: userId,
        p_permissions: permissionIds,
      });
      if (permError) throw permError;
    }

    return userId;
  }

  async function updateManager(managerId, { fullName, isActive, permissions } = {}) {
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
        p_permissions: permissions,
      });
      if (error) throw error;
    }
  }

  async function setManagerActive(managerId, active) {
    try {
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ active })
        .eq("user_id", managerId);
      if (roleError) throw roleError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_active: active })
        .eq("id", managerId);
      if (profileError) throw profileError;
    } catch (err) {
      console.error("setManagerActive error:", err);
      throw err;
    }
  }

  async function deleteManager(managerId) {
    // حذف auth user سمت سرور انجام می‌شود و پروفایل/نقش‌ها cascade می‌شوند
    const { error } = await supabase.rpc("delete_manager", {
      p_user_id: managerId,
    });
    if (error) throw error;
  }

  async function listManagers() {
    try {
      const [{ data, error }, { data: userRoles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, is_active, created_at, created_by")
          .order("created_at", { ascending: true }),
        supabase.from("user_roles").select("user_id, role_id, active"),
      ]);
      if (error) throw error;

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
    hasPermission: (permissionId) => permissions.includes(permissionId),
    canManage: () => role === "admin",
    login,
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
