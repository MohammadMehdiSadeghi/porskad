-- اضافه کردن ستون hidden_from به profiles
-- این ستون به صاحب اصلی اجازه میده ادمین‌های دیگه رو از لیست مدیران برای کاربر خاصی مخفی کنه
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hidden_from jsonb DEFAULT NULL;

COMMENT ON COLUMN public.profiles.hidden_from IS 'آرایه‌ای از user_idهایی که این مدیر ازشون مخفیه (فقط owner میتونه تنظیم کنه)';
