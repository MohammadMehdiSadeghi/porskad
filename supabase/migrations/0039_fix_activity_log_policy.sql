-- ══════════════════════════════════════════════════════════════
-- 0038: فیکس activity_log INSERT + بررسی مجوزها
-- ══════════════════════════════════════════════════════════════

-- حذف پالیسی‌های قدیمی activity_log
DROP POLICY IF EXISTS "owner insert activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "admin manage activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "owner read activity_log" ON public.activity_log;

-- پالیسی جدید: همه authenticated کاربرها بتونن insert کنن
CREATE POLICY "authenticated insert activity_log"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- پالیسی خواندن: owner و admin بتونن بخونن
CREATE POLICY "admin read activity_log"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_owner(auth.uid())
  );

-- پالیسی مدیریت: owner بتونه manage کنه
CREATE POLICY "owner manage activity_log"
  ON public.activity_log FOR ALL
  TO authenticated
  USING (public.is_owner(auth.uid()));
