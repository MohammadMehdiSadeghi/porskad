-- ══════════════════════════════════════════════════════════════
-- 0086: Telegram Manual Dispatch & Original Timestamp Support
-- ══════════════════════════════════════════════════════════════

-- بروزرسانی تابع get_telegram_dispatch_payload با پشتیبانی از پارامتر force و زمان واقعی ثبت
CREATE OR REPLACE FUNCTION public.get_telegram_dispatch_payload(
  p_form_id text,
  p_response_id uuid,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form record;
  v_resolved_form_id uuid;
  v_already_sent boolean;
  v_configs jsonb;
  v_items jsonb;
  v_entry_number bigint;
  v_submitted_at timestamptz;
BEGIN
  -- الف. یافتن فرم بر اساس UUID، public_id یا slug
  SELECT id, title, published, archived, deleted_at
  INTO v_form
  FROM public.forms
  WHERE (id::text = p_form_id OR public_id = p_form_id OR slug = p_form_id)
    AND deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'no_form_found');
  END IF;

  v_resolved_form_id := v_form.id;

  -- ب. اعتبارسنجی تعلق response_id به این فرم و استخراج زمان دقیق ثبت
  SELECT COALESCE(submitted_at, created_at, now())
  INTO v_submitted_at
  FROM public.responses
  WHERE id = p_response_id AND form_id = v_resolved_form_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid response_id for given form');
  END IF;

  -- ج. بررسی ارسال تکراری (Idempotency) - در صورت فعال بودن p_force این شرط رد می‌شود
  IF NOT COALESCE(p_force, false) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.telegram_send_log
      WHERE response_id = p_response_id AND status = 'sent'
    ) INTO v_already_sent;

    IF v_already_sent THEN
      RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'already_sent');
    END IF;
  END IF;

  -- د. دریافت کانفیگ‌های فعال متصل به این فرم
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'bot_token', c.bot_token,
      'chat_id', c.chat_id,
      'chat_title', c.chat_title
    )
  )
  INTO v_configs
  FROM public.telegram_form_links l
  JOIN public.telegram_config c ON c.id = l.config_id
  WHERE l.form_id = v_resolved_form_id
    AND l.is_active = true
    AND c.is_active = true;

  IF v_configs IS NULL OR jsonb_array_length(v_configs) = 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'no_telegram_link');
  END IF;

  -- ه. دریافت شماره ورودی
  SELECT count(*)
  INTO v_entry_number
  FROM public.responses
  WHERE form_id = v_resolved_form_id
    AND created_at <= COALESCE(v_submitted_at, now());

  -- و. دریافت سوالات و پاسخ‌های این فرم
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'title', q.title,
      'type', q.type,
      'position', q.position,
      'value', a.value
    ) ORDER BY q.position ASC
  )
  INTO v_items
  FROM public.questions q
  LEFT JOIN public.answers a ON a.question_id = q.id AND a.response_id = p_response_id
  WHERE q.form_id = v_resolved_form_id;

  RETURN jsonb_build_object(
    'ok', true,
    'form_id', v_resolved_form_id,
    'form_title', v_form.title,
    'entry_number', COALESCE(v_entry_number, 1),
    'submitted_at', v_submitted_at,
    'configs', v_configs,
    'items', COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_telegram_dispatch_payload(text, uuid, boolean) TO anon, authenticated;
