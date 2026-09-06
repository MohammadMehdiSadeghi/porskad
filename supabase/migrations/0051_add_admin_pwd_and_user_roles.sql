-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۵۱: ذخیره رمز عبور برای سوپرادمین و اصلاح نقش کاربران
-- ══════════════════════════════════════════════════════════════

-- ۱. ستون admin_pwd در profiles جهت ذخیره و مشاهده رمز عبور توسط سوپرادمین
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_pwd text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.admin_pwd IS 'رمز عبور ثبت‌شده جهت مشاهده توسط سوپرادمین (God)';

-- ۲. اطمینان از مقدار پیش‌فرض is_owner برابر false
ALTER TABLE public.profiles
  ALTER COLUMN is_owner SET DEFAULT false;

-- ۳. تریگر برای اطمینان از اینکه هر کاربر ثبت‌نامی جدید نقش manager (کاربر عادی) دریافت می‌کند
CREATE OR REPLACE FUNCTION public.handle_new_user_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ثبت نقش manager به عنوان پیش‌فرض در صورت نبود نقش
  INSERT INTO public.user_roles (user_id, role_id, active)
  VALUES (NEW.id, 'manager', true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_new_user_default_role ON auth.users;
CREATE TRIGGER tr_new_user_default_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_default_role();

-- ۴. تابع امنیتی جهت به‌روزرسانی رمز در profiles
CREATE OR REPLACE FUNCTION public.set_admin_user_password(p_user_id uuid, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- فقط ادمین یا سرویس می‌تواند این تابع را صدا بزند
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_owner = true OR id IN (
      SELECT user_id FROM public.user_roles WHERE role_id = 'admin' AND active = true
    ))
  ) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز';
  END IF;

  UPDATE public.profiles
  SET admin_pwd = p_new_password
  WHERE id = p_user_id;

  RETURN true;
END;
$$;
