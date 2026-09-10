import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(501).json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" });
  }

  try {
    // اعتبارسنجی کاربر
    const token = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // بررسی دسترسی: مالک یا هر سوپرادمین (نقش admin) مجاز به ایجاد کاربر عادی است
    const { data: prof } = await adminClient
      .from("profiles")
      .select("is_owner")
      .eq("id", user.id)
      .maybeSingle();

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role_id, active")
      .eq("user_id", user.id)
      .eq("active", true);

    const isCallerSuperAdmin = Boolean(
      prof?.is_owner ||
      (Array.isArray(callerRoles) && callerRoles.some((r) => r.role_id === "admin"))
    );
    if (!isCallerSuperAdmin) {
      return res.status(403).json({ error: "فقط سوپرادمین‌ها می‌توانند کاربر ایجاد کنند" });
    }

    const { email, password, fullName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName?.trim() || email.split("@")[0],
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data?.user?.id) {
      try {
        await adminClient
          .from("profiles")
          .update({
            full_name: fullName?.trim() || email.split("@")[0],
            is_owner: false,
          })
          .eq("id", data.user.id);
      } catch {}

      try {
        await adminClient
          .from("user_roles")
          .upsert({ user_id: data.user.id, role_id: "manager", active: true }, { onConflict: "user_id" });
      } catch {}
    }

    return res.status(200).json({ user_id: data.user.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
