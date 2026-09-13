-- ══════════════════════════════════════════════════════════════
-- Migration: 0076_discount_codes.sql
-- Description: سیستم کدهای تخفیف و پروموشن سامانه پرس‌کاد
-- ══════════════════════════════════════════════════════════════

-- ۱. ثبت کلید پیش‌فرض کدهای تخفیف در system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'discount_codes',
  '[
    {
      "id": "disc-welcome",
      "code": "WELCOME20",
      "title": "تخفیف خوش‌آمدگویی",
      "type": "percent",
      "value": 20,
      "maxDiscountToman": 50000,
      "minPurchaseToman": 0,
      "maxUses": 100,
      "usedCount": 0,
      "expiresAt": null,
      "applicablePlans": [],
      "isActive": true,
      "createdAt": "2026-03-01T00:00:00.000Z"
    },
    {
      "id": "disc-pro-special",
      "code": "PRO50",
      "title": "تخفیف ویژه ارتقا به طرح حرفه‌ای",
      "type": "percent",
      "value": 50,
      "maxDiscountToman": 150000,
      "minPurchaseToman": 50000,
      "maxUses": 50,
      "usedCount": 0,
      "expiresAt": "2027-03-20T23:59:59.000Z",
      "applicablePlans": ["pro"],
      "isActive": true,
      "createdAt": "2026-03-05T00:00:00.000Z"
    }
  ]'::jsonb,
  'لیست کدهای تخفیف فعال و مشخصات آن‌ها'
)
ON CONFLICT (key) DO NOTHING;

-- ۲. جدول مستقل کدهای تخفیف (اختیاری جهت مقیاس‌پذیری)
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  title text,
  type text NOT NULL CHECK (type IN ('percent', 'fixed')),
  value numeric NOT NULL,
  max_discount_toman numeric,
  min_purchase_toman numeric,
  max_uses integer,
  used_count integer DEFAULT 0,
  expires_at timestamptz,
  applicable_plans jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- فعال‌سازی RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- خواندن برای عموم کاربران لاگین شده آزاد
DROP POLICY IF EXISTS "allow read discount_codes" ON public.discount_codes;
CREATE POLICY "allow read discount_codes"
  ON public.discount_codes FOR SELECT
  TO authenticated
  USING (true);

-- ویرایش و ایجاد فقط توسط مدیر کل (is_owner)
DROP POLICY IF EXISTS "allow owner manage discount_codes" ON public.discount_codes;
CREATE POLICY "allow owner manage discount_codes"
  ON public.discount_codes FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));
