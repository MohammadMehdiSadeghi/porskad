-- ══════════════════════════════════════════════════════════════
-- فیکس قطعی RLS برای ثبت فرم توسط کاربران عادی (anon)
-- مشکل: کاربران anonymous هنگام ثبت فرم 401 می‌گیرن
-- ══════════════════════════════════════════════════════════════

-- ─── responses ───
-- حذف تمام پالیسی‌های insert قبلی (با هر اسمی)
DO $$ BEGIN
  DROP POLICY IF EXISTS "public insert responses for published forms" ON public.responses;
  DROP POLICY IF EXISTS "public insert responses" ON public.responses;
  DROP POLICY IF EXISTS "allow insert responses" ON public.responses;
  DROP POLICY IF EXISTS "anon insert responses" ON public.responses;
  DROP POLICY IF EXISTS "allow insert responses for published forms" ON public.responses;
  DROP POLICY IF EXISTS "anon_insert_responses" ON public.responses;
  DROP POLICY IF EXISTS "allow_insert_published_form_responses" ON public.responses;
  DROP POLICY IF EXISTS "responses_insert_policy" ON public.responses;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- پالیسی insert ساده: همه (anon + authenticated) بتونن فرم ثبت کنن
CREATE POLICY "anon_insert_responses"
  ON public.responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── answers ───
DO $$ BEGIN
  DROP POLICY IF EXISTS "public insert answers" ON public.answers;
  DROP POLICY IF EXISTS "public insert answers for published forms" ON public.answers;
  DROP POLICY IF EXISTS "allow insert answers" ON public.answers;
  DROP POLICY IF EXISTS "anon insert answers" ON public.answers;
  DROP POLICY IF EXISTS "allow_insert_answers" ON public.answers;
  DROP POLICY IF EXISTS "anon_insert_answers" ON public.answers;
  DROP POLICY IF EXISTS "answers_insert_policy" ON public.answers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "anon_insert_answers"
  ON public.answers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── embed_events ───
DO $$ BEGIN
  DROP POLICY IF EXISTS "allow insert embed_events" ON public.embed_events;
  DROP POLICY IF EXISTS "anon insert embed_events" ON public.embed_events;
  DROP POLICY IF EXISTS "anon_insert_embed_events" ON public.embed_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "anon_insert_embed_events"
  ON public.embed_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── مطمئن شو RLS فعاله روی هر سه تیبل ───
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_events ENABLE ROW LEVEL SECURITY;
