-- ══════════════════════════════════════════════════════════════
-- Placeholder داینامیک + تعمیرات اضافه ستون‌ها
-- ══════════════════════════════════════════════════════════════

-- اضافه کردن فیلدهایی که ممکنه از مایگریشن‌های قبلی اجرا نشده باشن
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT NULL;
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS jump_actions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS placeholder text NOT NULL DEFAULT '';

-- به‌روزرسانی save_form برای ذخیره placeholder
DROP FUNCTION IF EXISTS public.save_form(uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.save_form(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_form;

CREATE OR REPLACE FUNCTION public.save_form(
  p_form_id   uuid,
  p_form      jsonb,
  p_questions jsonb
)
RETURNS SETOF public.questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form_id uuid;
  q         jsonb;
  q_id      uuid;
  q_pos     int := 0;
BEGIN
  UPDATE public.forms SET
    title           = p_form->>'title',
    description     = p_form->>'description',
    slug            = p_form->>'slug',
    welcome_title   = p_form->>'welcome_title',
    welcome_message = p_form->>'welcome_message',
    exit_title      = p_form->>'exit_title',
    exit_message    = p_form->>'exit_message',
    published       = (p_form->>'published')::boolean,
    form_type       = coalesce(p_form->>'form_type', 'step_by_step')
  WHERE id = p_form_id
  RETURNING id INTO v_form_id;

  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'form not found';
  END IF;

  DELETE FROM public.questions
  WHERE form_id = v_form_id
    AND id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(p_questions) AS elem
      WHERE elem->>'id' IS NOT NULL AND elem->>'id' != 'null'
    );

  FOR q IN SELECT value FROM jsonb_array_elements(p_questions) AS elem
  LOOP
    q_pos := q_pos + 1;

    IF (q->>'id') IS NOT NULL AND (q->>'id') != 'null' AND (q->>'id') != '' THEN
      q_id := (q->>'id')::uuid;
      UPDATE public.questions SET
        type         = q->>'type',
        title        = q->>'title',
        description  = q->>'description',
        required     = (q->>'required')::boolean,
        placeholder  = coalesce(q->>'placeholder', ''),
        options      = coalesce(q->'options', '[]'::jsonb),
        position     = q_pos - 1,
        conditions   = nullif(q->>'conditions', 'null')::jsonb,
        jump_actions = coalesce(q->'jump_actions', '[]'::jsonb)
      WHERE id = q_id AND form_id = v_form_id;
    ELSE
      INSERT INTO public.questions (form_id, type, title, description, required, placeholder, options, position, conditions, jump_actions)
      VALUES (
        v_form_id,
        q->>'type',
        q->>'title',
        q->>'description',
        (q->>'required')::boolean,
        coalesce(q->>'placeholder', ''),
        coalesce(q->'options', '[]'::jsonb),
        q_pos - 1,
        nullif(q->>'conditions', 'null')::jsonb,
        coalesce(q->'jump_actions', '[]'::jsonb)
      )
      RETURNING id INTO q_id;
    END IF;

    RETURN QUERY SELECT * FROM public.questions WHERE id = q_id;
  END LOOP;
END;
$$;
