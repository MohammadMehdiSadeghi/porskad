-- ══════════════════════════════════════════════════════════════
-- Migration: 0084_trash_capture_forms_and_questions.sql
-- Description: ضبط فرم‌های حذف‌شده قطعی کاربر و سوالات حذف‌شده در سطل زباله سوپرادمین
-- ══════════════════════════════════════════════════════════════

SET lock_timeout = '10s';

-- ۱. تریگر ضبط سوالات حذف‌شده (Questions -> Trash)
CREATE OR REPLACE FUNCTION public.trash_capture_question()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_form_title text;
  v_form_exists boolean;
BEGIN
  -- بررسی اینکه آیا فرم هنوز وجود دارد (اگر فرم خود در حال حذف آبشاری باشد، با فرم ضبط می‌شود)
  SELECT coalesce(f.created_by, f.manager_id), f.title, true 
  INTO v_owner, v_form_title, v_form_exists
  FROM public.forms f 
  WHERE f.id = OLD.form_id;

  -- فقط زمانی سوال به عنوان آیتم مجزا ثبت می‌شود که فرم آن همچنان فعال/موجود باشد
  IF v_form_exists THEN
    INSERT INTO public.trash(entity_type, entity_id, label, payload, user_id, deleted_by, deleted_by_name)
    VALUES (
      'question',
      OLD.id,
      'سوال «' || coalesce(OLD.title, 'بدون عنوان') || '» از فرم «' || coalesce(v_form_title, 'فرم') || '»',
      to_jsonb(OLD) || jsonb_build_object('form_title', v_form_title),
      v_owner,
      auth.uid(),
      (SELECT coalesce(full_name, email) FROM public.profiles WHERE id = auth.uid())
    );
  END IF;

  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_trash_question ON public.questions;
CREATE TRIGGER trg_trash_question
  BEFORE DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_question();


-- ۲. تریگر ضبط فرم‌های حذف‌شده کامل (Forms -> Trash با تمام سوالات)
CREATE OR REPLACE FUNCTION public.trash_capture_form()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_questions jsonb;
BEGIN
  v_owner := coalesce(OLD.created_by, OLD.manager_id);

  -- جمع‌آوری تمام سوالات فرم در قالب JSON قبل از حذف آبشاری
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.position), '[]'::jsonb)
  INTO v_questions
  FROM public.questions q
  WHERE q.form_id = OLD.id;

  INSERT INTO public.trash(entity_type, entity_id, label, payload, user_id, deleted_by, deleted_by_name)
  VALUES (
    'form',
    OLD.id,
    'فرم «' || coalesce(OLD.title, OLD.slug, 'بدون عنوان') || '»',
    to_jsonb(OLD) || jsonb_build_object('questions', v_questions),
    v_owner,
    auth.uid(),
    (SELECT coalesce(full_name, email) FROM public.profiles WHERE id = auth.uid())
  );

  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_trash_form ON public.forms;
CREATE TRIGGER trg_trash_form
  BEFORE DELETE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.trash_capture_form();


