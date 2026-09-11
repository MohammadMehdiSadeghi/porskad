-- 0075: سطل زباله گاد — هر حذف (سخت) تا ۳۰ روز قابل بازیابی
-- پوشش: ورودی‌ها (+جواب‌هایشان)، تیکت‌ها، توکن ربات، لینک ربات.
-- فرم‌ها soft-delete هستند (deleted_at) و مستقیم از همان‌جا لیست/بازیابی می‌شوند.
CREATE TABLE IF NOT EXISTS public.trash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,          -- response | ticket | tg_config | tg_link
  entity_id uuid NOT NULL,
  label text,                          -- عنوان خوانا برای نمایش
  payload jsonb NOT NULL,              -- کامل ردیف حذف‌شده (برای بازیابی)
  user_id uuid,                        -- مالک داده (برای فیلتر «بر اساس کاربر»)
  deleted_by uuid,                     -- چه کسی حذف کرد (auth.uid)
  deleted_by_name text,                -- نام نمایشی حذف‌کننده
  deleted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  restored_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_trash_user ON public.trash(user_id, deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_trash_expiry ON public.trash(expires_at) WHERE restored_at IS NULL;

ALTER TABLE public.trash ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "god reads trash" ON public.trash;
CREATE POLICY "god reads trash" ON public.trash
  FOR SELECT USING (public.is_owner());
-- هیچ policy نوشتنی نیست: فقط تریگر/RPC (SECURITY DEFINER) می‌نویسند.

-- ─── تریگر: حذف سخت → سطل زباله ───
CREATE OR REPLACE FUNCTION public.trash_capture_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_title text; v_answers jsonb;
BEGIN
  SELECT coalesce(f.created_by, f.manager_id), f.title INTO v_owner, v_title
  FROM forms f WHERE f.id = OLD.form_id;
  SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) INTO v_answers
  FROM answers a WHERE a.response_id = OLD.id;
  INSERT INTO trash(entity_type, entity_id, label, payload, user_id, deleted_by, deleted_by_name)
  VALUES ('response', OLD.id,
    'ورودی فرم «' || coalesce(v_title, '?') || '»',
    to_jsonb(OLD) || jsonb_build_object('answers', v_answers),
    v_owner, auth.uid(),
    (SELECT coalesce(full_name, email) FROM profiles WHERE id = auth.uid()));
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_trash_response ON public.responses;
CREATE TRIGGER trg_trash_response BEFORE DELETE ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_response();

CREATE OR REPLACE FUNCTION public.trash_capture_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO trash(entity_type, entity_id, label, payload, user_id, deleted_by, deleted_by_name)
  VALUES ('ticket', OLD.id, 'تیکت: ' || coalesce(OLD.subject, '?'), to_jsonb(OLD),
    OLD.user_id, auth.uid(),
    (SELECT coalesce(full_name, email) FROM profiles WHERE id = auth.uid()));
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_trash_ticket ON public.support_tickets;
CREATE TRIGGER trg_trash_ticket BEFORE DELETE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_ticket();

CREATE OR REPLACE FUNCTION public.trash_capture_tg_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO trash(entity_type, entity_id, label, payload, user_id, deleted_by, deleted_by_name)
  VALUES ('tg_config', OLD.id, 'ربات تلگرام: ' || coalesce(OLD.chat_title, OLD.chat_id, '?'),
    to_jsonb(OLD), OLD.user_id, auth.uid(),
    (SELECT coalesce(full_name, email) FROM profiles WHERE id = auth.uid()));
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_trash_tg_config ON public.telegram_config;
CREATE TRIGGER trg_trash_tg_config BEFORE DELETE ON public.telegram_config
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_tg_config();

CREATE OR REPLACE FUNCTION public.trash_capture_tg_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_title text; v_chat text;
BEGIN
  SELECT coalesce(f.created_by, f.manager_id), f.title INTO v_owner, v_title
  FROM forms f WHERE f.id = OLD.form_id;
  SELECT coalesce(c.chat_title, c.chat_id) INTO v_chat
  FROM telegram_config c WHERE c.id = OLD.config_id;
  INSERT INTO trash(entity_type, entity_id, label, payload, user_id, deleted_by, deleted_by_name)
  VALUES ('tg_link', OLD.id,
    'لینک ربات: «' || coalesce(v_title, '?') || '» → ' || coalesce(v_chat, '?'),
    to_jsonb(OLD), v_owner, auth.uid(),
    (SELECT coalesce(full_name, email) FROM profiles WHERE id = auth.uid()));
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_trash_tg_link ON public.telegram_form_links;
CREATE TRIGGER trg_trash_tg_link BEFORE DELETE ON public.telegram_form_links
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_tg_link();

