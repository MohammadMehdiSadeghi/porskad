import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

export default async function handler(req, res) {
  // فقط POST
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    const body = req.body;

    // لاگ در محیط توسعه
    if (process.env.NODE_ENV !== "production") {
      console.log("Amoot webhook received:", JSON.stringify(body, null, 2));
    }

    // بررسی اینکه آیا گزارش تحویل هست یا پیامک دریافتی
    // فرمت آموت: معمولاً آرایه‌ای از آبجکت‌ها
    const messages = Array.isArray(body) ? body : [body];

    for (const msg of messages) {
      // اگر MessageID داشته باشه → گزارش تحویل یا پیامک ارسالی
      // اگر SMSMessageText داشته باشه → پیامک دریافتی
      if (msg.SMSMessageText || msg.MessageText) {
        // پیامک دریافتی
        await supabase.from("sms_inbox").insert({
          amoot_message_id: msg.MessageID || null,
          mobile: msg.Mobile || msg.SenderNumber || "",
          line_number: msg.LineNumber || "",
          text: msg.SMSMessageText || msg.MessageText || "",
          raw_payload: msg,
        });
      } else if (msg.MessageID || msg.Status) {
        // گزارش تحویل
        await supabase.from("sms_delivery_reports").insert({
          message_id: String(msg.MessageID || ""),
          mobile: msg.Mobile || "",
          status: msg.Status || "",
          delivered_at: msg.DeliveryDateTime || new Date().toISOString(),
          raw_payload: msg,
        });

        // به‌روزرسانی وضعیت در outbox
        if (msg.MessageID && msg.Status) {
          await supabase
            .from("sms_outbox")
            .update({ status: String(msg.Status) })
            .eq("message_id", String(msg.MessageID));
        }
      }
    }

    // همیشه 200 برگردان (آموت Timeout نخوره)
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    // بازم 200 برگردان تا آموت دوباره ارسال نکنه
    return res.status(200).json({ ok: true });
  }
}
