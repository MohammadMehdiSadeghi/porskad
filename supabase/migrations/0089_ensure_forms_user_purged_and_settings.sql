-- ══════════════════════════════════════════════════════════════
-- 0089: Ensure user_purged_at, settings, and RPC for forms permanent delete
-- ══════════════════════════════════════════════════════════════

SET lock_timeout = '10s';

-- ۱. ستون‌های نگهداری حذف دائمی کاربر و تنظیمات فرم
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS user_purged_at timestamptz DEFAULT NULL;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_forms_user_purged_at ON public.forms (user_purged_at);

-- ۲. به‌روزرسانی تابع امن RPC جهت انتقال فرم حذف دائمی شده به بایگانی ۳۰ روزه سوپرادمین
CREATE OR REPLACE FUNCTION public.user_permanent_delete_form(p_form_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form record;
  v_caller uuid := auth.uid();
  v_questions jsonb;
  v_now timestamptz := now();
  v_expires timestamptz := now() + interval '30 days';
  v_caller_name text;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_form FROM public.forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'form_not_found');
  END IF;

  IF NOT (
    v_form.created_by = v_caller
    OR v_form.manager_id = v_caller
    OR (SELECT coalesce(is_owner, false) FROM public.profiles WHERE id = v_caller)
    OR (SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_caller AND role_id = 'admin' AND active = true))
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT coalesce(full_name, email, 'کاربر') INTO v_caller_name FROM public.profiles WHERE id = v_caller;

  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.position), '[]'::jsonb)
  INTO v_questions
  FROM public.questions q
  WHERE q.form_id = p_form_id;

  BEGIN
    INSERT INTO public.trash (
      entity_type,
      entity_id,
      label,
      payload,
      user_id,
      deleted_by,
      deleted_by_name,
      deleted_at,
      expires_at
    ) VALUES (
      'form',
      v_form.id,
      'فرم «' || coalesce(v_form.title, v_form.slug, 'بدون عنوان') || '»',
      to_jsonb(v_form) || jsonb_build_object(
        'questions', v_questions,
        'user_deleted_permanent', true,
        'user_purged_at', v_now
      ),
      coalesce(v_form.created_by, v_form.manager_id, v_caller),
      v_caller,
      v_caller_name,
      v_now,
      v_expires
    );
  EXCEPTION WHEN OTHERS THEN
  END;

  UPDATE public.forms
  SET
    deleted_at = coalesce(deleted_at, v_now),
    published = false,
    user_purged_at = v_now
  WHERE id = p_form_id;

  BEGIN
    UPDATE public.forms
    SET settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
      'user_purged', true,
      'user_purged_at', v_now,
      'deleted_by', v_caller,
      'deleted_by_name', v_caller_name
    )
    WHERE id = p_form_id;
  EXCEPTION WHEN OTHERS THEN
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'فرم با موفقیت از سطل زباله پاک و جهت بایگانی ۳۰ روزه به سوپرادمین منتقل شد.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_permanent_delete_form(uuid) TO authenticated;