-- ─── بازیابی ───
CREATE OR REPLACE FUNCTION public.restore_from_trash(p_trash_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; p jsonb;
BEGIN
  IF NOT public.is_owner() THEN RETURN 'not_authorized'; END IF;
  SELECT * INTO t FROM trash WHERE id = p_trash_id AND restored_at IS NULL;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  p := t.payload;
  IF t.entity_type = 'response' THEN
    IF EXISTS (SELECT 1 FROM responses WHERE id = (p->>'id')::uuid) THEN RETURN 'conflict'; END IF;
    INSERT INTO responses (id, form_id, is_complete, started_at, submitted_at, duration_seconds,
      device, browser, os, user_agent, referer, created_at, referrer_url)
    VALUES ((p->>'id')::uuid, (p->>'form_id')::uuid, (p->>'is_complete')::boolean,
      (p->>'started_at')::timestamptz, (p->>'submitted_at')::timestamptz,
      (p->>'duration_seconds')::int, p->>'device', p->>'browser', p->>'os',
      p->>'user_agent', p->>'referer', (p->>'created_at')::timestamptz, p->>'referrer_url');
    IF jsonb_typeof(p->'answers') = 'array' THEN
      -- فقط جواب‌هایی که سوالشان هنوز وجود دارد (FK)؛ بقیه بی‌معنا هستند
      INSERT INTO answers (id, response_id, question_id, value, time_spent_seconds)
      SELECT (a->>'id')::uuid, (a->>'response_id')::uuid, (a->>'question_id')::uuid,
        a->'value', (a->>'time_spent_seconds')::int
      FROM jsonb_array_elements(p->'answers') a
      WHERE EXISTS (SELECT 1 FROM questions q WHERE q.id = (a->>'question_id')::uuid);
    END IF;
  ELSIF t.entity_type = 'ticket' THEN
    IF EXISTS (SELECT 1 FROM support_tickets WHERE id = (p->>'id')::uuid) THEN RETURN 'conflict'; END IF;
    INSERT INTO support_tickets (id, user_id, subject, message, status, admin_reply,
      replied_at, created_at, updated_at, archived_by_user, archived_by_admin,
      category, payment_status)
    VALUES ((p->>'id')::uuid, (p->>'user_id')::uuid, p->>'subject', p->>'message',
      coalesce(p->>'status','open'), p->>'admin_reply',
      (p->>'replied_at')::timestamptz, (p->>'created_at')::timestamptz,
      (p->>'updated_at')::timestamptz, (p->>'archived_by_user')::boolean,
      (p->>'archived_by_admin')::boolean, p->>'category', p->>'payment_status');
  ELSIF t.entity_type = 'tg_config' THEN
    IF EXISTS (SELECT 1 FROM telegram_config WHERE id = (p->>'id')::uuid) THEN RETURN 'conflict'; END IF;
    INSERT INTO telegram_config (id, bot_token, chat_id, chat_title, is_active, created_at, updated_at, user_id)
    VALUES ((p->>'id')::uuid, p->>'bot_token', p->>'chat_id', p->>'chat_title',
      (p->>'is_active')::boolean, (p->>'created_at')::timestamptz,
      (p->>'updated_at')::timestamptz, (p->>'user_id')::uuid);
  ELSIF t.entity_type = 'tg_link' THEN
    IF EXISTS (SELECT 1 FROM telegram_form_links WHERE id = (p->>'id')::uuid) THEN RETURN 'conflict'; END IF;
    INSERT INTO telegram_form_links (id, form_id, config_id, is_active, created_at)
    VALUES ((p->>'id')::uuid, (p->>'form_id')::uuid, (p->>'config_id')::uuid,
      (p->>'is_active')::boolean, (p->>'created_at')::timestamptz);
  ELSE
    RETURN 'unknown_type';
  END IF;
  UPDATE trash SET restored_at = now() WHERE id = p_trash_id;
  RETURN 'restored';
END $$;

-- ─── پاک‌سازی انقضا (۳۰ روز) ───
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.is_owner() THEN RETURN 0; END IF;
  DELETE FROM trash WHERE expires_at < now() AND restored_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ─── سفت‌کردن دسترسی‌ها ───
REVOKE EXECUTE ON FUNCTION public.restore_from_trash(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purge_expired_trash() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_from_trash(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_trash() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.trash_capture_response() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trash_capture_ticket() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trash_capture_tg_config() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trash_capture_tg_link() FROM PUBLIC, anon;

-- ─── فرم‌ها (soft-delete): چه کسی پاک کرد؟ ───
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS deleted_by uuid;
CREATE OR REPLACE FUNCTION public.trash_capture_form()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND NEW.deleted_by IS NULL THEN
    UPDATE forms SET deleted_by = auth.uid() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_trash_form ON public.forms;
CREATE TRIGGER trg_trash_form AFTER UPDATE OF deleted_at ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_form();
REVOKE EXECUTE ON FUNCTION public.trash_capture_form() FROM PUBLIC, anon;

-- ─── کاربران: حذف در این سامانه = غیرفعال‌سازی؛ چه کسی و کِی؟ ───
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
CREATE OR REPLACE FUNCTION public.trash_capture_deactivation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_active AND NOT NEW.is_active THEN
    UPDATE profiles SET deactivated_by = auth.uid(), deactivated_at = now() WHERE id = NEW.id;
  ELSIF NOT OLD.is_active AND NEW.is_active THEN
    UPDATE profiles SET deactivated_by = NULL, deactivated_at = NULL WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_trash_deactivation ON public.profiles;
CREATE TRIGGER trg_trash_deactivation AFTER UPDATE OF is_active ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_deactivation();
REVOKE EXECUTE ON FUNCTION public.trash_capture_deactivation() FROM PUBLIC, anon;

