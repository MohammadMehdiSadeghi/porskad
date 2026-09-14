import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // برای تایید و تست وب‌هوک توسط آموت یا مرورگر
    return res.status(200).json({
      status: "active",
      service: "Porskad Amoot SMS Webhook",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Server database configuration missing" });
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const payload = req.body || {};

    // استخراج فیلدها با پشتیبانی از فرمت‌های مختلف آموت
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

    const messageId =
      String(payload.MessageID || payload.messageId || payload.AmootMessageID || payload.ID || "");

    // اگر پیامک دریافتی معتبر باشد
    if (mobile || text) {
      await adminClient.from("sms_inbox").insert({
        amoot_message_id: messageId || null,
        mobile: String(mobile || "").trim(),
        line_number: String(lineNumber || "").trim(),
        text: String(text || "").trim(),
        raw_payload: payload,
      });

      return res.status(200).json({
        success: true,
        message: "Message received and logged to inbox",
      });
    }

    // اگر وب‌هوک وضعیت دلیوری (Delivery Report) باشد
    const deliveryStatus = payload.Status || payload.DeliveryStatus || payload.status;
    const deliveryMsgId = payload.MessageID || payload.CampaignID || payload.messageId;

    if (deliveryMsgId && deliveryStatus) {
      await adminClient.from("sms_delivery_reports").insert({
        message_id: String(deliveryMsgId),
        mobile: String(mobile || ""),
        status: String(deliveryStatus),
        delivered_at: new Date().toISOString(),
        raw_payload: payload,
      });

      // به‌روزرسانی وضعیت در جدول sms_outbox
      const isDelivered = String(deliveryStatus).toLowerCase().includes("deliver");
      await adminClient
        .from("sms_outbox")
        .update({
          status: isDelivered ? "delivered" : "sent",
        })
        .eq("message_id", String(deliveryMsgId));

      return res.status(200).json({
        success: true,
        message: "Delivery report processed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Webhook payload acknowledged",
    });
  } catch (err) {
    console.error("Amoot Webhook Error:", err);
    return res.status(500).json({
      error: "Webhook processing error",
      details: err.message,
    });
  }
}
