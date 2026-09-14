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
    User_WebServiceBanned: "دسترسی وب‌سرویس این حساب در سامانه آموت مسدود یا غیرفعال است (احتمالاً نیاز به احراز هویت/تأیید مدارک یا فعال‌سازی وب‌سرویس در پنل آموت دارید)",
    User_NotActive: "حساب کاربری آموت شما هنوز فعال نشده است",
    User_AccessDenied: "عدم دسترسی به وب‌سرویس در حساب آموت",
    LineNumber_Empty: "شماره خط فرستنده وارد نشده است (می‌توانید Public یا خط اختصاصی را انتخاب کنید)",
    LineNumber_Invalid: "شماره خط فرستنده در حساب آموت شما معتبر یا فعال نیست (می‌توانید خط Public یا Service را انتخاب کنید)",
    LineNumber_NotExist: "شماره خط فرستنده انتخابی در حساب آموت شما تعریف نشده است (لطفاً یکی از خطوط معتبر مانند Service یا Public یا 98 را انتخاب کنید)",
    Line_Not_Active: "خط ارسال پیامک انتخابی فعال نیست",
    Line_AccessDenied: "شما مجوز ارسال پیامک از این خط را ندارید",
    Insufficient_Credit: "اعتبار پنل پیامک آموت شما کافی نیست (لطفاً حساب آموت را شارژ کنید)",
    Mobile_Empty: "شماره موبایل گیرنده وارد نشده است",
    Mobiles_Empty: "شماره موبایل گیرنده وارد نشده است",
    Mobile_Invalid: "شماره موبایل وارد شده معتبر نیست",
    Mobiles_Invalid: "شماره موبایل‌های وارد شده معتبر نیستند",
    MessageText_Empty: "متن پیامک نمی‌تواند خالی باشد",
    SMSMessageText_Empty: "متن پیامک نمی‌تواند خالی باشد",
    FilterMessage_Reject: "متن پیامک توسط سامانه فیلترینگ پیامک رد شد (حاوی کلمات مسدودشده یا تبلیغاتی)",
    SendDateTime_Invalid: "تاریخ و زمان ارسال پیامک نامعتبر است",
    DailyLimit_Exceeded: "سقف مجاز ارسال روزانه پیامک به پایان رسیده است",
    Failed: "ارسال پیامک با خطا مواجه شد",
    ServerError: "خطای سرور سرویس‌دهنده آموت",
  };
  return map[status] || `وضعیت درگاه پیامک: ${status}`;
}

