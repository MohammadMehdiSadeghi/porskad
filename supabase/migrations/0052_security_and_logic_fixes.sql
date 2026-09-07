-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۵۲: اصلاحات امنیتی، حذف رمز متنی، اعتبارسنجی RPCها و RLS
-- ══════════════════════════════════════════════════════════════

-- ۱. [بخش ۱ - مورد ۱] حذف قطعی ستون admin_pwd و توابع مرتبط جهت جلوگیری از نشت رمز عبور
ALTER TABLE public.profiles DROP COLUMN IF EXISTS admin_pwd;
DROP FUNCTION IF EXISTS public.set_admin_user_password(uuid, text);

-- ۲. [بخش ۱ - مورد ۲] حذف پالیسی‌های بیش از حد باز USING(true) روی responses و answers
DROP POLICY IF EXISTS "allow select responses" ON public.responses;
DROP POLICY IF EXISTS "allow select answers" ON public.answers;
DROP POLICY IF EXISTS "allow delete responses" ON public.responses;

-- اطمینان از وجود پالیسی‌های امن محدود به ادمین/مالک فرم
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'responses' AND policyname = 'allow_select_responses_admin') THEN
    CREATE POLICY "allow_select_responses_admin" ON public.responses
      FOR SELECT TO authenticated
      USING (
        public.is_owner() OR
        EXISTS (
          SELECT 1 FROM public.forms f
          WHERE f.id = responses.form_id
            AND (f.manager_id = auth.uid() OR f.created_by = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'answers' AND policyname = 'allow_select_answers_admin') THEN
    CREATE POLICY "allow_select_answers_admin" ON public.answers
      FOR SELECT TO authenticated
      USING (
        public.is_owner() OR
        EXISTS (
          SELECT 1 FROM public.responses r
          JOIN public.forms f ON f.id = r.form_id
          WHERE r.id = answers.response_id
            AND (f.manager_id = auth.uid() OR f.created_by = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'responses' AND policyname = 'allow_delete_responses_owner') THEN
    CREATE POLICY "allow_delete_responses_owner" ON public.responses
      FOR DELETE TO authenticated
      USING (
        public.is_owner() OR
        EXISTS (
          SELECT 1 FROM public.forms f
          WHERE f.id = responses.form_id
            AND (f.manager_id = auth.uid() OR f.created_by = auth.uid())
        )
      );
  END IF;
END $$;

-- ۳. [بخش ۱ - مورد ۳ و بخش ۲ - مورد ۱۰] بازنویسی امن get_public_form:
-- حذف correct_answer و points از خروجی عمومی و بررسی وضعیت انتشار/آرشیو/حذف
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
  -- پیدا کردن شناسه یکتای فرم
  SELECT id INTO v_fid FROM public.forms
  WHERE public_id = p_form_id OR id::text = p_form_id
  LIMIT 1;

  IF v_fid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_form FROM public.forms WHERE id = v_fid;

  -- بررسی عدم انتشار، آرشیو بودن یا حذف نرم (مورد ۱۰)
  IF v_form.published = false 
     OR coalesce(v_form.archived, false) = true 
     OR v_form.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  -- فیلتر امن سوالات بدون فاش کردن کلید آزمون (correct_answer) و نمرات (points) (مورد ۳)
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

-- ۴. [بخش ۱ - مورد ۷ و بخش ۲ - مورد ۱۳] بازنویسی submit_public_response با اعتبارسنجی سمت سرور و زمان هر سوال
DROP FUNCTION IF EXISTS public.submit_public_response(text, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.submit_public_response(text, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.submit_public_response(
  p_form_public_id text,
  p_answers jsonb,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_times jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form_id uuid;
  v_response_id uuid;
  v_q record;
  v_answer_raw jsonb;
  v_answer_text text;
  v_answer_arr jsonb;
  v_answer_int integer;
  v_time_spent integer;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_duration integer;
  v_recent_count integer;
BEGIN
  -- ۱. بررسی وجود و انتشار فرم
  SELECT id INTO v_form_id
  FROM public.forms
  WHERE (public_id = p_form_public_id OR id::text = p_form_public_id)
    AND published = true
    AND coalesce(archived, false) = false
    AND deleted_at IS NULL;

  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'فرم یافت نشد، منقضی شده یا دسترسی به آن امکان‌پذیر نیست.';
  END IF;

  -- ۲. Rate limiting ساده برای جلوگیری از اسپم سریع
  SELECT count(*) INTO v_recent_count
  FROM public.responses
  WHERE form_id = v_form_id
    AND submitted_at > (now() - interval '1 minute');

  IF v_recent_count > 30 THEN
    RAISE EXCEPTION 'ترافیک ورودی به این فرم بسیار بالاست. لطفاً لحظاتی دیگر مجدداً تلاش کنید.';
  END IF;

  -- ۳. آماده‌سازی فراداده‌ها
  v_started_at := nullif(p_meta->>'startedAt', '')::timestamptz;
  v_completed_at := nullif(p_meta->>'completedAt', '')::timestamptz;

  IF v_started_at IS NOT NULL AND v_completed_at IS NOT NULL THEN
    v_duration := extract(epoch from (v_completed_at - v_started_at))::integer;
  END IF;

  -- ۴. ثبت رکورد اصلی response
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

  -- ۵. اعتبارسنجی تک‌تک سوالات و ثبت پاسخ‌ها
  FOR v_q IN
    SELECT id, type, title, required, options, max_selections
    FROM public.questions
    WHERE form_id = v_form_id
  LOOP
    -- بررسی پاسخ ارسال‌شده
    v_answer_raw := p_answers->(v_q.id::text);

    IF v_answer_raw IS NOT NULL AND v_answer_raw <> 'null'::jsonb THEN
      -- استخراج زمان پاسخ به این سوال (مورد ۱۳)
      v_time_spent := coalesce((p_times->>(v_q.id::text))::integer, 0);
      IF v_time_spent < 0 THEN v_time_spent := 0; END IF;

      -- اعتبارسنجی نوع فیلدها و طول مقادیر (مورد ۷)
      IF v_q.type IN ('text', 'email') THEN
        v_answer_text := v_answer_raw #>> '{}';
        IF length(v_answer_text) > 250 THEN
          RAISE EXCEPTION 'پاسخ سوال «%» بیش از حد طولانی است (حداکثر ۲۵۰ کاراکتر).', v_q.title;
        END IF;
      ELSIF v_q.type = 'long_text' THEN
        v_answer_text := v_answer_raw #>> '{}';
        IF length(v_answer_text) > 3500 THEN
          RAISE EXCEPTION 'پاسخ سوال «%» بیش از حد طولانی است (حداکثر ۳۵۰۰ کاراکتر).', v_q.title;
        END IF;
      ELSIF v_q.type = 'phone_ir' THEN
        v_answer_text := trim(v_answer_raw #>> '{}');
        IF length(v_answer_text) > 0 AND NOT (v_answer_text ~ '^09[0-9]{9}$') THEN
          RAISE EXCEPTION 'شماره موبایل وارد شده برای «%» نامعتبر است (الگوی صحیح: ۰۹۱۲۳۴۵۶۷۸۹).', v_q.title;
        END IF;
      ELSIF v_q.type = 'rating' THEN
        v_answer_int := nullif(v_answer_raw #>> '{}', '')::integer;
        IF v_answer_int IS NOT NULL AND (v_answer_int < 1 OR v_answer_int > 5) THEN
          RAISE EXCEPTION 'امتیاز سوال «%» باید بین ۱ تا ۵ باشد.', v_q.title;
        END IF;
      ELSIF v_q.type = 'choice' THEN
        IF jsonb_typeof(v_answer_raw) = 'array' THEN
          IF v_q.max_selections IS NOT NULL AND jsonb_array_length(v_answer_raw) > v_q.max_selections THEN
            RAISE EXCEPTION 'تعداد انتخاب‌های سوال «%» فراتر از حد مجاز است.', v_q.title;
          END IF;
        END IF;
      END IF;

      -- درج پاسخ در جدول answers همراه با زمان واقعی
      INSERT INTO public.answers (response_id, question_id, value, time_spent_seconds)
      VALUES (
        v_response_id,
        v_q.id,
        v_answer_raw,
        v_time_spent
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'responseId', v_response_id,
    'status', 'success'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_response(text, jsonb, jsonb, jsonb) TO anon, authenticated;

-- ۵. [بخش ۱ - مورد ۸] امن‌سازی تابع exec_sql در برابر دور زدن
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- فقط مالک اصلی سایت اجازه اجرای کوئری را دارد
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'فقط صاحب اصلی سایت می‌تواند SQL اجرا کند.';
  END IF;

  -- بررسی کلمات کلیدی مخرب در هر جای کوئری با word boundaries
  IF query ~* '\y(DELETE|INSERT|UPDATE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|VACUUM|CALL|DO)\y' THEN
    RAISE EXCEPTION 'فقط کوئری‌های خواندنی (SELECT) مجاز هستند و هرگونه عمل ویرایشی مسدود است.';
  END IF;

  -- اعمال محدودیت زمانی جهت جلوگیری از DoS
  PERFORM set_config('statement_timeout', '3000', true);

  EXECUTE 'SELECT to_jsonb(t) FROM (' || query || ' LIMIT 200) t'
  INTO v_result;

  RETURN coalesce(v_result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;

-- ۶. [بخش ۲ - مورد ۱۵] تریگر محافظتی برای تیکت‌های پشتیبانی (جلوگیری از جعل پاسخ ادمین توسط کاربر)
CREATE OR REPLACE FUNCTION public.tr_protect_support_ticket_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- اگر کاربر جاری صاحب یا ادمین نیست، تغییرات فیلدهای مدیریتی ریست می‌شوند
  IF NOT (public.is_owner() OR public.is_admin()) AND auth.role() <> 'service_role' THEN
    NEW.admin_reply := OLD.admin_reply;
    NEW.replied_at := OLD.replied_at;
    NEW.admin_id := OLD.admin_id;
    NEW.user_id := OLD.user_id;

    -- کاربر فقط مجاز است وضعیت را به closed تغییر دهد
    IF NEW.status NOT IN ('open', 'closed') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_support_ticket_fields ON public.support_tickets;
CREATE TRIGGER tr_protect_support_ticket_fields
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_protect_support_ticket_fields();
