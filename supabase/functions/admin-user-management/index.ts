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
    // service_role client — bypasses RLS for all writes
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the caller is authenticated
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

    // Check if caller is admin OR owner
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_owner")
      .eq("id", user.id)
      .single();

    const isOwner = profile?.is_owner === true;

    // Check admin role via user_roles
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    const isAdmin = isOwner || roleData?.role_id === "admin";

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "فقط مدیران ارشد می‌توانند این عملیات را انجام دهند" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, target_user_id, new_password, new_email, email, password, full_name } = await req.json();

    // ─── create_user: ایجاد مدیر جدید ───
    if (action === "create_user") {
      if (!email || !email.includes("@")) {
        return new Response(
          JSON.stringify({ error: "ایمیل نامعتبر است" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!password || password.length < 6) {
        return new Response(
          JSON.stringify({ error: "رمز عبور باید حداقل ۶ کاراکتر باشد" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ایجاد کاربر از طریق Supabase Admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split("@")[0] },
      });

      if (createError) throw createError;

      const userId = newUser.user.id;

      // به‌روزرسانی پروفایل (با service_role تا RLS مشکلی ایجاد نکنه)
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: email.trim(),
          full_name: full_name || email.split("@")[0],
          is_active: true,
          created_by: user.id,
        }, { onConflict: "id" });

      // اختصاص نقش admin (با service_role)
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role_id: "admin", active: true }, { onConflict: "user_id" });

      // لاگ فعالیت (فقط اینجا — Managers.jsx لاگ نمیزنه)
      await supabaseAdmin.from("activity_log").insert({
        user_id: user.id,
        action: "create_manager",
        target_type: "user",
        target_id: userId,
        details: { email: email.trim(), name: full_name, created_by: user.id },
      });

      return new Response(
        JSON.stringify({ success: true, user_id: userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset_password") {
      if (!new_password || new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        target_user_id,
        { password: new_password }
      );

      if (error) throw error;

      await supabaseAdmin.from("activity_log").insert({
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

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        target_user_id,
        { email: new_email }
      );

      if (error) throw error;

      // Update profiles table too
      await supabaseAdmin
        .from("profiles")
        .update({ email: new_email })
        .eq("id", target_user_id);

      await supabaseAdmin.from("activity_log").insert({
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
