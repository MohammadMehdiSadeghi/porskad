import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// بارگذاری خودکار مقادیر .env در صورت اجرا در محیط محلی Node.js
if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const idx = trimmed.indexOf("=");
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  } catch {}
}

// متادیتای تمام ۲۰ نوع سوال پرس‌کاد
const QUESTION_TYPES_DATA = {
  choice: {
    label: "چندگزینه‌ای",
    category: "choice",
    hint: "حداقل ۲ گزینه، انتخاب ۱ تا N گزینه",
    hasOptions: true,
    hasMaxSelections: true,
    hasDisplayMode: true,
    defaultDisplayMode: "buttons",
    defaultOptions: ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty", "selected_count_equals", "selected_count_greater_than", "selected_count_less_than"],
  },
  picture_choice: {
    label: "چندگزینه‌ای تصویری",
    category: "choice",
    hint: "انتخاب از میان تصاویر همراه با متن",
    hasOptions: true,
    hasMaxSelections: true,
    defaultOptions: [
      { text: "طرح ۱", image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300" },
      { text: "طرح ۲", image: "https://images.unsplash.com/photo-1557683316-973673baf926?w=300" }
    ],
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
  },
  dropdown: {
    label: "لیست کشویی",
    category: "choice",
    hint: "انتخاب یک مورد از فهرست بلند",
    hasOptions: true,
    defaultOptions: ["گزینه اول", "گزینه دوم", "گزینه سوم"],
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
  },
  yes_no: {
    label: "بله / خیر",
    category: "choice",
    hint: "دو گزینه ساده و سریع",
    hasOptions: false,
    conditionOperators: ["is_selected", "is_not_selected", "is_empty", "is_not_empty"],
  },
  likert: {
    label: "طیفی (مقیاس لیکرت)",
    category: "choice",
    hint: "سنجش میزان موافقت یا رضایت روی طیف",
    hasOptions: true,
    defaultOptions: ["کاملاً مخالفم", "مخالفم", "نظری ندارم", "موافقم", "کاملاً موافقم"],
    conditionOperators: ["equals", "not_equals", "is_empty", "is_not_empty"],
  },
  nps: {
    label: "امتیازدهی / وفاداری (۰ تا ۱۰)",
    category: "choice",
    hint: "امتیاز شاخص NPS از ۰ تا ۱۰",
    hasOptions: false,
    defaultMinLabel: "اصلاً احتمال ندارد",
    defaultMaxLabel: "بسیار زیاد",
    conditionOperators: ["equals", "not_equals", "greater_than", "less_than", "between", "is_empty", "is_not_empty"],
  },
  rating: {
    label: "ستاره امتیاز (۱ تا ۵)",
    category: "choice",
    hint: "امتیاز ۱ تا ۵ ستاره",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "greater_than", "less_than", "is_empty", "is_not_empty"],
  },
  matrix: {
    label: "ماتریسی (جدول سوالات)",
    category: "choice",
    hint: "چند سوال با گزینه‌های یکسان در جدول",
    hasOptions: true,
    defaultRows: ["کیفیت خدمات", "سرعت پاسخگویی", "سهولت استفاده"],
    defaultColumns: ["ضعیف", "متوسط", "خوب", "عالی"],
    conditionOperators: ["is_empty", "is_not_empty"],
  },
  ranking: {
    label: "اولویت‌دهی / رتبه‌بندی",
    category: "choice",
    hint: "مرتب‌سازی گزینه‌ها به ترتیب اهمیت و اولویت",
    hasOptions: true,
    defaultOptions: ["قیمت مناسب", "کیفیت بالا", "سرعت تحویل", "پشتیبانی قوی"],
    conditionOperators: ["is_empty", "is_not_empty"],
  },
  short_text: {
    label: "متن کوتاه",
    category: "text",
    hint: "جواب یک‌خطی کوتاه",
    defaultPlaceholder: "پاسخ خود را بنویسید...",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
  },
  long_text: {
    label: "متن بلند",
    category: "text",
    hint: "پاراگراف و توضیح کامل",
    defaultPlaceholder: "پاسخ خود را بنویسید...",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "is_empty", "is_not_empty"],
  },
  number: {
    label: "عدد",
    category: "text",
    hint: "ورودی عددی",
    defaultPlaceholder: "مثلاً: ۱۲۳",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "greater_than", "less_than", "between", "is_empty", "is_not_empty"],
  },
  email: {
    label: "ایمیل",
    category: "text",
    hint: "با اعتبارسنجی فرمت ایمیل",
    defaultPlaceholder: "example@email.com",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "ends_with", "is_empty", "is_not_empty"],
  },
  phone_ir: {
    label: "شماره موبایل ایران",
    category: "text",
    hint: "با اعتبارسنجی 09xxxxxxxxx",
    defaultPlaceholder: "۰۹۱۲۳۴۵۶۷۸۹",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
  },
  link: {
    label: "لینک / وب‌سایت",
    category: "text",
    hint: "دریافت آدرس اینترنتی یا وب‌سایت معتبر",
    defaultPlaceholder: "https://example.com",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
  },
  telegram_id: {
    label: "آیدی تلگرام",
    category: "text",
    hint: "آیدی تلگرام با @",
    defaultPlaceholder: "username@",
    hasOptions: false,
    conditionOperators: ["equals", "not_equals", "contains", "starts_with", "is_empty", "is_not_empty"],
  },
  statement: {
    label: "متن بدون پاسخ (توضیحی)",
    category: "advanced",
    hint: "پیام راهنما یا توضیحات بدون دریافت ورودی",
    hasOptions: false,
    isInformational: true,
  },
  group: {
    label: "گروه سوال / بخش‌بندی",
    category: "advanced",
    hint: "جداکننده و تیتر دسته‌بندی سوالات فرم",
    hasOptions: false,
    isInformational: true,
  },
  file_upload: {
    label: "آپلود فایل",
    category: "advanced",
    hint: "بارگذاری تصویر، سند یا فایل توسط کاربر",
    hasOptions: false,
    defaultAllowedTypes: "all",
    defaultMaxSizeMb: 10,
  },
  payment: {
    label: "درگاه پرداخت",
    category: "advanced",
    hint: "دریافت وجه آنلاین و صدور فاکتور",
    hasOptions: false,
    defaultAmount: 100000,
    defaultCurrency: "تومان",
  },
};

const CATEGORIES = [
  { key: "choice", title: "سوالات گزینه‌ای و مقیاسی", types: ["choice", "picture_choice", "dropdown", "yes_no", "likert", "nps", "rating", "matrix", "ranking"] },
  { key: "text", title: "سوالات متنی و اطلاعات تماس", types: ["short_text", "long_text", "number", "email", "phone_ir", "link", "telegram_id"] },
  { key: "advanced", title: "پیشرفته، رسانه و ساختار فرم", types: ["statement", "group", "file_upload", "payment"] },
];

const PRIMARY_GOD_EMAILS = [
  "superadmin@gmail.com",
  "superadmin@gmailc.com",
  "mohammadmehdisadeghi2016@gmail.com",
  "mohammad12345sadeghi@gmail.com",
  "artinerfan1388@gmail.com",
  "admin@porskad.ir",
  "admin@porskad.com",
];

function getDirSize(dirPath, exclude = []) {
  let totalBytes = 0;
  let fileCount = 0;
  try {
    if (!fs.existsSync(dirPath)) return { bytes: 0, files: 0 };
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          const sub = getDirSize(fullPath, exclude);
          totalBytes += sub.bytes;
          fileCount += sub.files;
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          totalBytes += stats.size;
          fileCount += 1;
        }
      } catch {}
    }
  } catch {}
  return { bytes: totalBytes, files: fileCount };
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const formSendRequests = new Map();
const CLEANUP_INTERVAL = 60 * 60 * 1000;
if (typeof setInterval !== "undefined") {
  if (!global.__tgCleanupInterval) {
    global.__tgCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of formSendRequests.entries()) {
        if (now - data.firstRequest > CLEANUP_INTERVAL) {
          formSendRequests.delete(key);
        }
      }
    }, CLEANUP_INTERVAL);
  }
}

function isTgRateLimited(key) {
  const now = Date.now();
  const data = formSendRequests.get(key);
  if (!data) {
    formSendRequests.set(key, { count: 1, firstRequest: now });
    return false;
  }
  if (now - data.firstRequest > 60 * 1000) {
    formSendRequests.set(key, { count: 1, firstRequest: now });
    return false;
  }
  if (data.count >= 30) {
    return true;
  }
  data.count += 1;
  return false;
}

function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

function getSupabaseClients(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return { supabaseUrl: null, anonKey: null, serviceKey: null, userClient: null, adminClient: null };
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "").trim();

  const userClient = token
    ? createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
    : null;

  const adminClient = serviceKey
    ? createClient(supabaseUrl, serviceKey)
    : createClient(supabaseUrl, anonKey);

  return { supabaseUrl, anonKey, serviceKey, userClient, adminClient };
}

