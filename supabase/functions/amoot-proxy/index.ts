import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AMOOT_BASE = "https://portal.amootsms.com/rest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonResp = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ─── 1. احراز هویت کاربر ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return jsonResp({ error: "Authorization header missing" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return jsonResp({ error: "Unauthorized" }, 401);

    // ─── 2. بررسی permission ───
    const { data: permData } = await supabase.rpc("has_permission", {
      p_user_id: user.id,
      p_permission_id: "manage_sms",
    });
    if (!permData)
      return jsonResp(
        { error: "Permission denied: manage_sms required" },
        403
      );

    // ─── 3. دریافت Token و LineNumber از sms_settings ───
    const { data: smsSettings } = await supabase
      .rpc("get_active_sms_settings")
      .maybeSingle();

    if (!smsSettings) {
      return jsonResp(
        {
          error: "SMS settings not configured",
          details: "لطفاً ابتدا تنظیمات آموت را ذخیره کنید.",
        },
        400
      );
    }

    const amootToken = smsSettings.amoot_token || smsSettings.api_token || "";
    const defaultLineNumber = smsSettings.line_number || "public";

    if (!amootToken) {
      return jsonResp(
        {
          error: "Amoot token not set",
          details: "توکن آموت در تنظیمات وارد نشده.",
        },
        400
      );
    }

    // ─── 4. دریافت body ───
    const { endpoint, params = {} } = await req.json();
    if (!endpoint)
      return jsonResp({ error: "Missing 'endpoint'" }, 400);

    // ─── 5. endpointهای مجاز ───
    const allowed = [
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
    ];
    if (!allowed.includes(endpoint))
      return jsonResp({ error: "Endpoint not allowed" }, 403);

    // ─── 6. توکن و خط پیش‌فرض رو اضافه کن ───
    params.Token = amootToken;

    // اگه LineNumber نداده شده، از تنظیمات پیش‌فرض استفاده کن
    if (!params.LineNumber || params.LineNumber === "public") {
      params.LineNumber = defaultLineNumber;
    }

    // ─── 7. ساخت body به فرمت x-www-form-urlencoded ───
    const formBody = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "") {
        formBody.set(key, String(val));
      }
    }

    console.log(
      `[amoot-proxy] ${endpoint} → ${AMOOT_BASE}/${endpoint} (POST)`
    );

    // ─── 8. فراخوانی آموت با POST + form-urlencoded ───
    const amootRes = await fetch(`${AMOOT_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    const responseText = await amootRes.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return jsonResp(
        {
          error: "Invalid response from Amoot",
          raw: responseText.slice(0, 500),
        },
        502
      );
    }

    // ─── لاگ خطاها ───
    if (data.Status && data.Status !== 0 && data.Status !== "0") {
      console.warn(
        `[amoot-proxy] ${endpoint} error:`,
        data.Status,
        data.explanation || ""
      );
    }

    return jsonResp(data);
  } catch (err) {
    console.error("amoot-proxy error:", err);
    return jsonResp({ error: err.message || "Internal error" }, 500);
  }
});
