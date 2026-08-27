-- ══════════════════════════════════════════════════════════════
-- اضافه کردن فیلد validation به get_public_form
-- بدون این فیلد، قوانین اعتبارسنجی (حداقل/حداکثر/regex) به فرانت‌اند ارسال نمی‌شد
-- ══════════════════════════════════════════════════════════════

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
      'validation', q.validation
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
