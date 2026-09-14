-- ══════════════════════════════════════════════════════════════
-- Migration: 0081_fix_auth_methods_and_system_settings.sql
-- Description: تضمین وجود کلیدهای روش‌های ثبت‌نام و ورود، مجازسازی RLS و ارتقای تابع get_system_settings
-- ══════════════════════════════════════════════════════════════

-- ۱. ثبت یا به‌روزرسانی کلیدهای روش‌های احراز هویت در جدول system_settings
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES 
  ('sms_otp_enabled', 'true'::jsonb, 'فعال بودن ثبت‌نام و ورود با پیامک OTP', now()),
  ('google_auth_enabled', 'true'::jsonb, 'فعال بودن ثبت‌نام و ورود با حساب گوگل', now()),
  ('registration_enabled', 'true'::jsonb, 'امکان ثبت‌نام مستقیم کاربران در سامانه', now()),
  ('otp_sms_pattern', '"کد تایید ثبت‌نام در پرس‌کاد: %code%"'::jsonb, 'الگوی پیامک حاوی کد تایید ورود و ثبت‌نام', now()),
  ('otp_line_number', '"Service"'::jsonb, 'خط فرستنده پیامک OTP (پیش‌فرض: Service)', now()),
  ('otp_cooldown_seconds', '90'::jsonb, 'زمان انتظار ارسال مجدد کد به ثانیه (پیش‌فرض: ۹۰ ثانیه)', now()),
  ('otp_max_resends', '2'::jsonb, 'حداکثر دفعات مجاز ارسال مجدد کد برای یک شماره', now())
ON CONFLICT (key) DO UPDATE
SET updated_at = now()
WHERE public.system_settings.key IN ('sms_otp_enabled', 'google_auth_enabled', 'registration_enabled');

-- ۲. به‌روزرسانی پالیسی خواندن عمومی تنظیمات سامانه
DROP POLICY IF EXISTS "read public settings" ON public.system_settings;
DROP POLICY IF EXISTS "allow read system_settings" ON public.system_settings;

CREATE POLICY "read public settings"
  ON public.system_settings FOR SELECT
  TO public
  USING (
    key = ANY (ARRAY[
      'registration_enabled', 'site_title', 'telegram_support_id',
      'default_max_active_forms', 'default_max_monthly_responses',
      'question_types_config', 'plans_config', 'user_tabs_config',
      'file_upload_policy', 'discount_codes',
      'sms_otp_enabled', 'google_auth_enabled',
      'otp_sms_pattern', 'otp_line_number', 'otp_cooldown_seconds', 'otp_max_resends'
    ])
  );

-- ۳. ارتقای تابع عمومی get_system_settings
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
      'otp_sms_pattern', coalesce((SELECT value FROM public.system_settings WHERE key = 'otp_sms_pattern'), '"کد تایید ثبت‌نام در پرس‌کاد: %code%"'::jsonb),
      'otp_line_number', coalesce((SELECT value FROM public.system_settings WHERE key = 'otp_line_number'), '"Service"'::jsonb),
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

-- ۴. اطمینان از دسترسی مجاز برای فراخوانی تابع
GRANT EXECUTE ON FUNCTION public.get_system_settings() TO public, anon, authenticated;
