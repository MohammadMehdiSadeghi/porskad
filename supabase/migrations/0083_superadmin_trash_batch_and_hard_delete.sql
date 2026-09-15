-- 0083: سطل زباله پیشرفته — حذف قطعی، عملیات گروهی و پاک‌سازی ۳۰ روزه (Deadlock-Safe)
-- تنظیم تایم‌اوت برای جلوگیری از بن‌بست‌های همزمانی (Lock Timeout)
SET lock_timeout = '10s';

-- ۱. پالیسی حذف مستقیم از جدول سطل زباله توسط گاد
DO $$
BEGIN
  DROP POLICY IF EXISTS "god deletes trash" ON public.trash;
  CREATE POLICY "god deletes trash" ON public.trash
    FOR DELETE USING (public.is_owner());
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ۲. تابع RPC حذف قطعی چندگانه (گروهی یا تکی) از جدول سطل زباله
CREATE OR REPLACE FUNCTION public.hard_delete_trash_items(p_trash_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n int := 0;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز: فقط مالک سیستم مجاز به حذف دائمی است.';
  END IF;

  DELETE FROM public.trash WHERE id = ANY(p_trash_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ۳. تابع RPC حذف قطعی فرم (حذف نهایی بدون تداخل قفل و پاک‌سازی سوابق سطل)
CREATE OR REPLACE FUNCTION public.hard_delete_form_permanent(p_form_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز: فقط مالک سیستم مجاز به حذف قطعی فرم است.';
  END IF;

  -- پاک‌سازی لاگ‌های قبلی این فرم در سطل
  DELETE FROM public.trash WHERE (entity_type = 'form' AND entity_id = p_form_id);

  -- حذف پاسخ‌ها، سوالات و فرم
  DELETE FROM public.answers WHERE response_id IN (SELECT id FROM public.responses WHERE form_id = p_form_id);
  DELETE FROM public.responses WHERE form_id = p_form_id;
  DELETE FROM public.questions WHERE form_id = p_form_id;
  DELETE FROM public.forms WHERE id = p_form_id;

  -- پاک‌سازی نهایی در صورتی که تریگر لاگی درج کرده باشد
  DELETE FROM public.trash WHERE (entity_type = 'form' AND entity_id = p_form_id);
END $$;

-- ۴. تابع پاک‌سازی اقلام منقضی‌شده (> ۳۰ روز) برای بهینه‌سازی استوریج و حافظه
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n_trash int := 0;
  n_forms int := 0;
BEGIN
  IF NOT public.is_owner() THEN
    RETURN 0;
  END IF;

  -- حذف اقلام با انقضای سپری‌شده در جدول trash
  DELETE FROM public.trash WHERE expires_at < now() AND restored_at IS NULL;
  GET DIAGNOSTICS n_trash = ROW_COUNT;

  -- حذف قطعی فرم‌های soft-delete قدیمی‌تر از ۳۰ روز
  DELETE FROM public.forms WHERE deleted_at IS NOT NULL AND deleted_at < (now() - interval '30 days');
  GET DIAGNOSTICS n_forms = ROW_COUNT;

  RETURN n_trash + n_forms;
END $$;

-- ۵. تنظیم دسترسی‌های اجرایی (فقط برای کاربران لاگین‌کرده، احراز هویت درون-تابع توسط is_owner انجام می‌شود)
REVOKE EXECUTE ON FUNCTION public.hard_delete_trash_items(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hard_delete_trash_items(uuid[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.hard_delete_form_permanent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hard_delete_form_permanent(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.purge_expired_trash() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_expired_trash() TO authenticated;
