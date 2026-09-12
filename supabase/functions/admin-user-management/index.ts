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
      .select("role_id, active")
      .eq("user_id", user.id)
      .eq("active", true);

    const isAdmin =
      isOwner ||
      (Array.isArray(roleData) && roleData.some((r) => r.role_id === "admin"));

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "فقط مدیران ارشد می‌توانند این عملیات را انجام دهند" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // گاد اصلی = مالک دیتابیس یا ایمیل‌های ثابت (نه هر سوپرادمین)
    const PRIMARY_GOD_EMAILS = [
      "superadmin@gmailc.com",
      "superadmin@gmail.com",
      "mohammad12345sadeghi@gmail.com",
      "artinerfan1388@gmail.com",
    ];
    const callerEmail = user.email?.toLowerCase()?.trim();
    const isCallerPrimaryGod = Boolean(isOwner || PRIMARY_GOD_EMAILS.includes(callerEmail));

    const { action, target_user_id, new_password, new_email, email, password, full_name, origin } = await req.json();

    // محافظت از سوپرادمین‌ها: تغییر نقش و رمز فقط توسط گاد اصلی مجاز است (ورود نظارتی مجاز است)
    if (target_user_id && action !== "impersonate") {
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, email, is_owner")
        .eq("id", target_user_id)
        .maybeSingle();

      if (targetProfile) {
        const targetEmail = targetProfile.email?.toLowerCase()?.trim();
        const { data: targetRoles } = await supabaseAdmin
          .from("user_roles")
          .select("role_id, active")
          .eq("user_id", target_user_id)
          .eq("active", true);
        const targetIsSuperAdmin = Boolean(
          targetProfile.is_owner ||
          (Array.isArray(targetRoles) && targetRoles.some((r) => r.role_id === "admin")) ||
          PRIMARY_GOD_EMAILS.includes(targetEmail)
        );

        if (targetIsSuperAdmin && !isCallerPrimaryGod) {
          return new Response(
            JSON.stringify({ error: "مدیریت سوپرادمین‌ها فقط توسط صاحب اصلی سیستم امکان‌پذیر است" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

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

      // کاربران ایجادشده از این مسیر، کاربر عادی هستند (نه سوپرادمین)
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role_id: "manager", active: true }, { onConflict: "user_id,role_id" });

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

    if (action === "impersonate") {
      let { data: targetAuthUser } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
      let userEmail = targetAuthUser?.user?.email;

      if (!userEmail && targetAuthUser?.user?.phone) {
        const rawPhone = targetAuthUser.user.phone.replace(/\D/g, "");
        const genEmail = `user_${rawPhone || target_user_id.slice(0, 8)}@porskad.ir`;
        try {
          const { data: updatedAuth } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
            email: genEmail,
            email_confirm: true,
          });
          if (updatedAuth?.user?.email) {
            userEmail = updatedAuth.user.email;
          }
        } catch (_) {}
      }

      if (!userEmail) {
        return new Response(
          JSON.stringify({ error: "کاربر یا ایمیل مربوطه یافت نشد" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const redirectOrigin = origin || "https://porskad.ir";
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
        options: {
          redirectTo: `${redirectOrigin}/admin`,
        },
      });

      if (linkErr) {
        return new Response(
          JSON.stringify({ error: linkErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.from("activity_log").insert({
        user_id: user.id,
        action: "impersonate_user",
        target_type: "user",
        target_id: target_user_id,
        details: { target_email: userEmail, impersonated_by: callerEmail },
      });

      const actionLink = linkData?.properties?.action_link;
      const hashedToken = linkData?.properties?.hashed_token;

      let directLoginUrl = actionLink;
      if (hashedToken) {
        directLoginUrl = `${redirectOrigin}/admin?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`;
      }

      return new Response(
        JSON.stringify({
          success: true,
          redirect_url: directLoginUrl,
          magic_link: actionLink,
          token_hash: hashedToken,
          email: userEmail,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "transfer_form") {
      const { form_id, target_user_id, from_user_id } = reqBody || {};
      if (!form_id || !target_user_id) {
        return new Response(
          JSON.stringify({ error: "شناسه فرم و حساب کاربری مقصد الزامی است" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (from_user_id && from_user_id === target_user_id) {
        return new Response(
          JSON.stringify({ error: "حساب کاربری مبدأ و مقصد نمی‌توانند یکسان باشند" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: formRecord, error: formErr } = await supabaseAdmin
        .from("forms")
        .select("id, title, slug, created_by, manager_id, published, archived, deleted_at")
        .eq("id", form_id)
        .single();

      if (formErr || !formRecord) {
        return new Response(
          JSON.stringify({ error: "فرم مورد نظر یافت نشد" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const currentOwnerId = formRecord.manager_id || formRecord.created_by;
      if (currentOwnerId === target_user_id) {
        return new Response(
          JSON.stringify({ error: "این فرم در حال حاضر متعلق به همین کاربر است" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: targetProfile, error: targetErr } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, is_owner, plan, max_forms")
        .eq("id", target_user_id)
        .single();

      if (targetErr || !targetProfile) {
        return new Response(
          JSON.stringify({ error: "کاربر مقصد در سیستم یافت نشد" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: prevProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", currentOwnerId)
        .maybeSingle();

      if (formRecord.published && !formRecord.archived && !formRecord.deleted_at && !targetProfile.is_owner) {
        const { count: activeCount } = await supabaseAdmin
          .from("forms")
          .select("id", { count: "exact", head: true })
          .or(`created_by.eq.${target_user_id},manager_id.eq.${target_user_id}`)
          .eq("published", true)
          .is("deleted_at", null)
          .neq("archived", true);

        const curMax = targetProfile.max_forms ?? 5;
        if (curMax < 999999 && (activeCount ?? 0) >= curMax) {
          await supabaseAdmin
            .from("profiles")
            .update({ max_forms: (activeCount ?? 0) + 2 })
            .eq("id", target_user_id);
        }
      }

      const { data: updatedForm, error: updateErr } = await supabaseAdmin
        .from("forms")
        .update({
          manager_id: target_user_id,
          created_by: target_user_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", form_id)
        .select("id, title, slug, manager_id, created_by, updated_at")
        .single();

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "خطا در انتقال فرم: " + updateErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        await supabaseAdmin.from("activity_log").insert({
          user_id: user.id,
          action: "transfer_form_ownership",
          target_type: "form",
          target_id: form_id,
          details: {
            form_id,
            form_title: formRecord.title,
            form_slug: formRecord.slug,
            previous_owner_id: currentOwnerId,
            previous_owner_email: prevProfile?.email,
            previous_owner_name: prevProfile?.full_name,
            target_user_id,
            target_user_email: targetProfile.email,
            target_user_name: targetProfile.full_name,
            transferred_by: callerEmail,
          },
        });
      } catch (logErr) {
        console.warn("Failed to log transfer_form activity:", logErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          form: updatedForm,
          previous_user: prevProfile,
          target_user: targetProfile,
        }),
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
