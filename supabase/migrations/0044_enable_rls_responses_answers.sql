-- ══════════════════════════════════════════════════════════════
-- 0044: اطمینان از فعال بودن RLS روی responses/answers
-- migration 0018_disable_rls_temp این دو جدول رو موقتاً DISABLE کرده بود؛
-- این فایل تضمین می‌کند بدون توجه به ترتیب اجرای مایگریشن‌ها،
-- RLS نهایتاً فعال باشد (امنیت داده‌های پاسخ‌ها).
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
