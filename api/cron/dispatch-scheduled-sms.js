import handler from "../amoot-proxy.js";

/**
 * اندپوینت اختصاصی Vercel Cron Job برای اجرای دقیقه‌ای دیسپچر پیامک‌های زماندار
 * مسیر: /api/cron/dispatch-scheduled-sms
 */
export default async function cronDispatcherHandler(req, res) {
  // اعتبارسنجی امنیتی در صورت تنظیم CRON_SECRET در محیط سرور
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // اگر در خواست محلی است یا توسط سرور اجرا شده، مجاز است
    const isLocal = req.headers.host?.includes("localhost") || req.headers.host?.includes("127.0.0.1");
    if (!isLocal && !req.headers["x-vercel-cron"]) {
      return res.status(401).json({ error: "Unauthorized Cron Execution" });
    }
  }

  req.method = "POST";
  if (!req.body) req.body = {};
  req.body.action = "dispatch_scheduled_sms";

  return handler(req, res);
}
