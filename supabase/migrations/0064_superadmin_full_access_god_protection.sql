-- ==============================================================================
-- 0064: مدل دسترسی نهایی سوپرادمین‌ها + حفاظت مطلق از حساب گاد اصلی
-- ==============================================================================
-- قواعد:
--   ۱) سوپرادمین (is_owner=true یا نقش admin در user_roles) = دسترسی کامل به
--      تمام بخش‌ها (تنظیمات سامانه، ساخت کاربر، سهمیه‌ها، تلگرام، پیامک و...)
--   ۲) حساب گاد اصلی (ایمیل‌های PRIMARY_GOD_EMAILS یا is_owner=true):
--        - برای سایر سوپرادمین‌ها «نامرئی» است (RLS روی profiles / tickets / logs)
--        - قابل حذف، غیرفعال‌سازی یا تغییر نیست
--   ۳) حذف / تنزل / ویرایش مجوز سایر سوپرادمین‌ها فقط توسط گاد اصلی ممکن است.
-- ==============================================================================

BEGIN;

-- ─── ۱. توابع کمکی مرکزی ───

-- گاد اصلی: صاحب دیتابیس یا ایمیل‌های ثابت
CREATE OR REPLACE FUNCTION public.is_primary_god(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND (
        p.is_owner = true
        OR lower(p.email) IN ('superadmin@gmailc.com', 'superadmin@gmail.com')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_primary_god(uuid) TO authenticated, anon;

-- سوپرادمین: گاد اصلی یا دارنده نقش admin
CREATE OR REPLACE FUNCTION public.is_superadmin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_primary_god(p_user_id) OR public.is_admin(p_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated, anon;

-- ─── ۲. تکمیل دسترسی‌ها و امکانات سوپرادمین‌های فعلی ───
-- رفع کامل «یک سری دسترسی‌ها رو نداره»: تلگرام، اکسل، منطق، فایل، پیامک، وب‌هوک، برندینگ
UPDATE public.profiles p
SET can_use_telegram      = true,
    can_export_excel      = true,
    can_use_logic         = true,
    can_upload_files      = true,
    can_use_sms           = true,
    can_use_webhooks      = true,
    can_remove_branding   = true,
    max_forms             = 999999,
    max_responses_per_month = 999999,
    plan                  = 'enterprise'
WHERE public.is_superadmin(p.id);

-- اطمینان از وجود نقش admin برای گاد اصلی (تا پالیسی‌های is_admin برای او هم برقرار باشند)
INSERT INTO public.user_roles (user_id, role_id, active)
SELECT p.id, 'admin', true
FROM public.profiles p
WHERE p.is_owner = true
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role_id = 'admin'
  );

-- رفع تداخل نقش‌ها: کاربری که admin فعال است نباید نقش manager فعال هم داشته باشد
UPDATE public.user_roles ur
SET active = false
WHERE ur.role_id = 'manager'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ua
    WHERE ua.user_id = ur.user_id AND ua.role_id = 'admin' AND ua.active = true
  );

-- ─── ۳. تنظیمات سامانه: سوپرادمین‌ها هم می‌توانند ویرایش کنند ───
DROP POLICY IF EXISTS "allow owner update system_settings" ON public.system_settings;
CREATE POLICY "allow superadmin update system_settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE OR REPLACE FUNCTION public.update_system_settings(p_settings jsonb)
RETURNS jsonb AS $$
DECLARE
  v_key text;
  v_val jsonb;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'فقط سوپرادمین مجاز به تغییر تنظیمات است.';
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_settings)
  LOOP
    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES (v_key, v_val, now())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now();
  END LOOP;

  RETURN public.get_system_settings();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── ۴. حذف کاربر: سوپرادمین‌ها فقط کاربر عادی؛ سوپرادمین‌ها فقط توسط گاد ───
