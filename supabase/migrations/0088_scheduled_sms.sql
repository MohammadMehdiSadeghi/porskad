-- ============================================================
-- Migration 0088: Scheduled SMS and Recipients Queue
-- ============================================================

-- ۱. جدول اصلی پیام‌های زماندار
CREATE TABLE IF NOT EXISTS public.scheduled_sms (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender_number VARCHAR(20) NOT NULL DEFAULT '98',
    source_type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source_type IN ('form', 'manual')),
    source_form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'canceled')),
    total_count INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    attempts SMALLINT NOT NULL DEFAULT 0,
    last_error VARCHAR(500) NULL,
    provider_response JSONB NULL,
    bot_notified_at TIMESTAMPTZ NULL,
    locked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ایندکس‌ها برای کوئری‌های با کارایی بالا در زمانبند
CREATE INDEX IF NOT EXISTS idx_scheduled_sms_status_time ON public.scheduled_sms(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_sms_user ON public.scheduled_sms(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_sms_created_at ON public.scheduled_sms(created_at DESC);

-- ۲. جدول گیرندگان هر پیام زماندار
CREATE TABLE IF NOT EXISTS public.scheduled_sms_recipients (
    id BIGSERIAL PRIMARY KEY,
    scheduled_sms_id BIGINT NOT NULL REFERENCES public.scheduled_sms(id) ON DELETE CASCADE,
    mobile VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    provider_message_id VARCHAR(100) NULL,
    error_message VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_recipients_parent ON public.scheduled_sms_recipients(scheduled_sms_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_recipients_mobile ON public.scheduled_sms_recipients(mobile);

-- ۳. ارتقای جدول sms_outbox جهت پشتیبانی از برچسب زماندار
ALTER TABLE public.sms_outbox 
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scheduled_sms_id BIGINT REFERENCES public.scheduled_sms(id) ON DELETE SET NULL;

-- ۴. تنظیم RLS و پالیسی‌های امنیتی
ALTER TABLE public.scheduled_sms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sms_recipients ENABLE ROW LEVEL SECURITY;

-- پالیسی‌های جدول scheduled_sms
DROP POLICY IF EXISTS "Users can view their own scheduled sms" ON public.scheduled_sms;
CREATE POLICY "Users can view their own scheduled sms"
    ON public.scheduled_sms FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_owner = true OR profiles.role IN ('superadmin', 'admin'))
        )
    );

DROP POLICY IF EXISTS "Users can insert their own scheduled sms" ON public.scheduled_sms;
CREATE POLICY "Users can insert their own scheduled sms"
    ON public.scheduled_sms FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their pending scheduled sms" ON public.scheduled_sms;
CREATE POLICY "Users can update their pending scheduled sms"
    ON public.scheduled_sms FOR UPDATE
    USING (
        (auth.uid() = user_id AND status = 'pending')
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_owner = true OR profiles.role IN ('superadmin', 'admin'))
        )
    );

DROP POLICY IF EXISTS "Users can delete their pending scheduled sms" ON public.scheduled_sms;
CREATE POLICY "Users can delete their pending scheduled sms"
    ON public.scheduled_sms FOR DELETE
    USING (
        (auth.uid() = user_id AND status IN ('pending', 'canceled'))
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_owner = true OR profiles.role IN ('superadmin', 'admin'))
        )
    );

-- پالیسی‌های جدول scheduled_sms_recipients
DROP POLICY IF EXISTS "Users can view recipients of their scheduled sms" ON public.scheduled_sms_recipients;
CREATE POLICY "Users can view recipients of their scheduled sms"
    ON public.scheduled_sms_recipients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.scheduled_sms
            WHERE scheduled_sms.id = scheduled_sms_recipients.scheduled_sms_id
            AND (
                scheduled_sms.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = auth.uid() 
                    AND (profiles.is_owner = true OR profiles.role IN ('superadmin', 'admin'))
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert recipients for their scheduled sms" ON public.scheduled_sms_recipients;
CREATE POLICY "Users can insert recipients for their scheduled sms"
    ON public.scheduled_sms_recipients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.scheduled_sms
            WHERE scheduled_sms.id = scheduled_sms_recipients.scheduled_sms_id
            AND scheduled_sms.user_id = auth.uid()
        )
    );
