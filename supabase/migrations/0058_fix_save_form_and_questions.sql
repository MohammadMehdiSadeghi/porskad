-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۵۷: رفع قطعی خطای ذخیره و ویرایش فرم و سوالات در تابع save_form
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ۱. حذف تمام نسخه‌های قبلی تابع save_form
DROP FUNCTION IF EXISTS public.save_form(uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.save_form(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_form;

-- ۲. بازنویسی امن و بدون خطای تابع save_form با پشتیبانی از JSONB native
CREATE OR REPLACE FUNCTION public.save_form(
  p_form_id uuid,
  p_form jsonb,
  p_questions jsonb
) RETURNS SETOF public.questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form_id uuid;
  q jsonb;
  q_id uuid;
  q_pos int := 0;
  v_existing_ids uuid[];
BEGIN
  -- ۱. به‌روزرسانی مشخصات اصلی فرم
  UPDATE public.forms SET
    title = coalesce(nullif(p_form->>'title', ''), title),
    description = coalesce(p_form->>'description', ''),
    slug = coalesce(nullif(p_form->>'slug', ''), slug),
    welcome_title = coalesce(p_form->>'welcome_title', welcome_title),
    welcome_message = coalesce(p_form->>'welcome_message', welcome_message),
    exit_title = coalesce(p_form->>'exit_title', exit_title),
    exit_message = coalesce(p_form->>'exit_message', exit_message),
    published = coalesce((p_form->>'published')::boolean, published),
    form_type = coalesce(nullif(p_form->>'form_type', ''), form_type, 'step_by_step'),
    identifier_mapping = CASE 
      WHEN p_form ? 'identifier_mapping' AND p_form->'identifier_mapping' IS NOT NULL AND p_form->'identifier_mapping' <> 'null'::jsonb 
      THEN p_form->'identifier_mapping'
      WHEN p_form ? 'identifier_mapping' AND (p_form->'identifier_mapping' IS NULL OR p_form->'identifier_mapping' = 'null'::jsonb)
      THEN NULL
      ELSE forms.identifier_mapping
    END,
    updated_at = now()
  WHERE id = p_form_id
  RETURNING id INTO v_form_id;

  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'فرم با شناسه مورد نظر یافت نشد.';
  END IF;

  -- ۲. استخراج شناسه‌های معتبر سوالات موجود جهت حذف سوالات برداشته شده
  SELECT array_agg((elem->>'id')::uuid) INTO v_existing_ids
  FROM jsonb_array_elements(p_questions) AS elem
  WHERE (elem->>'id') IS NOT NULL
    AND (elem->>'id') != ''
    AND (elem->>'id') != 'null'
    AND (elem->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF v_existing_ids IS NOT NULL AND array_length(v_existing_ids, 1) > 0 THEN
    DELETE FROM public.questions
    WHERE form_id = v_form_id
      AND id <> ALL(v_existing_ids);
  ELSE
    DELETE FROM public.questions
    WHERE form_id = v_form_id;
  END IF;

  -- ۳. درج یا به‌روزرسانی تک‌تک سوالات
  IF p_questions IS NOT NULL AND jsonb_typeof(p_questions) = 'array' THEN
    FOR q IN SELECT value FROM jsonb_array_elements(p_questions) AS elem LOOP
      q_pos := q_pos + 1;

      -- بررسی وجود شناسه معتبر UUID برای سوال
      IF (q->>'id') IS NOT NULL
         AND (q->>'id') != ''
         AND (q->>'id') != 'null'
         AND (q->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        
        q_id := (q->>'id')::uuid;

        UPDATE public.questions SET
          type = coalesce(q->>'type', 'short_text'),
          title = coalesce(q->>'title', 'سوال'),
          description = coalesce(q->>'description', ''),
          required = coalesce((q->>'required')::boolean, true),
          placeholder = coalesce(q->>'placeholder', ''),
          validation = CASE 
            WHEN q->'validation' IS NOT NULL AND q->'validation' <> 'null'::jsonb THEN q->'validation'
            ELSE NULL
          END,
          options = CASE 
            WHEN q->'options' IS NOT NULL AND jsonb_typeof(q->'options') = 'array' THEN q->'options'
            ELSE '[]'::jsonb
          END,
          position = q_pos - 1,
          conditions = CASE 
            WHEN q->'conditions' IS NOT NULL AND q->'conditions' <> 'null'::jsonb THEN q->'conditions'
            ELSE NULL
          END,
          jump_actions = CASE 
            WHEN q->'jump_actions' IS NOT NULL AND jsonb_typeof(q->'jump_actions') = 'array' THEN q->'jump_actions'
            ELSE '[]'::jsonb
          END,
          correct_answer = CASE 
            WHEN q->'correct_answer' IS NOT NULL AND q->'correct_answer' <> 'null'::jsonb THEN q->'correct_answer'
            ELSE NULL
          END,
          points = nullif(q->>'points', '')::integer,
          display_mode = nullif(q->>'display_mode', ''),
          max_selections = coalesce(nullif(q->>'max_selections', '')::integer, 1)
        WHERE id = q_id AND form_id = v_form_id;

      ELSE
        -- درج سوال جدید
        INSERT INTO public.questions (
          form_id,
          type,
          title,
          description,
          required,
          placeholder,
          validation,
          options,
          position,
          conditions,
          jump_actions,
          correct_answer,
          points,
          display_mode,
          max_selections
        ) VALUES (
          v_form_id,
          coalesce(q->>'type', 'short_text'),
          coalesce(q->>'title', 'سوال جدید'),
          coalesce(q->>'description', ''),
          coalesce((q->>'required')::boolean, true),
          coalesce(q->>'placeholder', ''),
          CASE 
            WHEN q->'validation' IS NOT NULL AND q->'validation' <> 'null'::jsonb THEN q->'validation'
            ELSE NULL
          END,
          CASE 
            WHEN q->'options' IS NOT NULL AND jsonb_typeof(q->'options') = 'array' THEN q->'options'
            ELSE '[]'::jsonb
          END,
          q_pos - 1,
          CASE 
            WHEN q->'conditions' IS NOT NULL AND q->'conditions' <> 'null'::jsonb THEN q->'conditions'
            ELSE NULL
          END,
          CASE 
            WHEN q->'jump_actions' IS NOT NULL AND jsonb_typeof(q->'jump_actions') = 'array' THEN q->'jump_actions'
            ELSE '[]'::jsonb
          END,
          CASE 
            WHEN q->'correct_answer' IS NOT NULL AND q->'correct_answer' <> 'null'::jsonb THEN q->'correct_answer'
            ELSE NULL
          END,
          nullif(q->>'points', '')::integer,
          nullif(q->>'display_mode', ''),
          coalesce(nullif(q->>'max_selections', '')::integer, 1)
        )
        RETURNING id INTO q_id;
      END IF;
    END LOOP;
  END IF;

  RETURN QUERY
  SELECT * FROM public.questions
  WHERE form_id = v_form_id
  ORDER BY position ASC;
END;
$$;

-- ۴. اعطای دسترسی اجرای تابع به کاربران لاگین شده و ناشناس
GRANT EXECUTE ON FUNCTION public.save_form(uuid, jsonb, jsonb) TO authenticated, anon;

-- ۵. اطمینان از دسترسی کامل به جدول questions برای مالکین و مدیران فرم
DROP POLICY IF EXISTS "questions manage" ON public.questions;
CREATE POLICY "questions manage"
  ON public.questions FOR ALL
  TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'edit_form')
    OR EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = questions.form_id
        AND (f.manager_id = auth.uid() OR f.created_by = auth.uid())
    )
  )
  WITH CHECK (
    public.is_owner(auth.uid())
    OR public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'edit_form')
    OR EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = questions.form_id
        AND (f.manager_id = auth.uid() OR f.created_by = auth.uid())
    )
  );

COMMIT;
