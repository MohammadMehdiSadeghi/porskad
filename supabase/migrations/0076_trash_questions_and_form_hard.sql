-- 0076: سطل زباله — تکمیل پوشش: سوالات حذف‌شده + حذف قطعی فرم (با سوالاتش)
-- (ادامهٔ 0075؛ idempotent)

-- ─── تریگر: حذف سوال → سطل ───
CREATE OR REPLACE FUNCTION public.trash_capture_question()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_title text;
BEGIN
  SELECT coalesce(f.created_by, f.manager_id), f.title INTO v_owner, v_title
  FROM forms f WHERE f.id = OLD.form_id;
  INSERT INTO trash(entity_type, entity_id, label, payload, user_id, deleted_by, deleted_by_name)
  VALUES ('question', OLD.id,
    'سوال «' || coalesce(OLD.title, '?') || '» از فرم «' || coalesce(v_title, '?') || '»',
    to_jsonb(OLD), v_owner, auth.uid(),
    (SELECT coalesce(full_name, email) FROM profiles WHERE id = auth.uid()));
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_trash_question ON public.questions;
CREATE TRIGGER trg_trash_question BEFORE DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_question();
REVOKE EXECUTE ON FUNCTION public.trash_capture_question() FROM PUBLIC, anon;

-- ─── تریگر: حذف قطعی فرم (با همهٔ سوالاتش) → سطل ───
CREATE OR REPLACE FUNCTION public.trash_capture_form_hard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_questions jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.position), '[]'::jsonb) INTO v_questions
  FROM questions q WHERE q.form_id = OLD.id;
  INSERT INTO trash(entity_type, entity_id, label, payload, user_id, deleted_by, deleted_by_name)
  VALUES ('form', OLD.id, 'فرم «' || coalesce(OLD.title, '?') || '» (حذف قطعی)',
    to_jsonb(OLD) || jsonb_build_object('questions', v_questions),
    coalesce(OLD.created_by, OLD.manager_id), auth.uid(),
    (SELECT coalesce(full_name, email) FROM profiles WHERE id = auth.uid()));
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_trash_form_hard ON public.forms;
CREATE TRIGGER trg_trash_form_hard BEFORE DELETE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_form_hard();
REVOKE EXECUTE ON FUNCTION public.trash_capture_form_hard() FROM PUBLIC, anon;

-- ─── بازیابی: شاخه‌های question و form (بدون تداخل cascade) ───
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
  ELSIF t.entity_type = 'question' THEN
    IF EXISTS (SELECT 1 FROM questions WHERE id = (p->>'id')::uuid) THEN RETURN 'conflict'; END IF;
    IF NOT EXISTS (SELECT 1 FROM forms WHERE id = (p->>'form_id')::uuid) THEN RETURN 'orphan_form_missing'; END IF;
    INSERT INTO questions (id, form_id, type, title, description, required, options, position,
      created_at, placeholder, conditions, jump_actions, validation, correct_answer, points,
      display_mode, max_selections)
    VALUES ((p->>'id')::uuid, (p->>'form_id')::uuid, p->>'type', p->>'title', p->>'description',
      (p->>'required')::boolean, p->'options', (p->>'position')::int,
      (p->>'created_at')::timestamptz, p->>'placeholder', p->'conditions', p->'jump_actions',
      p->'validation', p->'correct_answer', (p->>'points')::int, p->>'display_mode',
      (p->>'max_selections')::int);
  ELSIF t.entity_type = 'form' THEN
    IF EXISTS (SELECT 1 FROM forms WHERE id = (p->>'id')::uuid) THEN RETURN 'conflict'; END IF;
    INSERT INTO forms (id, slug, title, description, welcome_title, welcome_message,
      exit_title, exit_message, published, created_by, created_at, updated_at, manager_id,
      form_type, public_id, archived, identifier_mapping, deleted_at, default_theme, deleted_by)
    VALUES ((p->>'id')::uuid, p->>'slug', p->>'title', p->>'description', p->>'welcome_title',
      p->>'welcome_message', p->>'exit_title', p->>'exit_message', (p->>'published')::boolean,
      (p->>'created_by')::uuid, (p->>'created_at')::timestamptz, (p->>'updated_at')::timestamptz,
      (p->>'manager_id')::uuid, p->>'form_type', p->>'public_id', (p->>'archived')::boolean,
      p->'identifier_mapping', (p->>'deleted_at')::timestamptz, p->>'default_theme',
      (p->>'deleted_by')::uuid);
    IF jsonb_typeof(p->'questions') = 'array' THEN
      INSERT INTO questions (id, form_id, type, title, description, required, options, position,
        created_at, placeholder, conditions, jump_actions, validation, correct_answer, points,
        display_mode, max_selections)
      SELECT (q->>'id')::uuid, (p->>'id')::uuid, q->>'type', q->>'title', q->>'description',
        (q->>'required')::boolean, q->'options', (q->>'position')::int,
        (q->>'created_at')::timestamptz, q->>'placeholder', q->'conditions', q->'jump_actions',
        q->'validation', q->'correct_answer', (q->>'points')::int, q->>'display_mode',
        (q->>'max_selections')::int
      FROM jsonb_array_elements(p->'questions') q
      WHERE NOT EXISTS (SELECT 1 FROM questions ex WHERE ex.id = (q->>'id')::uuid);
    END IF;
  ELSE
    RETURN 'unknown_type';
  END IF;
  UPDATE trash SET restored_at = now() WHERE id = p_trash_id;
  RETURN 'restored';
END $$;

REVOKE EXECUTE ON FUNCTION public.restore_from_trash(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_from_trash(uuid) TO authenticated;
