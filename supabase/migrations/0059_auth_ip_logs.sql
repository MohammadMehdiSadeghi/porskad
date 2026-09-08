-- ══════════════════════════════════════════════════════════════
-- 0059: Auth & IP Security Logs for SuperAdmin (God Mode)
-- ══════════════════════════════════════════════════════════════

-- ۱. ایجاد جدول اختصاصی auth_logs
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email       TEXT,
  ip_address  TEXT,
  action      TEXT NOT NULL DEFAULT 'login', -- 'login', 'register', 'logout', 'failed_login', 'impersonate'
  device      TEXT,
  browser     TEXT,
  os          TEXT,
  user_agent  TEXT,
  details     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ایندکس‌ها برای جستجوی سریع و بدون تاخیر
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON public.auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_email ON public.auth_logs(email);
CREATE INDEX IF NOT EXISTS idx_auth_logs_ip_address ON public.auth_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_auth_logs_action ON public.auth_logs(action);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON public.auth_logs(created_at DESC);

-- اطمینان از وجود ستون ip_address در activity_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public.activity_log ADD COLUMN ip_address TEXT;
  END IF;
END $$;

-- ۲. فعال‌سازی RLS روی auth_logs
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin read auth_logs" ON public.auth_logs;
CREATE POLICY "superadmin read auth_logs"
  ON public.auth_logs FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_owner(auth.uid())
    OR (auth.jwt() ->> 'email') IN ('superadmin@gmailc.com', 'superadmin@gmail.com')
  );

DROP POLICY IF EXISTS "allow insert auth_logs" ON public.auth_logs;
CREATE POLICY "allow insert auth_logs"
  ON public.auth_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ۳. تابع RPC برای ثبت رویدادهای احراز هویت و ورود/ثبت‌نام (Security Definer)
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
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
BEGIN
  v_effective_user_id := COALESCE(p_user_id, auth.uid());
  
  IF p_email IS NOT NULL AND p_email <> '' THEN
    v_effective_email := p_email;
  ELSIF v_effective_user_id IS NOT NULL THEN
    SELECT email INTO v_effective_email FROM auth.users WHERE id = v_effective_user_id;
  END IF;

  INSERT INTO public.auth_logs (
    user_id, email, ip_address, action, device, browser, os, user_agent, details, created_at
  ) VALUES (
    v_effective_user_id,
    v_effective_email,
    p_ip_address,
    COALESCE(p_action, 'login'),
    p_device,
    p_browser,
    p_os,
    p_user_agent,
    COALESCE(p_details, '{}'::jsonb),
    now()
  ) RETURNING id INTO v_id;

  -- همچنین ثبت خلاصه در activity_log جهت سازگاری
  BEGIN
    INSERT INTO public.activity_log (
      user_id, action, target_type, target_id, details, ip_address, user_agent, created_at
    ) VALUES (
      v_effective_user_id,
      p_action,
      'auth',
      v_effective_user_id::text,
      jsonb_build_object('email', v_effective_email, 'ip', p_ip_address, 'browser', p_browser, 'os', p_os),
      p_ip_address,
      p_user_agent,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- نادیده‌گیری خطای احتمالی activity_log
  END;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- ۴. تابع RPC برای دریافت خلاصه آدرس‌های IP و تاریخچه ورود یک کاربر خاص
CREATE OR REPLACE FUNCTION public.get_user_ip_history(p_user_id UUID)
RETURNS TABLE (
  ip_address TEXT,
  login_count BIGINT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  browsers TEXT[],
  devices TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- فقط سوپرادمین حق دسترسی دارد
  IF NOT (
    public.is_admin(auth.uid())
    OR public.is_owner(auth.uid())
    OR (auth.jwt() ->> 'email') IN ('superadmin@gmailc.com', 'superadmin@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    al.ip_address,
    COUNT(*)::BIGINT AS login_count,
    MIN(al.created_at) AS first_seen,
    MAX(al.created_at) AS last_seen,
    ARRAY_AGG(DISTINCT al.browser) FILTER (WHERE al.browser IS NOT NULL) AS browsers,
    ARRAY_AGG(DISTINCT al.device) FILTER (WHERE al.device IS NOT NULL) AS devices
  FROM public.auth_logs al
  WHERE al.user_id = p_user_id AND al.ip_address IS NOT NULL AND al.ip_address <> ''
  GROUP BY al.ip_address
  ORDER BY MAX(al.created_at) DESC;
END;
$$;

-- مجوزهای فراخوانی تابع‌ها
GRANT EXECUTE ON FUNCTION public.log_auth_event TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_ip_history TO authenticated, service_role;
