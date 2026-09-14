import { createClient } from "@supabase/supabase-js";

function cleanVal(v) {
  if (v === null || v === undefined) return "";
  let s = String(v).trim();
  // حذف کوتیشن‌های احتمالی در ابتدا و انتهای پارامترها (مثل %22MSG-TEST-900001%22)
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export default async function handler(req, res) {
  // پشتیبانی کامل از Preflight CORS و هدرهای اختصاصی آموت
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-SMSCenter-Signature, x-smscenter-signature, *"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ادغام پارامترهای GET (Query String) و POST (Body)
  let queryParams = {};
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      queryParams[k] = cleanVal(v);
    }
  }

  let bodyParams = {};
  if (req.body) {
    let raw = req.body;
    if (typeof raw === "string" && raw.trim()) {
      try {
        raw = JSON.parse(raw);
      } catch {
        try {
          raw = Object.fromEntries(new URLSearchParams(raw));
        } catch {
          raw = {};
        }
      }
    }
    if (typeof raw === "object" && raw !== null) {
      for (const [k, v] of Object.entries(raw)) {
        bodyParams[k] = cleanVal(v);
      }
    }
  }

  const payload = { ...queryParams, ...bodyParams };

  // اتصال به پایگاه داده Supabase در صورت نیاز به ذخیره‌سازی
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceKey);

      // ۱. بررسی گزارش وضعیت تحویل پیامک (Delivery Report)
      const deliveryStatus =
        payload.DeliveryType ||
        payload.DeliveryStatus ||
        payload.Status ||
        payload.status ||
        "";

      const deliveryMsgId =
        payload.MessageID ||
        payload.CampaignID ||
        payload.messageId ||
        payload.ID ||
        "";

      const mobile =
        payload.Mobile ||
        payload.mobile ||
        payload.From ||
        payload.Sender ||
        payload.senderNumber ||
        "";

      const text =
        payload.SMSMessageText ||
        payload.MessageText ||
        payload.messageText ||
        payload.Text ||
        payload.text ||
        "";

      const lineNumber =
        payload.LineNumber ||
        payload.lineNumber ||
        payload.To ||
        payload.receiverNumber ||
        "";

      if (deliveryMsgId && deliveryStatus) {
        // ذخیره لاگ دلیوری
        try {
          await adminClient.from("sms_delivery_reports").insert({
            message_id: deliveryMsgId,
            mobile: mobile || null,
            status: deliveryStatus,
            delivered_at: new Date().toISOString(),
            raw_payload: payload,
          });
        } catch {
          // ignore if table doesn't exist
        }

        // به‌روزرسانی جدول سوابق ارسال پیامک
        const isDelivered = deliveryStatus.toLowerCase().includes("deliver");
        const isFailed = deliveryStatus.toLowerCase().includes("fail") || deliveryStatus.toLowerCase().includes("reject");
        
        await adminClient
          .from("sms_outbox")
          .update({
            status: isDelivered ? "delivered" : isFailed ? "failed" : "sent",
          })
          .eq("message_id", deliveryMsgId);
      }

      // ۲. بررسی پیامک دریافتی از مخاطب (Incoming SMS)
      if (mobile || text) {
        await adminClient.from("sms_inbox").insert({
          amoot_message_id: payload.MessageID || null,
          mobile: mobile,
          line_number: lineNumber,
          text: text,
          raw_payload: payload,
        });
      }
    } catch (err) {
      console.error("Amoot Webhook processing error:", err);
      // ادامه می‌دهیم تا حتما پاسخ OK به آموت داده شود
    }
  }

  // ⚠️ مهم: پرتال آموت و تسترهای وب‌هوک پیامک، خروجی متنی دقیق «OK» را به عنوان نشانه موفقیت بررسی می‌کنند
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.status(200).send("OK");
}
