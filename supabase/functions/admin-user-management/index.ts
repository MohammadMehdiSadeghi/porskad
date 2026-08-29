import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create admin client with service_role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the caller is authenticated and is the owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
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
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is owner
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_owner")
      .eq("id", user.id)
      .single();

    if (!profile?.is_owner) {
      return new Response(
        JSON.stringify({ error: "Only site owner can perform this action" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, target_user_id, new_password, new_email } = await req.json();

    if (action === "reset_password") {
      if (!new_password || new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        target_user_id,
        { password: new_password }
      );

      if (error) throw error;

      // Log the activity
      await supabase.from("activity_log").insert({
        user_id: user.id,
        action: "reset_password",
        target_type: "user",
        target_id: target_user_id,
        details: { reset_by: user.id },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_email") {
      if (!new_email || !new_email.includes("@")) {
        return new Response(
          JSON.stringify({ error: "Invalid email address" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        target_user_id,
        { email: new_email }
      );

      if (error) throw error;

      // Update profiles table too
      await supabase
        .from("profiles")
        .update({ email: new_email })
        .eq("id", target_user_id);

      // Log the activity
      await supabase.from("activity_log").insert({
        user_id: user.id,
        action: "update_email",
        target_type: "user",
        target_id: target_user_id,
        details: { new_email, updated_by: user.id },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Email updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action: " + action }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
