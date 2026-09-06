-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۴۸: افزودن ستون شماره موبایل به جدول profiles
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- به‌روزرسانی تابع handle_new_user برای استخراج خودکار شماره موبایل
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
    phone,
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
    COALESCE(new.raw_user_meta_data->>'phone', new.phone, null),
    5,
    100,
    'free',
    true,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  -- اختصاص خودکار نقش manager برای کاربران ثبت‌نامی جدید
  INSERT INTO public.user_roles (user_id, role_id, active)
  VALUES (new.id, 'manager', true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;
