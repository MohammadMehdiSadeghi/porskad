-- ══════════════════════════════════════════════════════════════
-- 0043: اضافه کردن سطل زباله (trash) به فرم‌ها
-- ستون deleted_at برای حذف نرم (soft delete)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- ایندکس برای فیلتر سریع
CREATE INDEX IF NOT EXISTS idx_forms_deleted_at ON public.forms (deleted_at);
