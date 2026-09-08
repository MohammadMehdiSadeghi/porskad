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
      .eq("active", true)
      .maybeSingle();

    const isSuperAdmin = prof?.is_owner || roleData?.role_id === "admin";
    if (!isSuperAdmin) {
      return res.status(403).json({ error: "فقط سوپرادمین مجاز به انجام این عملیات است" });
    }

    const PRIMARY_GOD_EMAILS = ["superadmin@gmailc.com", "superadmin@gmail.com"];
    const requesterEmail = user.email?.toLowerCase()?.trim();
    const isCallerPrimaryGod = Boolean(prof?.is_owner || isSuperAdmin || PRIMARY_GOD_EMAILS.includes(requesterEmail));

    const { action, target_user_id, new_password, new_email } = req.body || {};

    if (!action || !target_user_id) {
      return res.status(400).json({ error: "action و target_user_id الزامی هستند" });
    }

    // استتار و محافظت از اکانت اصلی در برابر سوپرادمین ثانویه
    const { data: targetProf } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("id", target_user_id)
      .maybeSingle();

    if (targetProf && PRIMARY_GOD_EMAILS.includes(targetProf.email?.toLowerCase()?.trim()) && !isCallerPrimaryGod) {
      return res.status(403).json({ error: "کاربر مورد نظر یافت نشد یا دسترسی به آن امکان‌پذیر نیست" });
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

    // ۶. ارتقا یا تنزل نقش کاربر (صاحب اصلی / سوپرادمین)
    if (action === "update_role") {
      if (!isCallerPrimaryGod && !prof?.is_owner) {
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

      // ۳. به‌روزرسانی سهمیه و پلن متناسب با نقش
      if (roleToSet === "admin") {
        await adminClient
          .from("profiles")
          .update({
            max_forms: 999999,
            max_responses_per_month: 999999,
            plan: "enterprise",
            can_use_telegram: true,
            can_export_excel: true,
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

    return res.status(400).json({ error: `عملیات ناشناخته: ${action}` });
  } catch (err) {
    console.error("Admin user management error:", err);
    return res.status(500).json({ error: err.message || "خطای سرور" });
  }
}
