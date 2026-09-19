-- ══════════════════════════════════════════════════════════════
-- تابع: دریافت تعداد پاسخ‌های هر فرم (دور زدن RLS)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_form_response_counts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT form_id, count(*) as total,
           count(*) FILTER (WHERE is_complete) as complete
    FROM public.responses
    GROUP BY form_id
  LOOP
    v_result := v_result || jsonb_build_object(
      v_row.form_id::text,
      jsonb_build_object('total', v_row.total, 'complete', v_row.complete)
    );
  END LOOP;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_form_response_counts() TO authenticated;
