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
  else if (/firefox|fxios/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";
  else if (/opr|opera/i.test(ua)) browser = "Opera";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Browser";

  return { browser, os, device };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

  // ⚠️ حریم خصوصی: هیچ IP یا موقعیت مکانی (کشور/شهر) عمداً استخراج و ذخیره نمی‌شود.
  // فقط مرورگر، سیستم‌عامل و نوع دستگاه لاگ می‌شود.

  const effectiveUserId = userId || user_id || null;
  const effectiveEmail = email ? String(email).trim().toLowerCase() : null;

  // حذف هرگونه داده حساس احتمالی که کلاینت فرستاده باشد
  const safeDetails = { ...(typeof details === "object" ? details : { raw: details }) };
  delete safeDetails.ip;
  delete safeDetails.client_ip;
  delete safeDetails.ip_address;
  delete safeDetails.country;
  delete safeDetails.city;
  delete safeDetails.location;
  delete safeDetails.lat;
  delete safeDetails.lng;
  delete safeDetails.phone;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey);

      // ۱. درج در جدول اختصاصی auth_logs
      await supabaseAdmin.from("auth_logs").insert({
        user_id: effectiveUserId,
        email: effectiveEmail,
        action,
        device,
        browser,
        os,
        user_agent: uaString,
        details: safeDetails,
      });

      // ۲. درج در activity_log جهت سازگاری
      try {
        await supabaseAdmin.from("activity_log").insert({
          user_id: effectiveUserId,
          action,
          target_type: "auth",
          target_id: effectiveUserId ? String(effectiveUserId) : null,
          details: { email: effectiveEmail, browser, os, device },
          user_agent: uaString,
        });
      } catch {}
    } catch (dbErr) {
      console.error("log-auth DB error:", dbErr?.message);
    }
  }

  return res.status(200).json({
    ok: true,
    device,
    browser,
    os,
  });
}
