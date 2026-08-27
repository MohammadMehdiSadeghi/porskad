-- ══════════════════════════════════════════════════════════════
-- Public ID + Embed Feature (سازگار با دیتابیس فعلی)
-- ══════════════════════════════════════════════════════════════

-- اضافه کردن public_id به جدول forms
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS public_id text unique;

-- تابع تولید public_id
CREATE OR REPLACE FUNCTION public.generate_form_public_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF new.public_id IS NULL THEN
    new.public_id := 'fr_' || lower(encode(gen_random_bytes(6), 'hex'));
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS forms_set_public_id ON public.forms;
CREATE TRIGGER forms_set_public_id
  BEFORE INSERT ON public.forms
  FOR EACH ROW EXECUTE PROCEDURE public.generate_form_public_id();

-- بروزرسانی فرم‌های موجود
UPDATE public.forms SET public_id = 'fr_' || lower(encode(gen_random_bytes(6), 'hex'))
WHERE public_id IS NULL;

-- تابع دریافت فرم عمومی
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

  IF v_form IS NULL THEN
    RETURN null;
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'type', q.type,
      'title', q.title,
      'description', q.description,
      'required', q.required,
      'placeholder', q.placeholder,
      'options', q.options,
      'position', q.position,
      'conditions', q.conditions,
      'jump_actions', q.jump_actions
    ) ORDER BY q.position
  ), '[]'::jsonb) INTO v_questions
  FROM public.questions q
  WHERE q.form_id = (v_form->>'id')::uuid;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', lr.id,
      'name', lr.name,
      'enabled', lr.enabled,
      'priority', lr.priority,
      'source_question_id', lr.source_question_id,
      'group_operator', lr.group_operator,
      'conditions_json', lr.conditions_json,
      'action_type', lr.action_type,
      'action_target_id', lr.action_target_id
    )
  ), '[]'::jsonb) INTO v_rules
  FROM public.logic_rules lr
  WHERE lr.form_id = (v_form->>'id')::uuid;

  RETURN jsonb_build_object(
    'id', v_form->>'public_id',
    'uuid_id', v_form->>'id',
    'title', v_form->>'title',
    'description', v_form->>'description',
    'welcome_title', v_form->>'welcome_title',
    'welcome_message', v_form->>'welcome_message',
    'exit_title', v_form->>'exit_title',
    'exit_message', v_form->>'exit_message',
    'showBranding', true,
    'questions', v_questions,
    'logicRules', v_rules
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_form(text) TO anon, authenticated;

-- تابع ثبت پاسخ عمومی
DROP FUNCTION IF EXISTS public.submit_public_response(text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.submit_public_response(
  p_form_public_id text,
  p_answers jsonb,
  p_meta jsonb default '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form_id uuid;
  v_response_id uuid;
  v_q jsonb;
  v_question_id uuid;
  v_answer jsonb;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_duration integer;
BEGIN
  SELECT id INTO v_form_id
  FROM public.forms
  WHERE (public_id = p_form_public_id OR id::text = p_form_public_id)
    AND published = true;

  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'فرم یافت نشد یا منتشر نشده.';
  END IF;

  v_started_at := nullif(p_meta->>'startedAt', '')::timestamptz;
  v_completed_at := nullif(p_meta->>'completedAt', '')::timestamptz;

  IF v_started_at IS NOT NULL AND v_completed_at IS NOT NULL THEN
    v_duration := extract(epoch from (v_completed_at - v_started_at))::integer;
  END IF;

  INSERT INTO public.responses (
    form_id, is_complete, started_at, submitted_at,
    duration_seconds, device, browser, os, user_agent, referer
  ) VALUES (
    v_form_id,
    true,
    coalesce(v_started_at, now()),
    coalesce(v_completed_at, now()),
    v_duration,
    p_meta->>'device',
    p_meta->>'browser',
    p_meta->>'os',
    p_meta->>'userAgent',
    p_meta->>'referrerUrl'
  )
  RETURNING id INTO v_response_id;

  FOR v_q IN
    SELECT jsonb_array_elements(
      (SELECT jsonb_agg(jsonb_build_object('id', q.id))
       FROM public.questions q WHERE q.form_id = v_form_id)
    )
  LOOP
    v_question_id := (v_q->>'id')::uuid;
    v_answer := p_answers->>(v_q->>'id');

    IF v_answer IS NOT NULL THEN
      INSERT INTO public.answers (response_id, question_id, value, time_spent_seconds)
      VALUES (
        v_response_id,
        v_question_id,
        to_jsonb(v_answer),
        0
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'responseId', v_response_id,
    'status', 'success'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_response(text, jsonb, jsonb) TO anon, authenticated;

-- جدول رویدادهای embed
CREATE TABLE IF NOT EXISTS public.embed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'start', 'complete')),
  referrer_url text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.embed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow insert embed_events"
  ON public.embed_events FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "allow select embed_events"
  ON public.embed_events FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS embed_events_form_id_idx ON public.embed_events (form_id, event_type);
