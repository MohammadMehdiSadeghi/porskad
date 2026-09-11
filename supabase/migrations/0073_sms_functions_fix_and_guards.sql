-- ══════════════════════════════════════════════════════════════════════
-- 0073 — اصلاح توابع اس‌ام‌اس (که به ستون‌های ناموجود ارجاع می‌دادند و
-- از همان اول می‌سوختند) + گارد سوپرادمین + بستن log_auth_event از anon
-- ستون‌های واقعی: sms_settings(amoot_token,...,updated_by) / sms_outbox(created_by)
-- ══════════════════════════════════════════════════════════════════════

-- ۱) get_active_sms_settings — ستون ghalt: api_token → amoot_token
CREATE OR REPLACE FUNCTION public.get_active_sms_settings()
RETURNS TABLE(id uuid, api_token text, line_number text, sender_name text, is_active boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'not authorized: superadmin only';
  END IF;
  RETURN QUERY
    SELECT s.id, s.amoot_token, s.line_number, s.sender_name, s.is_active
    FROM public.sms_settings s
    WHERE s.is_active = true
    LIMIT 1;
END;
$$;

-- ۲) get_sms_stats — ستون ghalt: sent_anonymously (count(*) → created_by IS NULL)
CREATE OR REPLACE FUNCTION public.get_sms_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'not authorized: superadmin only';
  END IF;
  SELECT jsonb_build_object(
    'total_sent', (SELECT count(*) FROM public.sms_outbox),
    'today_sent', (SELECT count(*) FROM public.sms_outbox WHERE created_at >= current_date),
    'month_sent', (SELECT count(*) FROM public.sms_outbox WHERE created_at >= date_trunc('month', now())),
    'delivered', (SELECT count(*) FROM public.sms_outbox WHERE status = 'delivered'),
    'failed', (SELECT count(*) FROM public.sms_outbox WHERE status = 'failed'),
    'sent_anonymously', (SELECT count(*) FROM public.sms_outbox WHERE created_by IS NULL)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.save_sms_settings(text, text, text);

-- ۳) save_sms_settings — ستون ghalt: created_by → updated_by + حذف درج api_token
CREATE OR REPLACE FUNCTION public.save_sms_settings(
  p_amoot_token text, p_line_number text, p_sender_name text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'not authorized: superadmin only';
  END IF;
  UPDATE public.sms_settings SET is_active = false WHERE is_active = true;
  INSERT INTO public.sms_settings (
    amoot_token, line_number, sender_name, is_active, updated_by, updated_at
  ) VALUES (
    p_amoot_token, p_line_number, p_sender_name, true, auth.uid(), now()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ۴) log_auth_event: از public/anon پس گرفته شود (fallback لاگین؛ لاگین
--    همیشه با anon انجام می‌شود ولی این تابع خودش اقلیت احراز را می‌نویسد)
--    توجه: مسیر اصلی از api/auth-log.js (سرور) است؛ این فالبک پس از لاگین است.
REVOKE EXECUTE ON FUNCTION public.log_auth_event(uuid,text,text,text,text,text,text,jsonb) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.log_auth_event(uuid,text,text,text,text,text,text,jsonb) TO authenticated;
