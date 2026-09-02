-- ══════════════════════════════════════════════════════════════
-- 0042: فیکس نهایی سیستم مجوزها + پالیسی‌ها
-- این فایل همه چیز رو در یک تراکنش انجام میده:
--   1. اضافه کردن مجوزهای مفقودی
--   2. فیکس get_user_permissions
--   3. فیکس has_permission (با CASCADE)
--   4. بازسازی همه پالیسی‌های وابسته
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. اضافه کردن مجوزهای مفقودی ───
INSERT INTO public.permissions (id, name, description)
VALUES
  ('manage_sms',      'پنل پیامک',       'ارسال و مدیریت پیامک'),
  ('manage_telegram', 'بات تلگرام',      'ارسال خودکار ورودی به تلگرام'),
  ('view_admins',     'نمایش مدیران',    'دیدن سایر ادمین‌ها در لیست')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. فیکس get_user_permissions ───
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
    RETURN QUERY SELECT p.id, p.name FROM public.permissions p;
    RETURN;
  END IF;

  -- اول مجوزهای سفارشی (user_permissions)
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

-- ─── 3. فیکس has_permission (حذف با CASCADE و ساخت مجدد) ───
DROP FUNCTION IF EXISTS public.has_permission(uuid, text) CASCADE;

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

  -- اول مجوز سفارشی
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

-- ─── 4. بازسازی پالیسی‌های وابسته که با CASCADE حذف شدن ───

-- forms: insert
DROP POLICY IF EXISTS "forms insert" ON public.forms;
CREATE POLICY "forms insert"
  ON public.forms FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'create_form')
    OR public.is_admin(auth.uid())
  );

-- forms: update
DROP POLICY IF EXISTS "forms update" ON public.forms;
CREATE POLICY "forms update"
  ON public.forms FOR UPDATE
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'edit_form')
    OR public.is_admin(auth.uid())
  );

-- forms: delete
DROP POLICY IF EXISTS "forms delete" ON public.forms;
CREATE POLICY "forms delete"
  ON public.forms FOR DELETE
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'delete_form')
    OR public.is_admin(auth.uid())
  );

-- questions: manage
DROP POLICY IF EXISTS "questions manage" ON public.questions;
CREATE POLICY "questions manage"
  ON public.questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = questions.form_id
      AND (
        public.has_permission(auth.uid(), 'edit_form')
        OR public.is_admin(auth.uid())
        OR f.manager_id = auth.uid()
      )
    )
  );

-- responses: delete
DROP POLICY IF EXISTS "responses delete" ON public.responses;
CREATE POLICY "responses delete"
  ON public.responses FOR DELETE
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'delete_form')
    OR public.is_admin(auth.uid())
  );

COMMIT;
