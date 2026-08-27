import { createClient } from "@supabase/supabase-js";

const AMOOT_BASE = "https://portal.amootsms.com/rest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Supabase config missing" });
    }

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

    // دریافت body
    const { endpoint, params = {} } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: "Missing endpoint" });
    }

    // توکن آموت از Environment Variable (امنیت)
    const amootToken = process.env.AMOOT_TOKEN;
    if (!amootToken) {
      return res.status(500).json({ error: "AMOOT_TOKEN not configured" });
    }

    // توکن رو خودکار اضافه کن (کاربر نیازی به دانستن توکن نداره)
    params.Token = amootToken;

    // مجاز کردن فقط endpointهای مشخص
    const allowedEndpoints = [
      "AccountStatus",
      "SendSimple",
      "SendQuickOTP",
      "GetDelivery",
      "GetDeliveries",
      "GetDeliveriesByCampaignID",
    ];

    if (!allowedEndpoints.includes(endpoint)) {
      return res.status(403).json({ error: "Endpoint not allowed" });
    }

    // ساخت URL
    const url = new URL(`${AMOOT_BASE}/${endpoint}`);
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== "") {
          url.searchParams.set(key, String(val));
        }
      }
    }

    // فراخوانی API آموت
    // آموت توکن رو هم توی query و هم توی Authorization header می‌خواد
    const amootRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: amootToken,
      },
    });

    const responseText = await amootRes.text();

    // سعی کن JSON پارس کنی
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // اگه JSON نبود، متن خام رو برگردون
      data = { Status: amootRes.status, RawResponse: responseText };
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("amoot-proxy error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
