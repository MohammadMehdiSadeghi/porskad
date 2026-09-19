-- ══════════════════════════════════════════════════════════════
-- 0047: محاسبه دقیق حجم دیتابیس و جداول برای پنل سوپرادمین
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_database_storage_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_db_size bigint;
  v_db_pretty text;
  v_tables jsonb;
BEGIN
  -- حجم کل دیتابیس
  v_db_size := pg_database_size(current_database());
  v_db_pretty := pg_size_pretty(v_db_size);

  -- تفکیک حجم و تعداد رکورد هر جدول
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', relname,
      'bytes', pg_total_relation_size(relid),
      'pretty', pg_size_pretty(pg_total_relation_size(relid)),
      'row_count', n_live_tup
    ) ORDER BY pg_total_relation_size(relid) DESC
  ) INTO v_tables
  FROM pg_stat_user_tables;

  RETURN jsonb_build_object(
    'db_size_bytes', v_db_size,
    'db_size_pretty', v_db_pretty,
    'tables', COALESCE(v_tables, '[]'::jsonb),
    'estimated', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_database_storage_stats() TO authenticated, anon, service_role;
