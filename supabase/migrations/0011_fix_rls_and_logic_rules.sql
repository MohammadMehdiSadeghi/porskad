-- ════════════════════════════════════════════════════════════════
-- پرس‌کاد (Porskad) v9 — تعمیر RLS و جداول گمشده
-- این مایگریشن مشکلات 404 روی logic_rules و 403 روی answers را حل می‌کند
-- ════════════════════════════════════════════════════════════════

-- ─── ۱. ساخت جدول logic_rules (اگر وجود نداشت) ───
create table if not exists public.logic_rules (
  id                  uuid primary key default gen_random_uuid(),
  form_id             uuid not null references public.forms(id) on delete cascade,
  name                text not null default '',
  enabled             boolean not null default true,
  priority            integer not null default 0,
  source_question_id  uuid references public.questions(id) on delete set null,
  group_operator      text not null default 'AND' check (group_operator in ('AND', 'OR')),
  conditions_json     jsonb not null default '[]'::jsonb,
  action_type         text not null default 'SHOW_QUESTION' check (action_type in ('SHOW_QUESTION', 'HIDE_QUESTION', 'GO_TO_QUESTION', 'END_FORM')),
  action_target_id    uuid references public.questions(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists logic_rules_form_id_idx on public.logic_rules (form_id);

-- ─── RLS برای logic_rules ───
alter table public.logic_rules enable row level security;

drop policy if exists "logic_rules admin manage" on public.logic_rules;
create policy "logic_rules admin manage"
  on public.logic_rules for all
  to authenticated
  using (true);

drop policy if exists "logic_rules public read" on public.logic_rules;
create policy "logic_rules public read"
  on public.logic_rules for select
  using (true);

-- ─── تابع save_logic_rules (اگر وجود نداشت) ───
create or replace function public.save_logic_rules(
  p_form_id   uuid,
  p_rules     jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- حذف Ruleهای قبلی فرم
  delete from public.logic_rules where form_id = p_form_id;

  -- درج Ruleهای جدید
  insert into public.logic_rules (
    id, form_id, name, enabled, priority,
    source_question_id, group_operator,
    conditions_json, action_type, action_target_id
  )
  select
    (r->>'id')::uuid,
    p_form_id,
    coalesce(r->>'name', ''),
    coalesce((r->>'enabled')::boolean, true),
    coalesce((r->>'priority')::integer, 0),
    nullif(r->>'source_question_id', 'null')::uuid,
    coalesce(r->>'group_operator', 'AND'),
    coalesce(r->'conditions_json', '[]'::jsonb),
    coalesce(r->>'action_type', 'SHOW_QUESTION'),
    nullif(r->>'action_target_id', 'null')::uuid
  from jsonb_array_elements(p_rules) as r;
end;
$$;

grant execute on function public.save_logic_rules(uuid, jsonb) to authenticated, anon;

-- ─── ۲. تعمیر RLS روی جدول responses ───
-- اطمینان از اینکه anonymous بتواند پاسخ ثبت کند
alter table public.responses enable row level security;

-- پالیسی insert برای عموم (فقط فرم‌های منتشرشده)
drop policy if exists "public insert responses" on public.responses;
create policy "public insert responses"
  on public.responses for insert
  to public
  with check (
    exists (select 1 from public.forms f where f.id = responses.form_id and f.published = true)
  );

-- پالیسی select برای authenticated
drop policy if exists "admin read responses" on public.responses;
drop policy if exists "users read responses" on public.responses;
create policy "users read responses"
  on public.responses for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.get_accessible_forms(auth.uid()) af where af.id = form_id)
  );

-- پالیسی delete برای authenticated
drop policy if exists "admin delete responses" on public.responses;
drop policy if exists "users delete responses" on public.responses;
create policy "users delete responses"
  on public.responses for delete
  to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.get_accessible_forms(auth.uid()) af where af.id = form_id)
  );

-- ─── ۳. تعمیر RLS روی جدول answers ───
-- اطمینان از اینکه anonymous بتواند جواب ثبت کند
alter table public.answers enable row level security;

-- پالیسی insert برای عموم
drop policy if exists "public insert answers" on public.answers;
drop policy if exists "public insert answers for published forms" on public.answers;
create policy "public insert answers"
  on public.answers for insert
  to public
  with check (
    exists (
      select 1 from public.responses r
      join public.forms f on f.id = r.form_id
      where r.id = answers.response_id and f.published = true
    )
  );

-- پالیسی select برای authenticated
drop policy if exists "admin read answers" on public.answers;
drop policy if exists "users read answers" on public.answers;
create policy "users read answers"
  on public.answers for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.responses r
      join public.get_accessible_forms(auth.uid()) af on af.id = r.form_id
      where r.id = answers.response_id
    )
  );
