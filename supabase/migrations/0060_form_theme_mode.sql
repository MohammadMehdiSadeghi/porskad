-- Migration 0060: Add default_theme column to forms table and update get_public_form
ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS default_theme text NOT NULL DEFAULT 'light'
CHECK (default_theme IN ('light', 'dark', 'system'));

COMMENT ON COLUMN public.forms.default_theme IS 'Default visual theme mode for this form: light, dark, or system';

DROP FUNCTION IF EXISTS public.get_public_form(text);

CREATE OR REPLACE FUNCTION public.get_public_form(p_form_id text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_form record;
  v_questions jsonb;
  v_rules jsonb;
  v_fid uuid;
BEGIN
  -- پیدا کردن شناسه یکتای فرم با public_id یا UUID یا slug
  SELECT id INTO v_fid FROM public.forms
  WHERE public_id = p_form_id OR id::text = p_form_id OR slug = p_form_id
  LIMIT 1;

  IF v_fid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_form FROM public.forms WHERE id = v_fid;

  -- بررسی عدم انتشار، آرشیو بودن یا حذف نرم
  IF v_form.published = false 
     OR coalesce(v_form.archived, false) = true 
     OR v_form.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  -- فیلتر امن سوالات
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'type', q.type,
      'title', q.title,
      'description', q.description,
      'required', q.required,
      'options', q.options,
      'position', q.position,
      'placeholder', q.placeholder,
      'conditions', q.conditions,
      'jump_actions', q.jump_actions,
      'validation', q.validation,
      'display_mode', q.display_mode,
      'max_selections', q.max_selections
    ) ORDER BY q.position
  ), '[]'::jsonb)
  INTO v_questions
  FROM public.questions q
  WHERE q.form_id = v_form.id;

  SELECT coalesce(jsonb_agg(lr.*), '[]'::jsonb)
  INTO v_rules
  FROM public.logic_rules lr
  WHERE lr.form_id = v_form.id;

  RETURN jsonb_build_object(
    'id', v_form.id,
    'title', v_form.title,
    'description', v_form.description,
    'slug', v_form.slug,
    'form_type', v_form.form_type,
    'default_theme', coalesce(v_form.default_theme, 'light'),
    'welcome_title', v_form.welcome_title,
    'welcome_message', v_form.welcome_message,
    'exit_title', v_form.exit_title,
    'exit_message', v_form.exit_message,
    'showBranding', true,
    'questions', v_questions,
    'logicRules', v_rules
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_form(text) TO anon, authenticated;
