-- ══════════════════════════════════════════════════════════════
-- Migration: 0085_user_purged_forms_retention.sql
-- Description: ستون user_purged_at جهت نگهداری ۳۰ روزه فرم‌های حذف‌شده قطعی کاربر برای سوپرادمین
-- ══════════════════════════════════════════════════════════════

SET lock_timeout = '10s';

-- ۱. ستون ثبت تاریخ حذف قطعی توسط کاربر
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS user_purged_at timestamptz DEFAULT NULL;

-- ۲. ایندکس جهت فیلتر پرفورمنس بالا در واکشی فرم‌ها
CREATE INDEX IF NOT EXISTS idx_forms_user_purged_at ON public.forms (user_purged_at);

-- ۳. پاکسازی خودکار فرم‌هایی که بیش از ۳۰ روز از حذف آنها گذشته است
CREATE OR REPLACE FUNCTION public.purge_expired_forms_and_trash()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
  v_forms_purged integer := 0;
  v_trash_purged integer := 0;
BEGIN
  -- حذف قطعی فرم‌هایی که ۳۰ روز از حذف آنها گذشته است
  DELETE FROM public.forms
  WHERE deleted_at IS NOT NULL AND deleted_at < (now() - interval '30 days');
  GET DIAGNOSTICS v_forms_purged = ROW_COUNT;

  -- پاکسازی سطل زباله عمومی
  DELETE FROM public.trash
  WHERE (expires_at < now() OR deleted_at < (now() - interval '30 days')) AND restored_at IS NULL;
  GET DIAGNOSTICS v_trash_purged = ROW_COUNT;

  v_count := v_forms_purged + v_trash_purged;
  RETURN v_count;
END $$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_forms_and_trash() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_expired_forms_and_trash() TO authenticated;
