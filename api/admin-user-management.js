import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(501).json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" });
  }

  try {
    // ۱. اعتبارسنجی توکن کاربر درخواست‌دهنده
    const token = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // ۲. بررسی دسترسی سوپرادمین (Owner یا Admin)
    const { data: prof } = await adminClient
      .from("profiles")
      .select("id, email, is_owner")
      .eq("id", user.id)
      .maybeSingle();

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role_id, active")
      .eq("user_id", user.id)
      .eq("active", true);

    const isSuperAdmin = Boolean(
      prof?.is_owner ||
      (Array.isArray(roleData) && roleData.some((r) => r.role_id === "admin"))
    );
    if (!isSuperAdmin) {
      return res.status(403).json({ error: "فقط سوپرادمین مجاز به انجام این عملیات است" });
    }

    const PRIMARY_GOD_EMAILS = [
      "superadmin@gmailc.com",
      "superadmin@gmail.com",
      "mohammad12345sadeghi@gmail.com",
      "artinerfan1388@gmail.com",
    ];
    const requesterEmail = user.email?.toLowerCase()?.trim();
    // نکته: «گاد اصلی» فقط مالک دیتابیس یا ایمیل‌های ثابت است — نه هر سوپرادمین
    const isCallerPrimaryGod = Boolean(prof?.is_owner || PRIMARY_GOD_EMAILS.includes(requesterEmail));

    const { action, target_user_id, new_password, new_email } = req.body || {};

    if (!action || !target_user_id) {
      return res.status(400).json({ error: "action و target_user_id الزامی هستند" });
    }

    // استتار و محافظت از اکانت اصلی در برابر سوپرادمین ثانویه (به جز عملیات لاگین نظارتی سوپرادمین)
    const { data: targetProf } = await adminClient
      .from("profiles")
      .select("id, email, is_owner")
      .eq("id", target_user_id)
      .maybeSingle();

    if (action !== "impersonate" && targetProf && PRIMARY_GOD_EMAILS.includes(targetProf.email?.toLowerCase()?.trim()) && !isCallerPrimaryGod) {
      return res.status(403).json({ error: "کاربر مورد نظر یافت نشد یا دسترسی به آن امکان‌پذیر نیست" });
    }

    // تشخیص سوپرادمین بودنِ هدف (برای محافظت فقط-گاد)
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("role_id, active")
      .eq("user_id", target_user_id)
      .eq("active", true);

    const targetIsSuperAdmin = Boolean(
      targetProf?.is_owner ||
      (Array.isArray(targetRoles) && targetRoles.some((r) => r.role_id === "admin")) ||
      (targetProf && PRIMARY_GOD_EMAILS.includes(targetProf.email?.toLowerCase()?.trim()))
    );

    // تغییر نقش و رمز سوپرادمین‌ها فقط از سوی گاد اصلی قابل انجام است (ورود نظارتی مجاز است)
    const godOnlyActions = ["update_role", "reset_password", "update_email"];
    if (targetIsSuperAdmin && !isCallerPrimaryGod && godOnlyActions.includes(action)) {
      return res.status(403).json({
        error: "مدیریت سوپرادمین‌ها (حذف، تنزل، تغییر نقش و رمز) فقط توسط صاحب اصلی سیستم امکان‌پذیر است",
      });
    }

    // ۳. تغییر رمز عبور کاربر
    if (action === "reset_password") {
      if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد" });
      }

      const { data: updatedUser, error: updateErr } = await adminClient.auth.admin.updateUserById(
        target_user_id,
        { password: new_password }
      );

      if (updateErr) {
        return res.status(400).json({ error: updateErr.message });
      }

      return res.status(200).json({ success: true, user: updatedUser.user });
    }

    // ۴. تغییر ایمیل کاربر
    if (action === "update_email") {
      if (!new_email || !new_email.includes("@")) {
        return res.status(400).json({ error: "ایمیل نامعتبر است" });
      }

      const { data: updatedUser, error: updateErr } = await adminClient.auth.admin.updateUserById(
        target_user_id,
        { email: new_email.trim(), email_confirm: true }
      );

      if (updateErr) {
        return res.status(400).json({ error: updateErr.message });
      }

      // به‌روزرسانی جدول profiles
      await adminClient
        .from("profiles")
        .update({ email: new_email.trim() })
        .eq("id", target_user_id);

      return res.status(200).json({ success: true, user: updatedUser.user });
    }

    // ۵. دریافت اطلاعات احراز هویت کاربر
    if (action === "get_auth_info") {
      const { data: authUser, error: getErr } = await adminClient.auth.admin.getUserById(target_user_id);
      if (getErr) {
        return res.status(400).json({ error: getErr.message });
      }

      return res.status(200).json({
        success: true,
        auth_info: {
          id: authUser.user.id,
          email: authUser.user.email,
          phone: authUser.user.phone,
          created_at: authUser.user.created_at,
          last_sign_in_at: authUser.user.last_sign_in_at,
          confirmed_at: authUser.user.email_confirmed_at,
          user_metadata: authUser.user.user_metadata,
          app_metadata: authUser.user.app_metadata,
        },
      });
    }

    // ۶. ارتقا یا تنزل نقش کاربر (صاحب اصلی / سوپرادمین) — فقط گاد اصلی
    if (action === "update_role") {
      if (!isCallerPrimaryGod) {
        return res.status(403).json({ error: "فقط صاحب اصلی سیستم مجاز به تغییر نقش کاربران است" });
      }
      const { new_role } = req.body || {};
      if (!["manager", "admin", "superadmin"].includes(new_role)) {
        return res.status(400).json({ error: "نقش ارسالی نامعتبر است" });
      }

      const roleToSet = new_role === "superadmin" ? "admin" : new_role;

      // ۱. حذف رکوردهای قبلی نقش برای کاربر
      await adminClient.from("user_roles").delete().eq("user_id", target_user_id);

      // ۲. درج رکورد نقش جدید
      const { error: roleErr } = await adminClient
        .from("user_roles")
        .insert({ user_id: target_user_id, role_id: roleToSet, active: true });

      if (roleErr) {
        return res.status(400).json({ error: roleErr.message });
      }

      // ۳. به‌روزرسانی سهمیه، پلن و تمام امکانات متناسب با نقش
      if (roleToSet === "admin") {
        await adminClient
          .from("profiles")
          .update({
            max_forms: 999999,
            max_responses_per_month: 999999,
            plan: "enterprise",
            can_use_telegram: true,
            can_export_excel: true,
            can_use_logic: true,
            can_upload_files: true,
            can_use_sms: true,
            can_use_webhooks: true,
            can_remove_branding: true,
          })
          .eq("id", target_user_id);

        // حذف محدودیت‌های پیشین جهت اعمال کامل کلیه مجوزهای نقشی سوپرادمین
        await adminClient
          .from("user_permissions")
          .delete()
          .eq("user_id", target_user_id);
      } else {
        await adminClient
          .from("profiles")
          .update({
            max_forms: 5,
            max_responses_per_month: 100,
            plan: "free",
          })
          .eq("id", target_user_id);
      }

      return res.status(200).json({ success: true, role: roleToSet });
    }

    // ۷. ورود به عنوان کاربر دیگر (Impersonate)
    if (action === "impersonate") {
      let { data: targetAuthUser, error: targetAuthErr } = await adminClient.auth.admin.getUserById(target_user_id);
      let userEmail = targetAuthUser?.user?.email || targetProf?.email;

      // در صورتی که کاربر ایمیل نداشت اما شماره موبایل داشت، یک شناسه ایمیل برای احراز تولید می‌کنیم
      if (!userEmail && (targetAuthUser?.user?.phone || targetProf?.phone)) {
        const rawPhone = (targetAuthUser?.user?.phone || targetProf?.phone).replace(/\D/g, "");
        const genEmail = `user_${rawPhone || target_user_id.slice(0, 8)}@porskad.ir`;
        try {
          const { data: updatedAuth } = await adminClient.auth.admin.updateUserById(target_user_id, {
            email: genEmail,
            email_confirm: true,
          });
          if (updatedAuth?.user?.email) {
            userEmail = updatedAuth.user.email;
          }
        } catch (phoneErr) {
          console.warn("Failed to attach email for phone-only user:", phoneErr);
        }
      }

      if (!userEmail) {
        return res.status(404).json({ error: "کاربر یا ایمیل مربوطه یافت نشد" });
      }

      const requestOrigin = req.body?.origin || req.headers.origin;
      let origin = requestOrigin;
      if (!origin && req.headers.host) {
        const proto = req.headers["x-forwarded-proto"] || (req.headers.host.includes("localhost") || req.headers.host.includes("127.0.0.1") ? "http" : "https");
        origin = `${proto}://${req.headers.host}`;
      }
      if (!origin) origin = "https://porskad.ir";

      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
        options: {
          redirectTo: `${origin}/admin`,
        },
      });

      if (linkErr) {
        return res.status(400).json({ error: linkErr.message });
      }

      const actionLink = linkData?.properties?.action_link;
      const hashedToken = linkData?.properties?.hashed_token;

      let directLoginUrl = actionLink;

      // تایید مستقیم توکن در سرور جهت دریافت access_token و refresh_token
      // با این کار مشکل خطای PKCE و ریدایرکت‌های واسط مرورگر کاملاً رفع می‌شود!
      if (hashedToken) {
        try {
          const verifyClient = createClient(supabaseUrl, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: verifiedSession, error: verifyErr } = await verifyClient.auth.verifyOtp({
            token_hash: hashedToken,
            type: "magiclink",
          });

          if (!verifyErr && verifiedSession?.session) {
            const at = verifiedSession.session.access_token;
            const rt = verifiedSession.session.refresh_token;
            directLoginUrl = `${origin}/admin#access_token=${encodeURIComponent(at)}&refresh_token=${encodeURIComponent(rt)}&token_type=bearer&type=recovery`;
          } else {
            directLoginUrl = `${origin}/admin?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`;
          }
        } catch (vErr) {
          console.warn("Server verifyOtp fallback error:", vErr);
          directLoginUrl = `${origin}/admin?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`;
        }
      }

      // ثبت در گزارش فعالیت
      try {
        await adminClient.from("activity_log").insert({
          user_id: user.id,
          action: "impersonate_user",
          target_type: "user",
          target_id: target_user_id,
          details: { target_email: userEmail, impersonated_by: requesterEmail },
        });
      } catch (logErr) {
        console.warn("Failed to log impersonate activity:", logErr);
      }

      return res.status(200).json({
        success: true,
        redirect_url: directLoginUrl,
        magic_link: actionLink,
        token_hash: hashedToken,
        email: userEmail,
      });
    }

    // ۸. انتقال مالکیت کامل فرم به یک حساب کاربری دیگر
    if (action === "transfer_form") {
      const { form_id, target_user_id, from_user_id } = req.body || {};
      if (!form_id || !target_user_id) {
        return res.status(400).json({ error: "شناسه فرم و حساب کاربری مقصد الزامی است" });
      }

      if (from_user_id && from_user_id === target_user_id) {
        return res.status(400).json({ error: "حساب کاربری مبدأ و مقصد نمی‌توانند یکسان باشند" });
      }

      // دریافت اطلاعات فرم
      const { data: formRecord, error: formErr } = await adminClient
        .from("forms")
        .select("id, title, slug, created_by, manager_id, published, archived, deleted_at")
        .eq("id", form_id)
        .single();

      if (formErr || !formRecord) {
        return res.status(404).json({ error: "فرم مورد نظر یافت نشد" });
      }

      const currentOwnerId = formRecord.manager_id || formRecord.created_by;
      if (currentOwnerId === target_user_id) {
        return res.status(400).json({ error: "این فرم در حال حاضر متعلق به همین کاربر است" });
      }

      // دریافت اطلاعات کاربر مقصد
      const { data: targetProfile, error: targetErr } = await adminClient
        .from("profiles")
        .select("id, email, full_name, is_owner, plan, max_forms")
        .eq("id", target_user_id)
        .single();

      if (targetErr || !targetProfile) {
        return res.status(404).json({ error: "کاربر مقصد در سیستم یافت نشد" });
      }

      // دریافت اطلاعات کاربر مبدأ جهت ثبت در لاگ سیستم
      const { data: prevProfile } = await adminClient
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", currentOwnerId)
        .maybeSingle();

      // بررسی سقف فرم‌های فعال کاربر مقصد برای جلوگیری از خطای تریگر پایگاه داده
      if (formRecord.published && !formRecord.archived && !formRecord.deleted_at && !targetProfile.is_owner) {
        const { count: activeCount } = await adminClient
          .from("forms")
          .select("id", { count: "exact", head: true })
          .or(`created_by.eq.${target_user_id},manager_id.eq.${target_user_id}`)
          .eq("published", true)
          .is("deleted_at", null)
          .neq("archived", true);

        const curMax = targetProfile.max_forms ?? 5;
        if (curMax < 999999 && (activeCount ?? 0) >= curMax) {
          // ارتقای سهمیه کاربر مقصد تا سقف تریگر دیتابیس مانع انتقال نشود
          await adminClient
            .from("profiles")
            .update({ max_forms: (activeCount ?? 0) + 2 })
            .eq("id", target_user_id);
        }
      }

      // اعمال انتقال فرم با به روزرسانی همزمان manager_id و created_by
      const { data: updatedForm, error: updateErr } = await adminClient
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
        return res.status(400).json({ error: "خطا در انتقال فرم: " + updateErr.message });
      }

      // حذف لینک‌های تلگرام قبلی متصل به این فرم جهت حفظ حریم خصوصی پاسخ‌های کاربر جدید
      try {
        await adminClient.from("telegram_form_links").delete().eq("form_id", form_id);
      } catch (tgErr) {
        console.warn("Failed to delete old telegram_form_links:", tgErr);
      }

      // ثبت در activity_log
      try {
        await adminClient.from("activity_log").insert({
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
            transferred_by: requesterEmail,
          },
        });
      } catch (logErr) {
        console.warn("Failed to log transfer_form activity:", logErr);
      }

      return res.status(200).json({
        success: true,
        form: updatedForm,
        previous_user: prevProfile,
        target_user: targetProfile,
      });
    }

    return res.status(400).json({ error: `عملیات ناشناخته: ${action}` });
  } catch (err) {
    console.error("Admin user management error:", err);
    return res.status(500).json({ error: err.message || "خطای سرور" });
  }
}
