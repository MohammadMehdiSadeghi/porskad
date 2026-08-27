-- ════════════════════════════════════════════════════════════════
-- پرسکاد (Porskad) v12 — Public ID + Embed Feature
-- ════════════════════════════════════════════════════════════════

-- ─── اضافه کردن public_id به جدول forms ───
-- public_id یک شناسه کوتاه و امن برای استفاده در URL/Embed است
alter table public.forms
  add column if not exists public_id text unique;

-- تابع تولید public_id (فرمت: fr_xxxxxxxx)
create or replace function public.generate_form_public_id()
returns trigger
language plpgsql
as $$
begin
  if new.public_id is null then
    new.public_id := 'fr_' || lower(encode(gen_random_bytes(6), 'hex'));
  end if;
  return new;
end;
$$;

drop trigger if exists forms_set_public_id on public.forms;
create trigger forms_set_public_id
  before insert on public.forms
  for each row execute procedure public.generate_form_public_id();

-- به‌روزرسانی فرم‌های موجود بدون public_id
update public.forms set public_id = 'fr_' || lower(encode(gen_random_bytes(6), 'hex'))
where public_id is null;

-- ─── RLS: اجازه خواندن فرم‌های منتشرشده برای عموم ───
-- (برای API عمومی Embed)
-- پالیسی قبلی باید کار کند، ولی اطمینان حاصل می‌کنیم

-- ─── تابع عمومی: دریافت Schema فرم ───
create or replace function public.get_public_form(p_form_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form jsonb;
  v_questions jsonb;
  v_rules jsonb;
begin
  -- پیدا کردن فرم با public_id یا id
  SELECT to_jsonb(f.*) INTO v_form
  FROM public.forms f
  WHERE (f.public_id = p_form_id OR f.id::text = p_form_id)
    AND f.published = true
  LIMIT 1;

  if v_form is null then
    return null;
  end if;

  -- سوالات
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'type', q.type,
      'title', q.title,
      'description', q.description,
      'required', q.required,
      'options', q.options,
      'position', q.position,
      'condition', q.condition,
      'conditions', q.conditions,
      'jump_actions', q.jump_actions
    ) ORDER BY q.position
  ), '[]'::jsonb) INTO v_questions
  FROM public.questions q
  WHERE q.form_id = (v_form->>'id')::uuid;

  -- Ruleهای منطقی
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', lr.id,
      'name', lr.name,
      'enabled', lr.enabled,
      'priority', lr.priority,
      'source_question_id', lr.source_question_id,
      'group_operator', lr.group_operator,
      'conditions_json', lr.conditions_json,
      'action_type', lr.action_type,
      'action_target_id', lr.action_target_id
    )
  ), '[]'::jsonb) INTO v_rules
  FROM public.logic_rules lr
  WHERE lr.form_id = (v_form->>'id')::uuid;

  -- ترکیب نهایی
  return jsonb_build_object(
    'id', v_form->>'public_id',
    'uuid_id', v_form->>'id',
    'title', v_form->>'title',
    'description', v_form->>'description',
    'welcome_title', v_form->>'welcome_title',
    'welcome_message', v_form->>'welcome_message',
    'exit_title', v_form->>'exit_title',
    'exit_message', v_form->>'exit_message',
    'showBranding', true,
    'questions', v_questions,
    'logicRules', v_rules
  );
end;
$$;

grant execute on function public.get_public_form(text) to anon, authenticated;

-- ─── تابع عمومی: ثبت پاسخ ───
create or replace function public.submit_public_response(
  p_form_public_id text,
  p_answers jsonb,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form_id uuid;
  v_response_id uuid;
  v_q jsonb;
  v_question_id uuid;
  v_answer jsonb;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_duration integer;
begin
  -- پیدا کردن فرم
  SELECT id INTO v_form_id
  FROM public.forms
  WHERE (public_id = p_form_public_id OR id::text = p_form_public_id)
    AND published = true;

  if v_form_id is null then
    raise exception 'فرم یافت نشد یا منتشر نشده.';
  end if;

  -- پارس کردن meta
  v_started_at := nullif(p_meta->>'startedAt', '')::timestamptz;
  v_completed_at := nullif(p_meta->>'completedAt', '')::timestamptz;

  if v_started_at is not null and v_completed_at is not null then
    v_duration := extract(epoch from (v_completed_at - v_started_at))::integer;
  end if;

  -- ساخت response
  INSERT INTO public.responses (
    form_id, is_complete, started_at, submitted_at,
    duration_seconds, device, browser, os, user_agent, referer
  ) VALUES (
    v_form_id,
    true,
    coalesce(v_started_at, now()),
    coalesce(v_completed_at, now()),
    v_duration,
    p_meta->>'device',
    p_meta->>'browser',
    p_meta->>'os',
    p_meta->>'userAgent',
    p_meta->>'referrerUrl'
  )
  RETURNING id INTO v_response_id;

  -- ثبت جواب‌ها
  FOR v_q IN
    SELECT jsonb_array_elements(
      (SELECT jsonb_agg(jsonb_build_object('id', q.id))
       FROM public.questions q WHERE q.form_id = v_form_id)
    )
  LOOP
    v_question_id := (v_q->>'id')::uuid;
    v_answer := p_answers->>(v_q->>'id');

    if v_answer is not null then
      INSERT INTO public.answers (response_id, question_id, value, time_spent_seconds)
      VALUES (
        v_response_id,
        v_question_id,
        to_jsonb(v_answer),
        0
      );
    end if;
  END LOOP;

  return jsonb_build_object(
    'responseId', v_response_id,
    'status', 'success'
  );
end;
$$;

grant execute on function public.submit_public_response(text, jsonb, jsonb) to anon, authenticated;

-- ─── تابع عمومی: ثبت رویداد (view/start) ───
create table if not exists public.embed_events (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'start', 'complete')),
  referrer_url text,
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.embed_events enable row level security;

create policy "allow insert embed_events"
  on public.embed_events for insert
  to public
  with check (true);

create policy "allow select embed_events"
  on public.embed_events for select
  to authenticated
  using (true);

create index if not exists embed_events_form_id_idx on public.embed_events (form_id, event_type);
