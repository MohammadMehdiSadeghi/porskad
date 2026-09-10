-- ==============================================================================
-- Migration 0065: ⏰ موقت — دسترسی کامل امکانات برای همه کاربران تا تکمیل اشتراک‌ها
-- ------------------------------------------------------------------------------
-- علت: با اضافه شدن سیستم اشتراک (0063)، پرچم‌های امکانات با پیش‌فرض false ساخته
-- شدند و فقط به owner/enterprise/pro روشن شدند → دسترسی کاربران عادی بسته شد.
-- این مایگریشن تا تکمیل بخش اشتراک، رفتار «قبل از پلن‌ها» را برمی‌گرداند:
--   ✅ همه امکانات (تلگرام، اکسل، منطق، آپلود فایل، پیامک، وب‌هوک، برندینگ) ON
--   ✅ ثبت‌نام‌های جدید هم خودکار همه امکانات را می‌گیرند
--   🔒 سهمیه‌ها دست‌نخورده: ۱۰۰ پاسخ/ماه و ۵ فرم فعال (هرچه الان هست می‌ماند)
--
-- ⚠️ موقت است: بعد از کامل‌کردن بخش اشتراک، با مایگریشن ۰۰۶۶ محدودیت‌ها برگردانده
--    می‌شود. رکوردهای user_permissions (محدودیت‌های دستی قبلی) در جدول
--    user_permissions_backup_0065 بکاپ گرفته شده‌اند.
-- ==============================================================================

BEGIN;

-- ─── ۱. پیش‌فرض ستون‌های امکانات → true (برای پروفایل‌های جدید/ثبت‌نام‌ها) ───
ALTER TABLE public.profiles
  ALTER COLUMN can_use_telegram    SET DEFAULT true,
  ALTER COLUMN can_export_excel    SET DEFAULT true,
  ALTER COLUMN can_use_logic       SET DEFAULT true,
  ALTER COLUMN can_upload_files    SET DEFAULT true,
  ALTER COLUMN can_use_sms         SET DEFAULT true,
  ALTER COLUMN can_use_webhooks    SET DEFAULT true,
  ALTER COLUMN can_remove_branding SET DEFAULT true;

-- ─── ۲. همه کاربران فعلی: همه امکانات روشن ───
-- (فقط پرچم‌ها؛ max_forms / max_responses_per_month / plan تغییر نمی‌کنند)
UPDATE public.profiles
SET can_use_telegram    = true,
    can_export_excel    = true,
    can_use_logic       = true,
    can_upload_files    = true,
    can_use_sms         = true,
    can_use_webhooks    = true,
    can_remove_branding = true;

-- ─── ۳. بکاپ و پاک‌سازی محدودیت‌های دستی per-user ───
-- اگر برای کسی مجوز دستی (user_permissions) ثبت شده، اول بکاپ می‌گیرد و بعد
-- پاک می‌کند تا get_user_permissions به مجوزهای نقش (manager) برگردد —
-- دقیقاً رفتار قبل از سیستم اشتراک.
CREATE TABLE IF NOT EXISTS public.user_permissions_backup_0065 (
  LIKE public.user_permissions INCLUDING ALL
);
INSERT INTO public.user_permissions_backup_0065
SELECT up.* FROM public.user_permissions up
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_permissions_backup_0065 b
  WHERE b.user_id = up.user_id AND b.permission_id = up.permission_id
);
DELETE FROM public.user_permissions;

-- ─── ۴. اطمینان از مجوزهای کامل نقش manager (سوپرادمین همه‌چیز دارد) ───
-- همان ست پیش‌فرض پرس‌کاد: تلگرام و اکسل برای همه، بدون نیاز به ارتقا.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'manager', p.id
FROM public.permissions p
WHERE p.id IN (
  'create_form', 'edit_form', 'delete_form', 'publish_form',
  'view_responses', 'view_analytics', 'export_excel', 'manage_telegram'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
