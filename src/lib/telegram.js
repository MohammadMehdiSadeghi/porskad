/**
 * ارسال ورودی فرم به تلگرام
 * این تابع بعد از ثبت موفق پاسخ فراخوانی می‌شود.
 */
export async function sendToTelegram(formId, responseId) {
  if (!formId || !responseId) {
    return { ok: false, error: "Missing formId or responseId" };
  }

  const payload = JSON.stringify({ form_id: formId, response_id: responseId });
  const headers = { "Content-Type": "application/json" };

  try {
    let res = await fetch("/api/telegram-send", {
      method: "POST",
      headers,
      body: payload,
    });

    // در صورت بروز خطای مسیر (۴۰۴ یا ۵۰۲)، مسیر متناوب /api/v1/telegram/send را بیازما
    if (!res.ok && (res.status === 404 || res.status === 502)) {
      try {
        const fallbackRes = await fetch("/api/v1/telegram/send", {
          method: "POST",
          headers,
          body: payload,
        });
        if (fallbackRes.ok) {
          res = fallbackRes;
        }
      } catch {}
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = { ok: res.ok, status: res.status };
    }

    if (!data.ok && !data.skipped) {
      console.warn("Telegram send failed:", data);
    }
    return data;
  } catch (err) {
    // بی‌صدا خطا رو لاگ کن — نباید تجربه کاربر رو خراب کنه
    console.warn("Telegram send error:", err);
    return { ok: false, error: err.message };
  }
}