async function getUserFromReq(req, clients) {
  if (!clients.userClient) return null;
  try {
    const { data: { user }, error } = await clients.userClient.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

async function isAuthorizedForForm(user, form, clients) {
  if (!user || !form) return false;
  if (form.manager_id === user.id || form.created_by === user.id) return true;
  try {
    const { data: profile } = await clients.adminClient
      .from("profiles")
      .select("is_owner, role")
      .eq("id", user.id)
      .maybeSingle();
    return Boolean(profile?.is_owner || profile?.role === "superadmin" || profile?.role === "admin");
  } catch {
    return false;
  }
}

// پاکسازی سوال برای کاربران عمومی/پاسخ‌دهندگان جهت جلوگیری از لو رفتن جواب آزمون‌ها و تقلب
function sanitizeQuestionForPublic(q) {
  if (!q) return null;
  const { correct_answer, ...safeQ } = q;
  return safeQ;
}

// پاکسازی تنظیمات حساس فرم (توکن تلگرام، وب‌هوک، کلیدهای پیامک) برای کاربران عمومی
function sanitizeFormSettingsForPublic(settings) {
  if (!settings || typeof settings !== "object") return {};
  const allowedKeys = [
    "theme", "font", "direction", "language", "show_progress_bar",
    "show_question_numbers", "allow_back_navigation", "submit_button_text",
    "success_redirect_url", "shuffle_questions", "display_mode", "max_responses_limit"
  ];
  const safe = {};
  for (const k of allowedKeys) {
    if (settings[k] !== undefined) safe[k] = settings[k];
  }
  return safe;
}

// قالب‌بندی هوشمند و خوانای تمام ۲۰ نوع سوال برای ارسال به پیام‌رسان تلگرام
function formatAnswerForTelegram(val) {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "بله" : "خیر";
  if (typeof val === "number") return val.toLocaleString("fa-IR");
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return "—";
    if (trimmed.startsWith("data:image/") || (trimmed.startsWith("data:") && trimmed.includes(";base64,"))) {
      return "✍️ [تصویر امضا ثبت شد]";
    }
    if (trimmed.length > 600) {
      return trimmed.slice(0, 600) + "...";
    }
    return trimmed;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    return val.map((item) => formatAnswerForTelegram(item)).join("، ");
  }
  if (typeof val === "object") {
    if (val.url) {
      return val.name ? `${val.name} (${val.url})` : val.url;
    }
    if (val.first_name !== undefined || val.last_name !== undefined) {
      return `${val.first_name || ""} ${val.last_name || ""}`.trim() || "—";
    }
    if (val.lat !== undefined && val.lng !== undefined) {
      return `📍 موقعیت: ${val.lat}, ${val.lng}`;
    }
    if (val.province || val.city || val.address) {
      return [val.province, val.city, val.address].filter(Boolean).join(" - ");
    }
    const entries = Object.entries(val);
    if (entries.length > 0) {
      return entries.map(([k, v]) => `• ${k}: ${formatAnswerForTelegram(v)}`).join("\n   ");
    }
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

// دیسپچ نوتیفیکیشن تلگرام با پایداری حداکثری و پشتیبانی از RPC امن، زمان واقعی ثبت و ارسال مجدد
async function dispatchTelegramNotification(clients, formId, responseId, options = {}) {
  if (!formId || !responseId) {
    return { ok: false, error: "Missing form_id or response_id" };
  }

  const isForce = Boolean(options.force);
  let resolvedFormId = formId;
  let formTitle = "—";
  let entryNumber = 1;
  let submittedAt = null;
  let configs = [];
  let questions = [];
  let answerMap = {};

  // ۱. اولویت اول: تلاش برای دریافت داده‌های کامل با RPC امن SECURITY DEFINER
  let rpcSucceeded = false;
  try {
    const { data: rpcData, error: rpcErr } = await clients.adminClient.rpc("get_telegram_dispatch_payload", {
      p_form_id: String(formId),
      p_response_id: responseId,
      p_force: isForce,
    });

    if (!rpcErr && rpcData && typeof rpcData === "object") {
      if (rpcData.skipped) {
        return { ok: true, skipped: true, reason: rpcData.reason };
      }
      if (rpcData.ok && Array.isArray(rpcData.configs) && rpcData.configs.length > 0) {
        rpcSucceeded = true;
        resolvedFormId = rpcData.form_id || formId;
        formTitle = rpcData.form_title || "—";
        entryNumber = rpcData.entry_number || 1;
        submittedAt = rpcData.submitted_at || null;
        configs = rpcData.configs;
        const items = rpcData.items || [];
        questions = items.map((it) => ({ id: it.id, title: it.title, position: it.position, type: it.type }));
        items.forEach((it) => {
          answerMap[it.id] = it.value;
        });
      }
    }
  } catch {}

  // ۲. فالبک: در صورتی که RPC فعال نبود، استعلام مستقیم جداول
  if (!rpcSucceeded) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(formId));
    if (!isUuid) {
      const { data: f, error: fErr } = await clients.adminClient
        .from("forms")
        .select("id, title")
        .or(`public_id.eq.${formId},slug.eq.${formId}`)
        .is("deleted_at", null)
        .maybeSingle();
      if (!fErr && f) {
        resolvedFormId = f.id;
        formTitle = f.title;
      } else {
        return { ok: true, skipped: true, reason: "no_form_found" };
      }
    } else {
      const { data: f } = await clients.adminClient
        .from("forms")
        .select("id, title")
        .eq("id", resolvedFormId)
        .maybeSingle();
      if (f) formTitle = f.title;
    }

    const { data: respCheck, error: respCheckErr } = await clients.adminClient
      .from("responses")
      .select("id, submitted_at, created_at")
      .eq("id", responseId)
      .eq("form_id", resolvedFormId)
      .maybeSingle();

    if (respCheckErr || !respCheck) {
      return { ok: false, error: "Invalid response_id for given form" };
    }

    submittedAt = respCheck.submitted_at || respCheck.created_at || null;

    if (!isForce) {
      const { data: alreadySent } = await clients.adminClient
        .from("telegram_send_log")
        .select("id")
        .eq("response_id", responseId)
        .eq("status", "sent")
        .limit(1);

      if (alreadySent && alreadySent.length > 0) {
        return { ok: true, skipped: true, reason: "already_sent" };
      }
    }

    const { data: links, error: linkError } = await clients.adminClient
      .from("telegram_form_links")
      .select("id, config_id, is_active")
      .eq("form_id", resolvedFormId)
      .eq("is_active", true);

    if (linkError || !links || links.length === 0) {
      return { ok: true, skipped: true, reason: "no_telegram_link" };
    }

    const configIds = [...new Set(links.map((l) => l.config_id))];
    const { data: cfgRows, error: configError } = await clients.adminClient
      .from("telegram_config")
      .select("id, bot_token, chat_id, is_active")
      .in("id", configIds)
      .eq("is_active", true);

    if (configError || !cfgRows || cfgRows.length === 0) {
      return { ok: true, skipped: true, reason: "no_active_config" };
    }
    configs = cfgRows;

    const { data: qRows } = await clients.adminClient
      .from("questions")
      .select("id, title, position, type")
      .eq("form_id", resolvedFormId)
      .order("position", { ascending: true });
    questions = qRows || [];

    const { data: ansRows } = await clients.adminClient
      .from("answers")
      .select("question_id, value")
      .eq("response_id", responseId);
    (ansRows || []).forEach((a) => {
      answerMap[a.question_id] = a.value;
    });

    const { count } = await clients.adminClient
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("form_id", resolvedFormId);
    entryNumber = count || 1;
  }

  // ۳. ساخت قالب پیام تلگرام با تاریخ و زمان واقعی ثبت پاسخ
  const responseDate = submittedAt ? new Date(submittedAt) : new Date();
  const timeStr = responseDate.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" });
  const dateStr = responseDate.toLocaleDateString("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" });

  const faNum = (n) => (n !== undefined && n !== null ? Number(n).toLocaleString("fa-IR") : "۰");

  const lines = [
    "━━━━━━━━━━━━━━━━━━",
    "🔴 پرس‌کاد",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `📋 فرم: ${formTitle || "—"}`,
    "",
  ];

  (questions || []).forEach((q, i) => {
    const val = answerMap[q.id];
    const displayVal = formatAnswerForTelegram(val);
    lines.push(`${faNum(i + 1)}. ${q.title || "بدون عنوان"}: ${displayVal}`);
  });

  lines.push("");
  lines.push(`⏰ زمان ثبت: ${timeStr} — ${dateStr}`);
  lines.push(`🔢 ورودی شماره ${faNum(entryNumber)}`);
  lines.push("━━━━━━━━━━━━━━━━━━");

  let messageText = lines.join("\n");
  // مهار محدودیت ۴۰۹۶ کاراکتری تلگرام
  if (messageText.length > 3900) {
    messageText = messageText.substring(0, 3850) + "\n\n⚠️ ... (ادامه پاسخ‌ها در پنل قابل مشاهده است)";
  }

  const results = [];

  for (const config of configs) {
    const botToken = String(config.bot_token || "").trim().replace(/^bot/i, "");
    const chatId = String(config.chat_id || "").trim();
    if (!botToken || !chatId) continue;

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
        }),
      });

      const tgData = await tgRes.json().catch(() => ({ ok: false, description: "Invalid JSON from Telegram" }));
      const isOk = Boolean(tgData.ok);
      const errMsg = isOk ? null : (tgData.description || "Unknown error");

      // ثبت لاگ از طریق RPC یا دیتابیس
      try {
        await clients.adminClient.rpc("log_telegram_send", {
          p_form_id: resolvedFormId,
          p_response_id: responseId,
          p_config_id: config.id,
          p_chat_id: chatId,
          p_status: isOk ? "sent" : "failed",
          p_error_message: errMsg,
          p_message_text: messageText,
        });
      } catch {
        try {
          await clients.adminClient.from("telegram_send_log").insert({
            form_id: resolvedFormId,
            response_id: responseId,
            config_id: config.id,
            chat_id: chatId,
            status: isOk ? "sent" : "failed",
            error_message: errMsg,
            message_text: messageText,
          });
        } catch {}
      }

      results.push({ config_id: config.id, ok: isOk, error: errMsg });
    } catch (err) {
      try {
        await clients.adminClient.rpc("log_telegram_send", {
          p_form_id: resolvedFormId,
          p_response_id: responseId,
          p_config_id: config.id,
          p_chat_id: chatId,
          p_status: "error",
          p_error_message: err.message,
          p_message_text: messageText,
        });
      } catch {
        try {
          await clients.adminClient.from("telegram_send_log").insert({
            form_id: resolvedFormId,
            response_id: responseId,
            config_id: config.id,
            chat_id: chatId,
            status: "error",
            error_message: err.message,
            message_text: messageText,
          });
        } catch {}
      }
      results.push({ config_id: config.id, ok: false, error: err.message });
    }
  }

  return { ok: true, results };
}

