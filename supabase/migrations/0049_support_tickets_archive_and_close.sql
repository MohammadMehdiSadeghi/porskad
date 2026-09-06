-- ==============================================================================
-- 0049: افزودن قابلیت‌های بستن، آرشیو و پالیسی‌های به‌روزرسانی تیکت‌های پشتیبانی
-- ==============================================================================

-- ۱. افزودن ستون‌های آرشیو برای کاربر و ادمین
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS archived_by_user boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_by_admin boolean DEFAULT false;

-- ۲. اطمینان از مقداردهی پیش‌فرض
UPDATE public.support_tickets SET archived_by_user = false WHERE archived_by_user IS NULL;
UPDATE public.support_tickets SET archived_by_admin = false WHERE archived_by_admin IS NULL;

-- ۳. ایجاد ایندکس برای جستجو و بارگذاری سریع فیلترها
CREATE INDEX IF NOT EXISTS idx_support_tickets_archive_user ON public.support_tickets (user_id, archived_by_user);
CREATE INDEX IF NOT EXISTS idx_support_tickets_archive_admin ON public.support_tickets (archived_by_admin);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON public.support_tickets (user_id, status);

-- ۴. به‌روزرسانی پالیسی‌های RLS برای مجاز کردن کاربران به آپدیت وضعیت تیکت‌های خود (مانند تغییر وضعیت آرشیو)
DROP POLICY IF EXISTS "support_tickets_user_update" ON public.support_tickets;
CREATE POLICY "support_tickets_user_update"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_owner() OR
    public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_owner() OR
    public.is_admin()
  );

COMMENT ON COLUMN public.support_tickets.archived_by_user IS 'مشخص می‌کند آیا تیکت توسط کاربر به آرشیو منتقل شده است یا خیر';
COMMENT ON COLUMN public.support_tickets.archived_by_admin IS 'مشخص می‌کند آیا تیکت توسط مدیر به آرشیو منتقل شده است یا خیر';
