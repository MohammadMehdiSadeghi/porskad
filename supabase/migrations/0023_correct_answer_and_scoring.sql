-- ══════════════════════════════════════════════════════════════
-- گزینه صحیح + امتیازدهی (نمره‌دهی آزمون)
-- ══════════════════════════════════════════════════════════════

-- اضافه کردن فیلدها
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS correct_answer jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS points integer DEFAULT NULL;

-- ─── بروزرسانی save_form ───
DROP FUNCTION IF EXISTS public.save_form(uuid, jsonb, jsonb);

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
        type            = q->>'type',
        title           = q->>'title',
        description     = q->>'description',
        required        = (q->>'required')::boolean,
        placeholder     = coalesce(q->>'placeholder', ''),
        validation      = nullif(q->>'validation', 'null')::jsonb,
        options         = coalesce(q->'options', '[]'::jsonb),
        position        = q_pos - 1,
        conditions      = nullif(q->>'conditions', 'null')::jsonb,
        jump_actions    = coalesce(q->'jump_actions', '[]'::jsonb),
        correct_answer  = nullif(q->>'correct_answer', 'null')::jsonb,
        points          = (q->>'points')::integer
      WHERE id = q_id AND form_id = v_form_id;
    ELSE
      INSERT INTO public.questions (form_id, type, title, description, required, placeholder, validation, options, position, conditions, jump_actions, correct_answer, points)
      VALUES (
        v_form_id,
        q->>'type',
        q->>'title',
        q->>'description',
        (q->>'required')::boolean,
        coalesce(q->>'placeholder', ''),
        nullif(q->>'validation', 'null')::jsonb,
        coalesce(q->'options', '[]'::jsonb),
        q_pos - 1,
        nullif(q->>'conditions', 'null')::jsonb,
        coalesce(q->'jump_actions', '[]'::jsonb),
        nullif(q->>'correct_answer', 'null')::jsonb,
        (q->>'points')::integer
      )
      RETURNING id INTO q_id;
    END IF;

    RETURN QUERY SELECT * FROM public.questions WHERE id = q_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_form(uuid, jsonb, jsonb) TO anon, authenticated;

-- ─── بروزرسانی get_public_form ───
DROP FUNCTION IF EXISTS public.get_public_form(text);

CREATE OR REPLACE FUNCTION public.get_public_form(p_form_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form jsonb;
  v_questions jsonb;
  v_rules jsonb;
BEGIN
  SELECT to_jsonb(f.*) INTO v_form
  FROM public.forms f
  WHERE (f.public_id = p_form_id OR f.id::text = p_form_id)
    AND f.published = true
  LIMIT 1;

  IF v_form IS NULL THEN RETURN null; END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id, 'type', q.type, 'title', q.title,
      'description', q.description, 'required', q.required,
      'placeholder', q.placeholder, 'options', q.options,
      'position', q.position, 'conditions', q.conditions,
      'jump_actions', q.jump_actions,
      'validation', q.validation,
      'correct_answer', q.correct_answer,
      'points', q.points
    ) ORDER BY q.position
  ), '[]'::jsonb) INTO v_questions
  FROM public.questions q
  WHERE q.form_id = (v_form->>'id')::uuid;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', lr.id, 'name', lr.name, 'enabled', lr.enabled,
      'priority', lr.priority, 'source_question_id', lr.source_question_id,
      'group_operator', lr.group_operator, 'conditions_json', lr.conditions_json,
      'action_type', lr.action_type, 'action_target_id', lr.action_target_id
    )
  ), '[]'::jsonb) INTO v_rules
  FROM public.logic_rules lr
  WHERE lr.form_id = (v_form->>'id')::uuid;

  RETURN jsonb_build_object(
    'id', v_form->>'public_id', 'uuid_id', v_form->>'id',
    'title', v_form->>'title', 'description', v_form->>'description',
    'form_type', v_form->>'form_type',
    'welcome_title', v_form->>'welcome_title', 'welcome_message', v_form->>'welcome_message',
    'exit_title', v_form->>'exit_title', 'exit_message', v_form->>'exit_message',
    'showBranding', true,
    'questions', v_questions, 'logicRules', v_rules
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_form(text) TO anon, authenticated;
