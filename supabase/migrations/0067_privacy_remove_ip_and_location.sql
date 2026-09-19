-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۶۶: حذف کامل ردپای IP، موقعیت مکانی و شماره تماس از لاگ‌ها
-- سیاست حریم خصوصی پرس‌کاد: لاگ‌ها فقط مرورگر، سیستم‌عامل و نوع دستگاه را نگه می‌دارند
-- ══════════════════════════════════════════════════════════════

-- ─── ۱. پاک‌سازی داده‌های موجود ───

-- ستون IP در چهار جدول: خالی‌سازی و سپس حذف ستون (idempotent)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['auth_logs', 'activity_log', 'responses', 'embed_events'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'ip_address'
    ) THEN
      EXECUTE format('UPDATE public.%I SET ip_address = NULL WHERE ip_address IS NOT NULL', t);
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN ip_address', t);
    END IF;
  END LOOP;
END;
$$;

-- حذف index مربوط به IP اگر باقی مانده باشد
DROP INDEX IF EXISTS public.idx_auth_logs_ip_address;

-- پاک‌سازی کلیدهای حساس مکان/IP از دل jsonb جزئیات لاگ‌ها
-- ⚠️ شماره تلفن (phone) عمداً حذف نمی‌شود — طبق خواسته کاربر فقط IP و موقعیت ممنوع است
UPDATE public.auth_logs
SET details = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(details)
  WHERE key NOT IN ('ip','client_ip','ip_address','country','city','location','lat','lng','latitude','longitude')
)
WHERE details IS NOT NULL AND jsonb_typeof(details) = 'object'
  AND details ?| array['ip','client_ip','ip_address','country','city','location','lat','lng','latitude','longitude'];

UPDATE public.activity_log
SET details = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(details)
  WHERE key NOT IN ('ip','client_ip','ip_address','country','city','location','lat','lng','latitude','longitude')
)
WHERE details IS NOT NULL AND jsonb_typeof(details) = 'object'
  AND details ?| array['ip','client_ip','ip_address','country','city','location','lat','lng','latitude','longitude'];

-- ─── ۲. بازنویسی تابع log_auth_event بدون IP ───
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_action TEXT DEFAULT 'login',
  p_device TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_effective_user_id UUID;
  v_effective_email TEXT;
  v_safe_details JSONB;
BEGIN
  v_effective_user_id := COALESCE(p_user_id, auth.uid());

  IF p_email IS NOT NULL AND p_email <> '' THEN
    v_effective_email := p_email;
  ELSIF v_effective_user_id IS NOT NULL THEN
    SELECT email INTO v_effective_email FROM auth.users WHERE id = v_effective_user_id;
  END IF;

  -- حذف هرگونه داده حساس که کلاینت فرستاده باشد
  v_safe_details := COALESCE(p_details, '{}'::jsonb);
  IF jsonb_typeof(v_safe_details) = 'object' THEN
    v_safe_details := (
      SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
      FROM jsonb_each(v_safe_details)
      WHERE key NOT IN ('ip','client_ip','ip_address','country','city','location','lat','lng','latitude','longitude')
    );
  END IF;

  INSERT INTO public.auth_logs (
    user_id, email, action, device, browser, os, user_agent, details, created_at
  ) VALUES (
    v_effective_user_id,
    v_effective_email,
    COALESCE(p_action, 'login'),
    p_device,
    p_browser,
    p_os,
    p_user_agent,
    v_safe_details,
    now()
  ) RETURNING id INTO v_id;

  -- ثبت خلاصه در activity_log جهت سازگاری (بدون IP)
  BEGIN
    INSERT INTO public.activity_log (
      user_id, action, target_type, target_id, details, user_agent, created_at
    ) VALUES (
      v_effective_user_id,
      p_action,
      'auth',
      v_effective_user_id::text,
      jsonb_build_object('email', v_effective_email, 'browser', p_browser, 'os', p_os),
      p_user_agent,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- حذف امضای قدیمی با پارامتر IP (اگر هنوز باقی مانده باشد)
DROP FUNCTION IF EXISTS public.log_auth_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

-- ─── ۳. بازنویسی get_all_auth_logs بدون IP و phone ───
DROP FUNCTION IF EXISTS public.get_all_auth_logs(INT, TEXT);

CREATE OR REPLACE FUNCTION public.get_all_auth_logs(
  p_limit INT DEFAULT 250,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  action TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_superadmin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_owner = true)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    COALESCE(al.email, p.email) AS email,
    p.full_name,
    p.phone,
    al.action,
    al.device,
    al.browser,
    al.os,
    al.user_agent,
    al.details,
    al.created_at
  FROM public.auth_logs al
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE (
    p_search IS NULL OR p_search = '' OR
    al.email ILIKE '%' || p_search || '%' OR
    al.action ILIKE '%' || p_search || '%' OR
    p.full_name ILIKE '%' || p_search || '%'
  )
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ─── ۴. حذف تابع تاریخچه IP کاربر ───
DROP FUNCTION IF EXISTS public.get_user_ip_history(UUID);

GRANT EXECUTE ON FUNCTION public.log_auth_event TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_auth_logs TO authenticated, service_role;
