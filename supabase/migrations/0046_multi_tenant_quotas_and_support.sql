-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۴۶: سهمیه‌های داینامیک و سیستم پشتیبانی چندکاربره (SaaS)
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

-- ۲. به‌روزرسانی تابع handle_new_user برای ثبت کاربر جدید با سهمیه پیش‌فرض
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
  RETURN new;
END;
$$;

-- ۳. ایجاد جدول تیکت‌ها و پیام‌های پشتیبانی (support_tickets)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- ۴. RLS برای support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- کاربر می‌تواند تیکت‌های خودش را ببیند
DROP POLICY IF EXISTS "support_tickets_user_select" ON public.support_tickets;
CREATE POLICY "support_tickets_user_select"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_owner() OR
    public.is_admin()
  );

-- کاربر می‌تواند تیکت ارسال کند
DROP POLICY IF EXISTS "support_tickets_user_insert" ON public.support_tickets;
CREATE POLICY "support_tickets_user_insert"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- فقط مالک و ادمین می‌توانند پاسخ ثبت کنند (Update)
DROP POLICY IF EXISTS "support_tickets_admin_update" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_update"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    public.is_owner() OR
    public.is_admin()
  );

-- ۵. تابع RPC برای تغییر سهمیه کاربر توسط مالک
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
