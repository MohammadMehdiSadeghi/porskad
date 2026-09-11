-- ══════════════════════════════════════════════════════════════════════
-- 0072 — بستن EXECUTE از گروه PUBLIC روی توابع حساس
--
-- در Supabase تابعی که ACL ندارد (یا '=X/postgres' دارد) به‌طور پیش‌فرض
-- از طریق گروه PUBLIC به همه — از جمله anon — اجازهٔ اجرا می‌دهد.
-- بنابراین هر «REVOKE ... FROM anon» قبلی بی‌اثر بود. اینجا صریح از PUBLIC
-- پس گرفته و فقط به نقش‌های لازم برگردانده می‌شود.
-- ══════════════════════════════════════════════════════════════════════

-- ─── ۱) توابع کمکی که داخل عبارات RLS صدا زده می‌شوند: عمومی می‌مانند
-- (is_admin / is_owner / is_superadmin / is_primary_god / has_permission)
-- چیزی لازم نیست؛ فقط مستند شد.

-- ─── ۲) توابع ادمین/گود: از anon و public پس گرفته شود ───
REVOKE EXECUTE ON FUNCTION public.update_system_settings(jsonb)            FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_active_sms_settings()                 FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_sms_stats()                           FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.save_sms_settings(text,text,text)         FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_database_storage_stats()              FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_form_response_counts()                FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid)                FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.update_user_email(uuid,text)              FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.log_activity(text,text,text,jsonb)        FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.log_error(text,text,text,text)            FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.log_sms_outbox(text,text,text,text,text)  FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.purge_responses(uuid)                     FROM public, anon;

-- فقط کاربران لاگین‌کرده (احراز سطح‌اختیار داخل تابع/RLS انجام می‌شود)
GRANT  EXECUTE ON FUNCTION public.get_user_permissions(uuid)      TO authenticated;
GRANT  EXECUTE ON FUNCTION public.log_activity(text,text,text,jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.log_error(text,text,text,text)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_form_response_counts()      TO authenticated;

-- این‌ها فقط سمت سرور (service_role) لازم‌اند؛ حتی authenticated هم نه:
-- get_active_sms_settings / get_sms_stats / save_sms_settings هیچ فراخوان
-- کلاینتی ندارند (تنظیمات اس‌ام‌اس از مسیر api/ انجام می‌شود).

-- ─── ۳) گارد داخلی get_form_response_counts: فقط آمار فرم‌های خود کاربر ───
-- (پیش‌تر شمارش پاسخ EVERY form را به هر کاربر لاگین‌کرده می‌داد)
CREATE OR REPLACE FUNCTION public.get_form_response_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_row    RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  FOR v_row IN
    SELECT r.form_id,
           count(*) AS total,
           count(*) FILTER (WHERE r.is_complete) AS complete
    FROM public.responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE public.is_admin(auth.uid())
       OR public.is_owner(auth.uid())
       OR f.created_by = auth.uid()
       OR f.manager_id = auth.uid()
    GROUP BY r.form_id
  LOOP
    v_result := v_result || jsonb_build_object(
      v_row.form_id::text,
      jsonb_build_object('total', v_row.total, 'complete', v_row.complete)
    );
  END LOOP;

  RETURN v_result;
END;
$$;

-- ─── ۴) گارد داخلی get_database_storage_stats: فقط سوپرادمین ───
CREATE OR REPLACE FUNCTION public.get_database_storage_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_size bigint; v_tables jsonb; v_rows bigint;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'not authorized: superadmin only';
  END IF;

  SELECT pg_database_size(current_database()) INTO v_size;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'table_name', t.tbl,
           'size_bytes', t.sz,
           'row_count', t.rc
         ) ORDER BY t.sz DESC), '[]'::jsonb)
  INTO v_tables
  FROM (
    SELECT c.relname::text AS tbl,
           pg_total_relation_size(c.oid) AS sz,
           coalesce((xpath('/row/c/text()', query_to_xml(
              format('select count(*) as c from public.%I', c.relname),
              false, true, '')))[1]::text::bigint, 0) AS rc
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) t;

  SELECT coalesce(sum((xpath('/row/c/text()', query_to_xml(
              format('select count(*) as c from public.%I', c.relname),
              false, true, '')))[1]::text::bigint), 0)
  INTO v_rows
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r';

  RETURN jsonb_build_object(
    'db_size_bytes', v_size,
    'db_size_text', pg_size_pretty(v_size),
    'tables', v_tables,
    'total_rows', v_rows
  );
END;
$$;

-- ─── ۵) get_active_sms_settings: توکن اس‌ام‌اس — فقط سوپرادمین ───
CREATE OR REPLACE FUNCTION public.get_active_sms_settings()
RETURNS TABLE(id uuid, api_token text, line_number text, sender_name text, is_active boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'not authorized: superadmin only';
  END IF;
  RETURN QUERY
    SELECT s.id, s.api_token, s.line_number, s.sender_name, s.is_active
    FROM public.sms_settings s
    WHERE s.is_active = true
    LIMIT 1;
END;
$$;

-- ─── ۶) get_sms_stats: فقط سوپرادمین ───
CREATE OR REPLACE FUNCTION public.get_sms_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
    'failed', (SELECT count(*) FROM public.sms_outbox WHERE status = 'failed')
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ─── ۷) log_sms_outbox: فقط سرور (api) — از هر دو نقش وب پس گرفته شد ───
-- (بالاتر از public/anon گرفته شد؛ authenticated داده نشد)

-- ─── ۸) save_form: anon دیگر نباید بتواند صدا بزند (تکرار مطمئن 0069) ───
REVOKE EXECUTE ON FUNCTION public.save_form(uuid, jsonb, jsonb) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.save_form(uuid, jsonb, jsonb) TO authenticated;

-- ─── ۹) submit_public_response باید برای anon باز بماند (فرم عمومی) ───
GRANT EXECUTE ON FUNCTION public.submit_public_response(text, jsonb, jsonb, jsonb) TO anon, authenticated;

-- ─── ۱۰) توابع کمکی: تأیید عمومی بودن (بی‌خطر، فقط مقدار boolean می‌دهند) ───
GRANT EXECUTE ON FUNCTION public.is_admin(uuid), public.is_owner(uuid),
                    public.is_superadmin(uuid), public.is_primary_god(uuid),
                    public.has_permission(uuid, text) TO public;

-- لاگ رویدادهای احراز هویت: فالبک کلاینت (activityLogger) بعد از لاگین
GRANT EXECUTE ON FUNCTION public.log_auth_event(uuid,text,text,text,text,text,text,jsonb) TO authenticated;
