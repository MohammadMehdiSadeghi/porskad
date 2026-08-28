-- ══════════════════════════════════════════════════════════════
-- فیکس RLS: اضافه کردن is_owner به پالیسی‌های responses و answers
-- بدون این، صاحب سایت پاسخ‌ها رو نمی‌بینه
-- ══════════════════════════════════════════════════════════════

-- responses: بازنویسی پالیسی SELECT با is_owner
DROP POLICY IF EXISTS "allow_select_responses_admin" ON public.responses;
CREATE POLICY "allow_select_responses_admin"
  ON public.responses FOR SELECT
  TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND f.manager_id = auth.uid()
    )
  );

-- responses: بازنویسی پالیسی DELETE با is_owner
DROP POLICY IF EXISTS "allow_delete_responses_admin" ON public.responses;
CREATE POLICY "allow_delete_responses_admin"
  ON public.responses FOR DELETE
  TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR public.is_admin(auth.uid())
  );

-- answers: بازنویسی پالیسی SELECT با is_owner
DROP POLICY IF EXISTS "allow_select_answers_admin" ON public.answers;
CREATE POLICY "allow_select_answers_admin"
  ON public.answers FOR SELECT
  TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.responses r
      JOIN public.forms f ON f.id = r.form_id
      WHERE r.id = response_id AND (f.manager_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );
