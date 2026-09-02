import { createClient } from "@supabase/supabase-js";

const AMOOT_BASE = "https://portal.amootsms.com/rest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── گرفتن توکن آموت: اول از environment، بعد از جدول sms_settings ───
async function getAmootToken(supabaseAdmin) {
  const envToken = process.env.AMOOT_TOKEN;
  if (envToken) return envToken;

  // fallback به دیتابیس (UI تنظیمات)
  try {
    const { data } = await supabaseAdmin
      .from("sms_settings")
      .select("amoot_token")
      .eq("id", 1)
      .maybeSingle();
    if (data?.amoot_token) return data.amoot_token;
  } catch {
    // ignore
  }
  return null;
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).setHeader("Access-Control-Allow-Origin", "*").end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // احراز هویت کاربر
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Supabase config missing" });
    }

    // کلاینت با توکن کاربر (برای بررسی permission)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // بررسی permission
    const { data: permData } = await supabase.rpc("has_permission", {
      p_user_id: user.id,
      p_permission_id: "manage_sms",
    });

    if (!permData) {
      return res.status(403).json({ error: "Permission denied" });
    }

    // کلاینت سرویس رول (برای خوندن sms_settings)
    const supabaseAdmin = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    const { endpoint, params = {} } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "Missing endpoint" });
    }

    // گرفتن توکن آموت
    const amootToken = await getAmootToken(supabaseAdmin);
    if (!amootToken) {
      return res.status(500).json({ error: "AMOOT_TOKEN not configured — set in Vercel env or via SMS settings" });
    }

    // مجاز کردن فقط endpointهای مشخص
    const allowedEndpoints = [
      "AccountStatus",
      "SendSimple",
      "SendQuickOTP",
      "SendOTP",
      "SendWithPattern",
      "SendWithPatternOWN",
      "SendWithBackupLine",
      "GetDelivery",
      "GetDeliveries",
      "GetDeliveriesByCampaignID",
      "GetMessage",
      "GetMessages",
      "Statistics",
      "CalculateMessagePrice",
      "CalculatePatternMessagePrice",
    ];

    if (!allowedEndpoints.includes(endpoint)) {
      return res.status(403).json({ error: "Endpoint not allowed" });
    }

    // توکن رو خودکار اضافه کن (کاربر نیازی به دانستن توکن نداره)
    params.Token = amootToken;

    // ساخت body به فرمت x-www-form-urlencoded
    const formBody = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        formBody.set(key, String(val));
      }
    }

    // فراخوانی API آموت با POST + form-urlencoded
    const amootRes = await fetch(`${AMOOT_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    const responseText = await amootRes.text();

    // سعی کن JSON پارس کنی
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { Status: amootRes.status, RawResponse: responseText };
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("amoot-proxy error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}