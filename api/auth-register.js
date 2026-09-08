import { createClient } from "@supabase/supabase-js";

// Rate limiting ساده بر اساس IP در حافظه (حداکثر ۵ ثبت‌نام در ساعت به ازای هر IP)
const registerRateLimitMap = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ۱. بررسی Rate limit
  const clientIp = (
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "unknown"
  ).split(",")[0].trim();

  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // ۱ ساعت
  const maxAttempts = 5;

  const userAttempts = registerRateLimitMap.get(clientIp) || [];
  const recentAttempts = userAttempts.filter((t) => now - t < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({
      error: "تعداد درخواست‌های ثبت‌نام از این آدرس بیش از حد مجاز است. لطفاً ۱ ساعت دیگر مجدداً تلاش کنید.",
    });
  }

  const { email, password, fullName, phone } = req.body || {};
  if (!email || !password || !phone) {
    return res.status(400).json({ error: "ایمیل، شماره موبایل و رمز عبور الزامی هستند" });
  }

  // اعتبارسنجی شماره موبایل ایران
  let cleanPhone = String(phone || "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[^\d+]/g, "");

  if (cleanPhone.startsWith("+98")) cleanPhone = "0" + cleanPhone.slice(3);
  else if (cleanPhone.startsWith("0098")) cleanPhone = "0" + cleanPhone.slice(4);
  else if (cleanPhone.startsWith("98") && cleanPhone.length >= 12) cleanPhone = "0" + cleanPhone.slice(2);
  else if (cleanPhone.startsWith("9") && cleanPhone.length === 10) cleanPhone = "0" + cleanPhone;

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

    // ۲. بررسی تکراری نبودن شماره موبایل در جدول profiles
    const { data: existingPhone, error: phoneErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (!phoneErr && existingPhone) {
      return res.status(400).json({ error: "این شماره موبایل قبلاً در سامانه ثبت‌نام کرده است" });
    }

    // ثبت تلاش در نرخ‌سنج
    recentAttempts.push(now);
    registerRateLimitMap.set(clientIp, recentAttempts);

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
          .update({
            phone: cleanPhone,
            full_name: fullName?.trim() || email.split("@")[0],
            is_owner: false,
          })
          .eq("id", data.user.id);
      } catch {}

      try {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.user.id, role_id: "manager", active: true }, { onConflict: "user_id,role_id" });
      } catch {}

      // ثبت لاگ ثبت‌نام همراه با IP در auth_logs و activity_log
      try {
        const ua = req.headers["user-agent"] || "";
        let browser = "Other";
        let os = "Other";
        let device = "Desktop";
        if (/mobile|android|iphone|ipad|ipod/i.test(ua)) device = /ipad|tablet/i.test(ua) ? "Tablet" : "Mobile";
        if (/windows/i.test(ua)) os = "Windows";
        else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
        else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
        else if (/android/i.test(ua)) os = "Android";
        else if (/linux/i.test(ua)) os = "Linux";

        if (/edg/i.test(ua)) browser = "Edge";
        else if (/chrome|crios/i.test(ua) && !/opr|opera|edg/i.test(ua)) browser = "Chrome";
        else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
        else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";

        await supabaseAdmin.from("auth_logs").insert({
          user_id: data.user.id,
          email: email.trim().toLowerCase(),
          ip_address: clientIp.replace(/^::ffff:/i, ""),
          action: "register",
          device,
          browser,
          os,
          user_agent: ua,
          details: {
            full_name: fullName?.trim() || email.split("@")[0],
            phone: cleanPhone,
            method: "api_registration",
          },
        });
      } catch {}
    }

    return res.status(200).json({ user: data.user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