export default async function handler(req, res) {
  // پشتیبانی آزاد از CORS برای پنل ادمین
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", service: "Amoot Bridge" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const adminClient = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

  const body = req.body || {};
  const { action } = body;

  try {
    // ══════════════════════════════════════════════════════════════
    // ۱. تست اتصال و بررسی اعتبار آموت (بدون نیاز به گیت 401)
    // ══════════════════════════════════════════════════════════════
    if (action === "test_connection") {
      let testToken = (body.token || "").trim();

      // اگر توکن پاس داده نشده، از دیتابیس می‌خوانیم
      if (!testToken && adminClient) {
        const { data: dbSettings } = await adminClient
          .from("sms_settings")
          .select("amoot_token")
          .eq("id", 1)
          .maybeSingle();
        testToken = dbSettings?.amoot_token || "";
      }

      if (!testToken) {
        testToken =
          process.env.AMOOT_TOKEN ||
          process.env.AMOOT_SMS_TOKEN ||
          process.env.VITE_AMOOT_TOKEN ||
          "";
      }

      if (!testToken) {
        return res.status(200).json({
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
        return res.status(200).json({
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
      let dbSettings = null;
      if (adminClient) {
        const { data } = await adminClient
          .from("sms_settings")
          .select("id, amoot_token, line_number, sender_name, is_active, updated_at")
          .eq("id", 1)
          .maybeSingle();
        dbSettings = data;
      }

      const effectiveToken = (
        (body.token ||
          dbSettings?.amoot_token ||
          process.env.AMOOT_TOKEN ||
          process.env.AMOOT_SMS_TOKEN ||
          process.env.VITE_AMOOT_TOKEN ||
          "") + ""
      ).trim();
      const hasToken = Boolean(effectiveToken && effectiveToken.length > 5);
      const maskedToken = hasToken
        ? "••••••••" + effectiveToken.slice(-4)
        : "";

      let liveAccount = null;
      if (hasToken && (dbSettings?.is_active ?? true)) {
        try {
          const amootRes = await fetch("https://portal.amootsms.com/rest/AccountStatus", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: effectiveToken }).toString(),
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
              listLineNumbers: Array.isArray(amootData.ListLineNumbers) && amootData.ListLineNumbers.length > 0
                ? amootData.ListLineNumbers
                : ["Public"],
            };
          } else if (amootData) {
            liveAccount = {
              status: "error",
              error: amootData.Status,
              message: translateAmootStatus(amootData.Status),
            };
          }
        } catch {
          // ignore
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

      if (!adminClient) {
        return res.status(200).json({ success: true, message: "تنظیمات دریافت شد." });
      }

      const { data: existing } = await adminClient
        .from("sms_settings")
        .select("amoot_token")
        .eq("id", 1)
        .maybeSingle();

      let finalToken = existing?.amoot_token || "";
      if (typeof amoot_token === "string" && amoot_token.trim() && !amoot_token.includes("••••")) {
        finalToken = amoot_token.trim();
      }

      if (adminClient) {
        try {
          await adminClient.from("sms_settings").upsert(
            {
              id: 1,
              amoot_token: finalToken,
              line_number: (line_number || "Public").trim(),
              sender_name: (sender_name || "پرس‌کاد").trim(),
              is_active: Boolean(is_active),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        } catch (dbErr) {
          console.warn("amoot-proxy upsert error:", dbErr?.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: "تنظیمات با موفقیت ذخیره شد.",
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ۴. ارسال پیامک (Send SMS via Amoot SendSimple)
    // ══════════════════════════════════════════════════════════════
    if (action === "send_sms") {
      const { mobiles, text, lineNumber, token: customToken } = body;

      if (!text || !text.trim()) {
        return res.status(200).json({ success: false, message: "متن پیامک نمی‌تواند خالی باشد." });
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

      targetMobiles = [...new Set(targetMobiles)];

      if (targetMobiles.length === 0) {
        return res.status(200).json({
          success: false,
          message: "هیچ شماره موبایل معتبری برای ارسال یافت نشد (شماره باید با ۰۹ شروع شود).",
        });
      }

      let activeToken = ((customToken || body.token || "") + "").trim();
      let defaultLine = lineNumber || "Public";

      if (!activeToken && adminClient) {
        try {
          const { data: dbSettings } = await adminClient
            .from("sms_settings")
            .select("amoot_token, line_number, is_active")
            .eq("id", 1)
            .maybeSingle();

          if (dbSettings) {
            activeToken = dbSettings.amoot_token || "";
            defaultLine = lineNumber || dbSettings.line_number || "Public";
          }
        } catch {
          // ignore
        }
      }

      if (!activeToken) {
        activeToken =
          process.env.AMOOT_TOKEN ||
          process.env.AMOOT_SMS_TOKEN ||
          process.env.VITE_AMOOT_TOKEN ||
          "";
      }

      if (!activeToken) {
        return res.status(200).json({
          success: false,
          message: "توکن سامانه پیامک آموت یافت نشد. لطفاً در تب تنظیمات توکن را ذخیره نمایید.",
        });
      }

      const amootPayload = {
        token: activeToken,
        Mobiles: targetMobiles.join(","),
        SMSMessageText: text.trim(),
        LineNumber: defaultLine,
      };

      if (body.sendDateTime && String(body.sendDateTime).trim() !== "0") {
        amootPayload.SendDateTime = String(body.sendDateTime).trim();
      }

      const sendRes = await fetch("https://portal.amootsms.com/rest/SendSimple", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(amootPayload).toString(),
        signal: AbortSignal.timeout(15000),
      });

      const sendData = await sendRes.json().catch(() => null);

      if (!sendData) {
        return res.status(200).json({
          success: false,
          message: "عدم دریافت پاسخ از سرور آموت.",
        });
      }

      const isSuccess = sendData.Status === "Success";
      const campaignId = String(sendData.CampaignID || "");
      const partsCount = Number(sendData.SMSPagesCount) || 1;
      const pricePerMsg = targetMobiles.length > 0 ? (Number(sendData.Price) || 0) / targetMobiles.length : 0;

      // درج سوابق در دیتابیس
      if (adminClient) {
        try {
          const outboxRecords = targetMobiles.map((m) => ({
            message_id: campaignId,
            mobile: m,
            text: text.trim(),
            status: isSuccess ? "sent" : "failed",
            error_message: isSuccess ? null : sendData.Status,
            line_number: defaultLine,
            parts: partsCount,
            cost: pricePerMsg,
          }));
          await adminClient.from("sms_outbox").insert(outboxRecords);
        } catch {
          // ignore
        }
      }

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

    return res.status(200).json({ success: true, message: "Amoot Bridge Ready" });
  } catch (err) {
    console.error("Amoot Bridge Error:", err);
    return res.status(200).json({
      success: false,
      message: err.message || "خطای ارتباط با سرور",
    });
  }
}