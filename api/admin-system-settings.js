import { createClient } from "@supabase/supabase-js";

const PRIMARY_GOD_EMAILS = [
  "superadmin@gmail.com",
  "superadmin@gmailc.com",
  "mohammadmehdisadeghi2016@gmail.com",
  "mohammad12345sadeghi@gmail.com",
  "artinerfan1388@gmail.com",
  "admin@porskad.ir",
  "admin@porskad.com",
];

export default async function handler(req, res) {
  // فعال‌سازی CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

  if (!supabaseUrl) {
    return res.status(500).json({ error: "Supabase URL is not configured." });
  }

  // ۱. در صورت درخواست GET، تنظیمات عمومی یا همه تنظیمات را بازمی‌گرداند
  if (req.method === "GET") {
    try {
      const client = createClient(supabaseUrl, serviceKey);
      const { data, error } = await client.from("system_settings").select("key, value");
      if (error) throw error;

      const obj = {};
      if (Array.isArray(data)) {
        for (const row of data) {
          obj[row.key] = row.value;
        }
      }
      return res.status(200).json({ success: true, settings: obj });
    } catch (err) {
      return res.status(500).json({ error: "Failed to read system settings: " + err.message });
    }
  }

  // ۲. در متد POST باید احراز هویت سوپرادمین انجام شود
  if (req.method === "POST") {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header is required." });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return res.status(401).json({ error: "Invalid session token." });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // بررسی سطح دسترسی سوپرادمین
    const userEmail = (user.email || "").toLowerCase().trim();
    const isGodEmail = PRIMARY_GOD_EMAILS.includes(userEmail);

    let isSuperAdmin = isGodEmail;

    if (!isSuperAdmin) {
      const { data: prof } = await adminClient
        .from("profiles")
        .select("id, email, is_owner")
        .eq("id", user.id)
        .maybeSingle();

      const { data: roles } = await adminClient
        .from("user_roles")
        .select("role_id, role, active")
        .eq("user_id", user.id);

      const hasAdminRole = Array.isArray(roles) && roles.some(
        (r) =>
          r.active !== false &&
          ["admin", "superadmin", "god", "owner"].includes(r.role_id || r.role)
      );

      isSuperAdmin = Boolean(prof?.is_owner || hasAdminRole);
    }

    if (!isSuperAdmin) {
      return res.status(403).json({ error: "فقط سوپرادمین مجاز به تغییر تنظیمات سامانه است." });
    }

    const body = req.body || {};
    const settingsToUpdate = body.settings || body;

    if (typeof settingsToUpdate !== "object" || settingsToUpdate === null) {
      return res.status(400).json({ error: "Invalid payload. Expected an object of settings." });
    }

    try {
      const upsertRows = Object.entries(settingsToUpdate).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      if (upsertRows.length === 0) {
        return res.status(400).json({ error: "No settings provided to update." });
      }

      const { error: upsertErr } = await adminClient
        .from("system_settings")
        .upsert(upsertRows, { onConflict: "key" });

      if (upsertErr) throw upsertErr;

      // دریافت تنظیمات کامل جدید
      const { data: allRows } = await adminClient.from("system_settings").select("key, value");
      const updatedObj = {};
      if (Array.isArray(allRows)) {
        for (const r of allRows) {
          updatedObj[r.key] = r.value;
        }
      }

      return res.status(200).json({
        success: true,
        message: "تنظیمات سامانه با موفقیت به‌روزرسانی شد.",
        settings: updatedObj,
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update settings: " + err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
}