CREATE OR REPLACE FUNCTION public.delete_manager(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'شما دسترسی حذف کاربران را ندارید.';
  END IF;

  IF public.is_primary_god(p_user_id) THEN
    RAISE EXCEPTION 'امکان حذف صاحب اصلی سایت وجود ندارد.';
  END IF;

  IF public.is_admin(p_user_id) AND NOT public.is_primary_god() THEN
    RAISE EXCEPTION 'حذف سوپرادمین‌ها فقط توسط صاحب اصلی سیستم امکان‌پذیر است.';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- ─── ۵. فعال/غیرفعال‌سازی: همان قواعد حذف ───
CREATE OR REPLACE FUNCTION public.set_manager_active(p_user_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'شما دسترسی مدیریت کاربران را ندارید.';
  END IF;

  IF public.is_primary_god(p_user_id) THEN
    RAISE EXCEPTION 'امکان تغییر وضعیت صاحب اصلی سایت وجود ندارد.';
  END IF;

  IF public.is_admin(p_user_id) AND NOT public.is_primary_god() THEN
    RAISE EXCEPTION 'تغییر وضعیت سوپرادمین‌ها فقط توسط صاحب اصلی سیستم امکان‌پذیر است.';
  END IF;

  UPDATE public.user_roles SET active = p_active WHERE user_id = p_user_id;
  UPDATE public.profiles SET is_active = p_active WHERE id = p_user_id;
END;
$$;

-- ─── ۶. مجوزهای اختصاصی: تغییر مجوز سوپرادمین‌ها فقط توسط گاد ───
CREATE OR REPLACE FUNCTION public.set_user_permissions(
  p_user_id   uuid,
  p_permission_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'شما دسترسی تغییر مجوزها را ندارید.';
  END IF;

  IF public.is_primary_god(p_user_id) THEN
    RAISE EXCEPTION 'امکان تغییر مجوزهای صاحب اصلی سایت وجود ندارد.';
  END IF;

  IF public.is_admin(p_user_id) AND NOT public.is_primary_god() THEN
    RAISE EXCEPTION 'تغییر مجوزهای سوپرادمین‌ها فقط توسط صاحب اصلی سیستم امکان‌پذیر است.';
  END IF;

  DELETE FROM public.user_permissions WHERE user_id = p_user_id;

  INSERT INTO public.user_permissions (user_id, permission_id)
  SELECT p_user_id, unnest(p_permission_ids);
END;
$$;

-- ─── ۷. سهمیه‌ها: هدفِ سوپرادمین/گاد فقط توسط گاد قابل تغییر است ───
CREATE OR REPLACE FUNCTION public.set_user_quotas(
  p_user_id uuid,
  p_max_forms integer,
  p_max_responses integer,
  p_plan text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز است';
  END IF;

  IF public.is_primary_god(p_user_id) THEN
    RAISE EXCEPTION 'امکان تغییر سهمیه صاحب اصلی سایت وجود ندارد.';
  END IF;

  IF public.is_admin(p_user_id) AND NOT public.is_primary_god() THEN
    RAISE EXCEPTION 'تغییر سهمیه سوپرادمین‌ها فقط توسط صاحب اصلی سیستم امکان‌پذیر است.';
  END IF;

  UPDATE public.profiles
  SET max_forms = p_max_forms,
      max_responses_per_month = p_max_responses,
      plan = p_plan
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_unlimited_quota(p_user_id uuid, p_unlimited boolean)
RETURNS jsonb AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'شما دسترسی لازم برای تغییر سهمیه کاربران را ندارید.';
  END IF;

  IF public.is_primary_god(p_user_id) THEN
    RAISE EXCEPTION 'امکان تغییر سهمیه صاحب اصلی سایت وجود ندارد.';
  END IF;

  IF public.is_admin(p_user_id) AND NOT public.is_primary_god() THEN
    RAISE EXCEPTION 'تغییر سهمیه سوپرادمین‌ها فقط توسط صاحب اصلی سیستم امکان‌پذیر است.';
  END IF;

  IF p_unlimited THEN
    UPDATE public.profiles
    SET max_forms = 999999,
        max_responses_per_month = 999999,
        plan = 'unlimited'
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET max_forms = 5,
        max_responses_per_month = 100,
        plan = 'free'
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'unlimited', p_unlimited,
    'max_forms', CASE WHEN p_unlimited THEN 999999 ELSE 5 END,
    'max_responses', CASE WHEN p_unlimited THEN 999999 ELSE 100 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── ۸. RLS پروفایل‌ها: سوپرادمین‌ها پروفایل گاد را نمی‌بینند و آن را تغییر نمی‌دهند ───

-- خواندن: گاد همه را می‌بیند؛ سوپرادمین‌ها همه به‌جز گاد؛ کاربر عادی فقط خودش
DROP POLICY IF EXISTS "admin read profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin read all profiles" ON public.profiles;
CREATE POLICY "profiles read policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.is_superadmin()
      AND NOT (public.is_primary_god(id) AND NOT public.is_primary_god())
    )
  );

-- تغییر: گاد کامل؛ سوپرادمین‌ها فقط پروفایل کاربران عادی؛ هر کاربر پروفایل خودش (با تریگر محافظت)
DROP POLICY IF EXISTS "admin manage profiles" ON public.profiles;
CREATE POLICY "profiles update policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.is_primary_god()
    OR id = auth.uid()
    OR (
      public.is_superadmin()
      AND NOT public.is_primary_god(id)
      AND NOT public.is_admin(id)
    )
  )
  WITH CHECK (
    public.is_primary_god()
    OR id = auth.uid()
    OR (
      public.is_superadmin()
      AND NOT public.is_primary_god(id)
      AND NOT public.is_admin(id)
    )
  );

-- تریگر ضد ارتقا: هیچ‌کس جز گاد نمی‌تواند is_owner را تغییر دهد و
-- کاربر عادی نمی‌تواند سهمیه/پلن/امکانات خودش را از طریق آپدیت مستقیم بالا ببرد
CREATE OR REPLACE FUNCTION public.tr_protect_profiles_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_primary_god() THEN
    -- پرچم مالکیت هرگز توسط غیر گاد قابل تغییر نیست
    NEW.is_owner := OLD.is_owner;

    -- تغییرات خودِ کاربر فقط روی اطلاعات هویتی؛ نه سهمیه، پلن و امکانات
    IF NEW.id = auth.uid() THEN
      NEW.max_forms                := OLD.max_forms;
      NEW.max_responses_per_month  := OLD.max_responses_per_month;
      NEW.monthly_responses_used   := OLD.monthly_responses_used;
      NEW.plan                     := OLD.plan;
      NEW.quota_reset_at           := OLD.quota_reset_at;
      NEW.can_use_telegram         := OLD.can_use_telegram;
      NEW.can_export_excel         := OLD.can_export_excel;
      NEW.can_use_logic            := OLD.can_use_logic;
      NEW.can_upload_files         := OLD.can_upload_files;
      NEW.can_use_sms              := OLD.can_use_sms;
      NEW.can_use_webhooks         := OLD.can_use_webhooks;
      NEW.can_remove_branding      := OLD.can_remove_branding;
      NEW.is_active                := OLD.is_active;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_owner_flag ON public.profiles;
DROP TRIGGER IF EXISTS tr_protect_profiles_escalation ON public.profiles;
CREATE TRIGGER tr_protect_profiles_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_protect_profiles_escalation();

-- ─── ۹. RLS نقش‌ها: سوپرادمین‌ها نقش هم را تغییر نمی‌دهند ───
-- گاد: کنترل کامل | سوپرادمین: فقط نقش‌های عادیِ کاربران عادی
DROP POLICY IF EXISTS "admin read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin manage user_roles" ON public.user_roles;
CREATE POLICY "user_roles read policy"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_superadmin());

