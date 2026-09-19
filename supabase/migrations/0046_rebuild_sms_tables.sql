-- ══════════════════════════════════════════════════════════════
-- 0045: بازسازی کامل جداول SMS برای آموت
-- migration 0031_cleanup_sms این جداول رو حذف کرده بود.
-- حالا با ساختار جدید و ساده‌تر برمی‌گردونیم.
-- ══════════════════════════════════════════════════════════════

-- ─── تنظیمات پیامک (یک رکورد) ───
CREATE TABLE IF NOT EXISTS public.sms_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  amoot_token text DEFAULT '',
  line_number text DEFAULT '',
  sender_name text DEFAULT 'پرس‌کاد',
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ─── صندوق خروجی (پیامک‌های ارسالی) ───
CREATE TABLE IF NOT EXISTS public.sms_outbox (
  id bigserial PRIMARY KEY,
  message_id text,
  mobile text NOT NULL,
  text text NOT NULL,
  status text DEFAULT 'pending',  -- pending | sent | failed | delivered
  error_message text,
  line_number text,
  parts integer,
  cost numeric,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── صندوق ورودی (پیامک‌های دریافتی از وب‌هوک) ───
CREATE TABLE IF NOT EXISTS public.sms_inbox (
  id bigserial PRIMARY KEY,
  amoot_message_id text,
  mobile text,
  line_number text,
  text text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- ─── گزارش تحویل (Delivery Reports از وب‌هوک) ───
CREATE TABLE IF NOT EXISTS public.sms_delivery_reports (
  id bigserial PRIMARY KEY,
  message_id text,
  mobile text,
  status text,
  delivered_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- ─── RLS ───
ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_delivery_reports ENABLE ROW LEVEL SECURITY;

-- sms_settings: فقط مدیر پیامک یا ادمین (خواندن/نوشتن)
CREATE POLICY "sms_settings_sms_admin_select" ON public.sms_settings
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_sms') OR public.is_admin(auth.uid()));
CREATE POLICY "sms_settings_sms_admin_write" ON public.sms_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'manage_sms') OR public.is_admin(auth.uid()));
CREATE POLICY "sms_settings_sms_admin_update" ON public.sms_settings
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'manage_sms') OR public.is_admin(auth.uid()));

-- sms_outbox: admin/owner می‌تونن ببینن، همه می‌تونن insert کنن (برای لاگ از سمت کلاینت)
CREATE POLICY "sms_outbox_admin_select" ON public.sms_outbox
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_sms') OR public.is_admin(auth.uid()));
CREATE POLICY "sms_outbox_insert" ON public.sms_outbox
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sms_outbox_admin_update" ON public.sms_outbox
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- sms_inbox: admin/owner می‌تونن ببینن، وب‌هوک با service_role می‌نویسه
CREATE POLICY "sms_inbox_admin_select" ON public.sms_inbox
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_sms') OR public.is_admin(auth.uid()));

-- sms_delivery_reports: admin/owner می‌تونن ببینن
CREATE POLICY "sms_delivery_reports_admin_select" ON public.sms_delivery_reports
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_sms') OR public.is_admin(auth.uid()));

-- ─── ایندکس‌ها ───
CREATE INDEX IF NOT EXISTS idx_sms_outbox_created_at ON public.sms_outbox (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_inbox_created_at ON public.sms_inbox (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_delivery_reports_message_id ON public.sms_delivery_reports (message_id);