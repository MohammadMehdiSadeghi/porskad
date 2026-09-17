-- ══════════════════════════════════════════════════════════════
-- 0085: Telegram Bot Dispatch RPC & Resilience
-- ══════════════════════════════════════════════════════════════

-- ۱. تابع امن دریافت داده‌های ارسال تلگرام با سطح دسترسی SECURITY DEFINER
-- این تابع فارغ از اینکه درخواست با کلید anon ارسال شده یا service_role،
-- به صورت کاملاً ایزوله و امن اطلاعات لازم برای پیام تلگرام را استخراج می‌کند.
CREATE OR REPLACE FUNCTION public.get_telegram_dispatch_payload(
  p_form_id text,
  p_response_id uuid
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

  -- ب. اعتبارسنجی تعلق response_id به این فرم
  IF NOT EXISTS (
    SELECT 1 FROM public.responses
    WHERE id = p_response_id AND form_id = v_resolved_form_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid response_id for given form');
  END IF;

  -- ج. بررسی ارسال تکراری (Idempotency)
  SELECT EXISTS (
    SELECT 1 FROM public.telegram_send_log
    WHERE response_id = p_response_id AND status = 'sent'
  ) INTO v_already_sent;

  IF v_already_sent THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'already_sent');
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
  WHERE form_id = v_resolved_form_id;

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
    'configs', v_configs,
    'items', COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_telegram_dispatch_payload(text, uuid) TO anon, authenticated;

-- ۲. تابع امن ثبت لاگ ارسال تلگرام
CREATE OR REPLACE FUNCTION public.log_telegram_send(
  p_form_id uuid,
  p_response_id uuid,
  p_config_id uuid,
  p_chat_id text,
  p_status text,
  p_error_message text DEFAULT NULL,
  p_message_text text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.telegram_send_log (
    form_id,
    response_id,
    config_id,
    chat_id,
    status,
    error_message,
    message_text,
    sent_at
  ) VALUES (
    p_form_id,
    p_response_id,
    p_config_id,
    p_chat_id,
    COALESCE(p_status, 'sent'),
    p_error_message,
    p_message_text,
    now()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_telegram_send(uuid, uuid, uuid, text, text, text, text) TO anon, authenticated;

-- ۳. ارتقای پالیسی درج در telegram_send_log
DROP POLICY IF EXISTS "telegram_send_log_public_insert" ON public.telegram_send_log;
CREATE POLICY "telegram_send_log_public_insert" ON public.telegram_send_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
