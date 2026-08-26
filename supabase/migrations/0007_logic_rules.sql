-- ════════════════════════════════════════════════════════════════
-- Logic Rules — جدول قوانین شرطی فرم
-- ════════════════════════════════════════════════════════════════

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

-- ─── به‌روزرسانی تابع save_form ───
-- Ruleها جداگانه ذخیره میشن (از طریق RPC جداگانه)

-- ─── تابع ذخیره Ruleها ───

create or replace function public.save_logic_rules(
  p_form_id   uuid,
  p_rules     jsonb
)
returns void
language plpgsql
security definer
set search_path = public
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

-- ─── RLS ───

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
