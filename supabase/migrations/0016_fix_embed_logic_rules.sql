-- ══════════════════════════════════════════════════════════════
-- فیکس get_public_form — سازگار با جدول logic_rules
-- ══════════════════════════════════════════════════════════════

-- ساخت جدول logic_rules اگه وجود نداشت
CREATE TABLE IF NOT EXISTS public.logic_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  name text DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  source_question_id uuid,
  group_operator text DEFAULT 'AND',
  conditions_json jsonb DEFAULT '[]'::jsonb,
  action_type text NOT NULL DEFAULT 'skip_question',
  action_target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.logic_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read logic_rules" ON public.logic_rules;
CREATE POLICY "public read logic_rules"
  ON public.logic_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = logic_rules.form_id AND f.published = true
    )
  );

DROP POLICY IF EXISTS "admin manage logic_rules" ON public.logic_rules;
CREATE POLICY "admin manage logic_rules"
  ON public.logic_rules FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS logic_rules_form_id_idx ON public.logic_rules (form_id, priority);

-- بروزرسانی تابع get_public_form
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
      'jump_actions', q.jump_actions
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
    'welcome_title', v_form->>'welcome_title',
    'welcome_message', v_form->>'welcome_message',
    'exit_title', v_form->>'exit_title',
    'exit_message', v_form->>'exit_message',
    'showBranding', true,
    'questions', v_questions, 'logicRules', v_rules
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_form(text) TO anon, authenticated;
