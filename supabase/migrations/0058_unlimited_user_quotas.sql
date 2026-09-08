-- ==============================================================================
-- Migration 0058: Unlimited Active Forms & Registrations Capability
-- قابلیت اختصاص سهمیه نامحدود برای فرم‌های فعال و تعداد ثبت‌نام بدون نیاز به سوپرادمین
-- ==============================================================================

BEGIN;

-- ۱. به‌روزرسانی تریگر سقف فرم‌های فعال جهت پشتیبانی کامل از سهمیه نامحدود
CREATE OR REPLACE FUNCTION public.tr_check_active_forms_limit()
RETURNS trigger AS $$
DECLARE
  v_count integer;
  v_max integer;
  v_is_owner boolean;
  v_user_id uuid;
BEGIN
  -- فقط زمانی که فرم فعال/منتشر می‌شود و آرشیو یا حذف شده نیست
  IF (NEW.published = true) AND (NEW.archived IS DISTINCT FROM true) AND (NEW.deleted_at IS NULL) THEN
    v_user_id := COALESCE(NEW.created_by, NEW.manager_id);
    IF v_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- سوپرادمین هیچ‌گونه محدودیتی ندارد
    SELECT is_owner INTO v_is_owner FROM public.profiles WHERE id = v_user_id;
    IF v_is_owner = true THEN
      RETURN NEW;
    END IF;

    -- دریافت سقف فرم‌های کاربر
    SELECT COALESCE(max_forms, 5) INTO v_max FROM public.profiles WHERE id = v_user_id;
    
    -- اگر کاربر سهمیه نامحدود داشته باشد (۹۹۹۹۹۹ یا بالاتر یا -۱)، نیازی به بررسی سقف نیست
    IF v_max >= 999999 OR v_max = -1 THEN
      RETURN NEW;
    END IF;

    IF v_max IS NULL OR v_max <= 0 THEN
      v_max := 5;
    END IF;

    -- شمارش فرم‌های فعال این کاربر
    SELECT count(*) INTO v_count
    FROM public.forms
    WHERE (created_by = v_user_id OR manager_id = v_user_id)
      AND published = true
      AND (archived IS DISTINCT FROM true)
      AND deleted_at IS NULL
      AND id <> NEW.id;

    IF v_count >= v_max THEN
      RAISE EXCEPTION 'سقف فرم‌های همزمان فعال (حداکثر % فرم) تکمیل شده است. لطفاً ابتدا یکی از فرم‌های فعال را غیرفعال یا بایگانی کنید.', v_max;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ۲. به‌روزرسانی تابع submit_public_response جهت رد کردن محدودیت برای کاربران با سهمیه نامحدود
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
  -- ۱. اعتبارسنجی اولیه فرم
  SELECT id, public_id, published, archived, deleted_at, title, manager_id, created_by
  INTO v_form
  FROM public.forms
  WHERE public_id = p_form_public_id OR id::text = p_form_public_id;

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

    -- اگر کاربر سوپرادمین باشد یا سهمیه ورودی نامحدود (۹۹۹۹۹۹ یا -۱) داشته باشد، سهمیه بدون محدودیت است
    IF v_is_owner IS NOT TRUE AND v_max_resp < 999999 AND v_max_resp <> -1 THEN
      -- بررسی پایان چرخه ۳۰ روزه و ریست خودکار
      IF v_reset_at IS NOT NULL AND now() >= v_reset_at THEN
        UPDATE public.profiles
        SET monthly_responses_used = 0,
            quota_reset_at = now() + INTERVAL '30 days'
        WHERE id = v_owner_id;
        v_used_resp := 0;
      END IF;

      -- بررسی سقف ورودی
      IF v_used_resp >= v_max_resp THEN
        RAISE EXCEPTION 'سهمیه ماهانه ورودی‌های این فرم (% ورودی در ماه) تکمیل شده است.', v_max_resp;
      END IF;

      -- افزایش شمارنده توکن مصرفی ماهانه
      UPDATE public.profiles
      SET monthly_responses_used = monthly_responses_used + 1
      WHERE id = v_owner_id;
    ELSIF v_is_owner IS NOT TRUE THEN
      -- برای کاربران نامحدود فقط شمارنده مصرف جهت آمار افزایش یابد (بدون بلاک شدن)
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
    referrer,
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
    SELECT id, type, required, options, min_val, max_val, title
    FROM public.questions
    WHERE form_id = v_form.id
  LOOP
    v_val := p_answers->(v_q.id::text);

    IF v_val IS NOT NULL AND v_val <> 'null'::jsonb THEN
      v_val_text := CASE WHEN jsonb_typeof(v_val) = 'string' THEN v_val#>>'{}' ELSE v_val::text END;

      -- بررسی طول پاسخ‌های متنی
      IF v_q.type = 'short_text' AND length(v_val_text) > 300 THEN
        RAISE EXCEPTION 'پاسخ سوال «%» بیش از حد مجاز طولانی است.', v_q.title;
      END IF;

      IF v_q.type = 'long_text' AND length(v_val_text) > 4000 THEN
        RAISE EXCEPTION 'پاسخ سوال «%» بیش از حد مجاز طولانی است.', v_q.title;
      END IF;

      -- بررسی فرمت شماره موبایل ایران
      IF v_q.type = 'phone_ir' AND length(v_val_text) > 0 THEN
        IF v_val_text !~ '^09[0-9]{9}$' THEN
          RAISE EXCEPTION 'شماره موبایل وارد شده برای سوال «%» معتبر نیست.', v_q.title;
        END IF;
      END IF;

      -- بررسی ریتینگ ۱ تا ۵
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

      -- زمان صرف‌شده برای این سوال
      v_time_spent := (p_times->>(v_q.id::text))::numeric;

      -- ثبت پاسخ در جدول answers
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

  RETURN jsonb_build_object('ok', true, 'responseId', v_response_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ۳. تابع اختصاصی تغییر سریع وضعیت سهمیه نامحدود توسط ادمین
CREATE OR REPLACE FUNCTION public.set_user_unlimited_quota(p_user_id uuid, p_unlimited boolean)
RETURNS jsonb AS $$
DECLARE
  v_caller_is_admin boolean;
BEGIN
  -- بررسی دسترسی: فقط ادمین یا اونر مجاز به تغییر است
  SELECT (is_owner = true OR public.is_admin(auth.uid())) INTO v_caller_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'شما دسترسی لازم برای تغییر سهمیه کاربران را ندارید.';
  END IF;

  IF p_unlimited THEN
    UPDATE public.profiles
    SET max_forms = 999999,
        max_responses_per_month = 999999,
        plan = 'unlimited'
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET max_forms = 5,
        max_responses_per_month = 100,
        plan = 'free'
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'unlimited', p_unlimited,
    'max_forms', CASE WHEN p_unlimited THEN 999999 ELSE 5 END,
    'max_responses', CASE WHEN p_unlimited THEN 999999 ELSE 100 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_user_unlimited_quota(uuid, boolean) TO authenticated;

COMMIT;
