-- 0056: اطمینان از دسترسی کامل و پیش‌فرض سوپرادمین به تمام بخش‌ها و مجوزها

BEGIN;

-- ۱. اطمینان از تخصیص تمام مجوزها به نقش admin در role_permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'admin', p.id
FROM public.permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ۲. به‌روزرسانی تابع get_user_permissions برای بازگرداندن تمام دسترسی‌ها برای superadmin
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE (permission_id text, permission_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ۱. مالک سیستم یا سوپرادمین: تمام مجوزها
  IF public.is_owner(p_user_id) 
     OR public.is_admin(p_user_id) 
     OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role_id = 'admin' AND active = true) THEN
    RETURN QUERY SELECT p.id, p.name FROM public.permissions p;
    RETURN;
  END IF;

  -- ۲. مجوزهای سفارشی کاربر (در صورت وجود)
  IF EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = p_user_id) THEN
    RETURN QUERY
      SELECT up.permission_id, pr.name
      FROM public.user_permissions up
      JOIN public.permissions pr ON pr.id = up.permission_id
      WHERE up.user_id = p_user_id;
    RETURN;
  END IF;

  -- ۳. مجوزهای نقش (role_permissions)
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

  -- ۴. فالبک پیش‌فرض برای کاربران معمولی
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

-- ۳. به‌روزرسانی تابع has_permission برای دسترسی بی‌قیدوشرط superadmin
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- مالک سیستم یا سوپرادمین: به همه مجوزها دسترسی دارد
  IF public.is_owner(p_user_id) 
     OR public.is_admin(p_user_id) 
     OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role_id = 'admin' AND active = true) THEN
    RETURN true;
  END IF;

  -- مجوز اختصاصی
  IF EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = p_user_id AND permission_id = p_permission_id
  ) THEN
    RETURN true;
  END IF;

  -- مجوز بر اساس نقش
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND ur.active = true
    JOIN public.role_permissions rp ON rp.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND rp.permission_id = p_permission_id
  );
END;
$$;

COMMIT;
