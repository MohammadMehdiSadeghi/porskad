-- ==============================================================================
-- 0086: محاسبه دقیق و استاندارد حجم دیتابیس برای پنل سوپرادمین
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_database_storage_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_size bigint;
  v_tables jsonb;
  v_rows bigint;
BEGIN
  -- احراز سطح دسترسی: فقط سوپرادمین یا فراخوانی‌های سمت سرور (service_role)
  IF NOT (
    public.is_superadmin()
    OR current_user = 'service_role'
    OR auth.role() = 'service_role'
  ) THEN
    RAISE EXCEPTION 'not authorized: superadmin only';
  END IF;

  -- محاسبه حجم واقعی کل دیتابیس در کلاستر پستگرس
  SELECT pg_database_size(current_database()) INTO v_size;

  -- تفکیک دقیق حجم فیزیکی هر جدول در اسکیما public (شامل داده، ایندکس‌ها و TOAST)
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'table_name', t.tbl,
           'name', t.tbl,
           'bytes', t.sz,
           'size_bytes', t.sz,
           'pretty', pg_size_pretty(t.sz),
           'row_count', t.rc,
           'rows', t.rc
         ) ORDER BY t.sz DESC), '[]'::jsonb)
  INTO v_tables
  FROM (
    SELECT c.relname::text AS tbl,
           pg_total_relation_size(c.oid) AS sz,
           coalesce(nullif(c.reltuples::bigint, -1), 0) AS rc
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) t;

  -- مجموع تعداد ردیف‌ها
  SELECT coalesce(sum(nullif(c.reltuples::bigint, -1)), 0)
  INTO v_rows
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r';

  RETURN jsonb_build_object(
    'db_size_bytes', v_size,
    'db_size_pretty', pg_size_pretty(v_size),
    'db_size_text', pg_size_pretty(v_size),
    'total_db_bytes', v_size,
    'total_db_pretty', pg_size_pretty(v_size),
    'tables', v_tables,
    'total_rows', v_rows,
    'estimated', false
  );
END;
$$;

-- اعطای دسترسی به کاربران لاگین‌کرده (احراز سوپرادمین بودن درون تابع چک می‌شود) و سرویس‌رول
GRANT EXECUTE ON FUNCTION public.get_database_storage_stats() TO authenticated, service_role;
