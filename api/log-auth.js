import { createClient } from "@supabase/supabase-js";

// تابع استخراج سیستم‌عامل، مرورگر و دستگاه از روی User-Agent
function parseUserAgent(ua = "") {
  let browser = "Other";
  let os = "Other";
  let device = "Desktop";

  if (!ua) return { browser, os, device };

  // دستگاه
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    device = /ipad|tablet/i.test(ua) ? "Tablet" : "Mobile";
  } else {
    device = "Desktop";
  }

  // سیستم‌عامل
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  // مرورگر
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome|crios/i.test(ua) && !/opr|opera|edg/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";
  else if (/opr|opera/i.test(ua)) browser = "Opera";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Browser";

  return { browser, os, device };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // استخراج آدرس IP کلاینت
  const forwarded = req.headers["x-forwarded-for"];
  const rawIp = forwarded ? forwarded.split(",")[0].trim() : (req.headers["x-real-ip"] || req.socket?.remoteAddress || "127.0.0.1");
  // پاکسازی پیشوندهای IPv6 مثل ::ffff:
  const clientIp = rawIp.replace(/^::ffff:/i, "");

  const uaString = req.headers["user-agent"] || "";
  const { browser: autoBrowser, os: autoOs, device: autoDevice } = parseUserAgent(uaString);

  const {
    userId,
    user_id,
    email,
    action = "login",
    details = {},
    browser = autoBrowser,
    os = autoOs,
    device = autoDevice,
  } = req.body || {};

  const effectiveUserId = userId || user_id || null;
  const effectiveEmail = email ? String(email).trim().toLowerCase() : null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey);

      // ۱. درج در جدول اختصاصی auth_logs
      await supabaseAdmin.from("auth_logs").insert({
        user_id: effectiveUserId,
        email: effectiveEmail,
        ip_address: clientIp,
        action,
        device,
        browser,
        os,
        user_agent: uaString,
        details: typeof details === "object" ? details : { raw: details },
      });

      // ۲. درج در activity_log جهت سازگاری
      try {
        await supabaseAdmin.from("activity_log").insert({
          user_id: effectiveUserId,
          action,
          target_type: "auth",
          target_id: effectiveUserId ? String(effectiveUserId) : null,
          details: { email: effectiveEmail, ip: clientIp, browser, os, device },
          ip_address: clientIp,
          user_agent: uaString,
        });
      } catch {}
    } catch (dbErr) {
      console.error("log-auth DB error:", dbErr?.message);
    }
  }

  return res.status(200).json({
    ok: true,
    ip: clientIp,
    device,
    browser,
    os,
  });
}
