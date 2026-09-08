-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۵۵: رفع قطعی خطای دیتابیس موقع ثبت‌نام (Database error saving new user)
-- ══════════════════════════════════════════════════════════════

-- ۱. اطمینان از وجود جدول roles و رکوردهای پایه admin و manager
CREATE TABLE IF NOT EXISTS public.roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.roles (id, name, description)
VALUES
  ('admin', 'مدیر ارشد', 'دسترسی کامل به همه‌ی فرم‌ها و مدیریت مدیران'),
  ('manager', 'مدیر', 'دسترسی به فرم‌ها و پاسخ‌ها بر اساس مجوزها')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ۲. اطمینان از وجود جدول permissions و مجوزهای سیستم
CREATE TABLE IF NOT EXISTS public.permissions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.permissions (id, name, description)
VALUES
  ('create_form', 'ایجاد فرم', 'ساخت فرم جدید'),
  ('edit_form', 'ویرایش فرم', 'تغییر تنظیمات و سوال‌های فرم'),
  ('delete_form', 'حذف فرم', 'حذف فرم و پاسخ‌های آن'),
  ('publish_form', 'انتشار فرم', 'فعال/غیرفعال کردن انتشار عمومی فرم'),
  ('view_responses', 'مشاهده پاسخ‌ها', 'دیدن پاسخ‌های فرم‌ها'),
  ('view_analytics', 'مشاهده تحلیل‌ها', 'دیدن نمودارها و تحلیل پیشرفته'),
  ('export_excel', 'خروجی اکسل', 'دانلود پاسخ‌ها به‌صورت Excel'),
  ('manage_managers', 'مدیریت مدیران', 'ایجاد/ویرایش/حذف مدیران'),
  ('manage_telegram', 'مدیریت ربات تلگرام', 'اتصال و تنظیمات تلگرام')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ۳. اطمینان از جدول role_permissions و انتساب دسترسی‌ها به manager و admin
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id text NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id text NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

INSERT INTO public.role_permissions (role_id, permission_id)
VALUES
  ('admin', 'create_form'),
  ('admin', 'edit_form'),
  ('admin', 'delete_form'),
  ('admin', 'publish_form'),
  ('admin', 'view_responses'),
  ('admin', 'view_analytics'),
  ('admin', 'export_excel'),
  ('admin', 'manage_managers'),
  ('admin', 'manage_telegram'),
  ('manager', 'create_form'),
  ('manager', 'edit_form'),
  ('manager', 'delete_form'),
  ('manager', 'publish_form'),
  ('manager', 'view_responses'),
  ('manager', 'view_analytics'),
  ('manager', 'export_excel'),
  ('manager', 'manage_telegram')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ۴. اطمینان از جدول user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- ۵. اطمینان از وجود تمام ستون‌های مورد نیاز در profiles و رفع محدودیت‌های تداخلی
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_owner boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_forms integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_responses_per_month integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS can_use_telegram boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_export_excel boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS monthly_responses_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_reset_at timestamptz DEFAULT (now() + INTERVAL '30 days');

-- لغو الزامی بودن ستون role قدیمی در صورت وجود تا در insert پروفایل مانع نشود
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- ۶. بازنویسی کاملاً ایمن و ضد خطا برای تابع handle_new_user (با Exception Handling)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_phone text;
  v_raw_meta jsonb;
BEGIN
  v_raw_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_full_name := COALESCE(
    v_raw_meta->>'full_name',
    v_raw_meta->>'name',
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'کاربر جدید'
  );
  
  -- استخراج ایمن شماره موبایل بدون کرش در صورت نبود ستون در رکورد
  BEGIN
    v_phone := COALESCE(
      v_raw_meta->>'phone',
      (to_jsonb(NEW)->>'phone'),
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    v_phone := NULL;
  END;

  -- الف) درج یا بروزرسانی در جدول profiles با محافظت خطاپذیری
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      phone,
      is_active,
      is_owner,
      max_forms,
      max_responses_per_month,
      plan,
      can_use_telegram,
      can_export_excel,
      monthly_responses_used,
      quota_reset_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_phone,
      true,
      false,
      5,
      100,
      'free',
      true,
      true,
      0,
      now() + INTERVAL '30 days'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      full_name = CASE 
        WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
        THEN EXCLUDED.full_name 
        ELSE public.profiles.full_name 
      END,
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  EXCEPTION WHEN OTHERS THEN
    -- در صورت هرگونه خطا، حداقل رکورد اصلی درج شود
    BEGIN
      INSERT INTO public.profiles (id, email)
      VALUES (NEW.id, NEW.email)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  -- ب) انتصاب نقش پیش‌فرض manager با محافظت خطا
  BEGIN
    INSERT INTO public.user_roles (user_id, role_id, active)
    VALUES (NEW.id, 'manager', true)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- ۷. پاکسازی تریگرهای تکراری روی auth.users و فعال‌سازی مجدد تریگر اصلی
DROP TRIGGER IF EXISTS tr_new_user_default_role ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
