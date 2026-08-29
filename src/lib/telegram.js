/**
 * ارسال ورودی فرم به تلگرام
 * این تابع بعد از ثبت موفق پاسخ فراخوانی می‌شود.
 */
export async function sendToTelegram(formId, responseId) {
  try {
    const res = await fetch("/api/telegram-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form_id: formId, response_id: responseId }),
    });
    const data = await res.json();
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
