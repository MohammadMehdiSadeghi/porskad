-- ══════════════════════════════════════════════════════════════
-- اضافه کردن checkbox و telegram_id به لیست مجاز انواع سوال
-- ══════════════════════════════════════════════════════════════

-- حذف constraint قدیمی
ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_type_check;

-- ساخت constraint جدید شامل همه انواع
ALTER TABLE public.questions
  ADD CONSTRAINT questions_type_check
  CHECK (type IN (
    'short_text', 'long_text', 'phone_ir', 'choice', 'checkbox',
    'email', 'number', 'rating', 'yes_no', 'telegram_id'
  ));
