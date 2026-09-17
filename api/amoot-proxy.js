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
    LineNumber_Empty: "شماره خط فرستنده وارد نشده است (می‌توانید خط 98 را انتخاب کنید)",
    LineNumber_Invalid: "شماره خط فرستنده در حساب آموت شما معتبر یا فعال نیست (می‌توانید خط 98 را انتخاب کنید)",
    LineNumber_NotExist: "شماره خط فرستنده انتخابی در حساب آموت شما تعریف نشده است (لطفاً خط معتبر 98 را انتخاب کنید)",
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

function cleanWebhookVal(v) {
  if (v === null || v === undefined) return "";
  let s = String(v).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export default async function handler(req, res) {
  // پشتیبانی آزاد از CORS برای پنل ادمین و وب‌هوک آموت
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-SMSCenter-Signature, x-smscenter-signature, *");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const adminClient = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

  let queryParams = {};
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      queryParams[k] = cleanWebhookVal(v);
    }
  }

  let body = req.body || {};
  if (typeof body === "string" && body.trim()) {
    try {
      body = JSON.parse(body);
    } catch {
      try {
        body = Object.fromEntries(new URLSearchParams(body));
      } catch {
        body = {};
      }
    }
  }

  let bodyParams = {};
  if (typeof body === "object" && body !== null) {
    for (const [k, v] of Object.entries(body)) {
      bodyParams[k] = cleanWebhookVal(v);
    }
  }

  const webhookPayload = { ...queryParams, ...bodyParams };
  const isWebhook =
    queryParams.mode === "webhook" ||
    req.url?.includes("webhook") ||
    Boolean(req.headers["x-smscenter-signature"]) ||
    Boolean(webhookPayload.DeliveryType || webhookPayload.DeliveryStatus || webhookPayload.SMSMessageText);

  // ══════════════════════════════════════════════════════════════
  // ۰. پردازش وب‌هوک وضعیت دلیوری و پیام‌های دریافتی آموت
  // ══════════════════════════════════════════════════════════════
  if (isWebhook) {
    if (adminClient) {
      try {
        const deliveryStatus =
          webhookPayload.DeliveryType ||
          webhookPayload.DeliveryStatus ||
          webhookPayload.Status ||
          webhookPayload.status ||
          "";

        const deliveryMsgId =
          webhookPayload.MessageID ||
          webhookPayload.CampaignID ||
          webhookPayload.messageId ||
          webhookPayload.ID ||
          "";

        const mobile =
          webhookPayload.Mobile ||
          webhookPayload.mobile ||
          webhookPayload.From ||
          webhookPayload.Sender ||
          webhookPayload.senderNumber ||
          "";

        const text =
          webhookPayload.SMSMessageText ||
          webhookPayload.MessageText ||
          webhookPayload.messageText ||
          webhookPayload.Text ||
          webhookPayload.text ||
          "";

        const lineNumber =
          webhookPayload.LineNumber ||
          webhookPayload.lineNumber ||
          webhookPayload.To ||
          webhookPayload.receiverNumber ||
          "";

        if (deliveryMsgId && deliveryStatus) {
          try {
            await adminClient.from("sms_delivery_reports").insert({
              message_id: deliveryMsgId,
              mobile: mobile || null,
              status: deliveryStatus,
              delivered_at: new Date().toISOString(),
              raw_payload: webhookPayload,
            });
          } catch {}

          const isDelivered = deliveryStatus.toLowerCase().includes("deliver");
          const isFailed = deliveryStatus.toLowerCase().includes("fail") || deliveryStatus.toLowerCase().includes("reject");

          await adminClient
            .from("sms_outbox")
            .update({
              status: isDelivered ? "delivered" : isFailed ? "failed" : "sent",
            })
            .eq("message_id", deliveryMsgId);
        }

        if (mobile || text) {
          await adminClient.from("sms_inbox").insert({
            amoot_message_id: webhookPayload.MessageID || null,
            mobile: mobile,
            line_number: lineNumber,
            text: text,
            raw_payload: webhookPayload,
          });
        }
      } catch (err) {
        console.error("Amoot Webhook processing error:", err);
      }
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (typeof res.send === "function") {
      return res.status(200).send("OK");
    }
    return res.status(200).end("OK");
  }

  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", service: "Amoot Bridge" });
  }

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
            ? amootData.ListLineNumbers.filter((l) => l && l !== "Public" && l !== "Service").length > 0
              ? amootData.ListLineNumbers.filter((l) => l && l !== "Public" && l !== "Service")
              : ["98"]
            : ["98"],
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
                ? amootData.ListLineNumbers.filter((l) => l && l !== "Public" && l !== "Service").length > 0
                  ? amootData.ListLineNumbers.filter((l) => l && l !== "Public" && l !== "Service")
                  : ["98"]
                : ["98"],
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
          line_number: (!dbSettings?.line_number || dbSettings?.line_number === "Public" || dbSettings?.line_number === "Service") ? "98" : dbSettings.line_number,
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
              line_number: (!line_number || line_number === "Public" || line_number === "Service" ? "98" : line_number).trim(),
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
      let defaultLine = (!lineNumber || lineNumber === "Public" || lineNumber === "Service") ? "98" : lineNumber;

      if (!activeToken && adminClient) {
        try {
          const { data: dbSettings } = await adminClient
            .from("sms_settings")
            .select("amoot_token, line_number, is_active")
            .eq("id", 1)
            .maybeSingle();

          if (dbSettings) {
            activeToken = dbSettings.amoot_token || "";
            const dbLine = dbSettings.line_number;
            defaultLine = (!dbLine || dbLine === "Public" || dbLine === "Service") ? defaultLine : dbLine;
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

    // ══════════════════════════════════════════════════════════════
    // ۵. ارسال پیامک با الگو (Send SMS via Amoot SendWithPattern)
    // ══════════════════════════════════════════════════════════════
    if (action === "send_pattern_sms") {
      const { mobile, patternCode, patternValues, token: customToken } = body;

      const cleanMobile = normalizeIranPhone(mobile);
      if (!isValidIranPhone(cleanMobile)) {
        return res.status(200).json({
          success: false,
          message: "شماره موبایل وارد شده معتبر نمی‌باشد (باید با ۰۹ شروع شود).",
        });
      }

      let activeToken = ((customToken || body.token || "") + "").trim();
      if (!activeToken && adminClient) {
        try {
          const { data: dbSettings } = await adminClient
            .from("sms_settings")
            .select("amoot_token")
            .eq("id", 1)
            .maybeSingle();
          if (dbSettings?.amoot_token) activeToken = dbSettings.amoot_token;
        } catch {}
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
          message: "توکن سامانه پیامک آموت یافت نشد.",
        });
      }

      const patternPayload = new URLSearchParams({
        Token: activeToken,
        token: activeToken,
        PatternCode: String(patternCode || "6516").trim(),
        Mobile: cleanMobile,
        MobileNumbers: cleanMobile,
        PatternValues: typeof patternValues === "object" ? JSON.stringify(patternValues) : String(patternValues || ""),
      });

      const sendRes = await fetch("https://portal.amootsms.com/rest/SendWithPattern", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: patternPayload.toString(),
        signal: AbortSignal.timeout(15000),
      });

      const sendData = await sendRes.json().catch(() => null);

      if (!sendData) {
        return res.status(200).json({
          success: false,
          message: "عدم دریافت پاسخ از سرور آموت.",
        });
      }

      const isSuccess = sendData.Status === "Success" || sendData.Status === "success" || sendData.Status === "OK";
      return res.status(200).json({
        success: isSuccess,
        status: sendData.Status,
        data: sendData,
        message: isSuccess ? "پیامک بر اساس الگو با موفقیت ارسال شد." : (translateAmootStatus(sendData.Status) || sendData.Status),
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ۶. ثبت پیام زماندار (Schedule SMS)
    // ══════════════════════════════════════════════════════════════
    if (action === "schedule_sms") {
      const {
        mobiles,
        text,
        lineNumber,
        scheduledAt,
        sourceType = "manual",
        sourceFormId = null,
      } = body;

      if (!adminClient) {
        return res.status(500).json({ success: false, message: "اتصال به پایگاه داده برقرار نیست." });
      }

      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: "متن پیامک نمی‌تواند خالی باشد." });
      }

      if (text.trim().length > 1000) {
        return res.status(400).json({ success: false, message: "متن پیامک حداکثر می‌تواند ۱۰۰۰ کاراکتر باشد." });
      }

      if (!scheduledAt) {
        return res.status(400).json({ success: false, message: "تاریخ و ساعت ارسال پیامک مشخص نشده است." });
      }

      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ success: false, message: "فرمت تاریخ و ساعت ارسال نامعتبر است." });
      }

      // حداقل ۲ دقیقه بعد از زمان کنونی
      const now = Date.now();
      const minScheduledTime = now + 90 * 1000; // با ۱۰ ثانیه حاشیه برای تاخیر شبکه
      if (scheduledDate.getTime() < minScheduledTime) {
        return res.status(400).json({
          success: false,
          message: "زمان ارسال باید حداقل ۲ دقیقه بعد از زمان کنونی باشد.",
        });
      }

      // نرمال‌سازی شماره‌ها و گزارش وضعیت
      let rawList = [];
      if (Array.isArray(mobiles)) {
        rawList = mobiles.map((m) => String(m || "").trim()).filter(Boolean);
      } else if (typeof mobiles === "string") {
        rawList = mobiles.split(/[\n,;]+/).map((m) => m.trim()).filter(Boolean);
      }

      let validMobiles = [];
      let invalidCount = 0;

      for (const item of rawList) {
        const norm = normalizeIranPhone(item);
        if (isValidIranPhone(norm)) {
          validMobiles.push(norm);
        } else {
          invalidCount++;
        }
      }

      const totalValidRaw = validMobiles.length;
      const uniqueMobiles = [...new Set(validMobiles)];
      const duplicateCount = totalValidRaw - uniqueMobiles.length;

      if (uniqueMobiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "هیچ شماره موبایل معتبری برای زمانبندی یافت نشد (شماره‌ها باید با ۰۹ شروع شوند).",
        });
      }

      const maxLimit = Number(process.env.MAX_SCHEDULED_RECIPIENTS || 5000);
      if (uniqueMobiles.length > maxLimit) {
        return res.status(400).json({
          success: false,
          message: `حداکثر تعداد گیرندگان در هر نوبت زمانبندی ${maxLimit.toLocaleString("fa-IR")} شماره است.`,
        });
      }

      // استخراج کاربر جاری
      let userId = body.user_id || null;
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
          const token = authHeader.replace("Bearer ", "").trim();
          try {
            const { data: { user } } = await adminClient.auth.getUser(token);
            if (user?.id) userId = user.id;
          } catch {}
        }
      }

      const finalLine = (!lineNumber || lineNumber === "Service" || lineNumber === "Public") ? "98" : lineNumber;

      // درج در جدول scheduled_sms
      const { data: scheduledRow, error: insertError } = await adminClient
        .from("scheduled_sms")
        .insert({
          user_id: userId,
          message: text.trim(),
          sender_number: finalLine,
          source_type: sourceType === "form" ? "form" : "manual",
          source_form_id: sourceFormId || null,
          scheduled_at: scheduledDate.toISOString(),
          status: "pending",
          total_count: uniqueMobiles.length,
          success_count: 0,
          failed_count: 0,
          attempts: 0,
        })
        .select()
        .single();

      if (insertError || !scheduledRow) {
        console.error("Error creating scheduled_sms:", insertError);
        return res.status(500).json({
          success: false,
          message: "خطا در ثبت اطلاعات زمانبندی در پایگاه داده: " + (insertError?.message || ""),
        });
      }

      // درج دسته‌ای گیرندگان در scheduled_sms_recipients (دسته‌های ۵۰۰ تایی)
      const recipientRows = uniqueMobiles.map((mob) => ({
        scheduled_sms_id: scheduledRow.id,
        mobile: mob,
        status: "pending",
      }));

      const BATCH_SIZE = 500;
      for (let i = 0; i < recipientRows.length; i += BATCH_SIZE) {
        const batch = recipientRows.slice(i, i + BATCH_SIZE);
        const { error: batchErr } = await adminClient
          .from("scheduled_sms_recipients")
          .insert(batch);
        if (batchErr) {
          console.warn("Recipients batch insert warning:", batchErr);
        }
      }

      return res.status(200).json({
        success: true,
        id: scheduledRow.id,
        scheduled_sms: scheduledRow,
        total_count: uniqueMobiles.length,
        removed_invalid_count: invalidCount,
        removed_duplicate_count: duplicateCount,
        message: `زمانبندی پیامک برای تاریخ و ساعت انتخابی با ${uniqueMobiles.length.toLocaleString("fa-IR")} گیرنده با موفقیت ثبت شد.`,
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ۷. دریافت لیست پیام‌های زماندار (Get Scheduled SMS List)
    // ══════════════════════════════════════════════════════════════
    if (action === "get_scheduled_sms_list") {
      if (!adminClient) {
        return res.status(500).json({ success: false, message: "اتصال به پایگاه داده برقرار نیست." });
      }

      const { status = "all", search = "", page = 1, limit = 20, fromDate, toDate } = body;
      const offset = (Number(page) - 1) * Number(limit);

      let query = adminClient
        .from("scheduled_sms")
        .select("*, forms:source_form_id(id, title, slug)", { count: "exact" })
        .order("scheduled_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (search && search.trim()) {
        query = query.ilike("message", `%${search.trim()}%`);
      }

      if (fromDate) {
        query = query.gte("scheduled_at", new Date(fromDate).toISOString());
      }
      if (toDate) {
        query = query.lte("scheduled_at", new Date(toDate).toISOString());
      }

      query = query.range(offset, offset + Number(limit) - 1);

      const { data, count, error } = await query;
      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(200).json({
        success: true,
        list: data || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ۸. دریافت جزئیات پیام زماندار و گیرندگان (Get Scheduled SMS Detail)
    // ══════════════════════════════════════════════════════════════
    if (action === "get_scheduled_sms_detail") {
      const { id } = body;
      if (!id) {
        return res.status(400).json({ success: false, message: "شناسه پیام مشخص نشده است." });
      }

      if (!adminClient) {
        return res.status(500).json({ success: false, message: "اتصال به پایگاه داده برقرار نیست." });
      }

      const { data: scheduledItem, error: fetchErr } = await adminClient
        .from("scheduled_sms")
        .select("*, forms:source_form_id(id, title, slug)")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !scheduledItem) {
        return res.status(404).json({ success: false, message: "پیام زماندار مورد نظر یافت نشد." });
      }

      const { data: recipients, error: recErr } = await adminClient
        .from("scheduled_sms_recipients")
        .select("*")
        .eq("scheduled_sms_id", id)
        .order("id", { ascending: true })
        .limit(1000);

      return res.status(200).json({
        success: true,
        scheduledSms: scheduledItem,
        recipients: recipients || [],
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ۹. لغو پیام زماندار (Cancel Scheduled SMS)
    // ══════════════════════════════════════════════════════════════
    if (action === "cancel_scheduled_sms") {
      const { id } = body;
      if (!id) {
        return res.status(400).json({ success: false, message: "شناسه پیام مشخص نشده است." });
      }

      if (!adminClient) {
        return res.status(500).json({ success: false, message: "اتصال به پایگاه داده برقرار نیست." });
      }

      const { data: target, error: fetchErr } = await adminClient
        .from("scheduled_sms")
        .select("id, status")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !target) {
        return res.status(404).json({ success: false, message: "پیام زماندار یافت نشد." });
      }

      if (target.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: `تنها پیام‌های در وضعیت «در انتظار» قابل لغو هستند (وضعیت فعلی: ${target.status}).`,
        });
      }

      const { error: updateErr } = await adminClient
        .from("scheduled_sms")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateErr) {
        return res.status(500).json({ success: false, message: "خطا در لغو زمانبندی: " + updateErr.message });
      }

      return res.status(200).json({
        success: true,
        message: "زمانبندی ارسال پیامک با موفقیت لغو گردید.",
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ۱۰. پردازش و دیسپچ صف پیام‌های زماندار (Dispatch Scheduled SMS)
    // ══════════════════════════════════════════════════════════════
    if (action === "dispatch_scheduled_sms") {
      if (!adminClient) {
        return res.status(500).json({ success: false, message: "اتصال به پایگاه داده برقرار نیست." });
      }

      const nowIso = new Date().toISOString();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

      // ۱. رکوردهای واجد شرایط را بخوان: status = 'pending' AND scheduled_at <= NOW() AND (locked_at IS NULL OR locked_at < NOW() - 10m)
      const { data: candidates, error: candErr } = await adminClient
        .from("scheduled_sms")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", nowIso)
        .or(`locked_at.is.null,locked_at.lte.${tenMinutesAgo}`)
        .order("scheduled_at", { ascending: true })
        .limit(10);

      if (candErr) {
        console.error("Scheduled SMS candidates query error:", candErr);
        return res.status(500).json({ success: false, message: candErr.message });
      }

      if (!candidates || candidates.length === 0) {
        return res.status(200).json({
          success: true,
          processedCount: 0,
          message: "هیچ پیام زمانداری در انتظار ارسال نیست.",
        });
      }

      // دریافت توکن فعال آموت
      let activeToken = process.env.AMOOT_TOKEN || process.env.AMOOT_SMS_TOKEN || process.env.VITE_AMOOT_TOKEN || "";
      let defaultLine = "98";

      try {
        const { data: dbSettings } = await adminClient
          .from("sms_settings")
          .select("amoot_token, line_number, is_active")
          .eq("id", 1)
          .maybeSingle();

        if (dbSettings) {
          if (dbSettings.amoot_token) activeToken = dbSettings.amoot_token;
          if (dbSettings.line_number && dbSettings.line_number !== "Public" && dbSettings.line_number !== "Service") {
            defaultLine = dbSettings.line_number;
          }
        }
      } catch {}

      const results = [];

      for (const item of candidates) {
        // ۲. قفل موقت رکورد
        const lockRes = await adminClient
          .from("scheduled_sms")
          .update({
            status: "processing",
            locked_at: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("status", "pending");

        if (lockRes.error) {
          console.warn(`Could not lock scheduled_sms #${item.id}:`, lockRes.error);
          continue;
        }

        // ۳. بررسی انقضا (اگر بیش از ۶ ساعت عقب افتاده باشد)
        const scheduledTime = new Date(item.scheduled_at).getTime();
        const sixHoursAgoTime = Date.now() - 6 * 60 * 60 * 1000;
        if (scheduledTime < sixHoursAgoTime) {
          const expiredErr = "منقضی شده (تاخیر بیش از ۶ ساعت در سرور)";
          await adminClient
            .from("scheduled_sms")
            .update({
              status: "failed",
              last_error: "expired",
              locked_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          await sendBotReportSafe({
            id: item.id,
            scheduled_at: item.scheduled_at,
            sender_number: item.sender_number || defaultLine,
            message: item.message,
            total_count: item.total_count,
            success_count: 0,
            failed_count: item.total_count,
            status: "failed",
            last_error: expiredErr,
          });

          await adminClient
            .from("scheduled_sms")
            .update({ bot_notified_at: new Date().toISOString() })
            .eq("id", item.id);

          results.push({ id: item.id, status: "expired" });
          continue;
        }

        // بررسی وجود توکن
        if (!activeToken) {
          const tokenErr = "توکن وب‌سرویس آموت در سامانه تعریف نشده است.";
          await adminClient
            .from("scheduled_sms")
            .update({
              status: "failed",
              last_error: tokenErr,
              locked_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          await sendBotReportSafe({
            id: item.id,
            scheduled_at: item.scheduled_at,
            sender_number: item.sender_number || defaultLine,
            message: item.message,
            total_count: item.total_count,
            success_count: 0,
            failed_count: item.total_count,
            status: "failed",
            last_error: tokenErr,
          });

          results.push({ id: item.id, status: "failed", error: tokenErr });
          continue;
        }

        // ۴. واکشی گیرندگان
        const { data: recipients, error: recErr } = await adminClient
          .from("scheduled_sms_recipients")
          .select("id, mobile")
          .eq("scheduled_sms_id", item.id);

        if (recErr || !recipients || recipients.length === 0) {
          await adminClient
            .from("scheduled_sms")
            .update({
              status: "failed",
              last_error: "هیچ گیرنده‌ای برای این پیامک یافت نشد.",
              locked_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          continue;
        }

        let totalSuccess = 0;
        let totalFailed = 0;
        let lastErrorText = null;
        let lastProviderResponse = null;
        const lineToSend = (!item.sender_number || item.sender_number === "Public" || item.sender_number === "Service")
          ? defaultLine
          : item.sender_number;

        // ۵. دسته‌های ۱۰۰ تایی گیرندگان
        const BATCH_SIZE = 100;
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
          const batch = recipients.slice(i, i + BATCH_SIZE);
          const batchMobiles = batch.map((r) => r.mobile);
          const batchIds = batch.map((r) => r.id);

          try {
            const amootPayload = {
              token: activeToken,
              Mobiles: batchMobiles.join(","),
              SMSMessageText: item.message.trim(),
              LineNumber: lineToSend,
            };

            const sendRes = await fetch("https://portal.amootsms.com/rest/SendSimple", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(amootPayload).toString(),
              signal: AbortSignal.timeout(20000),
            });

            const sendData = await sendRes.json().catch(() => null);
            lastProviderResponse = sendData;

            if (sendData && sendData.Status === "Success") {
              const campaignId = String(sendData.CampaignID || "");
              const partsCount = Number(sendData.SMSPagesCount) || 1;
              const pricePerMsg = batchMobiles.length > 0 ? (Number(sendData.Price) || 0) / batchMobiles.length : 0;

              // بروزرسانی وضعیت گیرندگان این دسته
              await adminClient
                .from("scheduled_sms_recipients")
                .update({
                  status: "sent",
                  provider_message_id: campaignId,
                  updated_at: new Date().toISOString(),
                })
                .in("id", batchIds);

              // ثبت در تاریخچه سایت (sms_outbox) با برچسب زماندار
              const outboxRows = batchMobiles.map((mob) => ({
                message_id: campaignId,
                mobile: mob,
                text: item.message.trim(),
                status: "sent",
                line_number: lineToSend,
                parts: partsCount,
                cost: pricePerMsg,
                is_scheduled: true,
                scheduled_sms_id: item.id,
              }));

              await adminClient.from("sms_outbox").insert(outboxRows).catch(() => {});

              totalSuccess += batchMobiles.length;
            } else {
              const rawStatus = sendData?.Status || "Failed";
              const errorFa = translateAmootStatus(rawStatus);
              lastErrorText = errorFa;

              await adminClient
                .from("scheduled_sms_recipients")
                .update({
                  status: "failed",
                  error_message: errorFa,
                  updated_at: new Date().toISOString(),
                })
                .in("id", batchIds);

              const outboxRows = batchMobiles.map((mob) => ({
                mobile: mob,
                text: item.message.trim(),
                status: "failed",
                error_message: errorFa,
                line_number: lineToSend,
                is_scheduled: true,
                scheduled_sms_id: item.id,
              }));

              await adminClient.from("sms_outbox").insert(outboxRows).catch(() => {});

              totalFailed += batchMobiles.length;
            }
          } catch (netErr) {
            console.error(`Batch send error for scheduled_sms #${item.id}:`, netErr);
            lastErrorText = netErr.message || "خطای ارتباط با درگاه پیامک";
            totalFailed += batchMobiles.length;

            await adminClient
              .from("scheduled_sms_recipients")
              .update({
                status: "failed",
                error_message: lastErrorText,
                updated_at: new Date().toISOString(),
              })
              .in("id", batchIds);
          }
        }

        // ۶. جمع‌بندی وضعیت نهایی رکورد
        const finalStatus = totalSuccess > 0 ? "sent" : "failed";

        await adminClient
          .from("scheduled_sms")
          .update({
            status: finalStatus,
            success_count: totalSuccess,
            failed_count: totalFailed,
            total_count: recipients.length,
            last_error: lastErrorText,
            provider_response: lastProviderResponse,
            locked_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        // ۷. ارسال گزارش به ربات
        await sendBotReportSafe({
          id: item.id,
          scheduled_at: item.scheduled_at,
          sender_number: lineToSend,
          message: item.message,
          total_count: recipients.length,
          success_count: totalSuccess,
          failed_count: totalFailed,
          status: finalStatus,
          last_error: lastErrorText,
        });

        await adminClient
          .from("scheduled_sms")
          .update({ bot_notified_at: new Date().toISOString() })
          .eq("id", item.id);

        results.push({
          id: item.id,
          status: finalStatus,
          successCount: totalSuccess,
          failedCount: totalFailed,
        });
      }

      return res.status(200).json({
        success: true,
        processedCount: results.length,
        results,
      });
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

// ══════════════════════════════════════════════════════════════
// توابع کمکی گزارش‌دهی به ربات (Bot Reporting)
// ══════════════════════════════════════════════════════════════
function formatJalaliDateTimeSafe(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    const dateStr = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const timeStr = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    return { dateStr, timeStr };
  } catch {
    return { dateStr: "—", timeStr: "—" };
  }
}

async function sendBotReportSafe({
  id,
  scheduled_at,
  sender_number,
  message,
  total_count,
  success_count,
  failed_count,
  status,
  last_error,
}) {
  const botToken = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "").trim().replace(/^bot/i, "");
  const botChatId = (process.env.BOT_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "").trim();
  const botApiBase = (process.env.BOT_API_BASE || "https://api.telegram.org").trim().replace(/\/$/, "");

  if (!botToken || !botChatId) {
    return;
  }

  const { dateStr, timeStr } = formatJalaliDateTimeSafe(scheduled_at);
  const statusFaMap = {
    sent: "ارسال شد",
    failed: "ناموفق",
    canceled: "لغو شده",
    processing: "در حال ارسال",
    pending: "در انتظار ارسال",
  };
  const statusFa = statusFaMap[status] || status;

  const previewText = (message || "").trim().slice(0, 60);

  let reportText =
`📤 گزارش ارسال زماندار

شناسه: #${id}
زمان مقرر: ${dateStr} — ${timeStr}
خط ارسال: ${sender_number}

متن: ${previewText}${message && message.length > 60 ? "..." : ""}

گیرندگان: ${total_count}
✅ موفق: ${success_count}
❌ ناموفق: ${failed_count}

وضعیت نهایی: ${statusFa}`;

  if (last_error && status === "failed") {
    reportText += `\n⚠️ علت: ${last_error}`;
  }

  try {
    const url = `${botApiBase}/bot${botToken}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: botChatId,
        text: reportText,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.warn("Scheduled SMS Bot report sending failed (silently caught):", err?.message);
  }
}