CREATE POLICY "user_roles write policy"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    public.is_primary_god()
    OR (
      public.is_admin()
      AND role_id <> 'admin'
      AND NOT public.is_primary_god(user_id)
      AND NOT public.is_admin(user_id)
    )
  )
  WITH CHECK (
    public.is_primary_god()
    OR (
      public.is_admin()
      AND role_id <> 'admin'
      AND NOT public.is_primary_god(user_id)
      AND NOT public.is_admin(user_id)
    )
  );

-- ─── ۱۰. تیکت‌ها و لاگ‌ها: ردیف‌های گاد برای سایر سوپرادمین‌ها نامرئی ───
DROP POLICY IF EXISTS "support_tickets_user_select" ON public.support_tickets;
CREATE POLICY "support_tickets_user_select"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.is_superadmin()
      AND NOT (public.is_primary_god(user_id) AND NOT public.is_primary_god())
    )
  );

DROP POLICY IF EXISTS "support_tickets_admin_update" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_user_update" ON public.support_tickets;
CREATE POLICY "support_tickets_update"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.is_superadmin()
      AND NOT (public.is_primary_god(user_id) AND NOT public.is_primary_god())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      public.is_superadmin()
      AND NOT (public.is_primary_god(user_id) AND NOT public.is_primary_god())
    )
  );

DROP POLICY IF EXISTS "support_tickets_delete" ON public.support_tickets;
CREATE POLICY "support_tickets_delete"
  ON public.support_tickets FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.is_superadmin()
      AND NOT (public.is_primary_god(user_id) AND NOT public.is_primary_god())
    )
  );

-- لاگ‌های احراز هویت: ردیف‌های گاد پنهان برای غیر گاد
DROP POLICY IF EXISTS "superadmin read auth_logs" ON public.auth_logs;
CREATE POLICY "superadmin read auth_logs"
  ON public.auth_logs FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    AND NOT (
      EXISTS (
        SELECT 1 FROM public.profiles gp
        WHERE public.is_primary_god(gp.id)
          AND (gp.id = auth_logs.user_id OR lower(gp.email) = lower(auth_logs.email))
      )
      AND NOT public.is_primary_god()
    )
  );

-- لاگ فعالیت‌ها: ردیف‌های گاد پنهان برای غیر گاد؛ درج لاگ خودی برای همه مجاز
DROP POLICY IF EXISTS "admin manage activity_log" ON public.activity_log;
CREATE POLICY "activity_log policy"
  ON public.activity_log FOR ALL
  TO authenticated
  USING (
    public.is_superadmin()
    AND NOT (
      EXISTS (
        SELECT 1 FROM public.profiles gp
        WHERE gp.id = activity_log.user_id
          AND public.is_primary_god(gp.id)
      )
      AND NOT public.is_primary_god()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_superadmin()
  );

COMMIT;
