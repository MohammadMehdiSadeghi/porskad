import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AMOOT_BASE = "https://portal.amootsms.com/rest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ─── 1. احراز هویت کاربر ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 2. بررسی permission manage_sms ───
    const { data: permData } = await supabase.rpc("has_permission", {
      p_user_id: user.id,
      p_permission_id: "manage_sms",
    });

    if (!permData) {
      return new Response(
        JSON.stringify({ error: "Permission denied: manage_sms required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 3. دریافت credentials آموت از sms_settings ───
    const { data: smsSettings, error: settingsError } = await supabase
      .rpc("get_active_sms_settings")
      .maybeSingle();

    if (settingsError) {
      console.error("SMS settings error:", settingsError);
      return new Response(
        JSON.stringify({
          error: "Could not load SMS settings",
          details: settingsError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!smsSettings) {
      return new Response(
        JSON.stringify({
          error: "SMS settings not configured",
          details: "No active SMS settings found. Please configure SMS settings first.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amootUserId = smsSettings.amoot_user_id || "";
    const amootPassword = smsSettings.amoot_password || "";
    const amootApikey = smsSettings.api_token || "";

    if (!amootUserId || !amootPassword) {
      return new Response(
        JSON.stringify({
          error: "SMS credentials incomplete",
          details: "amoot_user_id and amoot_password must be set in SMS settings.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 4. دریافت body درخواست ───
    const { endpoint, params } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing 'endpoint' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 5. لیست endpointهای مجاز ───
    const allowedEndpoints = [
      "AccountStatus",
      "SendSimple",
      "SendQuickOTP",
      "GetDelivery",
      "GetDeliveries",
      "GetDeliveriesByCampaignID",
    ];

    if (!allowedEndpoints.includes(endpoint)) {
      return new Response(
        JSON.stringify({
          error: "Endpoint not allowed",
          details: `Allowed: ${allowedEndpoints.join(", ")}`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 6. ساخت URL با Authentication ───
    const url = new URL(`${AMOOT_BASE}/${endpoint}`);

    // احراز هویت آموت (query parameters)
    url.searchParams.set("user_id", amootUserId);
    url.searchParams.set("password", amootPassword);
    if (amootApikey) {
      url.searchParams.set("apikey", amootApikey);
    }

    // پارامترهای درخواست کاربر
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== "") {
          url.searchParams.set(key, String(val));
        }
      }
    }

    console.log(`Amoot API request: ${endpoint} (user_id: ${amootUserId})`);

    // ─── 7. فراخوانی API آموت ───
    const amootRes = await fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    const responseText = await amootRes.text();

    // سعی کن JSON parse کنی
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // اگه JSON نبود، متن خام رو برگردون
      return new Response(
        JSON.stringify({
          error: "Invalid response from Amoot API",
          raw_response: responseText.slice(0, 500),
          http_status: amootRes.status,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 8. لاگ خطاها ───
    if (!amootRes.ok) {
      console.error(`Amoot API error: HTTP ${amootRes.status}`, data);
      return new Response(
        JSON.stringify({
          error: `Amoot API returned HTTP ${amootRes.status}`,
          amoot_response: data,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── 9. برگرداندن پاسخ ───
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("amoot-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
