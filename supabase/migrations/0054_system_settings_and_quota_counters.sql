-- ==============================================================================
-- Migration 0053: System Settings, 5 Active Forms Limit, & Monthly Quota Counter
-- ==============================================================================

-- ۱. فعال‌سازی انتشار بلادرنگ جداول در supabase_realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.forms;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ۲. افزودن فیلدهای شمارنده مصرف ماهانه و تاریخ ریست ۳۰ روزه به profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_responses_used integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS quota_reset_at timestamptz DEFAULT (now() + INTERVAL '30 days');

-- مقداردهی اولیه تاریخ ریست برای کاربران موجود (۳۰ روز پس از تاریخ ثبت‌نام)
UPDATE public.profiles
SET quota_reset_at = COALESCE(created_at, now()) + INTERVAL '30 days'
WHERE quota_reset_at IS NULL;

-- ۳. تریگر سقف ۵ فرم همزمان فعال در سطح دیتابیس
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

    -- بررسی اینکه آیا کاربر سوپرادمین است؟ سوپرادمین محدودیت ندارد
    SELECT is_owner INTO v_is_owner FROM public.profiles WHERE id = v_user_id;
    IF v_is_owner = true THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(max_forms, 5) INTO v_max FROM public.profiles WHERE id = v_user_id;
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

DROP TRIGGER IF EXISTS tr_enforce_active_forms_limit ON public.forms;
CREATE TRIGGER tr_enforce_active_forms_limit
  BEFORE INSERT OR UPDATE OF published, archived, deleted_at, manager_id, created_by ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_check_active_forms_limit();

-- ۴. تابع ریست دستی سهمیه توسط سوپرادمین در پنل ادمین
CREATE OR REPLACE FUNCTION public.reset_user_monthly_quota(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_caller_is_owner boolean;
  v_new_reset_at timestamptz;
BEGIN
  -- بررسی دسترسی: فقط سوپرادمین
  SELECT is_owner INTO v_caller_is_owner FROM public.profiles WHERE id = auth.uid();
  IF v_caller_is_owner IS NOT TRUE THEN
    RAISE EXCEPTION 'فقط مدیر کل سیستم مجاز به ریست سهمیه است.';
  END IF;

  v_new_reset_at := now() + INTERVAL '30 days';

  UPDATE public.profiles
  SET monthly_responses_used = 0,
      quota_reset_at = v_new_reset_at
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'monthly_responses_used', 0,
    'quota_reset_at', v_new_reset_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ۵. جدول تنظیمات سراسری سیستم (System Settings)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow read system_settings" ON public.system_settings;
CREATE POLICY "allow read system_settings"
  ON public.system_settings FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "allow owner update system_settings" ON public.system_settings;
CREATE POLICY "allow owner update system_settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));

-- درج مقادیر پیش‌فرض
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('site_title', '"پرس‌کاد"'::jsonb, 'عنوان و نام تجاری سایت'),
  ('telegram_support_id', '"porskad_support"'::jsonb, 'آیدی پشتیبانی تلگرام'),
  ('default_max_active_forms', '5'::jsonb, 'سقف پیش‌فرض فرم‌های همزمان فعال'),
  ('default_max_monthly_responses', '100'::jsonb, 'سقف پیش‌فرض ورودی‌های ماهانه هر کاربر'),
  ('registration_enabled', 'true'::jsonb, 'امکان ثبت‌نام کاربران جدید')
ON CONFLICT (key) DO NOTHING;

-- تابع واکشی کلیه تنظیمات
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS jsonb AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT jsonb_object_agg(key, value) INTO v_res FROM public.system_settings;
  RETURN COALESCE(v_res, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- تابع ذخیره تنظیمات سیستم توسط سوپرادمین
CREATE OR REPLACE FUNCTION public.update_system_settings(p_settings jsonb)
RETURNS jsonb AS $$
DECLARE
  v_is_owner boolean;
  v_key text;
  v_val jsonb;
BEGIN
  SELECT is_owner INTO v_is_owner FROM public.profiles WHERE id = auth.uid();
  IF v_is_owner IS NOT TRUE THEN
    RAISE EXCEPTION 'فقط سوپرادمین مجاز به تغییر تنظیمات است.';
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_settings)
  LOOP
    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES (v_key, v_val, now())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now();
  END LOOP;

  RETURN public.get_system_settings();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ۶. به‌روزرسانی submit_public_response با بررسی سهمیه ۱۰۰ تایی ماهانه و چرخه ۳۰ روزه
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

    IF v_is_owner IS NOT TRUE THEN
      -- بررسی پایان چرخه ۳۰ روزه و ریست خودکار
      IF v_reset_at IS NOT NULL AND now() >= v_reset_at THEN
        UPDATE public.profiles
        SET monthly_responses_used = 0,
            quota_reset_at = now() + INTERVAL '30 days'
        WHERE id = v_owner_id;
        v_used_resp := 0;
      END IF;

      -- بررسی سقف ۱۰۰ ورودی
      IF v_used_resp >= v_max_resp THEN
        RAISE EXCEPTION 'سهمیه ماهانه ورودی‌های این فرم (% ورودی در ماه) تکمیل شده است.', v_max_resp;
      END IF;

      -- افزایش شمارنده توکن مصرفی ماهانه (با حذف پاسخ توکن برنمی‌گردد)
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

  IF v_recent_count > 30 THEN
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
