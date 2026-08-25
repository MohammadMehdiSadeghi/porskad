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
  const [role, setRole] = useState(null); // 'admin' | 'manager'
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const fetchProfile = useCallback(async (uid) => {
    if (!supabase || !uid) return null;
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
  }, []);

  const fetchRole = useCallback(async (uid) => {
    if (!supabase || !uid) return null;
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
  }, []);

  const fetchPermissions = useCallback(async (uid) => {
    if (!supabase || !uid) return [];
    const { data, error } = await supabase.rpc("get_user_permissions", {
      p_user_id: uid,
    });
    if (error) {
      console.error("Error fetching permissions:", error);
      return [];
    }
    return data?.map((p) => p.permission_id) ?? [];
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sess = data.session;
      setSession(sess);
      if (sess?.user) {
        handleAuthChange(sess.user);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        handleAuthChange(newSession.user);
      } else {
        setUser(null);
        setRole(null);
        setPermissions([]);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleAuthChange(uidOrUser) {
    const uid = typeof uidOrUser === "string" ? uidOrUser : uidOrUser.id;
    const email = typeof uidOrUser === "string" ? null : uidOrUser.email;

    const [profileData, roleData, permsData] = await Promise.all([
      fetchProfile(uid),
      fetchRole(uid),
      fetchPermissions(uid),
    ]);

    setUser({ id: uid, email: email ?? profileData?.email });
    setProfile(profileData);
    setRole(roleData);
    setPermissions(permsData);
    setLoading(false);
  }

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

  async function createManager({
    email,
    password,
    fullName,
    permissionIds = DEFAULT_MANAGER_PERMISSIONS,
  }) {
    // 1. Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Insert profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      full_name: fullName ?? email.split("@")[0],
      is_active: true,
      created_by: user?.id,
    });
    if (profileError) throw profileError;

    // 3. Assign manager role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role_id: "manager",
      active: true,
    });
    if (roleError) throw roleError;

    // 4. Assign permissions (for manager role, we use role_permissions which is static)
    // Individual permission overrides are not supported in this simple design

    return userId;
  }

  async function updateManager(managerId, { fullName, isActive, role } = {}) {
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

    if (role) {
      const { error } = await supabase
        .from("user_roles")
        .update({ role_id: role, active: true })
        .eq("user_id", managerId);
      if (error) throw error;
    }
  }

  async function deactivateManager(managerId) {
    // Deactivate the user role
    const { error } = await supabase
      .from("user_roles")
      .update({ active: false })
      .eq("user_id", managerId);
    if (error) throw error;

    // Also deactivate profile
    await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", managerId);
  }

  async function deleteManager(managerId) {
    // Remove role
    await supabase.from("user_roles").delete().eq("user_id", managerId);
    // Remove profile
    await supabase.from("profiles").delete().eq("id", managerId);
    // Delete auth user (admin only)
    const { error } = await supabase.auth.admin.deleteUser(managerId);
    if (error && !error.message?.includes("500")) {
      // Some Supabase versions don't allow deleting auth users via admin API
      console.warn("Could not delete auth user:", error);
    }
  }

  async function listManagers() {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, is_active, created_at, created_by"
      )
      .eq("is_active", true);
    if (error) throw error;

    // Enrich with role info
    const userRoles = await supabase
      .from("user_roles")
      .select("user_id, role_id, active")
      .in(
        "user_id",
        data.map((p) => p.id)
      );

    return data.map((p) => {
      const roleData = userRoles.data?.find((ur) => ur.user_id === p.id);
      return {
        ...p,
        role: roleData?.role_id ?? "manager",
        roleActive: roleData?.active ?? true,
      };
    });
  }

  const value = {
    session,
    user,
    role,
    permissions,
    profile,
    loading,
    configured: isSupabaseConfigured,
    hasPermission: (permissionId) => permissions.includes(permissionId),
    canManage: () => role === "admin",
    login,
    logout,
    createManager,
    updateManager,
    deactivateManager,
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
