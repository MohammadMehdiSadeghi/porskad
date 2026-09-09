-- ==============================================================================
-- Migration 0063: Granular user feature flags (plans system)
-- ستون‌های دسترسی تفصیلی کاربران که در «مدیریت کاربران» و سیستم طرح‌ها استفاده می‌شوند.
-- بدون این ستون‌ها کوئری listManagers با خطای «column does not exist» شکست می‌خورد.
-- ==============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_use_logic boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_upload_files boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_use_sms boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_use_webhooks boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_remove_branding boolean DEFAULT false;

-- backfill مطابق نگاشت پیش‌فرض طرح‌ها در پنل مدیریت (enterprise → همه امکانات، pro → منطق و آپلود فایل)
UPDATE public.profiles
SET can_use_logic = true,
    can_upload_files = true,
    can_use_sms = true,
    can_use_webhooks = true,
    can_remove_branding = true
WHERE is_owner = true OR plan IN ('enterprise', 'unlimited');

UPDATE public.profiles
SET can_use_logic = true,
    can_upload_files = true
WHERE plan = 'pro';

COMMIT;
