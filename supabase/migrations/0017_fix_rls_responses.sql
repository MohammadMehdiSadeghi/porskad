-- ════════════════════════════════════════════════════════════════
-- تعمیر RLS روی responses و answers — اجازه ثبت فرم توسط کاربران عادی
-- ════════════════════════════════════════════════════════════════

-- حذف تمام پالیسی‌های قبلی responses
DO $$ BEGIN
  DROP POLICY IF EXISTS "public insert responses" ON public.responses;
  DROP POLICY IF EXISTS "users read responses" ON public.responses;
  DROP POLICY IF EXISTS "users delete responses" ON public.responses;
  DROP POLICY IF EXISTS "responses_insert_policy" ON public.responses;
  DROP POLICY IF EXISTS "responses_select_policy" ON public.responses;
  DROP POLICY IF EXISTS "responses_delete_policy" ON public.responses;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

--_responses: اجازه INSERT به همه (عموم + لاگین‌شده) برای فرم‌های منتشرشده
CREATE POLICY "allow_insert_published_form_responses"
  ON public.responses FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND f.published = true
    )
  );

-- responses: اجازه SELECT فقط به ادمین‌ها و منیجرهای مرتبط
CREATE POLICY "allow_select_responses_admin"
  ON public.responses FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND f.manager_id = auth.uid()
    )
  );

-- responses: اجازه DELETE فقط به ادمین‌ها
CREATE POLICY "allow_delete_responses_admin"
  ON public.responses FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
  );

-- حذف تمام پالیسی‌های قبلی answers
DO $$ BEGIN
  DROP POLICY IF EXISTS "public insert answers" ON public.answers;
  DROP POLICY IF EXISTS "users read answers" ON public.answers;
  DROP POLICY IF EXISTS "answers_insert_policy" ON public.answers;
  DROP POLICY IF EXISTS "answers_select_policy" ON public.answers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- answers: اجازه INSERT به همه (عموم + لاگین‌شده)
CREATE POLICY "allow_insert_answers"
  ON public.answers FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.responses r
      WHERE r.id = response_id
    )
  );

-- answers: اجازه SELECT فقط به ادمین‌ها
CREATE POLICY "allow_select_answers_admin"
  ON public.answers FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.responses r
      JOIN public.forms f ON f.id = r.form_id
      WHERE r.id = answers.response_id
        AND (f.manager_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- همچنین مطمئن شو RLS فعاله
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
