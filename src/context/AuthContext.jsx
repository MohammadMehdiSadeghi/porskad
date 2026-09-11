import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { logAuthEvent } from "../lib/activityLogger";

const AuthContext = createContext(null);

export const PRIMARY_GOD_EMAILS = ["superadmin@gmailc.com", "superadmin@gmail.com"];

export function isPrimaryGodEmail(email) {
  if (!email) return false;
  return PRIMARY_GOD_EMAILS.includes(String(email).toLowerCase().trim());
}

const ALL_PERMISSIONS = [
  "create_form",
  "edit_form",
  "delete_form",
  "publish_form",
  "view_responses",
  "view_analytics",
  "export_excel",
  "manage_managers",
  "view_admins",
  "manage_sms",
  "manage_telegram",
  "manage_settings",
  "view_logs",
];

const DEFAULT_MANAGER_PERMISSIONS = [
  "create_form",
  "edit_form",
  "delete_form",
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
      // اول با is_owner و فیلدهای سهمیه سعی کن
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, avatar_url, is_active, is_owner, created_by, max_forms, max_responses_per_month, monthly_responses_used, quota_reset_at, plan, can_use_telegram, can_export_excel")
        .eq("id", uid)
        .maybeSingle();

      if (!error && data) {
        if (!('is_owner' in data)) data.is_owner = false;
        data.max_forms = data.is_owner ? 999999 : (data.max_forms ?? 5);
        data.max_responses_per_month = data.is_owner ? 999999 : (data.max_responses_per_month ?? 100);
        data.monthly_responses_used = data.is_owner ? 0 : (data.monthly_responses_used ?? 0);
        data.quota_reset_at = data.quota_reset_at ?? null;
        data.plan = data.is_owner ? 'enterprise' : (data.plan ?? 'free');
        data.can_use_telegram = data.is_owner ? true : (data.can_use_telegram === true);
        data.can_export_excel = data.can_export_excel ?? true;
        return data;
      }

      // اگه خطا بود، فالبک با is_owner بدون فیلدهای سهمیه
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, avatar_url, is_active, is_owner, created_by")
        .eq("id", uid)
        .maybeSingle();

      if (fallbackError) {
        // فالبک حداقلی اگر حتی is_owner در ستون‌ها نبود
        const { data: minData } = await supabase
          .from("profiles")
          .select("id, email, full_name, phone, avatar_url, is_active, created_by")
          .eq("id", uid)
          .maybeSingle();

        if (minData) {
          minData.is_owner = false;
          minData.max_forms = 5;
          minData.max_responses_per_month = 100;
          minData.plan = "free";
          minData.can_use_telegram = Boolean(minData.is_owner);
          minData.can_export_excel = true;
          return minData;
        }
        return null;
      }

      if (fallbackData) {
        fallbackData.is_owner = Boolean(fallbackData.is_owner);
        fallbackData.max_forms = fallbackData.is_owner ? 999999 : 5;
        fallbackData.max_responses_per_month = fallbackData.is_owner ? 999999 : 100;
        fallbackData.plan = fallbackData.is_owner ? "enterprise" : "free";
        fallbackData.can_use_telegram = Boolean(fallbackData.is_owner);
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
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  const fetchRole = useCallback(async (uid) => {
    if (!supabase || !uid) return null;
    try {
      // نکته: ممکن است کاربر چند ردیف نقش فعال داشته باشد؛ به‌جای maybeSingle
      // (که با چند ردیف خطا می‌دهد) همه را می‌خوانیم و admin را ترجیح می‌دهیم
      const { data, error } = await supabase
        .from("user_roles")
        .select("role_id, active")
        .eq("user_id", uid)
        .eq("active", true);
      if (error) {
        console.error("Error fetching role:", error);
        return null;
      }
      if (Array.isArray(data) && data.length > 0) {
        if (data.some((r) => r.role_id === "admin")) return "admin";
        return data[0].role_id ?? null;
      }
      return null;
    } catch (err) {
      console.error("fetchRole error:", err);
      return null;
    }
  }, []);

  const fetchPermissions = useCallback(async (uid, userRole) => {
    if (!supabase || !uid) return [];
    if (userRole === "admin") return [...ALL_PERMISSIONS];
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

    let lastLoadedUid = null;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const uid = newSession.user.id;
        if (uid === lastLoadedUid && event === "TOKEN_REFRESHED") {
          return;
        }
        lastLoadedUid = uid;
        try {
          const [profileData, roleData] = await Promise.allSettled([
            withTimeout(fetchProfile(uid), 10000),
            withTimeout(fetchRole(uid), 10000),
          ]);
          const pProfile = profileData.status === 'fulfilled' ? profileData.value : null;
          const pRole = roleData.status === 'fulfilled' ? roleData.value : null;
          const isSuperAdmin = pRole === 'admin' || pProfile?.is_owner === true || isPrimaryGodEmail(newSession.user.email);

          if (isSuperAdmin && pProfile) {
            pProfile.is_owner = true;
            pProfile.can_use_telegram = true;
            pProfile.can_export_excel = true;
            pProfile.can_use_logic = true;
            pProfile.can_upload_files = true;
            pProfile.can_use_sms = true;
            pProfile.can_use_webhooks = true;
            pProfile.can_remove_branding = true;
            pProfile.max_forms = 999999;
            pProfile.max_responses_per_month = 999999;
            pProfile.plan = "enterprise";
          }

          const permsData = isSuperAdmin ? [...ALL_PERMISSIONS] : await fetchPermissions(uid, pRole);
          setUser({ id: uid, email: newSession.user.email });
          setProfile(pProfile);
          setRole(isSuperAdmin ? "admin" : pRole);
          setPermissions(permsData);
          setError(null);
        } catch (err) {
          console.error("handleAuthChange error:", err);
          setError(err.message || "Authentication error");
        } finally {
          setLoading(false);
        }
      } else {
        lastLoadedUid = null;
        setUser(null);
        setRole(null);
        setPermissions([]);
        setProfile(null);
        setError(null);
        setLoading(false);
      }
    });

    // Get initial session fallback
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
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
    if (error) {
      // لاگ تلاش ناموفق (برای تشخیص brute-force در تب سلامت گود)
      logAuthEvent({
        email: email || null,
        action: "failed_login",
        details: { reason: error.message?.slice(0, 120) || "unknown" },
      });
      throw error;
    }

    // ثبت لاگ ورود در پس‌زمینه (فقط مرورگر/سیستم‌عامل/دستگاه — بدون IP)
    if (data?.user) {
      logAuthEvent({
        userId: data.user.id,
        email: data.user.email || email,
        action: "login",
        details: { method: "password" },
      });
    }

    return data;
  }

  async function register(email, password, fullName, phone) {
    const cleanPhone = phone?.trim() || "";
    // ۱. ابتدا تلاش از طریق API برای تایید خودکار و دور زدن محدودیت ایمیل
    try {
      const apiRes = await fetch("/api/auth-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, fullName, phone: cleanPhone }),
      });
      if (apiRes.ok) {
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (loginData?.session) {
          if (cleanPhone) {
            try {
              await supabase.from("profiles").update({ phone: cleanPhone }).eq("id", loginData.user.id);
            } catch {}
          }
          // ثبت لاگ ورود پس از ثبت‌نام
          logAuthEvent({
            userId: loginData.user.id,
            email: loginData.user.email || email,
            action: "login_after_register",
            details: { method: "api_auto_login" },
          });
          return loginData;
        }
      } else {
        const errJson = await apiRes.json().catch(() => ({}));
        if (errJson.error && apiRes.status !== 501) {
          throw new Error(errJson.error);
        }
      }
    } catch (e) {
      if (e.message && !e.message.includes("501") && !e.message.includes("Failed to fetch")) {
        throw e;
      }
    }

    // ۲. فالبک به signUp عادی Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName?.trim() || email.split("@")[0],
          phone: cleanPhone,
        },
      },
    });
    if (error) throw error;

    // ثبت لاگ و اطلاعات تکمیلی در profiles
    try {
      if (data?.user) {
        await supabase.from("profiles").update({
          full_name: fullName?.trim() || email.split("@")[0],
          phone: cleanPhone,
          max_forms: 5,
          max_responses_per_month: 100,
          plan: 'free',
        }).eq("id", data.user.id);

        logAuthEvent({
          userId: data.user.id,
          email: data.user.email || email,
          action: "register",
          details: { full_name: fullName, method: "supabase_signup" },
        });
      }
    } catch {}

    return data;
  }

  async function updateUserQuota(userId, {
    maxForms,
    maxResponses,
    plan,
    canUseTelegram,
    canExportExcel,
    canUseLogic,
    canUploadFiles,
    canUseSms,
    canUseWebhooks,
    canRemoveBranding,
    quotaResetAt,
    monthlyResponsesUsed,
  }) {
    try {
      await supabase.rpc("set_user_quotas", {
        p_user_id: userId,
        p_max_forms: maxForms,
        p_max_responses: maxResponses,
        p_plan: plan,
      });
    } catch {}

    const updatePayload = {};
    if (maxForms !== undefined) updatePayload.max_forms = Math.max(1, Number(maxForms) || 1);
    if (maxResponses !== undefined) updatePayload.max_responses_per_month = Math.max(1, Number(maxResponses) || 1);
    if (plan !== undefined) updatePayload.plan = plan;
    if (typeof canUseTelegram === "boolean") updatePayload.can_use_telegram = canUseTelegram;
    if (typeof canExportExcel === "boolean") updatePayload.can_export_excel = canExportExcel;
    if (typeof canUseLogic === "boolean") updatePayload.can_use_logic = canUseLogic;
    if (typeof canUploadFiles === "boolean") updatePayload.can_upload_files = canUploadFiles;
    if (typeof canUseSms === "boolean") updatePayload.can_use_sms = canUseSms;
    if (typeof canUseWebhooks === "boolean") updatePayload.can_use_webhooks = canUseWebhooks;
    if (typeof canRemoveBranding === "boolean") updatePayload.can_remove_branding = canRemoveBranding;
    if (quotaResetAt !== undefined) updatePayload.quota_reset_at = quotaResetAt;
    if (monthlyResponsesUsed !== undefined && !isNaN(Number(monthlyResponsesUsed))) {
      updatePayload.monthly_responses_used = Math.max(0, Number(monthlyResponsesUsed));
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);
      if (error) throw error;
    }
  }

  async function logout() {
    if (user?.id) {
      logAuthEvent({
        userId: user.id,
        email: user.email,
        action: "logout",
      });
    }
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
    let userId = null;

    // ۱. اول سعی کن از طریق API سرورلس اختصاصی ایجاد کنی
    try {
      const apiRes = await fetch("/api/admin-create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          fullName: fullName ?? email.split("@")[0],
        }),
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        userId = json.user_id;
      }
    } catch {}

    // ۲. فالبک به Edge Function
    if (!userId) {
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
      userId = result.user_id;
    }

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

  // بررسی سمت کلاینت: حذف/غیرفعال‌سازی سوپرادمین‌ها فقط توسط گاد اصلی
  async function assertGodCanManageTarget(managerId, actionLabel) {
    if (!managerId || isPrimaryGodEmail(user?.email)) return;
    try {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("is_owner").eq("id", managerId).maybeSingle(),
        supabase.from("user_roles").select("role_id, active").eq("user_id", managerId).eq("active", true),
      ]);
      const targetIsSuper =
        prof?.is_owner === true || (Array.isArray(roles) && roles.some((r) => r.role_id === "admin"));
      if (targetIsSuper) {
        throw new Error(`${actionLabel} سوپرادمین‌ها فقط توسط صاحب اصلی سیستم امکان‌پذیر است.`);
      }
    } catch (err) {
      if (err.message && err.message.includes("صاحب اصلی")) throw err;
      // در صورت خطای خواندن، سمت دیتابیس محافظت می‌کند
    }
  }

  async function setManagerActive(managerId, active) {
    // بررسی سمت کلاینت: owner قابل غیرفعال کردن نیست
    if (profile?.is_owner && managerId === user?.id) {
      throw new Error("امکان غیرفعال کردن صاحب اصلی سایت وجود ندارد.");
    }
    await assertGodCanManageTarget(managerId, "تغییر وضعیت");
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
    await assertGodCanManageTarget(managerId, "حذف");
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
          .select("id, email, full_name, phone, is_active, is_owner, created_at, created_by, hidden_from, max_forms, max_responses_per_month, monthly_responses_used, quota_reset_at, plan, can_use_telegram, can_export_excel, can_use_logic, can_upload_files, can_use_sms, can_use_webhooks, can_remove_branding")
          .order("created_at", { ascending: true });
        profilesData = res.data;
        profilesError = res.error;
      } catch {
        const res = await supabase
          .from("profiles")
          .select("id, email, full_name, phone, is_active, is_owner, created_at, created_by, hidden_from, max_forms, max_responses_per_month, monthly_responses_used, quota_reset_at, plan, can_use_telegram, can_export_excel")
          .order("created_at", { ascending: true });
        profilesData = res.data;
        profilesError = res.error;
      }
      if (profilesError) throw profilesError;
      let data = profilesData || [];

      // استتار: سوپرادمین ثانویه نباید اکانت superadmin@gmailc.com را ببیند
      const callerIsGod = isPrimaryGodEmail(user?.email);
      if (!callerIsGod && data) {
        data = data.filter((m) => !isPrimaryGodEmail(m.email));
      }

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
          monthly_responses_used: p.is_owner ? 0 : (p.monthly_responses_used ?? 0),
          quota_reset_at: p.quota_reset_at || null,
          plan: p.is_owner ? 'enterprise' : (p.plan ?? 'free'),
          can_use_telegram: p.is_owner ? true : (p.can_use_telegram === true),
          can_export_excel: p.is_owner ? true : (p.can_export_excel === true),
          can_use_logic: p.is_owner ? true : (p.can_use_logic === true),
          can_upload_files: p.is_owner ? true : (p.can_upload_files === true),
          can_use_sms: p.is_owner ? true : (p.can_use_sms === true),
          can_use_webhooks: p.is_owner ? true : (p.can_use_webhooks === true),
          can_remove_branding: p.is_owner ? true : (p.can_remove_branding === true),
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

  async function resetUserQuota(userId) {
    if (!userId) return null;
    const { data, error } = await supabase.rpc("reset_user_monthly_quota", {
      p_user_id: userId,
    });
    if (error) throw error;
    return data;
  }

  const value = {
    session,
    user,
    resetUserQuota,
    role,
    permissions,
    profile,
    loading,
    error,
    configured: isSupabaseConfigured,
    hasPermission: (permissionId) => {
      if (profile?.is_owner === true || role === "admin") return true;
      // مشاهده یا مدیریت سایر کاربران برای کاربر عادی اکیداً ممنوع است
      if (permissionId === "manage_managers" || permissionId === "view_admins") return false;
      if (permissionId === "manage_telegram") return Boolean(profile?.can_use_telegram);
      if (permissions && permissions.length > 0) {
        return permissions.includes(permissionId);
      }
      return DEFAULT_MANAGER_PERMISSIONS.includes(permissionId);
    },
    canManage: () => profile?.is_owner === true || role === "admin",
    isOwner: () => profile?.is_owner === true || role === "admin",
    isPrimaryGod: () => isPrimaryGodEmail(user?.email),
    isPrimaryGodEmail,
    PRIMARY_GOD_EMAILS,
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
