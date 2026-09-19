-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۴۶: سهمیه‌های داینامیک، سیستم پشتیبانی و انزوای چندکاربره (SaaS)
-- ══════════════════════════════════════════════════════════════

-- ۱. افزودن ستون‌های سهمیه و پلن به جدول profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS max_forms integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_responses_per_month integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS can_use_telegram boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_export_excel boolean DEFAULT true;

-- مقداردهی به رکوردهای موجود اگر null باشند
UPDATE public.profiles
SET max_forms = COALESCE(max_forms, 5),
    max_responses_per_month = COALESCE(max_responses_per_month, 100),
    plan = COALESCE(plan, 'free'),
    can_use_telegram = COALESCE(can_use_telegram, true),
    can_export_excel = COALESCE(can_export_excel, true);

-- مالک اصلی سهمیه نامحدود دارد
UPDATE public.profiles
SET max_forms = 999999,
    max_responses_per_month = 999999,
    plan = 'enterprise'
WHERE is_owner = true;

-- ۲. به‌روزرسانی مجوزهای پیش‌فرض نقش manager
INSERT INTO public.role_permissions (role_id, permission_id)
VALUES
  ('manager', 'create_form'),
  ('manager', 'edit_form'),
  ('manager', 'delete_form'),
  ('manager', 'publish_form'),
  ('manager', 'view_responses'),
  ('manager', 'view_analytics'),
  ('manager', 'export_excel'),
  ('manager', 'manage_telegram')
ON CONFLICT DO NOTHING;

-- ۳. به‌روزرسانی تابع handle_new_user برای ثبت کاربر جدید با سهمیه و نقش پیش‌فرض
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    is_active,
    is_owner,
    max_forms,
    max_responses_per_month,
    plan,
    can_use_telegram,
    can_export_excel
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    true,
    false,
    5,
    100,
    'free',
    true,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- انتصاب خودکار نقش manager جهت دسترسی به ابزارهای کاربری
  INSERT INTO public.user_roles (user_id, role_id, active)
  VALUES (new.id, 'manager', true)
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

-- ۴. ایجاد جدول تیکت‌ها و پیام‌های پشتیبانی (support_tickets)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  admin_reply text DEFAULT NULL,
  replied_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);

-- ۵. RLS برای support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_user_select" ON public.support_tickets;
CREATE POLICY "support_tickets_user_select"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_owner() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "support_tickets_user_insert" ON public.support_tickets;
CREATE POLICY "support_tickets_user_insert"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "support_tickets_admin_update" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_update"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    public.is_owner() OR
    public.is_admin()
  );

-- ۶. ستون user_id و پالیسی‌های انزوای تلگرام
ALTER TABLE public.telegram_config
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- انتساب رکوردهای قبلی به صاحب سیستم
UPDATE public.telegram_config
SET user_id = (SELECT id FROM public.profiles WHERE is_owner = true LIMIT 1)
WHERE user_id IS NULL;

-- پالیسی‌های telegram_config
DROP POLICY IF EXISTS "telegram_config_user_select" ON public.telegram_config;
CREATE POLICY "telegram_config_user_select" ON public.telegram_config
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR public.is_owner() OR public.is_admin()
  );

DROP POLICY IF EXISTS "telegram_config_user_insert" ON public.telegram_config;
CREATE POLICY "telegram_config_user_insert" ON public.telegram_config
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR public.is_owner() OR public.is_admin()
  );

DROP POLICY IF EXISTS "telegram_config_user_update" ON public.telegram_config;
CREATE POLICY "telegram_config_user_update" ON public.telegram_config
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR public.is_owner() OR public.is_admin()
  );

DROP POLICY IF EXISTS "telegram_config_user_delete" ON public.telegram_config;
CREATE POLICY "telegram_config_user_delete" ON public.telegram_config
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR public.is_owner() OR public.is_admin()
  );

-- پالیسی‌های telegram_form_links
DROP POLICY IF EXISTS "telegram_form_links_user_select" ON public.telegram_form_links;
CREATE POLICY "telegram_form_links_user_select" ON public.telegram_form_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND (f.manager_id = auth.uid() OR f.created_by = auth.uid()))
    OR public.is_owner() OR public.is_admin()
  );

DROP POLICY IF EXISTS "telegram_form_links_user_insert" ON public.telegram_form_links;
CREATE POLICY "telegram_form_links_user_insert" ON public.telegram_form_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND (f.manager_id = auth.uid() OR f.created_by = auth.uid()))
    OR public.is_owner() OR public.is_admin()
  );

DROP POLICY IF EXISTS "telegram_form_links_user_update" ON public.telegram_form_links;
CREATE POLICY "telegram_form_links_user_update" ON public.telegram_form_links
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND (f.manager_id = auth.uid() OR f.created_by = auth.uid()))
    OR public.is_owner() OR public.is_admin()
  );

DROP POLICY IF EXISTS "telegram_form_links_user_delete" ON public.telegram_form_links;
CREATE POLICY "telegram_form_links_user_delete" ON public.telegram_form_links
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND (f.manager_id = auth.uid() OR f.created_by = auth.uid()))
    OR public.is_owner() OR public.is_admin()
  );

-- پالیسی telegram_send_log
DROP POLICY IF EXISTS "telegram_send_log_user_select" ON public.telegram_send_log;
CREATE POLICY "telegram_send_log_user_select" ON public.telegram_send_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND (f.manager_id = auth.uid() OR f.created_by = auth.uid()))
    OR public.is_owner() OR public.is_admin()
  );

-- ۷. پالیسی‌های حذف پاسخ توسط سازنده فرم
DROP POLICY IF EXISTS "allow_delete_responses_owner" ON public.responses;
CREATE POLICY "allow_delete_responses_owner"
  ON public.responses FOR DELETE
  TO authenticated
  USING (
    public.is_owner()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND (f.manager_id = auth.uid() OR f.created_by = auth.uid())
    )
  );

-- ۸. تابع RPC برای تغییر سهمیه کاربر توسط مالک
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
  -- بررسی دسترسی: فقط ادمین یا صاحب سایت
  IF NOT (public.is_owner() OR public.is_admin()) THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز است';
  END IF;

  UPDATE public.profiles
  SET max_forms = p_max_forms,
      max_responses_per_month = p_max_responses,
      plan = p_plan
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_quotas(uuid, integer, integer, text) TO authenticated;
