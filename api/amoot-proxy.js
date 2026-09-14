import { createClient } from "@supabase/supabase-js";

// ─── ابزار تبدیل ارقام و نرمال‌سازی شماره‌های ایران ───
function toEnDigits(str = "") {
  if (typeof str !== "string") return "";
  return str
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

function normalizeIranPhone(raw) {
  let s = toEnDigits(String(raw || "")).replace(/[^\d+]/g, "");
  if (s.startsWith("+98")) s = "0" + s.slice(3);
  else if (s.startsWith("0098")) s = "0" + s.slice(4);
  else if (s.startsWith("98") && s.length >= 12) s = "0" + s.slice(2);
  else if (s.startsWith("9") && s.length === 10) s = "0" + s;
  return s;
}

function isValidIranPhone(raw) {
  const s = normalizeIranPhone(raw);
  return /^09\d{9}$/.test(s);
}

// ─── پیام‌های خطای فارسی آموت ───
function translateAmootStatus(status) {
  const map = {
    Success: "عملیات با موفقیت انجام شد",
    Token_Invalid: "توکن وب‌سرویس آموت نامعتبر یا منقضی است",
    Token_NotExists: "توکن وب‌سرویس وارد شده در سامانه آموت یافت نشد",
    LineNumber_Empty: "شماره خط فرستنده وارد نشده است (می‌توانید Public یا خط اختصاصی را انتخاب کنید)",
    Insufficient_Credit: "اعتبار پنل پیامک آموت شما کافی نیست",
    Mobile_Empty: "شماره موبایل گیرنده وارد نشده است",
    Mobile_Invalid: "شماره موبایل وارد شده معتبر نیست",
    MessageText_Empty: "متن پیامک نمی‌تواند خالی باشد",
    Failed: "ارسال پیامک با خطا مواجه شد",
    ServerError: "خطای سرور سرویس‌دهنده آموت",
  };
  return map[status] || `وضعیت درگاه پیامک: ${status}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(200, corsHeaders);
    return res.end();
  }

  // تنظیم هدرهای CORS برای تمام پاسخ‌ها
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.setHeader(k, v);
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Supabase connection is not properly configured on server" });
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  // ─── احراز هویت کاربر ───
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: Missing Authorization header" });
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
    return res.status(401).json({ error: "Unauthorized: Invalid session" });
  }

  // بررسی دسترسی ادمین یا مالک سامانه
  const [{ data: prof }, { data: roleData }] = await Promise.all([
    adminClient.from("profiles").select("id, is_owner").eq("id", user.id).maybeSingle(),
    adminClient.from("user_roles").select("role_id, active").eq("user_id", user.id).eq("active", true),
  ]);

  const canManageSms = Boolean(
    prof?.is_owner ||
    (Array.isArray(roleData) && roleData.some((r) => r.role_id === "admin" || r.role_id === "superadmin"))
  );

  if (!canManageSms) {
    return res.status(403).json({ error: "شما دسترسی مجاز برای مدیریت پنل پیامک را ندارید" });
  }

  const body = req.body || {};
  const { action } = body;

  try {
    // ══════════════════════════════════════════════════════════════
    // ۱. تست اتصال و بررسی اعتبار (Test Connection & Check Credit)
    // ══════════════════════════════════════════════════════════════
    if (action === "test_connection") {
      let testToken = (body.token || "").trim();

      // اگر توکن به صورت دستی فرستاده نشده باشد، از دیتابیس می‌خوانیم
      if (!testToken) {
        const { data: dbSettings } = await adminClient
          .from("sms_settings")
          .select("amoot_token")
          .eq("id", 1)
          .maybeSingle();
        testToken = dbSettings?.amoot_token || "";
      }

      if (!testToken) {
        return res.status(400).json({
          success: false,
          error: "Token_Empty",
          message: "لطفاً ابتدا توکن وب‌سرویس آموت را وارد نمایید.",
        });
      }

      const amootRes = await fetch("https://portal.amootsms.com/rest/AccountStatus", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: testToken }).toString(),
        signal: AbortSignal.timeout(12000),
      });

      const amootData = await amootRes.json().catch(() => null);

      if (!amootData) {
        return res.status(502).json({
          success: false,
          message: "پاسخ نامعتبری از سرور آموت دریافت شد.",
        });
      }

      if (amootData.Status === "Success") {
        const remaindCredit = Number(amootData.RemaindCredit) || 0;
        return res.status(200).json({
          success: true,
          status: "Success",
          accountName: amootData.AccountName || "کاربر آموت",
          remaindCredit: remaindCredit,
          remaindCreditTomans: Math.floor(remaindCredit / 10),
          listLineNumbers: Array.isArray(amootData.ListLineNumbers) && amootData.ListLineNumbers.length > 0
            ? amootData.ListLineNumbers
            : ["Public"],
          message: "اتصال با موفقیت برقرار شد.",
        });
      } else {
        return res.status(200).json({
          success: false,
          status: amootData.Status,
          message: translateAmootStatus(amootData.Status),
        });
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ۲. دریافت تنظیمات جاری (Get Settings)
    // ══════════════════════════════════════════════════════════════
    if (action === "get_settings") {
      const { data: dbSettings, error: dbErr } = await adminClient
        .from("sms_settings")
        .select("id, amoot_token, line_number, sender_name, is_active, updated_at")
        .eq("id", 1)
        .maybeSingle();

      if (dbErr) throw dbErr;

      const hasToken = Boolean(dbSettings?.amoot_token && dbSettings.amoot_token.length > 5);
      const maskedToken = hasToken
        ? "••••••••" + dbSettings.amoot_token.slice(-4)
        : "";

      let liveAccount = null;
      if (hasToken && dbSettings.is_active) {
        try {
          const amootRes = await fetch("https://portal.amootsms.com/rest/AccountStatus", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: dbSettings.amoot_token }).toString(),
            signal: AbortSignal.timeout(8000),
          });
          const amootData = await amootRes.json().catch(() => null);
          if (amootData && amootData.Status === "Success") {
            const credit = Number(amootData.RemaindCredit) || 0;
            liveAccount = {
              status: "connected",
              accountName: amootData.AccountName,
              remaindCredit: credit,
              remaindCreditTomans: Math.floor(credit / 10),
              listLineNumbers: amootData.ListLineNumbers || ["Public"],
            };
          } else if (amootData) {
            liveAccount = {
              status: "error",
              error: amootData.Status,
              message: translateAmootStatus(amootData.Status),
            };
          }
        } catch {
          // در صورت بروز خطا در استعلام زنده از سرور آموت، تنظیمات محلی لود می‌شود
        }
      }

      return res.status(200).json({
        success: true,
        settings: {
          has_token: hasToken,
          masked_token: maskedToken,
          line_number: dbSettings?.line_number || "Public",
          sender_name: dbSettings?.sender_name || "پرس‌کاد",
          is_active: dbSettings?.is_active ?? true,
          updated_at: dbSettings?.updated_at,
        },
        liveAccount,
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ۳. ذخیره تنظیمات (Save Settings)
    // ══════════════════════════════════════════════════════════════
    if (action === "save_settings") {
      const { amoot_token, line_number, sender_name, is_active } = body;

      const { data: existing } = await adminClient
        .from("sms_settings")
        .select("amoot_token")
        .eq("id", 1)
        .maybeSingle();

      // اگر توکن جدید نفرستاده شده باشد یا ماسک شده باشد، توکن قبلی حفظ می‌شود
      let finalToken = existing?.amoot_token || "";
      if (typeof amoot_token === "string" && amoot_token.trim() && !amoot_token.includes("••••")) {
        finalToken = amoot_token.trim();
      }

      const { error: upsertErr } = await adminClient
        .from("sms_settings")
        .upsert(
          {
            id: 1,
            amoot_token: finalToken,
            line_number: (line_number || "Public").trim(),
            sender_name: (sender_name || "پرس‌کاد").trim(),
            is_active: Boolean(is_active),
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (upsertErr) throw upsertErr;

      // بررسی وضعیت توکن ذخیره‌شده
      let verification = null;
      if (finalToken) {
        try {
          const chkRes = await fetch("https://portal.amootsms.com/rest/AccountStatus", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: finalToken }).toString(),
            signal: AbortSignal.timeout(8000),
          });
          const chkData = await chkRes.json().catch(() => null);
          if (chkData?.Status === "Success") {
            verification = {
              valid: true,
              accountName: chkData.AccountName,
              credit: chkData.RemaindCredit,
              lines: chkData.ListLineNumbers,
            };
          } else {
            verification = {
              valid: false,
              message: translateAmootStatus(chkData?.Status),
            };
          }
        } catch {
          // ignore
        }
      }

      return res.status(200).json({
        success: true,
        message: "تنظیمات وب‌سرویس پیامک با موفقیت ذخیره شد.",
        verification,
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ۴. ارسال پیامک (Send SMS via Amoot SendSimple)
    // ══════════════════════════════════════════════════════════════
    if (action === "send_sms") {
      const { mobiles, text, lineNumber } = body;

      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: "متن پیامک نمی‌تواند خالی باشد." });
      }

      // نرمال‌سازی شماره‌های موبایل
      let targetMobiles = [];
      if (Array.isArray(mobiles)) {
        targetMobiles = mobiles.map(normalizeIranPhone).filter(isValidIranPhone);
      } else if (typeof mobiles === "string") {
        targetMobiles = mobiles
          .split(/[\n,;]+/)
          .map((m) => normalizeIranPhone(m.trim()))
          .filter(isValidIranPhone);
      }

      // حذف شماره‌های تکراری
      targetMobiles = [...new Set(targetMobiles)];

      if (targetMobiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "هیچ شماره موبایل معتبری برای ارسال یافت نشد (شماره باید با ۰۹ شروع شود).",
        });
      }

      // استخراج مشخصات از sms_settings
      const { data: dbSettings } = await adminClient
        .from("sms_settings")
        .select("amoot_token, line_number, is_active")
        .eq("id", 1)
        .maybeSingle();

      if (!dbSettings?.is_active) {
        return res.status(400).json({
          success: false,
          message: "سامانه پیامک در حال حاضر در حالت غیرفعال تنظیم شده است.",
        });
      }

      if (!dbSettings?.amoot_token) {
        return res.status(400).json({
          success: false,
          message: "توکن سامانه پیامک آموت تنظیم نشده است. ابتدا در تب تنظیمات آن را وارد کنید.",
        });
      }

      const activeLine = (lineNumber || dbSettings.line_number || "Public").trim();

      // ارسال درخواست به متد SendSimple آموت
      const amootPayload = {
        token: dbSettings.amoot_token,
        Mobiles: targetMobiles.join(","),
        SendDateTime: "0",
        SMSMessageText: text.trim(),
        LineNumber: activeLine,
      };

      const sendRes = await fetch("https://portal.amootsms.com/rest/SendSimple", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(amootPayload).toString(),
        signal: AbortSignal.timeout(15000),
      });

      const sendData = await sendRes.json().catch(() => null);

      if (!sendData) {
        return res.status(502).json({
          success: false,
          message: "عدم دریافت پاسخ معتبر از وب‌سرویس آموت.",
        });
      }

      const isSuccess = sendData.Status === "Success";
      const campaignId = String(sendData.CampaignID || "");
      const partsCount = Number(sendData.SMSPagesCount) || 1;
      const pricePerMsg = targetMobiles.length > 0 ? (Number(sendData.Price) || 0) / targetMobiles.length : 0;

      // درج سوابق در جدول sms_outbox
      const outboxRecords = targetMobiles.map((m) => ({
        message_id: campaignId,
        mobile: m,
        text: text.trim(),
        status: isSuccess ? "sent" : "failed",
        error_message: isSuccess ? null : sendData.Status,
        line_number: activeLine,
        parts: partsCount,
        cost: pricePerMsg,
        created_by: user.id,
      }));

      await adminClient.from("sms_outbox").insert(outboxRecords);

      if (isSuccess) {
        return res.status(200).json({
          success: true,
          status: "Success",
          campaignId: sendData.CampaignID,
          price: sendData.Price,
          parts: partsCount,
          count: targetMobiles.length,
          message: `پیامک با موفقیت به ${targetMobiles.length} شماره ارسال شد.`,
        });
      } else {
        return res.status(200).json({
          success: false,
          status: sendData.Status,
          message: translateAmootStatus(sendData.Status),
        });
      }
    }

    return res.status(400).json({ error: "اقدام نامعتبر (Invalid action)" });
  } catch (err) {
    console.error("Amoot Proxy Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
    });
  }
}