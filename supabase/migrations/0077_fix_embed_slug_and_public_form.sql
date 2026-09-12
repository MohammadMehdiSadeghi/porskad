-- ══════════════════════════════════════════════════════════════
-- 0077: Support slug lookup in get_public_form and submit_public_response
-- ══════════════════════════════════════════════════════════════

-- بروزرسانی get_public_form برای پشتیبانی از public_id، id و slug
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
  WHERE (f.public_id = p_form_id OR f.id::text = p_form_id OR f.slug = p_form_id)
    AND f.published = true
    AND f.archived = false
    AND f.deleted_at IS NULL
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
      'jump_actions', q.jump_actions,
      'display_mode', q.display_mode,
      'max_selections', q.max_selections,
      'validation', q.validation,
      'correct_answer', q.correct_answer,
      'score', q.score
    ) ORDER BY q.position
  ), '[]'::jsonb) INTO v_questions
  FROM public.questions q
  WHERE q.form_id = (v_form->>'id')::uuid
    AND (q.deleted_at IS NULL);

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
    ) ORDER BY lr.priority
  ), '[]'::jsonb) INTO v_rules
  FROM public.logic_rules lr
  WHERE lr.form_id = (v_form->>'id')::uuid;

  RETURN jsonb_build_object(
    'id', v_form->>'id',
    'uuid_id', v_form->>'id',
    'public_id', coalesce(v_form->>'public_id', v_form->>'id'),
    'title', v_form->>'title',
    'description', v_form->>'description',
    'slug', v_form->>'slug',
    'form_type', coalesce(v_form->>'form_type', 'step_by_step'),
    'default_theme', coalesce(v_form->>'default_theme', 'light'),
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

-- بروزرسانی submit_public_response برای پشتیبانی از slug
CREATE OR REPLACE FUNCTION public.submit_public_response(
  p_form_public_id text,
  p_answers jsonb,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_times jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_form record;
  v_response_id uuid;
  v_q record;
  v_val jsonb;
  v_val_text text;
  v_val_int int;
  v_duration int;
  v_recent_count int;
  v_time_spent numeric;
  v_owner_id uuid;
  v_is_owner boolean;
  v_max_resp integer;
  v_used_resp integer;
  v_reset_at timestamptz;
BEGIN
  -- ۱. اعتبارسنجی اولیه فرم (بر اساس public_id، id یا slug)
  SELECT id, public_id, published, archived, deleted_at, title, manager_id, created_by
  INTO v_form
  FROM public.forms
  WHERE public_id = p_form_public_id OR id::text = p_form_public_id OR slug = p_form_public_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'فرم مورد نظر یافت نشد.';
  END IF;

  IF v_form.published = false OR v_form.archived = true OR v_form.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'این فرم در حال حاضر غیرفعال یا مسدود است.';
  END IF;

  -- ۲. بررسی سهمیه ورودی ماهانه کاربر ایجادکننده فرم
  v_owner_id := COALESCE(v_form.created_by, v_form.manager_id);
  IF v_owner_id IS NOT NULL THEN
    SELECT is_owner, COALESCE(max_responses_per_month, 100), monthly_responses_used, quota_reset_at
    INTO v_is_owner, v_max_resp, v_used_resp, v_reset_at
    FROM public.profiles
    WHERE id = v_owner_id;

    IF v_is_owner IS NOT TRUE AND v_max_resp < 999999 AND v_max_resp <> -1 THEN
      IF v_reset_at IS NOT NULL AND now() >= v_reset_at THEN
        UPDATE public.profiles
        SET monthly_responses_used = 0,
            quota_reset_at = now() + INTERVAL '30 days'
        WHERE id = v_owner_id;
        v_used_resp := 0;
      END IF;

      IF v_used_resp >= v_max_resp THEN
        RAISE EXCEPTION 'سهمیه ماهانه ورودی‌های این فرم (% ورودی در ماه) تکمیل شده است.', v_max_resp;
      END IF;

      UPDATE public.profiles
      SET monthly_responses_used = monthly_responses_used + 1
      WHERE id = v_owner_id;
    ELSIF v_is_owner IS NOT TRUE THEN
      UPDATE public.profiles
      SET monthly_responses_used = monthly_responses_used + 1
      WHERE id = v_owner_id;
    END IF;
  END IF;

  -- ۳. محدودکننده نرخ ارسال (Rate Limiting)
  SELECT count(*) INTO v_recent_count
  FROM public.responses
  WHERE form_id = v_form.id
    AND created_at > now() - interval '1 minute';

  IF v_recent_count > 60 THEN
    RAISE EXCEPTION 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کرده و مجدداً تلاش نمایید.';
  END IF;

  -- محاسبه مدت زمان کل
  IF p_meta->>'startedAt' IS NOT NULL AND p_meta->>'completedAt' IS NOT NULL THEN
    v_duration := EXTRACT(EPOCH FROM ((p_meta->>'completedAt')::timestamptz - (p_meta->>'startedAt')::timestamptz))::int;
  ELSE
    v_duration := NULL;
  END IF;

  -- ۴. ثبت در جدول responses
  INSERT INTO public.responses (
    form_id,
    is_complete,
    duration_seconds,
    device,
    browser,
    os,
    user_agent,
    referrer_url,
    submitted_at
  ) VALUES (
    v_form.id,
    true,
    v_duration,
    COALESCE(p_meta->>'device', 'desktop'),
    p_meta->>'browser',
    p_meta->>'os',
    p_meta->>'userAgent',
    p_meta->>'referrerUrl',
    now()
  ) RETURNING id INTO v_response_id;

  -- ۵. اعتبارسنجی و ثبت تک‌تک پاسخ‌ها
  FOR v_q IN
    SELECT id, type, required, options, max_selections, title
    FROM public.questions
    WHERE form_id = v_form.id AND (deleted_at IS NULL)
  LOOP
    v_val := p_answers->(v_q.id::text);

    IF v_val IS NOT NULL AND v_val <> 'null'::jsonb THEN
      v_val_text := CASE WHEN jsonb_typeof(v_val) = 'string' THEN v_val#>>'{}' ELSE v_val::text END;

      IF v_q.type = 'short_text' AND length(v_val_text) > 300 THEN
        RAISE EXCEPTION 'پاسخ سوال «%» بیش از حد مجاز طولانی است.', v_q.title;
      END IF;

      IF v_q.type = 'long_text' AND length(v_val_text) > 4000 THEN
        RAISE EXCEPTION 'پاسخ سوال «%» بیش از حد مجاز طولانی است.', v_q.title;
      END IF;

      IF v_q.type = 'phone_ir' AND length(v_val_text) > 0 THEN
        IF v_val_text !~ '^09[0-9]{9}$' THEN
          RAISE EXCEPTION 'شماره موبایل وارد شده برای سوال «%» معتبر نیست.', v_q.title;
        END IF;
      END IF;

      IF v_q.type = 'rating' THEN
        BEGIN
          v_val_int := v_val_text::int;
          IF v_val_int < 1 OR v_val_int > 5 THEN
            RAISE EXCEPTION 'امتیاز باید بین ۱ تا ۵ باشد.';
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION 'امتیاز نامعتبر است.';
        END;
      END IF;

      v_time_spent := (p_times->>(v_q.id::text))::numeric;

      INSERT INTO public.answers (
        response_id,
        question_id,
        value,
        time_spent_seconds
      ) VALUES (
        v_response_id,
        v_q.id,
        v_val,
        v_time_spent
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'responseId', v_response_id,
    'response_id', v_response_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.submit_public_response(text, jsonb, jsonb, jsonb) TO anon, authenticated;
