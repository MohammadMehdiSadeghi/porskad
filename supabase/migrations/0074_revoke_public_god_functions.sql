-- ══════════════════════════════════════════════════════════════════════
-- 0074 — لایهٔ دفاع دوم: توابع گود/مدیریتی که گارد داخل-بدنه دارند،
-- از نظر ACL هم از public/anon بسته می‌شوند. (احراز اصلی همچنان داخل
-- تابع است؛ اینجا فقط اجازهٔ «صدا زدن» محدود به کاربران لاگین‌کرده می‌شود.)
-- ══════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION
  public.exec_sql(text),
  public.create_manager(text, text, text),
  public.delete_manager(uuid),
  public.reset_user_password(uuid, text),
  public.reset_user_monthly_quota(uuid),
  public.update_user_email(uuid, text),
  public.impersonate_user(uuid),
  public.purge_responses(uuid),
  public.export_table_data(text),
  public.get_all_users_full(),
  public.get_all_auth_logs(integer, text),
  public.get_db_stats(),
  public.set_manager_active(uuid, boolean),
  public.set_user_permissions(uuid, text[]),
  public.set_user_quotas(uuid, integer, integer, text),
  public.set_user_unlimited_quota(uuid, boolean)
FROM public, anon;

GRANT EXECUTE ON FUNCTION
  public.exec_sql(text),
  public.create_manager(text, text, text),
  public.delete_manager(uuid),
  public.reset_user_password(uuid, text),
  public.reset_user_monthly_quota(uuid),
  public.update_user_email(uuid, text),
  public.impersonate_user(uuid),
  public.purge_responses(uuid),
  public.export_table_data(text),
  public.get_all_users_full(),
  public.get_all_auth_logs(integer, text),
  public.get_db_stats(),
  public.set_manager_active(uuid, boolean),
  public.set_user_permissions(uuid, text[]),
  public.set_user_quotas(uuid, integer, integer, text),
  public.set_user_unlimited_quota(uuid, boolean)
TO authenticated;

-- ─── باگ واقعی log_activity: activity_log.id از نوع bigint (سریال) است ───
-- ولی تابع `returns uuid` و `returning id into v_id (uuid)` بود → هر فراخوانی
-- با 22P02 می‌سوخت (دکمهٔ تست لاگ در سوپرادمین + همهٔ لاگ‌های فعالیت!).
DROP FUNCTION IF EXISTS public.log_activity(text, text, text, jsonb);
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id bigint;
BEGIN
  INSERT INTO public.activity_log (user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, text, jsonb) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.log_activity(text, text, text, jsonb) TO authenticated;
