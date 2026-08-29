import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).setHeader("Access-Control-Allow-Origin", "*").end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { form_id, response_id } = req.body;
    if (!form_id || !response_id) {
      return res.status(400).json({ error: "Missing form_id or response_id" });
    }

    // ─── اتصال به Supabase ───
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Supabase config missing" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── بررسی وجود لینک تلگرام برای این فرم ───
    const { data: links, error: linkError } = await supabase
      .from("telegram_form_links")
      .select("id, config_id, is_active")
      .eq("form_id", form_id)
      .eq("is_active", true);

    if (linkError || !links || links.length === 0) {
      return res.status(200).json({ ok: true, skipped: true, reason: "no_telegram_link" });
    }

    // ─── دریافت تنظیمات تلگرام ───
    const configIds = [...new Set(links.map((l) => l.config_id))];
    const { data: configs, error: configError } = await supabase
      .from("telegram_config")
      .select("id, bot_token, chat_id, is_active")
      .in("id", configIds)
      .eq("is_active", true);

    if (configError || !configs || configs.length === 0) {
      return res.status(200).json({ ok: true, skipped: true, reason: "no_active_config" });
    }

    // ─── دریافت اطلاعات فرم ───
    const { data: form } = await supabase
      .from("forms")
      .select("id, title")
      .eq("id", form_id)
      .single();

    // ─── دریافت سوالات ───
    const { data: questions } = await supabase
      .from("questions")
      .select("id, title, position")
      .eq("form_id", form_id)
      .order("position", { ascending: true });

    // ─── دریافت جواب‌ها ───
    const { data: answers } = await supabase
      .from("answers")
      .select("question_id, value")
      .eq("response_id", response_id);

    // ─── شماره ورودی (تعداد responses قبلی + 1) ───
    const { count: entryNumber } = await supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("form_id", form_id);

    // ─── ساخت متن پیام ───
    const answerMap = {};
    (answers || []).forEach((a) => {
      answerMap[a.question_id] = a.value;
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    const dateStr = now.toLocaleDateString("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" });

    const lines = [];
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("🔴 پرس‌کاد");
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("");
    lines.push(`📋 فرم: ${form?.title || "—"}`);
    lines.push("");

    (questions || []).forEach((q, i) => {
      const faNum = (n) => n.toLocaleString("fa-IR");
      const val = answerMap[q.id];
      let displayVal = "—";
      if (val !== null && val !== undefined) {
        if (Array.isArray(val)) {
          displayVal = val.join(", ");
        } else {
          displayVal = String(val);
        }
      }
      lines.push(`${faNum(i + 1)}. ${q.title}: ${displayVal}`);
    });

    lines.push("");
    lines.push(`⏰ ساعت ثبت: ${timeStr} — ${dateStr}`);
    lines.push(`🔢 ورودی شماره ${((entryNumber || 0) + 1).toLocaleString("fa-IR")}`);
    lines.push("━━━━━━━━━━━━━━━━━━");

    const messageText = lines.join("\n");

    // ─── ارسال به هر config فعال ───
    const results = [];
    for (const config of configs) {
      try {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${config.bot_token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: config.chat_id,
              text: messageText,
            }),
          }
        );

        const tgData = await tgRes.json();

        // لاگ ارسال
        await supabase.from("telegram_send_log").insert({
          form_id,
          response_id,
          config_id: config.id,
          chat_id: config.chat_id,
          status: tgData.ok ? "sent" : "failed",
          error_message: tgData.ok ? null : tgData.description || "Unknown error",
          message_text: messageText,
        });

        results.push({ config_id: config.id, ok: tgData.ok, error: tgData.description });
      } catch (err) {
        await supabase.from("telegram_send_log").insert({
          form_id,
          response_id,
          config_id: config.id,
          chat_id: config.chat_id,
          status: "error",
          error_message: err.message,
          message_text: messageText,
        });
        results.push({ config_id: config.id, ok: false, error: err.message });
      }
    }

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error("telegram-send error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
