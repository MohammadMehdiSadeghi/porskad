import { createClient } from "@supabase/supabase-js";

// متادیتای انواع سوالات پرس‌کاد
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

function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

function getSupabaseClients(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    return res.status(500).json({ error: "Supabase configuration is missing" });
  }

  // تفکیک مسیرها: [...route]
  let segments = [];
  if (req.query?.route) {
    segments = Array.isArray(req.query.route) ? req.query.route : [req.query.route];
  } else {
    const cleanUrl = req.url.replace(/^\/api\/v1\/?/, "").split("?")[0];
    segments = cleanUrl.split("/").filter(Boolean);
  }

  const origin = getOrigin(req);

  try {
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
          const limit = Math.min(parseInt(req.query?.limit || "50", 10), 100);
          let query = clients.adminClient
            .from("forms")
            .select("id, slug, title, description, form_type, published, created_at, updated_at")
            .or(`manager_id.eq.${user.id},created_by.eq.${user.id}`)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(limit);

          if (req.query?.published !== undefined) {
            query = query.eq("published", req.query.published === "true");
          }

          const { data: forms, error } = await query;
          if (error) return res.status(400).json({ error: error.message });

          const enriched = (forms || []).map((f) => ({
            ...f,
            public_url: `${origin}/f/${f.slug}`,
            embed_url: `${origin}/embed/${f.slug}`,
          }));

          return res.status(200).json({ count: enriched.length, forms: enriched });
        }

        if (req.method === "POST") {
          // بررسی سقف ساخت فرم بر اساس پلن کاربر
          const { data: userProfile } = await clients.adminClient
            .from("profiles")
            .select("is_owner, plan, max_forms")
            .eq("id", user.id)
            .maybeSingle();

          const isUnlimited = Boolean(
            userProfile?.is_owner ||
            userProfile?.plan === "unlimited" ||
            (userProfile?.max_forms && Number(userProfile.max_forms) >= 999999)
          );

          if (!isUnlimited) {
            const allowedMax = userProfile?.max_forms ? Number(userProfile.max_forms) : 5;
            const { count: currentActiveForms } = await clients.adminClient
              .from("forms")
              .select("id", { count: "exact", head: true })
              .or(`manager_id.eq.${user.id},created_by.eq.${user.id}`)
              .is("deleted_at", null);

            if ((currentActiveForms || 0) >= allowedMax) {
              return res.status(403).json({
                error: `سقف ساخت فرم‌های حساب شما تکمیل شده است (حداکثر ${allowedMax} فرم). لطفاً پلن خود را ارتقا دهید.`,
                quota_exceeded: true,
                max_forms: allowedMax,
                current_forms: currentActiveForms,
              });
            }
          }

          const body = req.body || {};
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
          } = body;

          if (!title || !title.trim()) {
            return res.status(400).json({ error: "عنوان فرم الزامی است." });
          }

          const cleanSlug = slug
            ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
            : `form-${Math.random().toString(36).substring(2, 8)}`;

          const newFormData = {
            title: title.trim(),
            slug: cleanSlug,
            form_type,
            description,
            welcome_title,
            welcome_message,
            exit_title,
            exit_message,
            published: false,
            manager_id: user.id,
            created_by: user.id,
            default_theme: ["light", "dark", "system"].includes(default_theme) ? default_theme : "light",
          };

          const { data: newForm, error: insertErr } = await clients.adminClient
            .from("forms")
            .insert(newFormData)
            .select()
            .single();

          if (insertErr) return res.status(400).json({ error: insertErr.message });

          return res.status(201).json({
            form: {
              ...newForm,
              public_url: `${origin}/f/${newForm.slug}`,
              embed_url: `${origin}/embed/${newForm.slug}`,
            },
          });
        }

        return res.status(405).json({ error: "Method not allowed" });
      }

      // شناسه فرم: segments[1]
      const formIdentifier = segments[1];

      // کمکی: پیدا کردن فرم بر اساس id، public_id یا slug
      async function findForm() {
        let q = clients.adminClient.from("forms").select("*").is("deleted_at", null);
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
          title: form.title,
          direct_url: directUrl,
          embed_url: embedUrl,
          iframe_code: `<iframe src="${embedUrl}" width="100%" height="650" frameborder="0" style="border:none; border-radius:16px; overflow:hidden;" allow="camera; microphone; autoplay; encrypted-media; fullscreen" loading="lazy"></iframe>`,
          sdk_code: `<div id="porskad-form" data-porskad-form="${form.slug}"></div>\n<script src="${origin}/embed-sdk.js" async></script>`,
          react_code: `import React from 'react';\n\nexport function PorskadSurvey() {\n  return (\n    <iframe\n      src="${embedUrl}"\n      className="w-full h-[650px] border-0 rounded-2xl"\n      allow="camera; microphone; autoplay; fullscreen"\n      loading="lazy"\n    />\n  );\n}`,
        });
      }

      // 3.3 سوالات فرم: /api/v1/forms/:id/questions
      if (segments.length >= 3 && segments[2] === "questions") {
        const form = await findForm();
        if (!form) return res.status(404).json({ error: "فرم یافت نشد." });

        // GET /api/v1/forms/:id/questions
        if (segments.length === 3 && req.method === "GET") {
          const { data: questions, error } = await clients.adminClient
            .from("questions")
            .select("*")
            .eq("form_id", form.id)
            .order("position", { ascending: true });
          if (error) return res.status(400).json({ error: error.message });
          return res.status(200).json({ count: (questions || []).length, questions: questions || [] });
        }

        // POST /api/v1/forms/:id/questions (افزودن سوال جدید)
        if (segments.length === 3 && req.method === "POST") {
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          if (form.manager_id !== user.id && form.created_by !== user.id) {
            return res.status(403).json({ error: "دسترسی غیرمجاز به ویرایش این فرم." });
          }

          const body = req.body || {};
          const {
            type,
            title = "سوال جدید",
            description = "",
            required = true,
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

          // محاسبه موقعیت پیش‌فرض
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
            title,
            description,
            required: Boolean(required),
            options: Array.isArray(options) ? options : [],
            position: targetPosition,
            display_mode,
            max_selections,
            points,
            correct_answer,
            conditions,
            jump_actions,
          };

          const { data: savedQ, error: qErr } = await clients.adminClient
            .from("questions")
            .insert(newQ)
            .select()
            .single();

          if (qErr) return res.status(400).json({ error: qErr.message });
          return res.status(201).json({ question: savedQ });
        }

        // PUT / DELETE یک سوال مشخص: /api/v1/forms/:id/questions/:questionId
        if (segments.length === 4) {
          const questionId = segments[3];
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          if (form.manager_id !== user.id && form.created_by !== user.id) {
            return res.status(403).json({ error: "دسترسی غیرمجاز به این فرم." });
          }

          if (req.method === "PUT") {
            const body = req.body || {};
            const patch = {};
            [
              "title", "type", "description", "required", "options", "position",
              "display_mode", "max_selections", "points", "correct_answer", "conditions", "jump_actions"
            ].forEach((key) => {
              if (body[key] !== undefined) patch[key] = body[key];
            });

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

      // 3.4 پاسخ‌های فرم: /api/v1/forms/:id/responses
      if (segments.length >= 3 && segments[2] === "responses") {
        const form = await findForm();
        if (!form) return res.status(404).json({ error: "فرم یافت نشد." });

        // ثبت پاسخ جدید (Submit): POST /api/v1/forms/:id/responses
        if (segments.length === 3 && req.method === "POST") {
          // بررسی فعال بودن فرم
          if (!form.published || form.archived) {
            return res.status(400).json({ error: "این فرم در دسترس نیست یا غیرفعال شده است." });
          }

          // بررسی سقف مجاز پاسخ‌های این فرم
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
          const { answers = [], duration_seconds = null, device = "api", browser = "http-client" } = body;

          if (!Array.isArray(answers)) {
            return res.status(400).json({ error: "آرایه answers الزامی است." });
          }

          // اعتبارسنجی سوالات: استخراج سوالات معتبر این فرم جهت جلوگیری از ارسال شناسه‌های نامعتبر
          const { data: formQuestions } = await clients.adminClient
            .from("questions")
            .select("id, title, required, type")
            .eq("form_id", form.id);
          
          const validQIds = new Set((formQuestions || []).map((q) => q.id));
          const answersToInsert = [];
          for (const a of answers) {
            if (!a.question_id || !validQIds.has(a.question_id)) {
              continue; // نادیده گرفتن سوالاتی که متعلق به این فرم نیستند
            }
            answersToInsert.push({
              question_id: a.question_id,
              value: a.value,
              time_spent_seconds: a.time_spent_seconds || null,
            });
          }

          // بررسی سهمیه ماهانه مالک فرم (monthly_responses_used vs max_responses_per_month)
          const formOwnerId = form.manager_id || form.created_by;
          if (formOwnerId) {
            const { data: ownerProf } = await clients.adminClient
              .from("profiles")
              .select("id, is_owner, plan, max_responses_per_month, monthly_responses_used")
              .eq("id", formOwnerId)
              .maybeSingle();

            const isOwnerUnlimited = Boolean(
              ownerProf?.is_owner ||
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

            // افزایش سهمیه ماهانه مصرف‌شده
            await clients.adminClient.rpc("increment_monthly_responses", { p_user_id: formOwnerId }).catch(async () => {
              if (ownerProf) {
                await clients.adminClient
                  .from("profiles")
                  .update({ monthly_responses_used: (Number(ownerProf.monthly_responses_used) || 0) + 1 })
                  .eq("id", formOwnerId);
              }
            });
          }

          // ایجاد رکورد پاسخ در responses
          const { data: respRow, error: respErr } = await clients.adminClient
            .from("responses")
            .insert({
              form_id: form.id,
              is_complete: true,
              started_at: new Date(Date.now() - (duration_seconds || 10) * 1000).toISOString(),
              submitted_at: new Date().toISOString(),
              duration_seconds,
              device,
              browser,
            })
            .select()
            .single();

          if (respErr) return res.status(400).json({ error: respErr.message });

          // درج جواب‌ها در answers
          if (answersToInsert.length > 0) {
            const formatted = answersToInsert.map((a) => ({
              ...a,
              response_id: respRow.id,
            }));
            await clients.adminClient.from("answers").insert(formatted);
          }

          // ارسال پیام تلگرام در پس‌زمینه (اگر ربات تلگرام فعال باشد)
          try {
            fetch(`${origin}/api/telegram-send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ form_id: form.id, response_id: respRow.id }),
            }).catch(() => {});
          } catch {}

          // دیسپچ وب‌هوک در صورت وجود
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
                  response_id: respRow.id,
                  submitted_at: respRow.submitted_at,
                  answers: answersToInsert,
                }),
              }).catch(() => {});
            } catch {}
          }

          return res.status(201).json({
            success: true,
            response_id: respRow.id,
            message: form.exit_message || "از اینکه پاسخ دادید ممنونیم.",
          });
        }

        // دریافت لیست پاسخ‌ها: GET /api/v1/forms/:id/responses
        if (segments.length === 3 && req.method === "GET") {
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          if (form.manager_id !== user.id && form.created_by !== user.id) {
            return res.status(403).json({ error: "شما اجازه دسترسی به پاسخ‌های این فرم را ندارید." });
          }

          const limit = Math.min(parseInt(req.query?.limit || "50", 10), 200);
          const offset = parseInt(req.query?.offset || "0", 10);

          const { data: responses, error: rErr } = await clients.adminClient
            .from("responses")
            .select(`
              id, is_complete, started_at, submitted_at, duration_seconds, device, browser,
              answers ( id, question_id, value, time_spent_seconds )
            `)
            .eq("form_id", form.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

          if (rErr) return res.status(400).json({ error: rErr.message });

          return res.status(200).json({
            form_id: form.id,
            total: (responses || []).length,
            responses: responses || [],
          });
        }

        // حذف یک پاسخ: DELETE /api/v1/forms/:id/responses/:responseId
        if (segments.length === 4 && req.method === "DELETE") {
          const responseId = segments[3];
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          if (form.manager_id !== user.id && form.created_by !== user.id) {
            return res.status(403).json({ error: "دسترسی غیرمجاز" });
          }

          const { error: delErr } = await clients.adminClient
            .from("responses")
            .delete()
            .eq("id", responseId)
            .eq("form_id", form.id);

          if (delErr) return res.status(400).json({ error: delErr.message });
          return res.status(200).json({ success: true, message: "پاسخ با موفقیت حذف شد." });
        }
      }

      // 3.5 دریافت، ویرایش یا حذف تکی فرم: /api/v1/forms/:id
      if (segments.length === 2) {
        const form = await findForm();
        if (!form) return res.status(404).json({ error: "فرم یافت نشد." });

        if (req.method === "GET") {
          const user = await getUserFromReq(req, clients);
          const isOwnerOrAdmin = user && (
            form.manager_id === user.id ||
            form.created_by === user.id
          );

          // اگر فرم در وضعیت پیش‌نویس (منتشرنشده) یا آرشیو باشد، فقط مالک به آن دسترسی دارد
          if (!form.published || form.archived) {
            if (!isOwnerOrAdmin) {
              return res.status(404).json({ error: "فرم یافت نشد یا هنوز منتشر نشده است." });
            }
          }

          // دریافت سوالات مرتبط
          const { data: questions } = await clients.adminClient
            .from("questions")
            .select("*")
            .eq("form_id", form.id)
            .order("position", { ascending: true });

          // پاکسازی فیلدهای داخلی برای درخواست‌های عمومی
          const safeForm = isOwnerOrAdmin
            ? form
            : {
                id: form.id,
                slug: form.slug,
                public_id: form.public_id || form.id,
                title: form.title,
                description: form.description,
                form_type: form.form_type,
                published: form.published,
                welcome_title: form.welcome_title,
                welcome_message: form.welcome_message,
                exit_title: form.exit_title,
                exit_message: form.exit_message,
                default_theme: form.default_theme,
                created_at: form.created_at,
                updated_at: form.updated_at,
              };

          return res.status(200).json({
            form: {
              ...safeForm,
              public_url: `${origin}/f/${form.slug}`,
              embed_url: `${origin}/embed/${form.slug}`,
            },
            questions: questions || [],
          });
        }

        if (req.method === "PUT") {
          const user = await getUserFromReq(req, clients);
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          if (form.manager_id !== user.id && form.created_by !== user.id) {
            return res.status(403).json({ error: "شما اجازه ویرایش این فرم را ندارید." });
          }

          const body = req.body || {};
          const patch = {};
          [
            "title", "description", "published", "welcome_title", "welcome_message",
            "exit_title", "exit_message", "default_theme", "form_type"
          ].forEach((k) => {
            if (body[k] !== undefined) patch[k] = body[k];
          });

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
          if (form.manager_id !== user.id && form.created_by !== user.id) {
            return res.status(403).json({ error: "شما اجازه حذف این فرم را ندارید." });
          }

          // حذف نرم (Soft Delete) جهت امکان بازیابی از سطل زباله و محافظت از تاریخچه پاسخ‌ها
          const nowIso = new Date().toISOString();
          const { error: delErr } = await clients.adminClient
            .from("forms")
            .update({ deleted_at: nowIso, published: false })
            .eq("id", form.id);

          if (delErr) return res.status(400).json({ error: delErr.message });
          return res.status(200).json({ success: true, message: "فرم به سطل زباله منتقل شد." });
        }

        return res.status(405).json({ error: "Method not allowed" });
      }
    }

    return res.status(404).json({ error: "اندپوینت درخواستی یافت نشد. لطفاً مستندات /docs را بررسی کنید." });
  } catch (err) {
    console.error("API v1 Error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
