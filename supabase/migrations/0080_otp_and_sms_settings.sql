-- ══════════════════════════════════════════════════════════════
-- Migration: 0080_otp_and_sms_settings.sql
-- Description: تنظیمات پیامک ثبت‌نام OTP و جدول سشن‌های تایید موبایل
-- ══════════════════════════════════════════════════════════════

-- ۱. ثبت کلیدهای پیش‌فرض OTP در system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('otp_sms_pattern', '"کد تایید ثبت‌نام در پرس‌کاد: %code%"'::jsonb, 'الگوی پیامک حاوی کد تایید ورود و ثبت‌نام'),
  ('otp_line_number', '"Service"'::jsonb, 'خط فرستنده پیامک OTP (پیش‌فرض: Service)'),
  ('otp_cooldown_seconds', '90'::jsonb, 'زمان انتظار ارسال مجدد کد به ثانیه (پیش‌فرض: ۹۰ ثانیه)'),
  ('otp_max_resends', '2'::jsonb, 'حداکثر دفعات مجاز ارسال مجدد کد برای یک شماره')
ON CONFLICT (key) DO NOTHING;

-- ۲. به‌روزرسانی تابع get_system_settings جهت بازگرداندن فیلدهای عمومی OTP
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS jsonb
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_object_agg(s.key, s.value),
    '{}'::jsonb
  )
  FROM public.system_settings s
  WHERE s.key = ANY (ARRAY[
    'registration_enabled', 'site_title', 'telegram_support_id',
    'default_max_active_forms', 'default_max_monthly_responses',
    'question_types_config', 'plans_config', 'user_tabs_config',
    'file_upload_policy', 'discount_codes',
    'otp_sms_pattern', 'otp_line_number', 'otp_cooldown_seconds', 'otp_max_resends'
  ]);
$$;

-- ۳. ایجاد جدول ذخیره‌سازی سشن‌های اعتبارسنجی پیامکی
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  phone text PRIMARY KEY,
  code text NOT NULL,
  verification_token text,
  resend_count integer DEFAULT 0,
  attempts integer DEFAULT 0,
  verified boolean DEFAULT false,
  last_sent_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  token_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- فقط service_role می‌تواند بخواند یا بنویسد (کاربران ناشناس یا عادی دسترسی مستقیم ندارند)
DROP POLICY IF EXISTS "allow service role only on otp_verifications" ON public.otp_verifications;
CREATE POLICY "allow service role only on otp_verifications"
  ON public.otp_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
