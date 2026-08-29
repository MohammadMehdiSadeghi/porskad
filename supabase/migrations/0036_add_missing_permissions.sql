-- ══════════════════════════════════════════════════════════════
-- 0036: اضافه کردن مجوزهای مفقودی به جدول permissions
-- خطا: violates foreign key constraint "user_permissions_permission_id_fkey"
-- ══════════════════════════════════════════════════════════════

-- مجوزهایی که فرانت‌اند استفاده می‌کند ولی در دیتابیس نیستند
INSERT INTO public.permissions (id, name, description)
VALUES
  ('manage_sms',      'پنل پیامک',       'ارسال و مدیریت پیامک'),
  ('manage_telegram', 'بات تلگرام',      'ارسال خودکار ورودی به تلگرام'),
  ('view_admins',     'نمایش مدیران',    'دیدن سایر ادمین‌ها در لیست')
ON CONFLICT (id) DO NOTHING;
