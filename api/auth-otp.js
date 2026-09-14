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

    try {
      const { data: sysSettings } = await supabaseAdmin
        .from("system_settings")
        .select("key, value")
        .in("key", ["otp_sms_pattern", "otp_line_number", "otp_cooldown_seconds", "otp_max_resends", "otp_amoot_token"]);

      if (Array.isArray(sysSettings)) {
        for (const row of sysSettings) {
          if (row.key === "otp_sms_pattern" && row.value) pattern = String(row.value);
          if (row.key === "otp_line_number" && row.value) lineNumber = String(row.value);
          if (row.key === "otp_cooldown_seconds" && Number(row.value)) cooldownSeconds = Number(row.value);
          if (row.key === "otp_max_resends" && Number(row.value) !== undefined) maxResends = Number(row.value);
          if (row.key === "otp_amoot_token" && row.value) amootToken = String(row.value);
        }
      }
    } catch {}

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
    const existingSession = otpSessions.get(cleanPhone);
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
        const amootRes = await fetch("https://portal.amootsms.com/rest/SendSimple", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: amootToken.trim(),
            Mobiles: cleanPhone,
            SMSMessageText: messageText.trim(),
            LineNumber: lineNumber || "Service",
          }).toString(),
          signal: AbortSignal.timeout(12000),
        });

        const amootData = await amootRes.json().catch(() => null);
        if (amootData && amootData.Status === "Success") {
          sendSuccess = true;
        } else {
          sendErrorMsg = amootData?.Status || "Amoot error";
          console.warn("Amoot OTP send warning:", sendErrorMsg);
        }
      } catch (err) {
        sendErrorMsg = err.message;
        console.warn("Amoot OTP fetch error:", err.message);
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

    // ۶. ذخیره سشن جدید با افزایش شمارنده ارسال مجدد
    const currentResends = existingSession ? existingSession.resends + 1 : 0;
    otpSessions.set(cleanPhone, {
      code,
      expiresAt: now + 5 * 60 * 1000, // ۵ دقیقه اعتبار کد
      lastSentAt: now,
      resends: currentResends,
      attempts: 0,
      verified: false,
      verificationToken: null,
      tokenExpiresAt: null,
    });

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

    const session = otpSessions.get(cleanPhone);
    if (!session) {
      return res.status(400).json({ error: "کد تاییدی برای این شماره یافت نشد یا منقضی شده است. لطفاً مجدداً کد دریافت کنید." });
    }

    if (now > session.expiresAt) {
      return res.status(400).json({ error: "کد تایید منقضی شده است (مهلت ۵ دقیقه به پایان رسید). لطفاً کد جدید دریافت کنید." });
    }

    if (session.attempts >= 5) {
      otpSessions.delete(cleanPhone);
      return res.status(429).json({ error: "تعداد دفعات ورود اشتباه بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید." });
    }

    if (session.code !== rawCode) {
      session.attempts += 1;
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

    const session = otpSessions.get(cleanPhone);
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

      // پاک کردن سشن OTP
      otpSessions.delete(cleanPhone);

      return res.status(200).json({
        success: true,
        user: authData.user,
        email: userEmail,
        message: "ثبت‌نام با موفقیت انجام شد.",
      });
    }

    return res.status(500).json({ error: "خطا در ایجاد حساب کاربری." });
  }

  return res.status(400).json({ error: "Unknown action" });
}
