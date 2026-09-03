import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

// ─── بررسی امضای وب‌هوک آموت ───
// آموت امضا را معمولاً در هدر `Signature` یا `X-Signature` یا در بدنه با کلید `Signature` می‌فرستد.
// الگوریتم: HMAC-SHA256 از روی JSON بدنه با کلید AMOOT_WEBHOOK_SECRET — base64 یا hex
function verifySignature(rawBody, provided) {
  if (!provided) return false;
  const secret = process.env.AMOOT_WEBHOOK_SECRET;
  if (!secret) return false; // سکرت تنظیم نشده → رد نکن، بگذار به‌صورت loose قبول شود

  const hmacB64 = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const hmacHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const candidate = String(provided).trim();
  return (
    candidate === hmacB64 ||
    candidate === hmacHex ||
    // بعضی اوقات آموت فقط خودِ secret را به‌عنوان امضا می‌فرستد
    candidate === secret
  );
}

export default async function handler(req, res) {
  // فقط POST
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    // ─── خواندن بدنه خام برای بررسی امضا ───
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    const body = typeof req.body === "object" && req.body !== null ? req.body : JSON.parse(rawBody || "{}");

    // ─── امضا از هدر یا بدنه ───
    // آموت طبق مستندات: هدر X-SMSCenter-Signature
    const headerSig =
      req.headers["x-smscenter-signature"] ||
      req.headers["signature"] ||
      req.headers["x-signature"] ||
      req.headers["x-amoot-signature"] ||
      req.headers["x-webhook-signature"] ||
      (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
      "";
    const bodySig = body.Signature || body.signature || body.Sign || "";
    const providedSig = headerSig || bodySig;

    const secretSet = Boolean(process.env.AMOOT_WEBHOOK_SECRET);
    const sigValid = providedSig ? verifySignature(rawBody, providedSig) : false;

    // اگر سکرت ست شده باشد، حتماً امضا باید درست باشد
    if (secretSet && providedSig && !sigValid) {
      console.warn("Amoot webhook: invalid signature rejected");
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }
    // اگر سکرت ست شده ولی امضا نیامده → بپذیر ولی هشدار بده (برخی تنظیمات آموت امضا نمی‌فرستند)
    if (secretSet && !providedSig) {
      console.warn("Amoot webhook: no signature provided (accepting, consider enabling in Amoot panel)");
    }

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
          amoot_message_id: msg.MessageID ? String(msg.MessageID) : null,
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
