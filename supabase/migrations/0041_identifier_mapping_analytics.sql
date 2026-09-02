-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۴۱: آنالیتیکس گروهی فیلد چندانتخابی (multi-select spec)
--   ۱. ستون identifier_mapping روی forms — آرایه‌ای از id سوال‌های
--      شناسه به ترتیب سطح (سطح ۱ = فرد، سطح ۲ = تیم، ...)
--   ۲. بروزرسانی save_form برای ذخیره identifier_mapping
--   ۳. ولیدیشن بک‌اند: تعداد انتخاب‌های سوال چندگزینه‌ای
--      نباید از max_selections بیشتر باشد (تریگر روی answers)
-- این فایل را در Supabase Dashboard → SQL Editor اجرا کنید.
-- ══════════════════════════════════════════════════════════════

-- ۱. ستون identifier_mapping
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS identifier_mapping jsonb DEFAULT NULL;

-- ۲. بروزرسانی save_form
DROP FUNCTION IF EXISTS public.save_form(uuid, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.save_form(
  p_form_id uuid, p_form jsonb, p_questions jsonb
) RETURNS SETOF public.questions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_form_id uuid; q jsonb; q_id uuid; q_pos int := 0;
BEGIN
  UPDATE public.forms SET
    title = p_form->>'title', description = p_form->>'description',
    slug = p_form->>'slug', welcome_title = p_form->>'welcome_title',
    welcome_message = p_form->>'welcome_message', exit_title = p_form->>'exit_title',
    exit_message = p_form->>'exit_message', published = (p_form->>'published')::boolean,
    form_type = coalesce(p_form->>'form_type', 'step_by_step'),
    identifier_mapping = coalesce(nullif(p_form->'identifier_mapping', 'null'::jsonb), forms.identifier_mapping)
  WHERE id = p_form_id RETURNING id INTO v_form_id;

  IF v_form_id IS NULL THEN RAISE EXCEPTION 'form not found'; END IF;

  DELETE FROM public.questions WHERE form_id = v_form_id
    AND id NOT IN (SELECT (elem->>'id')::uuid FROM jsonb_array_elements(p_questions) AS elem
      WHERE elem->>'id' IS NOT NULL AND elem->>'id' != 'null');

  FOR q IN SELECT value FROM jsonb_array_elements(p_questions) AS elem LOOP
    q_pos := q_pos + 1;
    IF (q->>'id') IS NOT NULL AND (q->>'id') != 'null' AND (q->>'id') != '' THEN
      q_id := (q->>'id')::uuid;
      UPDATE public.questions SET
        type=q->>'type', title=q->>'title', description=q->>'description',
        required=(q->>'required')::boolean, placeholder=coalesce(q->>'placeholder',''),
        validation=nullif(q->>'validation','null')::jsonb, options=coalesce(q->'options','[]'::jsonb),
        position=q_pos-1, conditions=nullif(q->>'conditions','null')::jsonb,
        jump_actions=coalesce(q->'jump_actions','[]'::jsonb),
        correct_answer=nullif(q->>'correct_answer','null')::jsonb,
        points=(q->>'points')::integer, display_mode=q->>'display_mode',
        max_selections=coalesce((q->>'max_selections')::integer, 1)
      WHERE id = q_id AND form_id = v_form_id;
    ELSE
      INSERT INTO public.questions (form_id, type, title, description, required, placeholder,
        validation, options, position, conditions, jump_actions, correct_answer, points, display_mode, max_selections)
      VALUES (v_form_id, q->>'type', q->>'title', q->>'description', (q->>'required')::boolean,
        coalesce(q->>'placeholder',''), nullif(q->>'validation','null')::jsonb,
        coalesce(q->'options','[]'::jsonb), q_pos-1, nullif(q->>'conditions','null')::jsonb,
        coalesce(q->'jump_actions','[]'::jsonb), nullif(q->>'correct_answer','null')::jsonb,
        (q->>'points')::integer, q->>'display_mode',
        coalesce((q->>'max_selections')::integer, 1))
      RETURNING id INTO q_id;
    END IF;
  END LOOP;

  RETURN QUERY SELECT * FROM public.questions WHERE form_id = v_form_id ORDER BY position;
END; $$;

GRANT EXECUTE ON FUNCTION public.save_form(uuid, jsonb, jsonb) TO authenticated;

-- ۳. ولیدیشن بک‌اند — لایه دوم اعمال max_selections
--    اگر تعداد انتخاب‌ها از حد مجاز بیشتر بود، ثبت رد می‌شود (خطا برمی‌گردد)
CREATE OR REPLACE FUNCTION public.validate_answer_max_selections()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  q_type text;
  q_max  integer;
  v_count integer;
BEGIN
  IF NEW.value IS NULL OR jsonb_typeof(NEW.value) <> 'array' THEN
    RETURN NEW;
  END IF;

  SELECT type, max_selections INTO q_type, q_max
  FROM public.questions
  WHERE id = NEW.question_id;

  IF q_type = 'choice' AND COALESCE(q_max, 1) > 1 THEN
    v_count := jsonb_array_length(NEW.value);
    IF v_count > q_max THEN
      RAISE EXCEPTION 'تعداد انتخاب‌ها (%) بیشتر از حد مجاز (%) است', v_count, q_max
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS answers_validate_max_selections ON public.answers;
CREATE TRIGGER answers_validate_max_selections
  BEFORE INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.validate_answer_max_selections();
