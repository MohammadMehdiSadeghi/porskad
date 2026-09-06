import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, fullName, phone } = req.body || {};
  if (!email || !password || !phone) {
    return res.status(400).json({ error: "ایمیل، شماره موبایل و رمز عبور الزامی هستند" });
  }

  // اعتبارسنجی شماره موبایل ایران
  const cleanPhone = String(phone || "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[^\d+]/g, "")
    .replace(/^(\+98|0098)/, "0")
    .replace(/^(9\d{9})$/, "0$1");

  if (!/^09\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ error: "شماره موبایل نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹)" });
  }

  // اعتبارسنجی رمز عبور (حداقل ۶ کاراکتر شامل حروف و اعداد)
  if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)) {
    return res.status(400).json({ error: "رمز عبور باید حداقل ۶ کاراکتر و شامل حروف انگلیسی و عدد باشد" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(501).json({ error: "Service role key not configured" });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName?.trim() || email.split("@")[0],
        phone: cleanPhone,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data?.user?.id) {
      try {
        await supabaseAdmin
          .from("profiles")
          .update({ phone: cleanPhone, full_name: fullName?.trim() || email.split("@")[0] })
          .eq("id", data.user.id);
      } catch {}
    }

    return res.status(200).json({ user: data.user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
