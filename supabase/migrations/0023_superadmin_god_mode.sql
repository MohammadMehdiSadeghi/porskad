-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۲۳: حالت خدایی سوپرادمین
-- ══════════════════════════════════════════════════════════════

-- ─── جدول لاگ فعالیت (Activity Log) ───
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,          -- 'login', 'create_form', 'delete_response', etc.
  target_type TEXT,                   -- 'form', 'response', 'user', etc.
  target_id   TEXT,                   -- ID of the affected record
  details     JSONB DEFAULT NULL,     -- Additional context
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: فقط owner می‌تونه بخونه
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner read activity_log" ON public.activity_log;
CREATE POLICY "owner read activity_log"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "owner insert activity_log" ON public.activity_log;
CREATE POLICY "owner insert activity_log"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));

-- ─── جدول لاگ خطاها (Error Log) ───
CREATE TABLE IF NOT EXISTS public.error_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  stack       TEXT,
  source      TEXT,                   -- 'client', 'server', 'edge'
  url         TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner read error_log" ON public.error_log;
CREATE POLICY "owner read error_log"
  ON public.error_log FOR SELECT
  TO authenticated
  USING (public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "insert error_log" ON public.error_log;
CREATE POLICY "insert error_log"
  ON public.error_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ─── تابع: ورود به عنوان کاربر دیگر (Impersonation) ───
-- فقط owner می‌تونه ازش استفاده کنه
CREATE OR REPLACE FUNCTION public.impersonate_user(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_target_profile RECORD;
  v_target_role TEXT;
  v_target_perms TEXT[];
BEGIN
  -- بررسی owner بودن
  SELECT public.is_owner(auth.uid()) INTO v_is_owner;
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only owner can impersonate users';
  END IF;

  -- نمی‌تونه خودش رو impersonate کنه
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot impersonate yourself';
  END IF;

  -- اطلاعات کاربر هدف
  SELECT * INTO v_target_profile FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- نقش کاربر هدف
  SELECT role_id INTO v_target_role FROM public.user_roles WHERE user_id = p_target_user_id AND active = true LIMIT 1;

  -- مجوزهای کاربر هدف
  SELECT array_agg(permission_id) INTO v_target_perms FROM public.user_permissions WHERE user_id = p_target_user_id;

  -- لاگ فعالیت
  INSERT INTO public.activity_log (user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'impersonate', 'user', p_target_user_id::text,
    jsonb_build_object('target_email', v_target_profile.email, 'target_name', v_target_profile.full_name));

  RETURN jsonb_build_object(
    'user_id', v_target_profile.id,
    'email', v_target_profile.email,
    'full_name', v_target_profile.full_name,
    'role', COALESCE(v_target_role, 'manager'),
    'permissions', COALESCE(v_target_perms, ARRAY[]::text[]),
    'is_owner', v_target_profile.is_owner,
    'is_active', v_target_profile.is_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.impersonate_user(UUID) TO authenticated;

-- ─── تابع: آمار کامل دیتابیس ───
CREATE OR REPLACE FUNCTION public.get_db_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_tables TEXT[] := ARRAY['forms', 'questions', 'responses', 'answers', 'profiles', 'user_roles', 'user_permissions', 'logic_rules', 'activity_log', 'error_log'];
  v_table TEXT;
  v_count BIGINT;
BEGIN
  v_result := '{}'::jsonb;
  FOREACH v_table IN ARRAY v_tables
  LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', v_table) INTO v_count;
      v_result := v_result || jsonb_build_object(v_table, v_count);
    EXCEPTION WHEN OTHERS THEN
      v_result := v_result || jsonb_build_object(v_table, 0);
    END;
  END LOOP;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_db_stats() TO authenticated;

-- ─── تابع: لاگ فعالیت کاربر ───
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ─── تابع: لاگ خطا ───
CREATE OR REPLACE FUNCTION public.log_error(
  p_message TEXT,
  p_stack TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'client',
  p_url TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.error_log (user_id, message, stack, source, url)
  VALUES (auth.uid(), p_message, p_stack, p_source, p_url);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_error(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ─── تابع: حذف کامل پاسخ‌ها (برای سوپرادمین) ───
CREATE OR REPLACE FUNCTION public.purge_responses(p_form_id UUID DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owner can purge responses';
  END IF;

  IF p_form_id IS NOT NULL THEN
    DELETE FROM public.answers WHERE response_id IN (
      SELECT id FROM public.responses WHERE form_id = p_form_id
    );
    DELETE FROM public.responses WHERE form_id = p_form_id;
  ELSE
    DELETE FROM public.answers;
    DELETE FROM public.responses;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_responses(UUID) TO authenticated;

-- ─── تابع: بکاپ دیتابیس (خروجی JSON از تمام جداول) ───
CREATE OR REPLACE FUNCTION public.export_table_data(p_table_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Only owner can export data';
  END IF;

  EXECUTE format('SELECT coalesce(jsonb_agg(t.*), ''[]''::jsonb) FROM public.%I t', p_table_name)
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_table_data(TEXT) TO authenticated;