-- ۳. ارتقای تابع جامع بازیابی از سطل زباله (restore_from_trash)
CREATE OR REPLACE FUNCTION public.restore_from_trash(p_trash_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t record;
  p jsonb;
  v_q jsonb;
BEGIN
  IF NOT (public.is_owner() OR public.is_superadmin()) THEN 
    RETURN 'not_authorized'; 
  END IF;

  SELECT * INTO t FROM public.trash WHERE id = p_trash_id AND restored_at IS NULL;
  IF NOT FOUND THEN 
    RETURN 'not_found'; 
  END IF;

  p := t.payload;

  -- الف) بازیابی پاسخ
  IF t.entity_type = 'response' THEN
    IF EXISTS (SELECT 1 FROM public.responses WHERE id = (p->>'id')::uuid) THEN 
      RETURN 'conflict'; 
    END IF;

    INSERT INTO public.responses (
      id, form_id, is_complete, started_at, submitted_at, duration_seconds,
      device, browser, os, user_agent, referer, created_at, referrer_url
    ) VALUES (
      (p->>'id')::uuid, (p->>'form_id')::uuid, (p->>'is_complete')::boolean,
      (p->>'started_at')::timestamptz, (p->>'submitted_at')::timestamptz,
      (p->>'duration_seconds')::int, p->>'device', p->>'browser', p->>'os',
      p->>'user_agent', p->>'referer', (p->>'created_at')::timestamptz, p->>'referrer_url'
    );

    IF jsonb_typeof(p->'answers') = 'array' THEN
      INSERT INTO public.answers (id, response_id, question_id, value, time_spent_seconds)
      SELECT 
        (a->>'id')::uuid, 
        (a->>'response_id')::uuid, 
        (a->>'question_id')::uuid,
        a->'value', 
        (a->>'time_spent_seconds')::int
      FROM jsonb_array_elements(p->'answers') a
      WHERE EXISTS (SELECT 1 FROM public.questions q WHERE q.id = (a->>'question_id')::uuid);
    END IF;

  -- ب) بازیابی کامل فرم + سوالات آن
  ELSIF t.entity_type = 'form' THEN
    IF EXISTS (SELECT 1 FROM public.forms WHERE id = (p->>'id')::uuid) THEN 
      -- اگر فرم هنوز هست، فقط وضعیت حذف آن برداشته شود
      UPDATE public.forms SET deleted_at = NULL WHERE id = (p->>'id')::uuid;
    ELSE
      -- درج مجدد ردیف فرم
      INSERT INTO public.forms (
        id, slug, title, description, welcome_title, welcome_message, exit_title, exit_message,
        published, manager_id, created_by, form_type, default_theme, created_at, updated_at, deleted_at, archived
      ) VALUES (
        (p->>'id')::uuid,
        p->>'slug',
        coalesce(p->>'title', 'فرم بازیابی‌شده'),
        coalesce(p->>'description', ''),
        p->>'welcome_title',
        p->>'welcome_message',
        p->>'exit_title',
        p->>'exit_message',
        coalesce((p->>'published')::boolean, false),
        (p->>'manager_id')::uuid,
        coalesce((p->>'created_by')::uuid, (p->>'manager_id')::uuid),
        coalesce(p->>'form_type', 'step_by_step'),
        coalesce(p->>'default_theme', 'light'),
        coalesce((p->>'created_at')::timestamptz, now()),
        now(),
        NULL,
        coalesce((p->>'archived')::boolean, false)
      );

      -- بازگردانی سوالات فرم در صورت وجود در snapshot
      IF jsonb_typeof(p->'questions') = 'array' THEN
        FOR v_q IN SELECT * FROM jsonb_array_elements(p->'questions')
        LOOP
          IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id = (v_q->>'id')::uuid) THEN
            INSERT INTO public.questions (
              id, form_id, type, title, description, required, options, position,
              placeholder, validation, conditions, jump_actions, correct_answer, points, display_mode, max_selections, created_at
            ) VALUES (
              (v_q->>'id')::uuid,
              (p->>'id')::uuid,
              coalesce(v_q->>'type', 'short_text'),
              coalesce(v_q->>'title', 'سوال'),
              coalesce(v_q->>'description', ''),
              coalesce((v_q->>'required')::boolean, true),
              coalesce(v_q->'options', '[]'::jsonb),
              coalesce((v_q->>'position')::int, 0),
              coalesce(v_q->>'placeholder', ''),
              v_q->'validation',
              v_q->'conditions',
              coalesce(v_q->'jump_actions', '[]'::jsonb),
              v_q->'correct_answer',
              (v_q->>'points')::int,
              v_q->>'display_mode',
              coalesce((v_q->>'max_selections')::int, 1),
              coalesce((v_q->>'created_at')::timestamptz, now())
            );
          END IF;
        END LOOP;
      END IF;
    END IF;

  -- ج) بازیابی تک سوال به فرم مربوطه
  ELSIF t.entity_type = 'question' THEN
    IF NOT EXISTS (SELECT 1 FROM public.forms WHERE id = (p->>'form_id')::uuid) THEN
      RETURN 'parent_form_not_found';
    END IF;

    IF EXISTS (SELECT 1 FROM public.questions WHERE id = (p->>'id')::uuid) THEN
      RETURN 'conflict';
    END IF;

    INSERT INTO public.questions (
      id, form_id, type, title, description, required, options, position,
      placeholder, validation, conditions, jump_actions, correct_answer, points, display_mode, max_selections, created_at
    ) VALUES (
      (p->>'id')::uuid,
      (p->>'form_id')::uuid,
      coalesce(p->>'type', 'short_text'),
      coalesce(p->>'title', 'سوال بازیابی‌شده'),
      coalesce(p->>'description', ''),
      coalesce((p->>'required')::boolean, true),
      coalesce(p->'options', '[]'::jsonb),
      coalesce((p->>'position')::int, 0),
      coalesce(p->>'placeholder', ''),
      p->'validation',
      p->'conditions',
      coalesce(p->'jump_actions', '[]'::jsonb),
      p->'correct_answer',
      (p->>'points')::int,
      p->>'display_mode',
      coalesce((p->>'max_selections')::int, 1),
      coalesce((p->>'created_at')::timestamptz, now())
    );

  -- د) تیکت پشتیبانی
  ELSIF t.entity_type = 'ticket' THEN
    IF EXISTS (SELECT 1 FROM public.support_tickets WHERE id = (p->>'id')::uuid) THEN 
      RETURN 'conflict'; 
    END IF;
    INSERT INTO public.support_tickets (
      id, user_id, subject, message, status, admin_reply,
      replied_at, created_at, updated_at, archived_by_user, archived_by_admin,
      category, payment_status
    ) VALUES (
      (p->>'id')::uuid, (p->>'user_id')::uuid, p->>'subject', p->>'message',
      coalesce(p->>'status','open'), p->>'admin_reply',
      (p->>'replied_at')::timestamptz, (p->>'created_at')::timestamptz,
      (p->>'updated_at')::timestamptz, (p->>'archived_by_user')::boolean,
      (p->>'archived_by_admin')::boolean, p->>'category', p->>'payment_status'
    );

  -- ه) پیکربندی تلگرام
  ELSIF t.entity_type = 'tg_config' THEN
    IF EXISTS (SELECT 1 FROM public.telegram_config WHERE id = (p->>'id')::uuid) THEN 
      RETURN 'conflict'; 
    END IF;
    INSERT INTO public.telegram_config (
      id, bot_token, chat_id, chat_title, is_active, created_at, updated_at, user_id
    ) VALUES (
      (p->>'id')::uuid, p->>'bot_token', p->>'chat_id', p->>'chat_title',
      (p->>'is_active')::boolean, (p->>'created_at')::timestamptz,
      (p->>'updated_at')::timestamptz, (p->>'user_id')::uuid
    );

  -- و) لینک تلگرام
  ELSIF t.entity_type = 'tg_link' THEN
    IF EXISTS (SELECT 1 FROM public.telegram_form_links WHERE id = (p->>'id')::uuid) THEN 
      RETURN 'conflict'; 
    END IF;
    INSERT INTO public.telegram_form_links (
      id, form_id, config_id, is_active, created_at
    ) VALUES (
      (p->>'id')::uuid, (p->>'form_id')::uuid, (p->>'config_id')::uuid,
      (p->>'is_active')::boolean, (p->>'created_at')::timestamptz
    );
  ELSE
    RETURN 'unknown_type';
  END IF;

  UPDATE public.trash SET restored_at = now() WHERE id = p_trash_id;
  RETURN 'restored';
END $$;

REVOKE EXECUTE ON FUNCTION public.restore_from_trash(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_from_trash(uuid) TO authenticated;
