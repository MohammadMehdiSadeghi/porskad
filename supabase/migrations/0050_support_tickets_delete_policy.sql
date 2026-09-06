-- ==============================================================================
-- 0050: افزودن پالیسی مجاز کردن حذف تیکت‌های پشتیبانی (DELETE policy)
-- ==============================================================================

-- پالیسی حذف برای پشتیبانی: مدیران کل و سازنده تیکت مجاز به حذف هستند
DROP POLICY IF EXISTS "support_tickets_delete" ON public.support_tickets;
CREATE POLICY "support_tickets_delete"
  ON public.support_tickets FOR DELETE
  TO authenticated
  USING (
    public.is_owner() OR
    public.is_admin() OR
    user_id = auth.uid()
  );

COMMENT ON TABLE public.support_tickets IS 'جدول تیکت‌های پشتیبانی با امکان حذف توسط ادمین و کاربر';
