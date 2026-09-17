-- ══════════════════════════════════════════════════════════════
-- Migration: 0088_update_otp_pattern_6528.sql
-- Description: به‌روزرسانی کد الگوی اختصاصی پیامک OTP در آموت به 6528 و متن الگو
-- ══════════════════════════════════════════════════════════════

-- ۱. به‌روزرسانی مقادیر در جدول system_settings
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES 
  ('otp_pattern_code', '"6528"'::jsonb, 'کد الگوی وب‌سرویس آموت جهت ارسال سریع OTP (پیش‌فرض: 6528)', now()),
  ('otp_sms_pattern', '"کد تایید ثبت نام در پرس کاد : %code%"'::jsonb, 'الگوی پیامک تایید هویت و ثبت‌نام سریع آموت', now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

-- ۲. به‌روزرسانی تابع get_system_settings
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS jsonb
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'site_title', coalesce((SELECT value FROM public.system_settings WHERE key = 'site_title'), '"پرس‌کاد"'::jsonb),
      'telegram_support_id', coalesce((SELECT value FROM public.system_settings WHERE key = 'telegram_support_id'), '"porskad_support"'::jsonb),
      'default_max_active_forms', coalesce((SELECT value FROM public.system_settings WHERE key = 'default_max_active_forms'), '5'::jsonb),
      'default_max_monthly_responses', coalesce((SELECT value FROM public.system_settings WHERE key = 'default_max_monthly_responses'), '100'::jsonb),
      'registration_enabled', coalesce((SELECT value FROM public.system_settings WHERE key = 'registration_enabled'), 'true'::jsonb),
      'sms_otp_enabled', coalesce((SELECT value FROM public.system_settings WHERE key = 'sms_otp_enabled'), 'true'::jsonb),
      'google_auth_enabled', coalesce((SELECT value FROM public.system_settings WHERE key = 'google_auth_enabled'), 'true'::jsonb),
      'otp_sms_pattern', coalesce((SELECT value FROM public.system_settings WHERE key = 'otp_sms_pattern'), '"کد تایید ثبت نام در پرس کاد : %code%"'::jsonb),
      'otp_pattern_code', coalesce((SELECT value FROM public.system_settings WHERE key = 'otp_pattern_code'), '"6528"'::jsonb),
      'otp_line_number', coalesce((SELECT value FROM public.system_settings WHERE key = 'otp_line_number'), '"98"'::jsonb),
      'otp_cooldown_seconds', coalesce((SELECT value FROM public.system_settings WHERE key = 'otp_cooldown_seconds'), '90'::jsonb),
      'otp_max_resends', coalesce((SELECT value FROM public.system_settings WHERE key = 'otp_max_resends'), '2'::jsonb),
      'question_types_config', (SELECT value FROM public.system_settings WHERE key = 'question_types_config'),
      'plans_config', (SELECT value FROM public.system_settings WHERE key = 'plans_config'),
      'user_tabs_config', (SELECT value FROM public.system_settings WHERE key = 'user_tabs_config'),
      'file_upload_policy', (SELECT value FROM public.system_settings WHERE key = 'file_upload_policy'),
      'discount_codes', (SELECT value FROM public.system_settings WHERE key = 'discount_codes')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_system_settings() TO public, anon, authenticated;
