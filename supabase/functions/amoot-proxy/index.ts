import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AMOOT_BASE = "https://portal.amootsms.com/rest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    if (!authHeader) return jsonResp({ error: "Authorization header missing" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResp({ error: "Unauthorized" }, 401);

    // ─── 2. بررسی permission ───
    const { data: permData } = await supabase.rpc("has_permission", {
      p_user_id: user.id,
      p_permission_id: "manage_sms",
    });
    if (!permData) return jsonResp({ error: "Permission denied: manage_sms required" }, 403);

    // ─── 3. دریافت Token آموت از sms_settings ───
    const { data: smsSettings } = await supabase
      .rpc("get_active_sms_settings")
      .maybeSingle();

    if (!smsSettings) {
      return jsonResp({
        error: "SMS settings not configured",
        details: "لطفاً ابتدا تنظیمات آموت را ذخیره کنید.",
      }, 400);
    }

    const amootToken = smsSettings.amoot_token || smsSettings.api_token || "";
    if (!amootToken) {
      return jsonResp({
        error: "Amoot token not set",
        details: "توکن آموت در تنظیمات وارد نشده.",
      }, 400);
    }

    // ─── 4. دریافت body ───
    const { endpoint, params } = await req.json();
    if (!endpoint) return jsonResp({ error: "Missing 'endpoint'" }, 400);

    // ─── 5. endpointهای مجاز ───
    const allowed = ["AccountStatus", "SendSimple", "SendQuickOTP", "GetDelivery", "GetDeliveries", "GetDeliveriesByCampaignID"];
    if (!allowed.includes(endpoint)) return jsonResp({ error: "Endpoint not allowed" }, 403);

    // ─── 6. ساخت URL با Token ───
    const url = new URL(`${AMOOT_BASE}/${endpoint}`);
    url.searchParams.set("Token", amootToken);

    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== "") {
          url.searchParams.set(key, String(val));
        }
      }
    }

    // ─── 7. فراخوانی آموت ───
    const amootRes = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const responseText = await amootRes.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return jsonResp({ error: "Invalid response from Amoot", raw: responseText.slice(0, 500) }, 502);
    }

    if (!amootRes.ok) {
      console.error(`Amoot API error: HTTP ${amootRes.status}`, data);
      return jsonResp({ error: `Amoot HTTP ${amootRes.status}`, amoot_response: data }, 502);
    }

    return jsonResp(data);
  } catch (err) {
    console.error("amoot-proxy error:", err);
    return jsonResp({ error: err.message || "Internal error" }, 500);
  }
});
