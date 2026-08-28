-- ═══════════════════════════════════════════════════════════════
-- اصلاح تابع get_active_sms_settings برای پنل پیامک
-- این فایل رو کپی کن و توی SQL Editor اجرا کن
-- ═══════════════════════════════════════════════════════════════

-- حذف نسخه قبلی (اگه وجود داشته باشه)
DROP FUNCTION IF EXISTS public.get_active_sms_settings();

-- ساخت مجدد با return type دقیق
CREATE OR REPLACE FUNCTION public.get_active_sms_settings()
RETURNS TABLE (
  id          uuid,
  api_token   text,
  line_number text,
  sender_name text,
  is_active   boolean
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT s.id, s.api_token, s.line_number, s.sender_name, s.is_active
    FROM public.sms_settings s
    WHERE s.is_active = true
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_sms_settings() TO authenticated;
