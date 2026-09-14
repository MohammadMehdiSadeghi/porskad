import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ─── نرمال‌سازی ارقام و شماره موبایل ایران ───
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

// حافظه موقت سشن‌های OTP
// ساختار: phone => { code, expiresAt, lastSentAt, resends, attempts, verified, verificationToken, tokenExpiresAt }
const otpSessions = new Map();

// پاک‌سازی خودکار سشن‌های منقضی هر ۱۰ دقیقه
if (!global.__otpCleanupInterval) {
  global.__otpCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [phone, session] of otpSessions.entries()) {
      if (session.expiresAt < now && (!session.tokenExpiresAt || session.tokenExpiresAt < now)) {
        otpSessions.delete(phone);
      }
    }
  }, 10 * 60 * 1000);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(501).json({ error: "Service role key not configured on server" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const body = req.body || {};
  const { action, phone } = body;

  const cleanPhone = normalizeIranPhone(phone);
  const now = Date.now();

  // ══════════════════════════════════════════════════════════════
  // ۱. ارسال کد تایید (send_otp)
  // ══════════════════════════════════════════════════════════════
  if (action === "send_otp") {
    if (!isValidIranPhone(cleanPhone)) {
      return res.status(400).json({ error: "شماره موبایل وارد شده معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)" });
    }

    // ۱. بررسی یکتا بودن شماره — هر شماره فقط یک بار می‌تواند ثبت‌نام کند
    const { data: existingProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (!profileErr && existingProfile) {
      return res.status(400).json({
        error: "این شماره موبایل قبلاً در سامانه ثبت‌نام کرده است. لطفاً وارد شوید.",
        isDuplicate: true,
      });
    }

    // ۲. خواندن تنظیمات الگو و خنک‌سازی از system_settings
    let pattern = "کد تایید ثبت‌نام در پرس‌کاد: %code%";
    let lineNumber = "Service";
    let cooldownSeconds = 90; // ۱:۳۰ دقیقه طبق درخواست کاربر
    let maxResends = 2; // حداکثر ۲ بار ارسال مجدد طبق درخواست کاربر
    let amootToken = process.env.AMOOT_TOKEN || process.env.AMOOT_SMS_TOKEN || "";
    let smsOtpEnabled = true;
    let registrationEnabled = true;

    try {
      const { data: sysSettings } = await supabaseAdmin
        .from("system_settings")
        .select("key, value")
        .in("key", ["sms_otp_enabled", "registration_enabled", "otp_sms_pattern", "otp_line_number", "otp_cooldown_seconds", "otp_max_resends", "otp_amoot_token"]);

      if (Array.isArray(sysSettings) && sysSettings.length > 0) {
        for (const row of sysSettings) {
          if (row.key === "sms_otp_enabled" && row.value !== undefined) smsOtpEnabled = row.value === true || row.value === "true";
          if (row.key === "registration_enabled" && row.value !== undefined) registrationEnabled = row.value === true || row.value === "true";
          if (row.key === "otp_sms_pattern" && row.value) pattern = String(row.value);
          if (row.key === "otp_line_number" && row.value) lineNumber = String(row.value);
          if (row.key === "otp_cooldown_seconds" && Number(row.value)) cooldownSeconds = Number(row.value);
          if (row.key === "otp_max_resends" && Number(row.value) !== undefined) maxResends = Number(row.value);
          if (row.key === "otp_amoot_token" && row.value) amootToken = String(row.value);
        }
      } else {
        const { data: rpcData } = await supabaseAdmin.rpc("get_system_settings");
        if (rpcData) {
          if (typeof rpcData.sms_otp_enabled === "boolean") smsOtpEnabled = rpcData.sms_otp_enabled;
          if (typeof rpcData.registration_enabled === "boolean") registrationEnabled = rpcData.registration_enabled;
          if (rpcData.otp_sms_pattern) pattern = String(rpcData.otp_sms_pattern);
          if (rpcData.otp_line_number) lineNumber = String(rpcData.otp_line_number);
          if (rpcData.otp_cooldown_seconds) cooldownSeconds = Number(rpcData.otp_cooldown_seconds);
          if (rpcData.otp_max_resends !== undefined) maxResends = Number(rpcData.otp_max_resends);
        }
      }
    } catch {}

    if (registrationEnabled === false) {
      return res.status(403).json({ error: "ثبت‌نام عمومی در سامانه در حال حاضر غیرفعال است." });
    }

    if (smsOtpEnabled === false) {
      return res.status(400).json({ error: "ثبت‌نام با پیامک در حال حاضر غیرفعال است. لطفاً از طریق ورود با گوگل اقدام فرمایید." });
    }

    // همچنین اگر توکن آموت در sms_settings باشد بخوانیم
    if (!amootToken) {
      try {
        const { data: smsRow } = await supabaseAdmin
          .from("sms_settings")
          .select("amoot_token, line_number")
          .eq("id", 1)
          .maybeSingle();
        if (smsRow?.amoot_token) {
          amootToken = smsRow.amoot_token;
          if (!lineNumber || lineNumber === "Service") {
            lineNumber = smsRow.line_number || "Service";
          }
        }
      } catch {}
    }

    // ۳. بررسی محدودیت ارسال مجدد و زمان خنک‌سازی (Cooldown & Max Resends)
    let existingSession = otpSessions.get(cleanPhone);
    if (!existingSession) {
      try {
        const { data: dbSession } = await supabaseAdmin
          .from("otp_verifications")
          .select("*")
          .eq("phone", cleanPhone)
          .maybeSingle();
        if (dbSession) {
          existingSession = {
            code: dbSession.code,
            expiresAt: new Date(dbSession.expires_at).getTime(),
            lastSentAt: new Date(dbSession.last_sent_at).getTime(),
            resends: dbSession.resend_count || 0,
            attempts: dbSession.attempts || 0,
            verified: dbSession.verified || false,
            verificationToken: dbSession.verification_token || null,
            tokenExpiresAt: dbSession.token_expires_at ? new Date(dbSession.token_expires_at).getTime() : null,
          };
          otpSessions.set(cleanPhone, existingSession);
        }
      } catch {}
    }

    if (existingSession) {
      const elapsed = Math.floor((now - existingSession.lastSentAt) / 1000);
      if (elapsed < cooldownSeconds) {
        const remaining = cooldownSeconds - elapsed;
        return res.status(429).json({
          error: `لطفاً ${remaining} ثانیه دیگر جهت ارسال مجدد کد شکیبا باشید.`,
          remainingCooldown: remaining,
        });
      }

      if (existingSession.resends >= maxResends) {
        return res.status(429).json({
          error: `سقف ارسال مجدد کد تایید (${maxResends} بار) برای این شماره به پایان رسیده است. لطفاً بعداً تلاش کنید.`,
          maxResendsExceeded: true,
        });
      }
    }

    // ۴. تولید کد ۵ رقمی ایمن
    const code = String(Math.floor(10000 + Math.random() * 90000));
    const messageText = pattern.includes("%code%")
      ? pattern.replace(/%code%/g, code)
      : `${pattern}\nکد شما: ${code}`;

    // ۵. ارسال پیامک از طریق درگاه آموت
    let sendSuccess = false;
    let sendErrorMsg = null;

    if (amootToken) {
      try {
        const sendUrl = "https://portal.amootsoft.com/webservice2.asmx/SendSimple";
        const postData = new URLSearchParams({
          UserName: amootToken,
          Password: "",
          LineNumber: lineNumber || "Service",
          Mobile: cleanPhone,
          SMSMessage: messageText,
        });

        const resp = await fetch(sendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: postData.toString(),
        });
        const text = await resp.text();
        sendSuccess = resp.ok && (text.includes("SendSimpleResult") || text.includes("<Status>Success</Status>") || !text.includes("Fault"));
        if (!sendSuccess) {
          sendErrorMsg = text.slice(0, 160);
        }
      } catch (err) {
        sendErrorMsg = err.message;
      }
    } else {
      // حالت توسعه محلی اگر توکن تعریف نشده باشد
      console.log(`[DEV OTP LOG] Verification code for ${cleanPhone}: ${code}`);
      sendSuccess = true;
    }

    // ثبت در sms_outbox در پس‌زمینه
    try {
      await supabaseAdmin.from("sms_outbox").insert({
        mobile: cleanPhone,
        text: messageText,
        status: sendSuccess ? "sent" : "failed",
        error_message: sendErrorMsg,
        line_number: lineNumber,
      });
    } catch {}

    // ۶. ذخیره سشن جدید با افزایش شمارنده ارسال مجدد در حافظه و دیتابیس
    const currentResends = existingSession ? existingSession.resends + 1 : 0;
    const expiresAt = now + 5 * 60 * 1000;

    otpSessions.set(cleanPhone, {
      code,
      expiresAt,
      lastSentAt: now,
      resends: currentResends,
      attempts: 0,
      verified: false,
      verificationToken: null,
      tokenExpiresAt: null,
    });

    try {
      await supabaseAdmin.from("otp_verifications").upsert({
        phone: cleanPhone,
        code,
        resend_count: currentResends,
        attempts: 0,
        verified: false,
        last_sent_at: new Date(now).toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
      }, { onConflict: "phone" });
    } catch {}

    return res.status(200).json({
      success: true,
      message: "کد تایید ۵ رقمی به شماره موبایل شما پیامک شد.",
      cooldown: cooldownSeconds,
      remainingResends: maxResends - currentResends,
      // در صورت تست لوکال یا عدم وجود توکن برای سهولت توسعه
      devCode: !amootToken ? code : undefined,
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ۲. بررسی و اعتبارسنجی کد (verify_otp)
  // ══════════════════════════════════════════════════════════════
  if (action === "verify_otp") {
    const rawCode = toEnDigits(String(body.code || "")).replace(/\D/g, "");
    if (!rawCode || rawCode.length < 5) {
      return res.status(400).json({ error: "لطفاً کد تایید ۵ رقمی را کامل وارد نمایید." });
    }

    let session = otpSessions.get(cleanPhone);
    if (!session) {
      try {
        const { data: dbSession } = await supabaseAdmin
          .from("otp_verifications")
          .select("*")
          .eq("phone", cleanPhone)
          .maybeSingle();
        if (dbSession) {
          session = {
            code: dbSession.code,
            expiresAt: new Date(dbSession.expires_at).getTime(),
            lastSentAt: new Date(dbSession.last_sent_at).getTime(),
            resends: dbSession.resend_count || 0,
            attempts: dbSession.attempts || 0,
            verified: dbSession.verified || false,
            verificationToken: dbSession.verification_token || null,
            tokenExpiresAt: dbSession.token_expires_at ? new Date(dbSession.token_expires_at).getTime() : null,
          };
          otpSessions.set(cleanPhone, session);
        }
      } catch {}
    }

    if (!session) {
      return res.status(400).json({ error: "کد تاییدی برای این شماره یافت نشد یا منقضی شده است. لطفاً مجدداً کد دریافت کنید." });
    }

    if (now > session.expiresAt) {
      return res.status(400).json({ error: "کد تایید منقضی شده است (مهلت ۵ دقیقه به پایان رسید). لطفاً کد جدید دریافت کنید." });
    }

    if (session.attempts >= 5) {
      otpSessions.delete(cleanPhone);
      try { await supabaseAdmin.from("otp_verifications").delete().eq("phone", cleanPhone); } catch {}
      return res.status(429).json({ error: "تعداد دفعات ورود اشتباه بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید." });
    }

    if (session.code !== rawCode) {
      session.attempts += 1;
      try { await supabaseAdmin.from("otp_verifications").update({ attempts: session.attempts }).eq("phone", cleanPhone); } catch {}
      const remainingAttempts = 5 - session.attempts;
      return res.status(400).json({
        error: `کد تایید وارد شده نادرست است. (${remainingAttempts} تلاش باقی‌مانده)`,
      });
    }

    // تایید موفق: تولید توکن اعتبارسنجی کوتاه‌مدت برای مرحله پایانی ثبت‌نام
    const verificationToken = crypto.randomBytes(24).toString("hex");
    session.verified = true;
    session.verificationToken = verificationToken;
    session.tokenExpiresAt = now + 15 * 60 * 1000; // ۱۵ دقیقه مهلت تکمیل نام و رمز عبور

    return res.status(200).json({
      success: true,
      verificationToken,
      phone: cleanPhone,
      message: "شماره موبایل شما با موفقیت تایید شد.",
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ۳. تکمیل ثبت‌نام (complete_registration)
  // ══════════════════════════════════════════════════════════════
  if (action === "complete_registration") {
    const { verificationToken, fullName, password } = body;

    if (!verificationToken) {
      return res.status(400).json({ error: "توکن اعتبارسنجی یافت نشد. لطفاً ابتدا شماره را تایید کنید." });
    }

    let session = otpSessions.get(cleanPhone);
    if (!session || !session.verified || session.verificationToken !== verificationToken) {
      try {
        const { data: dbSession } = await supabaseAdmin
          .from("otp_verifications")
          .select("*")
          .eq("phone", cleanPhone)
          .maybeSingle();
        if (dbSession && dbSession.verified && dbSession.verification_token === verificationToken) {
          session = {
            verified: true,
            verificationToken: dbSession.verification_token,
            tokenExpiresAt: dbSession.token_expires_at ? new Date(dbSession.token_expires_at).getTime() : 0,
          };
        }
      } catch {}
    }

    if (
      !session ||
      !session.verified ||
      session.verificationToken !== verificationToken ||
      now > session.tokenExpiresAt
    ) {
      return res.status(400).json({
        error: "اعتبار سنجی منقضی شده یا نامعتبر است. لطفاً فرآیند تایید پیامکی را مجدداً انجام دهید.",
      });
    }

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: "لطفاً نام و نام خانوادگی خود را کامل وارد کنید." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "رمز عبور باید حداقل ۶ کاراکتر باشد." });
    }

    // بررسی نهایی عدم تکراری بودن در دیتابیس
    const { data: finalCheck } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (finalCheck) {
      return res.status(400).json({ error: "این شماره موبایل قبلاً ثبت‌نام شده است." });
    }

    const userEmail = `${cleanPhone}@porskad.local`;

    // ایجاد کاربر در Supabase Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: cleanPhone,
      },
    });

    if (authErr) {
      return res.status(400).json({ error: authErr.message });
    }

    const newUserId = authData?.user?.id;

    if (newUserId) {
      // ذخیره در جدول profiles
      try {
        await supabaseAdmin.from("profiles").upsert(
          {
            id: newUserId,
            email: userEmail,
            full_name: fullName.trim(),
            phone: cleanPhone,
            is_owner: false,
            max_forms: 5,
            max_responses_per_month: 100,
            plan: "free",
          },
          { onConflict: "id" }
        );
      } catch (profErr) {
        console.warn("Error updating profile:", profErr?.message);
      }

      // انتساب نقش کاربری manager
      try {
        await supabaseAdmin.from("user_roles").upsert(
          {
            user_id: newUserId,
            role_id: "manager",
            active: true,
          },
          { onConflict: "user_id,role_id" }
        );
      } catch {}

      // ثبت لاگ ورود و ثبت‌نام
      try {
        await supabaseAdmin.from("auth_logs").insert({
          user_id: newUserId,
          email: userEmail,
          action: "register_otp",
          device: "Web",
          details: {
            phone: cleanPhone,
            full_name: fullName.trim(),
            method: "phone_otp_registration",
          },
        });
      } catch {}

      // پاک کردن سشن OTP از حافظه و دیتابیس
      otpSessions.delete(cleanPhone);
      try {
        await supabaseAdmin.from("otp_verifications").delete().eq("phone", cleanPhone);
      } catch {}

      return res.status(200).json({
        success: true,
        user: authData.user,
        email: userEmail,
        message: "ثبت‌نام با موفقیت انجام شد.",
      });
    }

    return res.status(500).json({ error: "خطا در ایجاد حساب کاربری." });
  }

  // ══════════════════════════════════════════════════════════════
  // ۴. ثبت‌نام مستقیم با ایمیل و رمز عبور (سازگاری کامل با فرآیندهای قدیمی)
  // ══════════════════════════════════════════════════════════════
  if (action === "register" || (!action && body.email && body.password)) {
    const { email: regEmail, password: regPassword, fullName: regFullName, phone: regPhone } = body || {};
    if (!regEmail || !regPassword) {
      return res.status(400).json({ error: "ایمیل و رمز عبور الزامی هستند" });
    }

    const regCleanPhone = regPhone ? normalizeIranPhone(regPhone) : "";

    const { data: regData, error: regError } = await supabaseAdmin.auth.admin.createUser({
      email: regEmail.trim(),
      password: regPassword,
      email_confirm: true,
      user_metadata: {
        full_name: regFullName?.trim() || regEmail.split("@")[0],
        phone: regCleanPhone,
      },
    });

    if (regError) {
      return res.status(400).json({ error: regError.message });
    }

    if (regData?.user?.id) {
      try {
        await supabaseAdmin
          .from("profiles")
          .update({
            phone: regCleanPhone || null,
            full_name: regFullName?.trim() || regEmail.split("@")[0],
            is_owner: false,
          })
          .eq("id", regData.user.id);
      } catch {}

      try {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: regData.user.id, role_id: "manager", active: true }, { onConflict: "user_id,role_id" });
      } catch {}
    }

    return res.status(200).json({ user: regData.user });
  }

  // ══════════════════════════════════════════════════════════════
  // ۵. ثبت لاگ‌های امنیتی ورود و نشست‌ها (log_auth)
  // ══════════════════════════════════════════════════════════════
  if (action === "log_auth") {
    const uaString = req.headers["user-agent"] || "";
    let autoBrowser = "Other";
    let autoOs = "Other";
    let autoDevice = "Desktop";

    if (uaString) {
      if (/mobile|android|iphone|ipad|ipod/i.test(uaString)) {
        autoDevice = /ipad|tablet/i.test(uaString) ? "Tablet" : "Mobile";
      }
      if (/windows/i.test(uaString)) autoOs = "Windows";
      else if (/macintosh|mac os x/i.test(uaString)) autoOs = "macOS";
      else if (/iphone|ipad|ipod/i.test(uaString)) autoOs = "iOS";
      else if (/android/i.test(uaString)) autoOs = "Android";
      else if (/linux/i.test(uaString)) autoOs = "Linux";

      if (/edg/i.test(uaString)) autoBrowser = "Edge";
      else if (/chrome|crios/i.test(uaString) && !/opr|opera|edg/i.test(uaString)) autoBrowser = "Chrome";
      else if (/firefox|fxios/i.test(uaString) && !/chrome|crios/i.test(uaString)) autoBrowser = "Firefox";
      else if (/safari/i.test(uaString) && !/chrome|crios/i.test(uaString)) autoBrowser = "Safari";
      else if (/opr|opera/i.test(uaString)) autoBrowser = "Opera";
      else if (/samsungbrowser/i.test(uaString)) autoBrowser = "Samsung Browser";
    }

    const {
      userId,
      user_id,
      email: logEmail,
      log_action = "login",
      details = {},
      browser = autoBrowser,
      os = autoOs,
      device = autoDevice,
    } = body;

    const rawUserId = userId || user_id || null;
    const isUuid = rawUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(rawUserId));
    const effectiveUserId = isUuid ? rawUserId : null;
    const effectiveEmail = logEmail ? String(logEmail).trim().toLowerCase().slice(0, 255) : null;
    const ALLOWED_ACTIONS = ["login", "logout", "failed_login", "register", "password_reset", "session_refresh", "token_revoke"];
    const effectiveAction = ALLOWED_ACTIONS.includes(log_action) ? log_action : "auth_event";

    const safeDetails = { ...(typeof details === "object" ? details : { raw: String(details).slice(0, 500) }) };
    delete safeDetails.ip;
    delete safeDetails.client_ip;
    delete safeDetails.ip_address;
    delete safeDetails.country;
    delete safeDetails.city;
    delete safeDetails.location;
    delete safeDetails.lat;
    delete safeDetails.lng;
    delete safeDetails.phone;

    try {
      await supabaseAdmin.from("auth_logs").insert({
        user_id: effectiveUserId,
        email: effectiveEmail,
        action: effectiveAction,
        device,
        browser,
        os,
        user_agent: uaString,
        details: safeDetails,
      });

      try {
        await supabaseAdmin.from("activity_log").insert({
          user_id: effectiveUserId,
          action: effectiveAction,
          target_type: "auth",
          target_id: effectiveUserId ? String(effectiveUserId) : null,
          details: { email: effectiveEmail, browser, os, device },
          user_agent: uaString,
        });
      } catch {}
    } catch (dbErr) {
      console.warn("log_auth DB warning:", dbErr?.message);
    }

    return res.status(200).json({ ok: true, device, browser, os });
  }

  return res.status(400).json({ error: "Unknown action" });
}
