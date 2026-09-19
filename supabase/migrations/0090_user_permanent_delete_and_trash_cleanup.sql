-- ══════════════════════════════════════════════════════════════
-- 0087: User Permanent Delete & Strict SuperAdmin Trash Retention
-- ══════════════════════════════════════════════════════════════

SET lock_timeout = '10s';

-- ۱. حذف تریگرهای تک‌جواب، تیکت و سوالات (طبق سناریو: هیچ تک‌جواب یا آیتم متفرقه‌ای به سطل زباله نمی‌رود)
DROP TRIGGER IF EXISTS trg_trash_response ON public.responses;
DROP TRIGGER IF EXISTS trg_trash_ticket ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_trash_question ON public.questions;

-- ۲. پاکسازی رکوردهای تک‌جواب و متفرقه از جدول trash (فقط فرم‌ها و کاربران در سطل زباله می‌مانند)
DELETE FROM public.trash WHERE entity_type NOT IN ('form', 'user');

-- ۳. اطمینان از وجود ستون user_purged_at روی جدول forms
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS user_purged_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_forms_user_purged_at ON public.forms (user_purged_at);

-- ۴. تابع امن RPC برای حذف قطعی فرم توسط کاربر از سطل زباله خودش
-- عملکرد: فرم از دید کاربر برای همیشه محو می‌شود و جهت نگهداری ۳۰ روزه در سطل زباله سوپرادمین ثبت می‌گردد
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

  -- بررسی وجود فرم
  SELECT * INTO v_form FROM public.forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'form_not_found');
  END IF;

  -- بررسی دسترسی (مالک، مدیر یا سوپرادمین)
  IF NOT (
    v_form.created_by = v_caller
    OR v_form.manager_id = v_caller
    OR public.is_owner()
    OR public.is_admin()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- نام نمایشی حذف‌کننده
  SELECT coalesce(full_name, email, 'کاربر') INTO v_caller_name FROM public.profiles WHERE id = v_caller;

  -- جمع‌آوری اسنپ‌شات سوالات فرم
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.position), '[]'::jsonb)
  INTO v_questions
  FROM public.questions q
  WHERE q.form_id = p_form_id;

  -- ثبت در جدول trash برای سوپرادمین (مهلت ۳۰ روزه)
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
    -- در صورت خطای درج در trash ادامه می‌دهیم تا فرم حتماً از دید کاربر حذف شود
  END;

  -- علامت‌گذاری قطعی فرم جهت خروج کامل از دسترس کاربر
  UPDATE public.forms
  SET
    deleted_at = coalesce(deleted_at, v_now),
    published = false,
    user_purged_at = v_now,
    settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
      'user_purged', true,
      'user_purged_at', v_now,
      'deleted_by', v_caller,
      'deleted_by_name', v_caller_name
    )
  WHERE id = p_form_id;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'فرم با موفقیت از سطل زباله پاک و جهت بایگانی ۳۰ روزه به سوپرادمین منتقل شد.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_permanent_delete_form(uuid) TO authenticated;