export default async function handler(req, res) {
  // هدرهای CORS برای دسترسی از هر پلتفرم خارجی
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const clients = getSupabaseClients(req);
  if (!clients.supabaseUrl) {
    return res.status(500).json({ error: "تنظیمات اتصال دیتابیس (Supabase URL / Key) یافت نشد." });
  }

  // تفکیک مسیرها: [...route] به صورت ایمن و چندسطحی
  let segments = [];
  if (req.query?.route) {
    if (Array.isArray(req.query.route)) {
      segments = req.query.route.flatMap((s) => String(s).split("/")).filter(Boolean);
    } else {
      segments = String(req.query.route).split("/").filter(Boolean);
    }
  } else {
    const cleanUrl = (req.url || "").replace(/^\/api\/(?:v1\/)?/, "").split("?")[0];
    segments = cleanUrl.split("/").filter(Boolean);
  }

  // حذف پیشوندهای احتمالی api یا v1 از ابتدای segments
  while (segments.length > 0 && (segments[0] === "api" || segments[0] === "v1")) {
    segments.shift();
  }

  const origin = getOrigin(req);

  // استخراج خودکار Query Params در صورت اجرا بدون فریم‌ورک اکسپرس (مانند میدلور محلی یا محیط‌های سرورلس خاص)
  if (!req.query && req.url && req.url.includes("?")) {
    try {
      const parsedUrl = new URL(req.url, origin);
      req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    } catch {}
  }

  // اطمینان از پارس بودن body اگر به صورت رشته متنی ارسال شده باشد
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      req.body = JSON.parse(req.body);
    } catch {}
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // ۰. اندپوینت پایه مستندات و مشخصات REST API: GET /api/v1
    // ─────────────────────────────────────────────────────────────
    if (segments.length === 0) {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      return res.status(200).json({
        name: "Porskad REST API",
        version: "v1",
        status: "online",
        docs_url: `${origin}/docs`,
        openapi_spec: `${origin}/openapi.json`,
        endpoints: {
          account: `${origin}/api/v1/me`,
          question_types: `${origin}/api/v1/question-types`,
          forms: `${origin}/api/v1/forms`,
          form_detail: `${origin}/api/v1/forms/{id}`,
          form_questions: `${origin}/api/v1/forms/{id}/questions`,
          form_responses: `${origin}/api/v1/forms/{id}/responses`,
          form_embed: `${origin}/api/v1/forms/{id}/embed`,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // الف. تنظیمات سراسری سیستم (System Settings): /api/v1/admin/settings یا /api/v1/admin-system-settings
    // ─────────────────────────────────────────────────────────────
    if (
      (segments.length === 1 && (segments[0] === "admin-system-settings" || segments[0] === "system-settings")) ||
      (segments.length === 2 && segments[0] === "admin" && segments[1] === "settings")
    ) {
      if (req.method === "GET") {
        const { data, error } = await clients.adminClient.from("system_settings").select("key, value");
        if (error) {
          return res.status(500).json({ error: "Failed to read system settings: " + error.message });
        }
        const obj = {};
        if (Array.isArray(data)) {
          for (const row of data) {
            obj[row.key] = row.value;
          }
        }
        return res.status(200).json({ success: true, settings: obj });
      }

      if (req.method === "POST") {
        const user = await getUserFromReq(req, clients);
        if (!user) {
          return res.status(401).json({ error: "Authorization header / valid session is required." });
        }

        const userEmail = (user.email || "").toLowerCase().trim();
        const isGodEmail = PRIMARY_GOD_EMAILS.includes(userEmail);
        let isSuperAdmin = isGodEmail;

        if (!isSuperAdmin) {
          const { data: prof } = await clients.adminClient
            .from("profiles")
            .select("id, email, is_owner")
            .eq("id", user.id)
            .maybeSingle();

          const { data: roles } = await clients.adminClient
            .from("user_roles")
            .select("role_id, role, active")
            .eq("user_id", user.id);

          const hasAdminRole = Array.isArray(roles) && roles.some(
            (r) => r.active !== false && ["admin", "superadmin", "god", "owner"].includes(r.role_id || r.role)
          );

          isSuperAdmin = Boolean(prof?.is_owner || hasAdminRole);
        }

        if (!isSuperAdmin) {
          return res.status(403).json({ error: "فقط سوپرادمین مجاز به تغییر تنظیمات سامانه است." });
        }

        const body = req.body || {};
        const settingsToUpdate = body.settings || body;

        if (typeof settingsToUpdate !== "object" || settingsToUpdate === null) {
          return res.status(400).json({ error: "Invalid payload. Expected an object of settings." });
        }

        const upsertRows = Object.entries(settingsToUpdate).map(([key, value]) => ({
          key,
          value,
          updated_at: new Date().toISOString(),
        }));

        if (upsertRows.length === 0) {
          return res.status(400).json({ error: "No settings provided to update." });
        }

        const { error: upsertErr } = await clients.adminClient
          .from("system_settings")
          .upsert(upsertRows, { onConflict: "key" });

        if (upsertErr) {
          return res.status(500).json({ error: "Failed to update settings: " + upsertErr.message });
        }

        const { data: allRows } = await clients.adminClient.from("system_settings").select("key, value");
        const updatedObj = {};
        if (Array.isArray(allRows)) {
          for (const r of allRows) {
            updatedObj[r.key] = r.value;
          }
        }

        return res.status(200).json({
          success: true,
          message: "تنظیمات سامانه با موفقیت به‌روزرسانی شد.",
          settings: updatedObj,
        });
      }

      return res.status(405).json({ error: "Method not allowed" });
    }

    // ─────────────────────────────────────────────────────────────
    // ب. مانیتورینگ منابع و دیسک (System Storage): /api/v1/admin/storage یا /api/v1/system-storage
    // ─────────────────────────────────────────────────────────────
    if (
      (segments.length === 1 && (segments[0] === "system-storage" || segments[0] === "storage")) ||
      (segments.length === 2 && segments[0] === "admin" && segments[1] === "storage")
    ) {
      if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const cwd = process.cwd();
      const publicDir = path.join(cwd, "public");
      const distDir = path.join(cwd, "dist");
      const srcDir = path.join(cwd, "src");
      const apiDir = path.join(cwd, "api");
      const diagramsDir = path.join(cwd, "diagrams");
      const supabaseDir = path.join(cwd, "supabase");

      const publicStats = getDirSize(publicDir);
      const distStats = getDirSize(distDir);
      const srcStats = getDirSize(srcDir);
      const apiStats = getDirSize(apiDir);
      const diagramsStats = getDirSize(diagramsDir);
      const supabaseStats = getDirSize(supabaseDir);

      let dbStats = {
        formsCount: 0,
        responsesCount: 0,
        answersCount: 0,
        usersCount: 0,
        assetsCount: 0,
      };

      try {
        const [formsRes, respRes, ansRes, usersRes, assetsRes] = await Promise.all([
          clients.adminClient.from("forms").select("id", { count: "exact", head: true }),
          clients.adminClient.from("responses").select("id", { count: "exact", head: true }),
          clients.adminClient.from("answers").select("id", { count: "exact", head: true }),
          clients.adminClient.from("profiles").select("id", { count: "exact", head: true }),
          clients.adminClient.from("form_assets").select("id", { count: "exact", head: true }),
        ]);

        dbStats = {
          formsCount: formsRes.count || 0,
          responsesCount: respRes.count || 0,
          answersCount: ansRes.count || 0,
          usersCount: usersRes.count || 0,
          assetsCount: assetsRes.count || 0,
        };
      } catch {}

      const totalLocalBytes =
        publicStats.bytes +
        distStats.bytes +
        srcStats.bytes +
        apiStats.bytes +
        diagramsStats.bytes +
        supabaseStats.bytes;

      const totalLocalFiles =
        publicStats.files +
        distStats.files +
        srcStats.files +
        apiStats.files +
        diagramsStats.files +
        supabaseStats.files;

      const estimatedDbBytes =
        Math.max(3500000,
          dbStats.formsCount * 2500 +
          dbStats.responsesCount * 1200 +
          dbStats.answersCount * 300 +
          dbStats.usersCount * 800 +
          dbStats.assetsCount * 50000
        );

      let realDbBytes = 0;
      let realDbPretty = null;
      let tablesList = [];
      let isDbEstimated = true;

      try {
        const { data: dbStorage, error: rpcErr } = await clients.adminClient.rpc("get_database_storage_stats");
        if (!rpcErr && dbStorage && (dbStorage.db_size_bytes || dbStorage.total_db_bytes)) {
          realDbBytes = Number(dbStorage.db_size_bytes || dbStorage.total_db_bytes);
          realDbPretty = dbStorage.db_size_pretty || dbStorage.total_db_pretty || formatBytes(realDbBytes);
          tablesList = (dbStorage.tables || []).map((t) => ({
            table_name: t.name || t.table_name,
            row_count: t.rows ?? t.row_count ?? 0,
            bytes: t.bytes ?? t.size_bytes ?? 0,
            pretty: t.pretty || formatBytes(t.bytes ?? t.size_bytes ?? 0),
          }));
          isDbEstimated = false;
        }
      } catch (e) {
        console.warn("Storage RPC error:", e);
      }

      const baseDbBytes = 5.4 * 1024 * 1024;
      const rawCalculated = !isDbEstimated ? realDbBytes : estimatedDbBytes;
      const effectiveDbBytes = rawCalculated >= 4.5 * 1024 * 1024 ? rawCalculated : Math.round(baseDbBytes + (rawCalculated || 0));
      const effectiveDbPretty = formatBytes(effectiveDbBytes);

      const totalEstimatedBytes = totalLocalBytes + effectiveDbBytes;
      const MAX_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
      const usedPercentage = Math.min(100, parseFloat(((totalEstimatedBytes / MAX_STORAGE_LIMIT_BYTES) * 100).toFixed(1)));

      return res.status(200).json({
        success: true,
        database: {
          db_size_bytes: effectiveDbBytes,
          db_size_pretty: effectiveDbPretty,
          tables: tablesList,
          estimated: isDbEstimated,
        },
        project: {
          source_bytes: srcStats.bytes,
          source_pretty: formatBytes(srcStats.bytes),
          source_files: srcStats.files,
          full_bytes: totalLocalBytes,
          full_pretty: formatBytes(totalLocalBytes),
          full_files: totalLocalFiles,
          breakdown: [
            { name: "Frontend Source (src/)", pretty: formatBytes(srcStats.bytes), files: srcStats.files },
            { name: "Production Build (dist/)", pretty: formatBytes(distStats.bytes), files: distStats.files },
            { name: "Public Assets & Media (public/)", pretty: formatBytes(publicStats.bytes), files: publicStats.files },
            { name: "Diagrams & Documentation", pretty: formatBytes(diagramsStats.bytes), files: diagramsStats.files },
            { name: "Supabase Migrations (supabase/)", pretty: formatBytes(supabaseStats.bytes), files: supabaseStats.files },
            { name: "Serverless API Routes (api/)", pretty: formatBytes(apiStats.bytes), files: apiStats.files },
          ],
        },
        summary: {
          usedBytes: totalEstimatedBytes,
          usedFormatted: formatBytes(totalEstimatedBytes),
          totalBytes: MAX_STORAGE_LIMIT_BYTES,
          totalFormatted: formatBytes(MAX_STORAGE_LIMIT_BYTES),
          usedPercentage,
          freeBytes: Math.max(0, MAX_STORAGE_LIMIT_BYTES - totalEstimatedBytes),
          freeFormatted: formatBytes(Math.max(0, MAX_STORAGE_LIMIT_BYTES - totalEstimatedBytes)),
        },
        breakdown: {
          uploads: {
            bytes: uploadsStats.bytes,
            formatted: formatBytes(uploadsStats.bytes),
            files: uploadsStats.files,
          },
          database: {
            bytes: effectiveDbBytes,
            formatted: effectiveDbPretty,
            ...dbStats,
            estimated: isDbEstimated,
          },
          codebase: {
            distBytes: distStats.bytes,
            distFormatted: formatBytes(distStats.bytes),
            srcBytes: srcStats.bytes,
            srcFormatted: formatBytes(srcStats.bytes),
          },
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ج. اعلان تلگرام (Telegram Send): /api/v1/telegram/send یا /api/v1/telegram-send
    // ─────────────────────────────────────────────────────────────
    if (
      (segments.length === 1 && (segments[0] === "telegram-send" || segments[0] === "telegram")) ||
      (segments.length === 2 && segments[0] === "telegram" && segments[1] === "send") ||
      (segments.length >= 1 && segments[segments.length - 1] === "telegram-send")
    ) {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

      const { form_id, response_id, force } = req.body || {};
      if (!form_id || !response_id) {
        return res.status(400).json({ error: "Missing form_id or response_id" });
      }

      if (!force && isTgRateLimited(String(form_id))) {
        return res.status(429).json({ error: "Too many requests" });
      }

      const dispatchResult = await dispatchTelegramNotification(clients, form_id, response_id, {
        force: Boolean(force),
      });
      if (!dispatchResult.ok && dispatchResult.error) {
        const statusCode = dispatchResult.error.includes("Invalid response_id") ? 404 : 400;
        return res.status(statusCode).json(dispatchResult);
      }
      return res.status(200).json(dispatchResult);
    }

    // ─────────────────────────────────────────────────────────────
    // د. مدیریت کاربران ادمین (Admin User Management): /api/v1/admin/users یا /api/v1/admin-user-management
    // ─────────────────────────────────────────────────────────────
    if (
      (segments.length === 1 && (segments[0] === "admin-user-management" || segments[0] === "user-management")) ||
      (segments.length === 2 && segments[0] === "admin" && segments[1] === "users")
    ) {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

      const user = await getUserFromReq(req, clients);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { data: prof } = await clients.adminClient
        .from("profiles")
        .select("id, email, is_owner")
        .eq("id", user.id)
        .maybeSingle();

      const { data: roleData } = await clients.adminClient
        .from("user_roles")
        .select("role_id, active")
        .eq("user_id", user.id)
        .eq("active", true);

      const isSuperAdmin = Boolean(
        prof?.is_owner || (Array.isArray(roleData) && roleData.some((r) => r.role_id === "admin"))
      );

      if (!isSuperAdmin) {
        return res.status(403).json({ error: "فقط سوپرادمین مجاز به انجام این عملیات است" });
      }

      const requesterEmail = user.email?.toLowerCase()?.trim();
      const isCallerPrimaryGod = Boolean(prof?.is_owner || PRIMARY_GOD_EMAILS.includes(requesterEmail));

      const { action, target_user_id, new_password, new_email } = req.body || {};

      if (action === "create_user") {
        const { email, password, fullName } = req.body || {};
        if (!email || !password) {
          return res.status(400).json({ error: "Email and password are required" });
        }

        const { data: createdData, error: createErr } = await clients.adminClient.auth.admin.createUser({
          email: email.trim(),
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName?.trim() || email.split("@")[0] },
        });

        if (createErr) return res.status(400).json({ error: createErr.message });

        if (createdData?.user?.id) {
          try {
            await clients.adminClient
              .from("profiles")
              .update({
                full_name: fullName?.trim() || email.split("@")[0],
                is_owner: false,
              })
              .eq("id", createdData.user.id);
          } catch {}

          try {
            await clients.adminClient
              .from("user_roles")
              .upsert({ user_id: createdData.user.id, role_id: "manager", active: true }, { onConflict: "user_id" });
          } catch {}
        }

        return res.status(200).json({ user_id: createdData.user.id });
      }

      if (!action || !target_user_id) {
        return res.status(400).json({ error: "action و target_user_id الزامی هستند" });
      }

      const { data: targetProf } = await clients.adminClient
        .from("profiles")
        .select("id, email, is_owner")
        .eq("id", target_user_id)
        .maybeSingle();

      if (action !== "impersonate" && targetProf && PRIMARY_GOD_EMAILS.includes(targetProf.email?.toLowerCase()?.trim()) && !isCallerPrimaryGod) {
        return res.status(403).json({ error: "کاربر مورد نظر یافت نشد یا دسترسی به آن امکان‌پذیر نیست" });
      }

      const { data: targetRoles } = await clients.adminClient
        .from("user_roles")
        .select("role_id, active")
        .eq("user_id", target_user_id)
        .eq("active", true);

      const targetIsSuperAdmin = Boolean(
        targetProf?.is_owner ||
        (Array.isArray(targetRoles) && targetRoles.some((r) => r.role_id === "admin")) ||
        (targetProf && PRIMARY_GOD_EMAILS.includes(targetProf.email?.toLowerCase()?.trim()))
      );

      const godOnlyActions = ["update_role", "reset_password", "update_email"];
      if (targetIsSuperAdmin && !isCallerPrimaryGod && godOnlyActions.includes(action)) {
        return res.status(403).json({
          error: "مدیریت سوپرادمین‌ها (حذف، تنزل، تغییر نقش و رمز) فقط توسط صاحب اصلی سیستم امکان‌پذیر است",
        });
      }

      if (action === "reset_password") {
        if (!new_password || new_password.length < 6) {
          return res.status(400).json({ error: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد" });
        }
        const { data: updatedUser, error: updateErr } = await clients.adminClient.auth.admin.updateUserById(
          target_user_id,
          { password: new_password }
        );
        if (updateErr) return res.status(400).json({ error: updateErr.message });
        return res.status(200).json({ success: true, user: updatedUser.user });
      }

      if (action === "update_email") {
        if (!new_email || !new_email.includes("@")) {
          return res.status(400).json({ error: "ایمیل نامعتبر است" });
        }
        const { data: updatedUser, error: updateErr } = await clients.adminClient.auth.admin.updateUserById(
          target_user_id,
          { email: new_email.trim(), email_confirm: true }
        );
        if (updateErr) return res.status(400).json({ error: updateErr.message });

        await clients.adminClient
          .from("profiles")
          .update({ email: new_email.trim() })
          .eq("id", target_user_id);

        return res.status(200).json({ success: true, user: updatedUser.user });
      }

      if (action === "get_auth_info") {
        const { data: authUser, error: getErr } = await clients.adminClient.auth.admin.getUserById(target_user_id);
        if (getErr) return res.status(400).json({ error: getErr.message });
        return res.status(200).json({
          success: true,
          auth_info: {
            id: authUser.user.id,
            email: authUser.user.email,
            phone: authUser.user.phone,
            created_at: authUser.user.created_at,
            last_sign_in_at: authUser.user.last_sign_in_at,
            confirmed_at: authUser.user.email_confirmed_at,
            user_metadata: authUser.user.user_metadata,
            app_metadata: authUser.user.app_metadata,
          },
        });
      }

      if (action === "update_role") {
        if (!isCallerPrimaryGod) {
          return res.status(403).json({ error: "فقط صاحب اصلی سیستم مجاز به تغییر نقش کاربران است" });
        }
        const { new_role } = req.body || {};
        if (!["manager", "admin", "superadmin"].includes(new_role)) {
          return res.status(400).json({ error: "نقش ارسالی نامعتبر است" });
        }
        const roleToSet = new_role === "superadmin" ? "admin" : new_role;

        await clients.adminClient.from("user_roles").delete().eq("user_id", target_user_id);
        const { error: roleErr } = await clients.adminClient
          .from("user_roles")
          .insert({ user_id: target_user_id, role_id: roleToSet, active: true });

        if (roleErr) return res.status(400).json({ error: roleErr.message });

        if (roleToSet === "admin") {
          await clients.adminClient
            .from("profiles")
            .update({
              max_forms: 999999,
              max_responses_per_month: 999999,
              plan: "enterprise",
              can_use_telegram: true,
              can_export_excel: true,
              can_use_logic: true,
              can_upload_files: true,
              can_use_sms: true,
              can_use_webhooks: true,
              can_remove_branding: true,
            })
            .eq("id", target_user_id);

          await clients.adminClient.from("user_permissions").delete().eq("user_id", target_user_id);
        } else {
          await clients.adminClient
            .from("profiles")
            .update({ max_forms: 5, max_responses_per_month: 100, plan: "free" })
            .eq("id", target_user_id);
        }

        return res.status(200).json({ success: true, role: roleToSet });
      }

      if (action === "impersonate") {
        let { data: targetAuthUser } = await clients.adminClient.auth.admin.getUserById(target_user_id);
        let userEmail = targetAuthUser?.user?.email || targetProf?.email;

        if (!userEmail && (targetAuthUser?.user?.phone || targetProf?.phone)) {
          const rawPhone = (targetAuthUser?.user?.phone || targetProf?.phone).replace(/\D/g, "");
          const genEmail = `user_${rawPhone || target_user_id.slice(0, 8)}@porskad.ir`;
          try {
            const { data: updatedAuth } = await clients.adminClient.auth.admin.updateUserById(target_user_id, {
              email: genEmail,
              email_confirm: true,
            });
            if (updatedAuth?.user?.email) userEmail = updatedAuth.user.email;
          } catch {}
        }

        if (!userEmail) return res.status(404).json({ error: "کاربر یا ایمیل مربوطه یافت نشد" });

        const requestOrigin = req.body?.origin || req.headers.origin;
        let siteOrigin = requestOrigin || origin;

        const { data: linkData, error: linkErr } = await clients.adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: userEmail,
          options: { redirectTo: `${siteOrigin}/admin/forms` },
        });

        if (linkErr) return res.status(400).json({ error: linkErr.message });

        const actionLink = linkData?.properties?.action_link;
        const hashedToken = linkData?.properties?.hashed_token;
        let directLoginUrl = actionLink;
        let serverSession = null;

        if (hashedToken) {
          try {
            const verifyClient = createClient(clients.supabaseUrl, clients.anonKey, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            const { data: verifiedSession, error: verifyErr } = await verifyClient.auth.verifyOtp({
              token_hash: hashedToken,
              type: "magiclink",
            });

            if (!verifyErr && verifiedSession?.session) {
              serverSession = verifiedSession.session;
              const at = verifiedSession.session.access_token;
              const rt = verifiedSession.session.refresh_token;
              directLoginUrl = `${siteOrigin}/admin/forms#access_token=${at}&refresh_token=${rt}&token_type=bearer&type=magiclink`;
            }
          } catch {}
        }

        try {
          await clients.adminClient.from("activity_log").insert({
            user_id: user.id,
            action: "impersonate_user",
            target_type: "user",
            target_id: target_user_id,
            details: { target_email: userEmail, impersonated_by: requesterEmail },
          });
        } catch {}

        return res.status(200).json({
          success: true,
          redirect_url: directLoginUrl,
          magic_link: actionLink,
          token_hash: hashedToken,
          email: userEmail,
          session: serverSession,
        });
      }

      if (action === "transfer_form") {
        const { form_id, target_user_id: targetUserId, from_user_id: fromUserId } = req.body || {};
        if (!form_id || !targetUserId) {
          return res.status(400).json({ error: "شناسه فرم و حساب کاربری مقصد الزامی است" });
        }

        const { data: formRecord, error: formErr } = await clients.adminClient
          .from("forms")
          .select("id, title, slug, created_by, manager_id, published, archived, deleted_at")
          .eq("id", form_id)
          .single();

        if (formErr || !formRecord) return res.status(404).json({ error: "فرم مورد نظر یافت نشد" });

        const currentOwnerId = formRecord.manager_id || formRecord.created_by;
        if (currentOwnerId === targetUserId) {
          return res.status(400).json({ error: "این فرم در حال حاضر متعلق به همین کاربر است" });
        }

        const { data: targetProfile, error: targetErr } = await clients.adminClient
          .from("profiles")
          .select("id, email, full_name, is_owner, plan, max_forms")
          .eq("id", targetUserId)
          .single();

        if (targetErr || !targetProfile) return res.status(404).json({ error: "کاربر مقصد در سیستم یافت نشد" });

        const { data: prevProfile } = await clients.adminClient
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", currentOwnerId)
          .maybeSingle();

        if (formRecord.published && !formRecord.archived && !formRecord.deleted_at && !targetProfile.is_owner) {
          const { count: activeCount } = await clients.adminClient
            .from("forms")
            .select("id", { count: "exact", head: true })
            .or(`created_by.eq.${targetUserId},manager_id.eq.${targetUserId}`)
            .eq("published", true)
            .is("deleted_at", null)
            .neq("archived", true);

          const curMax = targetProfile.max_forms ?? 5;
          if (curMax < 999999 && (activeCount ?? 0) >= curMax) {
            await clients.adminClient
              .from("profiles")
              .update({ max_forms: (activeCount ?? 0) + 2 })
              .eq("id", targetUserId);
          }
        }

        const { data: updatedForm, error: updateErr } = await clients.adminClient
          .from("forms")
          .update({
            manager_id: targetUserId,
            created_by: targetUserId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", form_id)
          .select("id, title, slug, manager_id, created_by, updated_at")
          .single();

        if (updateErr) return res.status(400).json({ error: "خطا در انتقال فرم: " + updateErr.message });

        try {
          await clients.adminClient.from("telegram_form_links").delete().eq("form_id", form_id);
        } catch {}

        try {
          await clients.adminClient.from("activity_log").insert({
            user_id: user.id,
            action: "transfer_form_ownership",
            target_type: "form",
            target_id: form_id,
            details: {
              form_id,
              form_title: formRecord.title,
              form_slug: formRecord.slug,
              previous_owner_id: currentOwnerId,
              previous_owner_email: prevProfile?.email,
              previous_owner_name: prevProfile?.full_name,
              target_user_id: targetUserId,
              target_user_email: targetProfile.email,
              target_user_name: targetProfile.full_name,
              transferred_by: requesterEmail,
            },
          });
        } catch {}

        return res.status(200).json({
          success: true,
          form: updatedForm,
          previous_user: prevProfile,
          target_user: targetProfile,
        });
      }

      return res.status(400).json({ error: `عملیات ناشناخته: ${action}` });
    }

    // ─────────────────────────────────────────────────────────────
    // ۱. متادیتای انواع سوال: GET /api/v1/question-types
    // ─────────────────────────────────────────────────────────────
    if (segments.length === 1 && segments[0] === "question-types") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      return res.status(200).json({
        count: Object.keys(QUESTION_TYPES_DATA).length,
        categories: CATEGORIES,
        types: QUESTION_TYPES_DATA,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ۲. اطلاعات حساب کاربری: GET /api/v1/me
    // ─────────────────────────────────────────────────────────────
    if (segments.length === 1 && segments[0] === "me") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      const user = await getUserFromReq(req, clients);
      if (!user) return res.status(401).json({ error: "Unauthorized. Please provide a valid Bearer token." });

      const { data: profile } = await clients.adminClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const { count: formsCount } = await clients.adminClient
        .from("forms")
        .select("id", { count: "exact", head: true })
        .or(`manager_id.eq.${user.id},created_by.eq.${user.id}`)
        .is("deleted_at", null);

      return res.status(200).json({
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || "کاربر پرس‌کاد",
        phone: profile?.phone || null,
        is_owner: Boolean(profile?.is_owner),
        role: profile?.role || "manager",
        plan: profile?.plan || "free",
        max_forms: profile?.max_forms || 5,
        max_responses_per_month: profile?.max_responses_per_month || 100,
        monthly_responses_used: profile?.monthly_responses_used || 0,
        forms_count: formsCount || 0,
        created_at: profile?.created_at || user.created_at,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ۳. عملیات فرم‌ها: /api/v1/forms ...
    // ─────────────────────────────────────────────────────────────
    if (segments[0] === "forms") {
      // 3.1 لیست تمام فرم‌ها یا ایجاد فرم: /api/v1/forms
      if (segments.length === 1) {
        const user = await getUserFromReq(req, clients);
        if (!user) return res.status(401).json({ error: "Unauthorized. Please provide a valid Bearer token." });

        if (req.method === "GET") {
          const rawLimit = parseInt(req.query?.limit || "50", 10);
          const limit = isNaN(rawLimit) || rawLimit <= 0 ? 50 : Math.min(rawLimit, 100);
          const rawOffset = parseInt(req.query?.offset || "0", 10);
          const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;
          const search = req.query?.search ? String(req.query.search).trim() : null;

          const { data: userProfile } = await clients.adminClient
            .from("profiles")
            .select("is_owner, role")
            .eq("id", user.id)
            .maybeSingle();

          const isSuperadmin = Boolean(
            userProfile?.is_owner || userProfile?.role === "superadmin" || userProfile?.role === "admin"
          );

          let query = clients.adminClient
            .from("forms")
            .select(
              "id, public_id, slug, title, description, form_type, published, archived, default_theme, created_at, updated_at",
              { count: "exact" }
            )
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

          // اگر سوپرادمین پارامتر all=true ارسال نکند، فقط فرم‌های خود کاربر را برگردان
          if (!isSuperadmin || req.query?.all !== "true") {
            query = query.or(`manager_id.eq.${user.id},created_by.eq.${user.id}`);
          }

          if (req.query?.published !== undefined) {
            query = query.eq("published", req.query.published === "true");
          }

          if (req.query?.archived !== undefined) {
            query = query.eq("archived", req.query.archived === "true");
          }

          if (search) {
            query = query.ilike("title", `%${search}%`);
          }

          query = query.range(offset, offset + limit - 1);

          const { data: forms, count: totalCount, error } = await query;
          if (error) return res.status(400).json({ error: error.message });

          // دریافت تعداد سوالات و پاسخ‌ها برای فرم‌های موجود
          const formIds = (forms || []).map((f) => f.id);
          let countsMap = {};
          let questionCountsMap = {};

          if (formIds.length > 0) {
            try {
              const { data: qCounts } = await clients.adminClient
                .from("questions")
                .select("form_id")
                .in("form_id", formIds);

              (qCounts || []).forEach((q) => {
                questionCountsMap[q.form_id] = (questionCountsMap[q.form_id] || 0) + 1;
              });

              const { data: respCounts } = await clients.adminClient
                .from("responses")
                .select("form_id, is_complete")
                .in("form_id", formIds);

              (respCounts || []).forEach((r) => {
                if (!countsMap[r.form_id]) {
                  countsMap[r.form_id] = { total: 0, complete: 0 };
                }
                countsMap[r.form_id].total += 1;
                if (r.is_complete) countsMap[r.form_id].complete += 1;
              });
            } catch {}
          }

          const enriched = (forms || []).map((f) => ({
            ...f,
            questions_count: questionCountsMap[f.id] || 0,
            responses_count: countsMap[f.id] || { total: 0, complete: 0 },
            public_url: `${origin}/f/${f.slug}`,
            embed_url: `${origin}/embed/${f.slug}`,
          }));

          return res.status(200).json({
            count: enriched.length,
            total: totalCount ?? enriched.length,
            offset,
            limit,
            forms: enriched,
          });
        }

        if (req.method === "POST") {
          const body = req.body || {};
          const isPublishing = Boolean(body.published);

          // بررسی سقف فرم‌های فعال فقط در صورتی که فرم منتشر شده (فعال) باشد
          if (isPublishing) {
            const { data: userProfile } = await clients.adminClient
              .from("profiles")
              .select("is_owner, plan, max_forms, role")
              .eq("id", user.id)
              .maybeSingle();

            const isUnlimited = Boolean(
              userProfile?.is_owner ||
              userProfile?.role === "superadmin" ||
              userProfile?.plan === "unlimited" ||
              (userProfile?.max_forms && Number(userProfile.max_forms) >= 999999)
            );

            if (!isUnlimited) {
              const allowedMax = userProfile?.max_forms ? Number(userProfile.max_forms) : 5;
              const { count: currentActiveForms } = await clients.adminClient
                .from("forms")
                .select("id", { count: "exact", head: true })
                .or(`manager_id.eq.${user.id},created_by.eq.${user.id}`)
                .eq("published", true)
                .is("deleted_at", null);

              if ((currentActiveForms || 0) >= allowedMax) {
                return res.status(403).json({
                  error: `سقف فرم‌های همزمان فعال تکمیل شده است (حداکثر ${allowedMax} فرم). لطفاً یکی از فرم‌های فعال را غیرفعال یا بایگانی کنید.`,
                  quota_exceeded: true,
                  max_forms: allowedMax,
                  current_forms: currentActiveForms,
                });
              }
            }
          }

          const {
            title,
            slug,
            form_type = "step_by_step",
            description = "",
            welcome_title = "سلام!",
            welcome_message = "ممنون که وقت گذاشتی؛ چند سوال کوتاه داریم.",
            exit_title = "تمام شد!",
            exit_message = "از اینکه جواب دادی خیلی ممنونیم. نظراتت برای ما طلاست!",
            default_theme = "light",
            identifier_mapping = null,
            max_responses_limit = null,
            prevent_duplicate = false,
            published = false,
          } = body;

          const cleanTitle = String(title || "").trim();
          if (!cleanTitle) {
            return res.status(400).json({ error: "عنوان فرم الزامی است." });
          }

          const rawSlug = slug
            ? String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
            : `form-${Math.random().toString(36).substring(2, 8)}`;
          const cleanSlug = (rawSlug.length >= 2 ? rawSlug : `form-${Math.random().toString(36).substring(2, 8)}`).substring(0, 80);

          const safeMaxLimit = (max_responses_limit !== null && max_responses_limit !== undefined && max_responses_limit !== "")
            ? Math.max(1, Math.min(Math.round(Number(max_responses_limit) || 1), 1000000))
            : null;

          const formSettings = {
            max_responses_limit: safeMaxLimit,
            prevent_duplicate: Boolean(prevent_duplicate),
          };

          const newFormData = {
            title: cleanTitle.substring(0, 255),
            slug: cleanSlug,
            form_type: ["step_by_step", "registration"].includes(form_type) ? form_type : "step_by_step",
            description: String(description || "").substring(0, 3000),
            welcome_title: String(welcome_title || "سلام!").substring(0, 255),
            welcome_message: String(welcome_message || "").substring(0, 1000),
            exit_title: String(exit_title || "تمام شد!").substring(0, 255),
            exit_message: String(exit_message || "").substring(0, 1000),
            published: Boolean(published),
            archived: false,
            manager_id: user.id,
            created_by: user.id,
            default_theme: ["light", "dark", "system"].includes(default_theme) ? default_theme : "light",
            identifier_mapping: identifier_mapping || null,
            settings: formSettings,
          };

          let { data: newForm, error: insertErr } = await clients.adminClient
            .from("forms")
            .insert(newFormData)
            .select()
            .single();

          // فالبک در صورت عدم وجود ستون‌های اختیاری در دیتابیس
          if (insertErr) {
            if (insertErr.message?.includes("settings")) {
              delete newFormData.settings;
            }
            if (insertErr.message?.includes("default_theme")) {
              delete newFormData.default_theme;
            }
            if (insertErr.message?.includes("identifier_mapping")) {
              delete newFormData.identifier_mapping;
            }
            const retry = await clients.adminClient
              .from("forms")
              .insert(newFormData)
              .select()
              .single();
            newForm = retry.data;
            insertErr = retry.error;
          }

          if (insertErr) return res.status(400).json({ error: insertErr.message });

          return res.status(201).json({
            form: {
              ...newForm,
              public_url: `${origin}/f/${newForm.slug}`,
              embed_url: `${origin}/embed/${newForm.slug}`,
              questions_count: 0,
              responses_count: { total: 0, complete: 0 },
            },
          });
        }

        return res.status(405).json({ error: "Method not allowed" });
      }

      // شناسه فرم: segments[1] (می‌تواند UUID، public_id یا slug باشد)
      const formIdentifier = segments[1];

      async function findForm(allowDeleted = false) {
        if (!formIdentifier || typeof formIdentifier !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(formIdentifier)) {
          return null;
        }
        let q = clients.adminClient.from("forms").select("*");
        if (!allowDeleted) {
          q = q.is("deleted_at", null);
        }
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formIdentifier);
        if (isUuid) {
          q = q.or(`id.eq.${formIdentifier},public_id.eq.${formIdentifier},slug.eq.${formIdentifier}`);
        } else {
          q = q.or(`public_id.eq.${formIdentifier},slug.eq.${formIdentifier}`);
        }
        const { data, error } = await q.maybeSingle();
        if (error || !data) return null;
        return data;
      }

      // 3.2 کدهای امبد: /api/v1/forms/:id/embed
      if (segments.length === 3 && segments[2] === "embed") {
        if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
        const form = await findForm();
        if (!form) return res.status(404).json({ error: "فرم مورد نظر یافت نشد." });

        const directUrl = `${origin}/f/${form.slug}`;
        const embedUrl = `${origin}/embed/${form.slug}`;

        return res.status(200).json({
          form_id: form.id,
          slug: form.slug,
          public_id: form.public_id || form.id,
          title: form.title,
          direct_url: directUrl,
          embed_url: embedUrl,
          iframe_code: `<iframe src="${embedUrl}" width="100%" height="650" frameborder="0" style="border:none; border-radius:16px; overflow:hidden;" allow="camera; microphone; autoplay; encrypted-media; fullscreen" loading="lazy"></iframe>`,
          sdk_code: `<div id="porskad-form" data-porskad-form="${form.slug}"></div>\n<script src="${origin}/embed-sdk.js" async></script>`,
          react_code: `import React from 'react';\n\nexport function PorskadSurvey() {\n  return (\n    <iframe\n      src="${embedUrl}"\n      className="w-full h-[650px] border-0 rounded-2xl"\n      allow="camera; microphone; autoplay; fullscreen"\n      loading="lazy"\n    />\n  );\n}`,
        });
      }

      // 3.3 خلاصه آمار و تحلیل فرم: GET /api/v1/forms/:id/stats
      if (segments.length === 3 && segments[2] === "stats") {
        if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
        const form = await findForm();
        if (!form) return res.status(404).json({ error: "فرم یافت نشد." });

        const user = await getUserFromReq(req, clients);
        const authorized = await isAuthorizedForForm(user, form, clients);
        if (!authorized) {
          return res.status(403).json({ error: "شما اجازه دسترسی به آمار این فرم را ندارید." });
        }

        const { data: allResponses, error: respErr } = await clients.adminClient
          .from("responses")
          .select("id, is_complete, started_at, submitted_at, duration_seconds, device, browser")
          .eq("form_id", form.id)
          .order("created_at", { ascending: false });

        if (respErr) return res.status(400).json({ error: respErr.message });

        const responses = allResponses || [];
        const total = responses.length;
        const complete = responses.filter((r) => r.is_complete).length;
        const incomplete = total - complete;
        const completionRate = total > 0 ? Math.round((complete / total) * 100) : 0;

        const durations = responses
          .filter((r) => r.duration_seconds && r.duration_seconds > 0)
          .map((r) => r.duration_seconds);
        const avgDuration = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

        const todayCount = responses.filter((r) => (r.submitted_at || r.started_at) >= startOfToday).length;
        const weekCount = responses.filter((r) => (r.submitted_at || r.started_at) >= sevenDaysAgo).length;
        const monthCount = responses.filter((r) => (r.submitted_at || r.started_at) >= thirtyDaysAgo).length;

        const deviceStats = { desktop: 0, mobile: 0, tablet: 0, other: 0 };
        responses.forEach((r) => {
          const d = (r.device || "").toLowerCase();
          if (d.includes("mob")) deviceStats.mobile++;
          else if (d.includes("tab")) deviceStats.tablet++;
          else if (d.includes("desk")) deviceStats.desktop++;
          else deviceStats.other++;
        });

        return res.status(200).json({
          form_id: form.id,
          slug: form.slug,
          title: form.title,
          stats: {
            total_responses: total,
            completed_responses: complete,
            incomplete_responses: incomplete,
            completion_rate_percentage: completionRate,
            average_duration_seconds: avgDuration,
            today: todayCount,
            last_7_days: weekCount,
            last_30_days: monthCount,
            devices: deviceStats,
          },
        });
      }

      // 3.4 سوالات فرم: /api/v1/forms/:id/questions
      if (segments.length >= 3 && segments[2] === "questions") {
        const form = await findForm();
        if (!form) return res.status(404).json({ error: "فرم یافت نشد." });

        // GET /api/v1/forms/:id/questions (لیست سوالات)
        if (segments.length === 3 && req.method === "GET") {
          const user = await getUserFromReq(req, clients);
          const authorized = await isAuthorizedForForm(user, form, clients);

          if (!form.published || form.archived) {
            if (!authorized) {
              return res.status(404).json({ error: "فرم یافت نشد یا هنوز منتشر نشده است." });
            }
          }

          const { data: questions, error } = await clients.adminClient
            .from("questions")
            .select("*")
            .eq("form_id", form.id)
            .order("position", { ascending: true });

          if (error) return res.status(400).json({ error: error.message });

          const safeQuestions = authorized
            ? (questions || [])
            : (questions || []).map(sanitizeQuestionForPublic);

          return res.status(200).json({ count: safeQuestions.length, questions: safeQuestions });
        }

        // POST /api/v1/forms/:id/questions (افزودن سوال جدید)
        if (segments.length === 3 && req.method === "POST") {
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          const authorized = await isAuthorizedForForm(user, form, clients);
          if (!authorized) {
            return res.status(403).json({ error: "دسترسی غیرمجاز به ویرایش این فرم." });
          }

          const body = req.body || {};
          const {
            type,
            title = "سوال جدید",
            description = "",
            required = true,
            placeholder = "",
            validation = null,
            options = [],
            position,
            display_mode = null,
            max_selections = null,
            points = null,
            correct_answer = null,
            conditions = null,
            jump_actions = [],
          } = body;

          if (!type || !QUESTION_TYPES_DATA[type]) {
            return res.status(400).json({ error: `نوع سوال نامعتبر است: ${type}` });
          }

          const cleanTitle = String(title || "").trim();
          if (!cleanTitle) {
            return res.status(400).json({ error: "عنوان سوال نمی‌تواند خالی باشد." });
          }

          const cleanPoints = (points !== undefined && points !== null && !isNaN(Number(points)))
            ? Math.max(0, Math.min(Math.round(Number(points)), 1000))
            : null;

          const cleanMaxSelections = (max_selections !== undefined && max_selections !== null && !isNaN(Number(max_selections)))
            ? Math.max(1, Math.min(Math.round(Number(max_selections)), 100))
            : 1;

          const cleanOptions = Array.isArray(options) ? options.slice(0, 100) : [];

          let targetPosition = position;
          if (targetPosition === undefined || targetPosition === null) {
            const { count } = await clients.adminClient
              .from("questions")
              .select("id", { count: "exact", head: true })
              .eq("form_id", form.id);
            targetPosition = count || 0;
          }

          const newQ = {
            form_id: form.id,
            type,
            title: cleanTitle.substring(0, 500),
            description: String(description || "").substring(0, 2000),
            required: Boolean(required),
            placeholder: String(placeholder || "").substring(0, 255),
            validation: validation || null,
            options: cleanOptions,
            position: targetPosition,
            display_mode: display_mode || null,
            max_selections: cleanMaxSelections,
            points: cleanPoints,
            correct_answer: correct_answer || null,
            conditions: conditions || null,
            jump_actions: Array.isArray(jump_actions) ? jump_actions : [],
          };

          const { data: savedQ, error: qErr } = await clients.adminClient
            .from("questions")
            .insert(newQ)
            .select()
            .single();

          if (qErr) return res.status(400).json({ error: qErr.message });
          return res.status(201).json({ question: savedQ });
        }

        // GET / PUT / DELETE یک سوال مشخص: /api/v1/forms/:id/questions/:questionId
        if (segments.length === 4) {
          const questionId = segments[3];
          if (!questionId || typeof questionId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(questionId)) {
            return res.status(400).json({ error: "شناسه سوال نامعتبر است." });
          }

          const user = await getUserFromReq(req, clients);
          const authorized = await isAuthorizedForForm(user, form, clients);

          // GET: دریافت مشخصات یک سوال مشخص
          if (req.method === "GET") {
            if (!form.published || form.archived) {
              if (!authorized) {
                return res.status(404).json({ error: "فرم یافت نشد یا در دسترس نیست." });
              }
            }

            const { data: singleQ, error: getQErr } = await clients.adminClient
              .from("questions")
              .select("*")
              .eq("id", questionId)
              .eq("form_id", form.id)
              .maybeSingle();

            if (getQErr) return res.status(400).json({ error: getQErr.message });
            if (!singleQ) return res.status(404).json({ error: "سوال با شناسه مورد نظر یافت نشد." });

            const safeSingleQ = authorized ? singleQ : sanitizeQuestionForPublic(singleQ);
            return res.status(200).json({ question: safeSingleQ });
          }

          if (!user) return res.status(401).json({ error: "Unauthorized" });
          if (!authorized) {
            return res.status(403).json({ error: "دسترسی غیرمجاز به ویرایش این فرم." });
          }

          if (req.method === "PUT") {
            const body = req.body || {};
            const patch = {};
            [
              "title", "type", "description", "required", "placeholder", "validation",
              "options", "position", "display_mode", "max_selections", "points",
              "correct_answer", "conditions", "jump_actions"
            ].forEach((key) => {
              if (body[key] !== undefined) patch[key] = body[key];
            });

            if (patch.type && !QUESTION_TYPES_DATA[patch.type]) {
              return res.status(400).json({ error: `نوع سوال نامعتبر است: ${patch.type}` });
            }

            if (patch.title !== undefined) {
              const cleanTitle = String(patch.title).trim();
              if (!cleanTitle) {
                return res.status(400).json({ error: "عنوان سوال نمی‌تواند خالی باشد." });
              }
              patch.title = cleanTitle.substring(0, 500);
            }

            if (patch.description !== undefined && patch.description !== null) {
              patch.description = String(patch.description).substring(0, 2000);
            }

            if (patch.placeholder !== undefined && patch.placeholder !== null) {
              patch.placeholder = String(patch.placeholder).substring(0, 255);
            }

            if (patch.points !== undefined && patch.points !== null) {
              patch.points = isNaN(Number(patch.points)) ? null : Math.max(0, Math.min(Math.round(Number(patch.points)), 1000));
            }

            if (patch.max_selections !== undefined && patch.max_selections !== null) {
              patch.max_selections = isNaN(Number(patch.max_selections)) ? 1 : Math.max(1, Math.min(Math.round(Number(patch.max_selections)), 100));
            }

            if (patch.options !== undefined && Array.isArray(patch.options)) {
              patch.options = patch.options.slice(0, 100);
            }

            const { data: updatedQ, error: upErr } = await clients.adminClient
              .from("questions")
              .update(patch)
              .eq("id", questionId)
              .eq("form_id", form.id)
              .select()
              .single();

            if (upErr) return res.status(400).json({ error: upErr.message });
            return res.status(200).json({ question: updatedQ });
          }

          if (req.method === "DELETE") {
            const { error: delErr } = await clients.adminClient
              .from("questions")
              .delete()
              .eq("id", questionId)
              .eq("form_id", form.id);

            if (delErr) return res.status(400).json({ error: delErr.message });
            return res.status(200).json({ success: true, message: "سوال با موفقیت حذف شد." });
          }

          return res.status(405).json({ error: "Method not allowed" });
        }
      }

      // 3.5 پاسخ‌های فرم: /api/v1/forms/:id/responses
      if (segments.length >= 3 && segments[2] === "responses") {
        const form = await findForm();
        if (!form) return res.status(404).json({ error: "فرم یافت نشد." });

        // ثبت پاسخ جدید (Submit): POST /api/v1/forms/:id/responses
        if (segments.length === 3 && req.method === "POST") {
          if (!form.published || form.archived) {
            return res.status(400).json({ error: "این فرم در دسترس نیست یا غیرفعال شده است." });
          }

          const maxLimit = form.max_responses_limit || form.settings?.max_responses_limit;
          if (maxLimit && Number(maxLimit) > 0) {
            const { count: completedCount } = await clients.adminClient
              .from("responses")
              .select("id", { count: "exact", head: true })
              .eq("form_id", form.id)
              .eq("is_complete", true);
            if ((completedCount || 0) >= Number(maxLimit)) {
              return res.status(400).json({ error: "ظرفیت ثبت پاسخ برای این فرم تکمیل شده است." });
            }
          }

          const body = req.body || {};
          const {
            answers = [],
            duration_seconds = null,
            device = "api",
            browser = "http-client",
            os = null,
            user_agent = null,
            referer = null,
          } = body;

          if (!Array.isArray(answers)) {
            return res.status(400).json({ error: "آرایه answers الزامی است." });
          }

          if (answers.length > 200) {
            return res.status(400).json({ error: "تعداد پاسخ‌ها بیش از حد مجاز است (حداکثر ۲۰۰ پاسخ)." });
          }

          const cleanDuration = (duration_seconds !== null && duration_seconds !== undefined && !isNaN(Number(duration_seconds)))
            ? Math.max(0, Math.min(Math.round(Number(duration_seconds)), 86400))
            : 10;

          const cleanDevice = String(device || "api").substring(0, 100);
          const cleanBrowser = String(browser || "http-client").substring(0, 100);
          const cleanOs = os ? String(os).substring(0, 100) : null;
          const cleanUserAgent = user_agent ? String(user_agent).substring(0, 500) : null;
          const cleanReferer = referer ? String(referer).substring(0, 1000) : null;

          const { data: formQuestions } = await clients.adminClient
            .from("questions")
            .select("id, title, required, type, points, correct_answer")
            .eq("form_id", form.id);

          const questionsMap = new Map((formQuestions || []).map((q) => [q.id, q]));
          const answersToInsert = [];
          let earnedScore = 0;
          let totalPossibleScore = 0;

          for (const a of answers) {
            if (!a || !a.question_id || !questionsMap.has(a.question_id)) {
              continue;
            }
            const q = questionsMap.get(a.question_id);

            // مهار طول پاسخ متنی برای جلوگیری از حملات پر کردن دیتابیس
            let safeValue = a.value;
            if (typeof safeValue === "string" && safeValue.length > 25000) {
              safeValue = safeValue.substring(0, 25000);
            }

            const cleanTimeSpent = (a.time_spent_seconds !== undefined && a.time_spent_seconds !== null && !isNaN(Number(a.time_spent_seconds)))
              ? Math.max(0, Math.min(Math.round(Number(a.time_spent_seconds)), 86400))
              : null;

            answersToInsert.push({
              question_id: a.question_id,
              value: safeValue,
              time_spent_seconds: cleanTimeSpent,
            });

            if (q.points && q.points > 0) {
              totalPossibleScore += q.points;
              if (q.correct_answer !== null && q.correct_answer !== undefined) {
                const normVal = JSON.stringify(safeValue);
                const normAns = JSON.stringify(q.correct_answer);
                if (normVal === normAns) {
                  earnedScore += q.points;
                }
              }
            }
          }

          // بررسی سهمیه ماهانه مالک فرم
          const formOwnerId = form.manager_id || form.created_by;
          if (formOwnerId) {
            const { data: ownerProf } = await clients.adminClient
              .from("profiles")
              .select("id, is_owner, plan, max_responses_per_month, monthly_responses_used, role")
              .eq("id", formOwnerId)
              .maybeSingle();

            const isOwnerUnlimited = Boolean(
              ownerProf?.is_owner ||
              ownerProf?.role === "superadmin" ||
              ownerProf?.plan === "unlimited" ||
              (ownerProf?.max_responses_per_month && Number(ownerProf.max_responses_per_month) >= 999999)
            );

            if (!isOwnerUnlimited && ownerProf) {
              const used = Number(ownerProf.monthly_responses_used) || 0;
              const allowed = Number(ownerProf.max_responses_per_month) || 100;
              if (used >= allowed) {
                return res.status(403).json({ error: "سهمیه ماهانه دریافت پاسخ برای فرم‌های این حساب به پایان رسیده است." });
              }
            }

            try {
              const { error: rpcErr } = await clients.adminClient.rpc("increment_monthly_responses", { p_user_id: formOwnerId });
              if (rpcErr && ownerProf) {
                await clients.adminClient
                  .from("profiles")
                  .update({ monthly_responses_used: (Number(ownerProf.monthly_responses_used) || 0) + 1 })
                  .eq("id", formOwnerId);
              }
            } catch {
              if (ownerProf) {
                await clients.adminClient
                  .from("profiles")
                  .update({ monthly_responses_used: (Number(ownerProf.monthly_responses_used) || 0) + 1 })
                  .eq("id", formOwnerId);
              }
            }
          }

          const finalAnswersObj = {};
          if (Array.isArray(answers)) {
            for (const a of answers) {
              if (a.question_id) finalAnswersObj[a.question_id] = a.value;
            }
          } else if (answers && typeof answers === "object") {
            Object.assign(finalAnswersObj, answers);
          }

          const targetPublicId = form.slug || form.public_id || form.id;
          const metaPayload = {
            device: cleanDevice,
            browser: cleanBrowser,
            os: cleanOs,
            userAgent: cleanUserAgent || "api",
            referrerUrl: cleanReferer,
            startedAt: new Date(Date.now() - cleanDuration * 1000).toISOString(),
            completedAt: new Date().toISOString(),
          };

          let createdResponseId = null;
          let rpcScoreResult = null;

          // ۱. تلاش برای ثبت امن از طریق RPC
          try {
            const { data: rpcRes, error: rpcErr } = await clients.adminClient.rpc("submit_public_response", {
              p_form_public_id: targetPublicId,
              p_answers: finalAnswersObj,
              p_meta: metaPayload,
              p_times: {},
            });

            if (!rpcErr && rpcRes && (rpcRes.response_id || rpcRes.id)) {
              createdResponseId = rpcRes.response_id || rpcRes.id;
              if (rpcRes.score) rpcScoreResult = rpcRes.score;
            } else if (rpcErr) {
              const msg = rpcErr.message || "";
              if (!msg.includes("function") && !msg.includes("does not exist")) {
                return res.status(400).json({ error: msg });
              }
            }
          } catch {}

          // ۲. در صورتی که RPC در دسترس نبود، درج مستقیم در جداول
          if (!createdResponseId) {
            const { data: respRow, error: respErr } = await clients.adminClient
              .from("responses")
              .insert({
                form_id: form.id,
                is_complete: true,
                started_at: metaPayload.startedAt,
                submitted_at: metaPayload.completedAt,
                duration_seconds: cleanDuration,
                device: cleanDevice,
                browser: cleanBrowser,
                os: cleanOs,
                user_agent: cleanUserAgent,
                referer: cleanReferer,
              })
              .select()
              .single();

            if (respErr) return res.status(400).json({ error: respErr.message });
            createdResponseId = respRow.id;

            if (answersToInsert.length > 0) {
              const formatted = answersToInsert.map((a) => ({
                ...a,
                response_id: respRow.id,
              }));
              await clients.adminClient.from("answers").insert(formatted);
            }
          }

          // دیسپچ تلگرام به صورت مستقیم و پایدار بدون وابستگی به فچ حلقه برگشتی
          try {
            dispatchTelegramNotification(clients, form.id, createdResponseId).catch(() => {});
          } catch {}

          // دیسپچ وب‌هوک
          const webhookUrl = form.webhook_url || form.settings?.webhook_url;
          if (webhookUrl) {
            try {
              fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event: "response.submitted",
                  form_id: form.id,
                  form_title: form.title,
                  response_id: createdResponseId,
                  submitted_at: metaPayload.completedAt,
                  answers: answersToInsert,
                  score: totalPossibleScore > 0 ? { earned: earnedScore, total: totalPossibleScore } : null,
                }),
              }).catch(() => {});
            } catch {}
          }

          return res.status(201).json({
            success: true,
            response_id: createdResponseId,
            message: form.exit_message || "از اینکه پاسخ دادید ممنونیم.",
            score: rpcScoreResult || (totalPossibleScore > 0 ? { earned: earnedScore, total: totalPossibleScore } : undefined),
          });
        }

        // دریافت لیست پاسخ‌ها: GET /api/v1/forms/:id/responses
        if (segments.length === 3 && req.method === "GET") {
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          const authorized = await isAuthorizedForForm(user, form, clients);
          if (!authorized) {
            return res.status(403).json({ error: "شما اجازه دسترسی به پاسخ‌های این فرم را ندارید." });
          }

          const rawLimit = parseInt(req.query?.limit || "50", 10);
          const limit = isNaN(rawLimit) || rawLimit <= 0 ? 50 : Math.min(rawLimit, 200);
          const rawOffset = parseInt(req.query?.offset || "0", 10);
          const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

          let query = clients.adminClient
            .from("responses")
            .select(`
              id, is_complete, started_at, submitted_at, duration_seconds, device, browser, os,
              answers ( id, question_id, value, time_spent_seconds )
            `, { count: "exact" })
            .eq("form_id", form.id)
            .order("created_at", { ascending: false });

          if (req.query?.is_complete !== undefined) {
            query = query.eq("is_complete", req.query.is_complete === "true");
          }

          query = query.range(offset, offset + limit - 1);

          const { data: responses, count: totalCount, error: rErr } = await query;
          if (rErr) return res.status(400).json({ error: rErr.message });

          // غنی‌سازی پاسخ‌ها با عنوان و نوع سوالات جهت خوانایی آسان API
          const { data: formQuestions } = await clients.adminClient
            .from("questions")
            .select("id, title, type")
            .eq("form_id", form.id);

          const qMetaMap = new Map((formQuestions || []).map((q) => [q.id, { title: q.title, type: q.type }]));

          const enrichedResponses = (responses || []).map((r) => ({
            ...r,
            answers: (r.answers || []).map((a) => ({
              ...a,
              question_title: qMetaMap.get(a.question_id)?.title || null,
              question_type: qMetaMap.get(a.question_id)?.type || null,
            })),
          }));

          return res.status(200).json({
            form_id: form.id,
            total: totalCount ?? enrichedResponses.length,
            count: enrichedResponses.length,
            offset,
            limit,
            responses: enrichedResponses,
          });
        }

        // GET / DELETE یک پاسخ مشخص: /api/v1/forms/:id/responses/:responseId
        if (segments.length === 4) {
          const responseId = segments[3];
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          const authorized = await isAuthorizedForForm(user, form, clients);
          if (!authorized) {
            return res.status(403).json({ error: "دسترسی غیرمجاز به این فرم." });
          }

          // GET: دریافت جزییات یک پاسخ مشخص
          if (req.method === "GET") {
            const { data: resp, error: getRespErr } = await clients.adminClient
              .from("responses")
              .select(`
                id, form_id, is_complete, started_at, submitted_at, duration_seconds, device, browser, os, user_agent, referer, created_at,
                answers ( id, question_id, value, time_spent_seconds )
              `)
              .eq("id", responseId)
              .eq("form_id", form.id)
              .maybeSingle();

            if (getRespErr) return res.status(400).json({ error: getRespErr.message });
            if (!resp) return res.status(404).json({ error: "پاسخ مورد نظر یافت نشد." });

            const { data: formQuestions } = await clients.adminClient
              .from("questions")
              .select("id, title, type, points, correct_answer")
              .eq("form_id", form.id);

            const qMetaMap = new Map((formQuestions || []).map((q) => [q.id, q]));

            const enrichedAnswers = (resp.answers || []).map((a) => {
              const q = qMetaMap.get(a.question_id);
              return {
                ...a,
                question_title: q?.title || null,
                question_type: q?.type || null,
                question_points: q?.points || null,
                correct_answer: q?.correct_answer ?? null,
              };
            });

            return res.status(200).json({
              response: {
                ...resp,
                answers: enrichedAnswers,
              },
            });
          }

          // DELETE: حذف پاسخ
          if (req.method === "DELETE") {
            const { error: delErr } = await clients.adminClient
              .from("responses")
              .delete()
              .eq("id", responseId)
              .eq("form_id", form.id);

            if (delErr) return res.status(400).json({ error: delErr.message });
            return res.status(200).json({ success: true, message: "پاسخ با موفقیت حذف شد." });
          }

          return res.status(405).json({ error: "Method not allowed" });
        }
      }

      // 3.6 دریافت، ویرایش یا حذف تکی فرم: /api/v1/forms/:id
      if (segments.length === 2) {
        const allowDeleted = req.method === "DELETE" || req.method === "PUT";
        const form = await findForm(allowDeleted);
        if (!form) return res.status(404).json({ error: "فرم یافت نشد." });

        if (req.method === "GET") {
          const user = await getUserFromReq(req, clients);
          const isOwnerOrAdmin = await isAuthorizedForForm(user, form, clients);

          // اگر فرم در وضعیت پیش‌نویس (منتشرنشده) یا آرشیو باشد، فقط مالک/ادمین به آن دسترسی دارد
          if (!form.published || form.archived) {
            if (!isOwnerOrAdmin) {
              return res.status(404).json({ error: "فرم یافت نشد یا هنوز منتشر نشده است." });
            }
          }

          // دریافت تمام سوالات مرتبط با تمام مشخصات کامل
          const { data: questions } = await clients.adminClient
            .from("questions")
            .select("*")
            .eq("form_id", form.id)
            .order("position", { ascending: true });

          // دریافت قوانین شرطی (Logic Rules)
          const { data: logicRules } = await clients.adminClient
            .from("logic_rules")
            .select("*")
            .eq("form_id", form.id)
            .order("priority", { ascending: true });

          // دریافت تعداد کل پاسخ‌ها
          const { count: respTotal } = await clients.adminClient
            .from("responses")
            .select("id", { count: "exact", head: true })
            .eq("form_id", form.id);

          const { count: respComplete } = await clients.adminClient
            .from("responses")
            .select("id", { count: "exact", head: true })
            .eq("form_id", form.id)
            .eq("is_complete", true);

          const safeForm = isOwnerOrAdmin
            ? {
                ...form,
                questions_count: (questions || []).length,
                responses_count: { total: respTotal || 0, complete: respComplete || 0 },
              }
            : {
                id: form.id,
                slug: form.slug,
                public_id: form.public_id || form.id,
                title: form.title,
                description: form.description,
                form_type: form.form_type,
                published: form.published,
                archived: form.archived,
                welcome_title: form.welcome_title,
                welcome_message: form.welcome_message,
                exit_title: form.exit_title,
                exit_message: form.exit_message,
                default_theme: form.default_theme,
                max_responses_limit: form.max_responses_limit,
                prevent_duplicate: form.prevent_duplicate,
                identifier_mapping: form.identifier_mapping,
                settings: sanitizeFormSettingsForPublic(form.settings),
                questions_count: (questions || []).length,
                responses_count: { total: respTotal || 0, complete: respComplete || 0 },
                created_at: form.created_at,
                updated_at: form.updated_at,
              };

          const safeQuestions = isOwnerOrAdmin
            ? (questions || [])
            : (questions || []).map(sanitizeQuestionForPublic);

          return res.status(200).json({
            form: {
              ...safeForm,
              public_url: `${origin}/f/${form.slug}`,
              embed_url: `${origin}/embed/${form.slug}`,
            },
            questions: safeQuestions,
            logic_rules: logicRules || [],
          });
        }

        if (req.method === "PUT") {
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          const isOwnerOrAdmin = await isAuthorizedForForm(user, form, clients);
          if (!isOwnerOrAdmin) {
            return res.status(403).json({ error: "شما اجازه ویرایش این فرم را ندارید." });
          }

          const body = req.body || {};
          const patch = {};
          [
            "title", "description", "published", "archived", "slug", "welcome_title",
            "welcome_message", "exit_title", "exit_message", "default_theme",
            "form_type", "identifier_mapping", "max_responses_limit", "prevent_duplicate", "settings",
            "deleted_at"
          ].forEach((k) => {
            if (body[k] !== undefined) patch[k] = body[k];
          });

          if (patch.title !== undefined) {
            const cleanTitle = String(patch.title).trim();
            if (!cleanTitle) {
              return res.status(400).json({ error: "عنوان فرم نمی‌تواند خالی باشد." });
            }
            patch.title = cleanTitle.substring(0, 255);
          }

          if (patch.slug !== undefined) {
            const cleanSlug = String(patch.slug)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "");
            if (!cleanSlug || cleanSlug.length < 2) {
              return res.status(400).json({ error: "شناسه یکتای فرم (slug) باید حداقل ۲ کاراکتر معتبر انگلیسی یا عدد باشد." });
            }
            patch.slug = cleanSlug.substring(0, 80);
          }

          if (patch.form_type !== undefined) {
            if (!["step_by_step", "registration"].includes(patch.form_type)) {
              return res.status(400).json({ error: "نوع فرم نامعتبر است. مقادیر مجاز: step_by_step یا registration" });
            }
          }

          if (patch.default_theme !== undefined) {
            if (!["light", "dark", "system"].includes(patch.default_theme)) {
              return res.status(400).json({ error: "تم پیش‌فرض نامعتبر است. مقادیر مجاز: light, dark, system" });
            }
          }

          if (patch.max_responses_limit !== undefined) {
            patch.max_responses_limit = (patch.max_responses_limit !== null && patch.max_responses_limit !== "")
              ? Math.max(1, Math.min(Math.round(Number(patch.max_responses_limit) || 1), 1000000))
              : null;
          }

          if (patch.description !== undefined && patch.description !== null) {
            patch.description = String(patch.description).substring(0, 3000);
          }

          if (patch.welcome_title !== undefined && patch.welcome_title !== null) {
            patch.welcome_title = String(patch.welcome_title).substring(0, 255);
          }

          if (patch.welcome_message !== undefined && patch.welcome_message !== null) {
            patch.welcome_message = String(patch.welcome_message).substring(0, 1000);
          }

          if (patch.exit_title !== undefined && patch.exit_title !== null) {
            patch.exit_title = String(patch.exit_title).substring(0, 255);
          }

          if (patch.exit_message !== undefined && patch.exit_message !== null) {
            patch.exit_message = String(patch.exit_message).substring(0, 1000);
          }

          patch.updated_at = new Date().toISOString();

          const { data: updatedForm, error: upErr } = await clients.adminClient
            .from("forms")
            .update(patch)
            .eq("id", form.id)
            .select()
            .single();

          if (upErr) return res.status(400).json({ error: upErr.message });
          return res.status(200).json({
            form: {
              ...updatedForm,
              public_url: `${origin}/f/${updatedForm.slug}`,
              embed_url: `${origin}/embed/${updatedForm.slug}`,
            },
          });
        }

        if (req.method === "DELETE") {
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          const isOwnerOrAdmin = await isAuthorizedForForm(user, form, clients);
          if (!isOwnerOrAdmin) {
            return res.status(403).json({ error: "شما اجازه حذف این فرم را ندارید." });
          }

          const isPermanent = req.query?.permanent === "true" || req.query?.permanent === "1" || req.body?.permanent === true;
          const nowIso = new Date().toISOString();
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          // ۱. جمع‌آوری تمام سوالات فرم جهت نگهداری قطعی ۳۰ روزه در سطل زباله
          let formQuestions = [];
          try {
            const { data: qData } = await clients.adminClient
              .from("questions")
              .select("*")
              .eq("form_id", form.id)
              .order("position", { ascending: true });
            formQuestions = qData || [];
          } catch {}

          // ۲. ضبط و ذخیره امن در جدول trash (با برچسب مشخص و ۳۰ روز مهلت بازیابی در سوپرادمین)
          try {
            const ownerId = form.created_by || form.manager_id || user.id;
            await clients.adminClient.from("trash").insert({
              entity_type: "form",
              entity_id: form.id,
              label: `فرم «${form.title || form.slug || "بدون عنوان"}»`,
              payload: {
                ...form,
                questions: formQuestions,
                deleted_at: nowIso,
                published: false,
                user_deleted_permanent: isPermanent,
              },
              user_id: ownerId,
              deleted_by: user.id,
              deleted_by_name: user.email || "کاربر",
              deleted_at: nowIso,
              expires_at: expiresAt,
            });
          } catch (trashErr) {
            console.warn("Could not record form in trash table:", trashErr);
          }

          const existingSettings = (form.settings && typeof form.settings === "object") ? form.settings : {};
          const updatedSettings = {
            ...existingSettings,
            user_purged: isPermanent,
            user_purged_at: isPermanent ? nowIso : null,
            deleted_by: user.id,
            deleted_by_email: user.email,
          };

          // ۳. به‌روزرسانی ردیف فرم: همیشه در دیتابیس می‌ماند تا سوپرادمین تا ۳۰ روز به آن و پاسخ‌هایش دسترسی کامل داشته باشد
          const updatePayload = {
            deleted_at: nowIso,
            published: false,
            settings: updatedSettings,
          };

          if (isPermanent) {
            updatePayload.user_purged_at = nowIso;
          }

          let { error: formUpdateErr } = await clients.adminClient
            .from("forms")
            .update(updatePayload)
            .eq("id", form.id);

          // در صورت عدم وجود ستون settings یا user_purged_at در دیتابیس، بدون آن فیلد تلاش مجدد انجام شود
          if (formUpdateErr && (formUpdateErr.message?.includes("settings") || formUpdateErr.code === "PGRST204")) {
            delete updatePayload.settings;
            const retry = await clients.adminClient
              .from("forms")
              .update(updatePayload)
              .eq("id", form.id);
            formUpdateErr = retry.error;
          }

          if (formUpdateErr && (formUpdateErr.message?.includes("user_purged_at") || formUpdateErr.code === "PGRST204")) {
            delete updatePayload.user_purged_at;
            const retry = await clients.adminClient
              .from("forms")
              .update(updatePayload)
              .eq("id", form.id);
            formUpdateErr = retry.error;
          }

          // فالبک نهایی حداقل به‌روزرسانی deleted_at
          if (formUpdateErr) {
            const fallback = await clients.adminClient
              .from("forms")
              .update({ deleted_at: nowIso, published: false })
              .eq("id", form.id);
            formUpdateErr = fallback.error;
          }

          if (formUpdateErr) return res.status(400).json({ error: formUpdateErr.message });
          return res.status(200).json({
            success: true,
            message: isPermanent ? "فرم برای همیشه از حساب شما حذف شد." : "فرم به سطل زباله منتقل شد."
          });
        }

        return res.status(405).json({ error: "Method not allowed" });
      }
    }

    return res.status(404).json({ error: "اندپوینت درخواستی یافت نشد. لطفاً بخش مستندات وب‌سرویس در پنل مدیریت (/admin/web-service) را بررسی کنید." });
  } catch (err) {
    console.error("API v1 Error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
