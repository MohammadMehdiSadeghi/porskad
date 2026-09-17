import handler from "./v1/[...route].js";

/**
 * اندپوینت مستقیم ارسال اعلان به بات تلگرام
 * سازگار کامل با Vercel Serverless Functions و فراخوانی‌های کلاینت
 */
export default async function telegramSendHandler(req, res) {
  if (!req.query) req.query = {};
  req.query.route = ["telegram-send"];
  return handler(req, res);
}
