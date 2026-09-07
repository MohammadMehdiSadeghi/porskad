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
    return res.status(501).json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" });
  }

  try {
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

    // اطمینان از ثبت پروفایل و نقش مدیر پیش‌فرض در صورت نبود
    try {
      await adminClient.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "کاربر",
          is_owner: false,
        },
        { onConflict: "id" }
      );
    } catch {}

    try {
      await adminClient.from("user_roles").upsert(
        { user_id: user.id, role_id: "manager", active: true },
        { onConflict: "user_id" }
      );
    } catch {}

    const {
      title,
      form_type = "step_by_step",
      description = "",
      welcome_title = "سلام!",
      welcome_message = "ممنون که وقت گذاشتی؛ چند سوال کوتاه داریم.",
      exit_title = "تمام شد!",
      exit_message = "از اینکه جواب دادی خیلی ممنونیم. نظراتت برای ما طلاست!",
      slug,
    } = req.body || {};

    const cleanSlug = slug || `form-${Math.random().toString(36).substring(2, 8)}`;

    const newFormData = {
      title: title || (form_type === "registration" ? "فرم ثبت‌نام" : "فرم جدید"),
      form_type,
      description,
      welcome_title,
      welcome_message,
      exit_title,
      exit_message,
      published: false,
      manager_id: user.id,
      created_by: user.id,
      slug: cleanSlug,
    };

    const { data, error } = await adminClient
      .from("forms")
      .insert(newFormData)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ form: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
