-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۵۴: رفع مشکل ساخت فرم توسط کاربران عادی و تنظیم پالیسی‌های forms
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ۱. اعطای نقش manager به تمام کاربرانی که در user_roles رکوردی ندارند
INSERT INTO public.user_roles (user_id, role_id, active)
SELECT p.id, 'manager', true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ۲. اصلاح تابع has_permission با فالبک امن برای کاربران بدون نقش خاص
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ۱. مالک سیستم تمام مجوزها را دارد
  IF public.is_owner(p_user_id) THEN
    RETURN true;
  END IF;

  -- ۲. مجوزهای سفارشی کاربر
  IF EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = p_user_id AND permission_id = p_permission_id
  ) THEN
    RETURN true;
  END IF;

  -- ۳. مجوزهای نقش کاربر
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND ur.active = true
    JOIN public.role_permissions rp ON rp.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND rp.permission_id = p_permission_id
  ) THEN
    RETURN true;
  END IF;

  -- ۴. فالبک پیش‌فرض برای کاربرانی که نقش مشخصی ندارند یا ثبت نشده‌اند
  -- مجوزهای پایه کاربری مجاز است
  IF p_permission_id IN (
    'create_form',
    'edit_form',
    'delete_form',
    'publish_form',
    'view_responses',
    'view_analytics',
    'export_excel'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ۳. اصلاح تابع get_user_permissions جهت برگشت مجوزهای پیش‌فرض در صورت نبود نقش
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE (permission_id text, permission_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ۱. مالک سیستم
  IF public.is_owner(p_user_id) THEN
    RETURN QUERY SELECT p.id, p.name FROM public.permissions p;
    RETURN;
  END IF;

  -- ۲. مجوزهای سفارشی
  IF EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = p_user_id) THEN
    RETURN QUERY
      SELECT up.permission_id, pr.name
      FROM public.user_permissions up
      JOIN public.permissions pr ON pr.id = up.permission_id
      WHERE up.user_id = p_user_id;
    RETURN;
  END IF;

  -- ۳. مجوزهای نقش
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND active = true) THEN
    RETURN QUERY
      SELECT DISTINCT rp.permission_id, pr.name
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id AND ur.active = true
      JOIN public.role_permissions rp ON rp.role_id = r.id
      JOIN public.permissions pr ON pr.id = rp.permission_id
      WHERE ur.user_id = p_user_id;
    RETURN;
  END IF;

  -- ۴. فالبک پیش‌فرض برای تمام کاربران
  RETURN QUERY
    SELECT p.id, p.name
    FROM public.permissions p
    WHERE p.id IN (
      'create_form',
      'edit_form',
      'delete_form',
      'publish_form',
      'view_responses',
      'view_analytics',
      'export_excel'
    );
END;
$$;

-- ۴. بازسازی و اصلاح پالیسی‌های جدول forms
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- پالیسی INSERT
DROP POLICY IF EXISTS "forms insert" ON public.forms;
DROP POLICY IF EXISTS "authenticated create forms" ON public.forms;
CREATE POLICY "forms insert"
  ON public.forms FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR manager_id = auth.uid()
    OR public.has_permission(auth.uid(), 'create_form')
    OR public.is_admin(auth.uid())
    OR public.is_owner(auth.uid())
  );

-- پالیسی SELECT
DROP POLICY IF EXISTS "users read accessible forms" ON public.forms;
CREATE POLICY "users read accessible forms"
  ON public.forms FOR SELECT
  TO authenticated
  USING (
    published = true
    OR created_by = auth.uid()
    OR manager_id = auth.uid()
    OR public.has_permission(auth.uid(), 'create_form')
    OR public.is_admin(auth.uid())
    OR public.is_owner(auth.uid())
  );

-- پالیسی UPDATE
DROP POLICY IF EXISTS "forms update" ON public.forms;
CREATE POLICY "forms update"
  ON public.forms FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR manager_id = auth.uid()
    OR public.has_permission(auth.uid(), 'edit_form')
    OR public.is_admin(auth.uid())
    OR public.is_owner(auth.uid())
  );

-- پالیسی DELETE
DROP POLICY IF EXISTS "forms delete" ON public.forms;
CREATE POLICY "forms delete"
  ON public.forms FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR manager_id = auth.uid()
    OR public.has_permission(auth.uid(), 'delete_form')
    OR public.is_admin(auth.uid())
    OR public.is_owner(auth.uid())
  );

COMMIT;
