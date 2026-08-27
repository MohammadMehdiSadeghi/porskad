-- ══════════════════════════════════════════════════════════════
-- تعمیر RLS برای کاربران بدون لاگین (anon)
-- مشکل: پالیسی‌های قبلی با `to public` ساخته شدن ولی
-- کاربران anonymous در Supabase از نقش `anon` استفاده می‌کنن
-- ══════════════════════════════════════════════════════════════

-- ─── responses ───
-- حذف همه پالیسی‌های قبلی insert (با هر اسمی که باشن)
DO $$
BEGIN
  -- حذف پالیسی‌های احتمالی با نام‌های مختلف
  DROP POLICY IF EXISTS "public insert responses for published forms" ON public.responses;
  DROP POLICY IF EXISTS "public insert responses" ON public.responses;
  DROP POLICY IF EXISTS "allow insert responses" ON public.responses;
  DROP POLICY IF EXISTS "anon insert responses" ON public.responses;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- پالیسی insert برای responses: هر کاربری (anon + authenticated) بتونه insert کنه
CREATE POLICY "anon_insert_responses"
  ON public.responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- پالیسی select فقط برای authenticated (ادمین‌ها بتونن پاسخ‌ها رو ببینن)
DO $$ BEGIN DROP POLICY IF EXISTS "admin read responses" ON public.responses; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "allow select responses" ON public.responses; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "admin_select_responses"
  ON public.responses FOR SELECT
  TO authenticated
  USING (true);

-- پالیسی delete فقط برای authenticated
DO $$ BEGIN DROP POLICY IF EXISTS "admin delete responses" ON public.responses; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "allow delete responses" ON public.responses; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "admin_delete_responses"
  ON public.responses FOR DELETE
  TO authenticated
  USING (true);

-- ─── answers ───
-- حذف همه پالیسی‌های قبلی insert
DO $$
BEGIN
  DROP POLICY IF EXISTS "public insert answers" ON public.answers;
  DROP POLICY IF EXISTS "public insert answers for published forms" ON public.answers;
  DROP POLICY IF EXISTS "allow insert answers" ON public.answers;
  DROP POLICY IF EXISTS "anon insert answers" ON public.answers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- پالیسی insert ساده: هر کاربری بتونه insert کنه
CREATE POLICY "anon_insert_answers"
  ON public.answers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- پالیسی select فقط برای authenticated
DO $$ BEGIN DROP POLICY IF EXISTS "admin read answers" ON public.answers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "allow select answers" ON public.answers; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "admin_select_answers"
  ON public.answers FOR SELECT
  TO authenticated
  USING (true);

-- ─── embed_events ───
DO $$
BEGIN
  DROP POLICY IF EXISTS "allow insert embed_events" ON public.embed_events;
  DROP POLICY IF EXISTS "anon insert embed_events" ON public.embed_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "anon_insert_embed_events"
  ON public.embed_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── تایید ───
-- بعد از اجرای این مایگریشن:
-- 1. کاربران بدون لاگین (anon) می‌تونن فرم ثبت کنن
-- 2. ادمین‌ها (authenticated) می‌تونن پاسخ‌ها رو بخونن و حذف کنن
