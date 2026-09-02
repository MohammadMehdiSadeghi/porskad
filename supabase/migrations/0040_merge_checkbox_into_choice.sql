-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۴۰: ادغام checkbox در choice
-- همه سوالات checkbox → choice با max_selections = تعداد گزینه‌ها
-- ══════════════════════════════════════════════════════════════

-- ۱. تبدیل همه checkbox به choice
-- max_selections رو برابر تعداد گزینه‌ها می‌ذاریم (یعنی انتخاب همه مجازه)
UPDATE public.questions
SET type = 'choice',
    max_selections = GREATEST(jsonb_array_length(COALESCE(options, '[]'::jsonb)), 1)
WHERE type = 'checkbox';

-- ۲. حذف 'checkbox' از check constraint اگه وجود داره
-- (سوال type قدیمی رو قبول نکنه)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%questions%type%'
      AND pg_get_constraintdef(oid) LIKE '%checkbox%'
  ) THEN
    ALTER TABLE public.questions
      DROP CONSTRAINT IF EXISTS questions_type_check;
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_type_check
      CHECK (type IN ('short_text','long_text','phone_ir','choice','email','number','rating','yes_no','telegram_id'));
  END IF;
END $$;

-- ۳. بروزرسانی save_form (اگه مایگریشن قبلی اعمال نشده باشه)
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
    form_type = coalesce(p_form->>'form_type', 'step_by_step')
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
