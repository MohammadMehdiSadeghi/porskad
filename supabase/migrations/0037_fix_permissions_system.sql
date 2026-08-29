-- ══════════════════════════════════════════════════════════════
-- 0037: فیکس سیستم مجوزها — user_permissions نادیده گرفته می‌شد
-- مشکل: set_user_permissions در user_permissions ذخیره می‌کرد
--        ولی get_user_permissions و has_permission فقط role_permissions رو می‌خوندن
-- ══════════════════════════════════════════════════════════════

-- ─── فیکس get_user_permissions ───
-- اول user_permissions (مجوزهای سفارشی) رو چک کنه
-- اگه نبود، نقش (role_permissions) رو برگردونه
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE (permission_id text, permission_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- owner همه مجوزها رو داره
  IF public.is_owner(p_user_id) THEN
    RETURN QUERY
      SELECT p.id, p.name FROM public.permissions p;
    RETURN;
  END IF;

  -- اول چک کن آیا مجوزهای سفارشی وجود داره (user_permissions)
  IF EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = p_user_id) THEN
    RETURN QUERY
      SELECT up.permission_id, pr.name
      FROM public.user_permissions up
      JOIN public.permissions pr ON pr.id = up.permission_id
      WHERE up.user_id = p_user_id;
    RETURN;
  END IF;

  -- اگه مجوز سفارشی نبود، بر اساس نقش (role_permissions)
  RETURN QUERY
    SELECT DISTINCT rp.permission_id, pr.name
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND ur.active = true
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions pr ON pr.id = rp.permission_id
    WHERE ur.user_id = p_user_id;
END;
$$;

-- ─── فیکس has_permission ───
-- همین منطق رو داشته باشه: اول user_permissions، بعد role_permissions
DROP FUNCTION IF EXISTS public.has_permission(uuid, text);

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- owner همه مجوزها رو داره
  IF public.is_owner(p_user_id) THEN
    RETURN true;
  END IF;

  -- اول چک کن آیا مجوز سفارشی وجود داره
  IF EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = p_user_id AND permission_id = p_permission_id
  ) THEN
    RETURN true;
  END IF;

  -- اگه مجوز سفارشی نبود، بر اساس نقش
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
