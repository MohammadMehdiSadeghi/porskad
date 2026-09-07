-- ════════════════════════════════════════════════════════════════
-- پرس‌کاد (Porskad) v1 — Schema اولیه
-- این فایل را در Supabase Dashboard → SQL Editor اجرا کنید.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── جدول پروفایل‌ها (متصل به auth.users) ───
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  role        text not null default 'admin' check (role in ('admin', 'viewer')),
  created_at  timestamptz not null default now()
);

-- ساخت خودکار پروفایل هنگام ثبت هر کاربر جدید
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── جدول فرم‌ها ───
create table if not exists public.forms (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{3,64}$'),
  title           text not null default 'فرم بدون عنوان',
  description     text not null default '',
  welcome_title   text not null default 'سلام!',
  welcome_message text not null default 'ممنون که وقت گذاشتی؛ چند سوال کوتاه داریم.',
  exit_title      text not null default 'تمام شد!',
  exit_message    text not null default 'از اینکه جواب دادی خیلی ممنونیم. نظراتت برای ما طلاست!',
  published       boolean not null default false,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── جدول سوال‌ها ───
-- type: short_text | long_text | phone_ir | choice | email | number | rating | yes_no
-- options: آرایه‌ای از گزینه‌ها (فقط برای type=choice) مثل ["گزینه ۱","گزینه ۲",...]
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.forms (id) on delete cascade,
  type        text not null check (type in ('short_text','long_text','phone_ir','choice','email','number','rating','yes_no')),
  title       text not null default 'سوال جدید',
  description text not null default '',
  required    boolean not null default true,
  options     jsonb not null default '[]'::jsonb,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists questions_form_id_idx on public.questions (form_id, position);

-- ─── جدول پاسخ‌ها (هر بار پر کردن یک فرم) ───
create table if not exists public.responses (
  id               uuid primary key default gen_random_uuid(),
  form_id          uuid not null references public.forms (id) on delete cascade,
  is_complete      boolean not null default false,
  started_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  duration_seconds integer,
  device           text,   -- mobile | tablet | desktop
  browser          text,   -- Chrome | Safari | Firefox | ...
  os               text,    -- Android | iOS | Windows | macOS | ...
  user_agent       text,
  referer          text,
  created_at       timestamptz not null default now()
);

create index if not exists responses_form_id_idx on public.responses (form_id, created_at desc);

-- ─── جدول جواب هر سوال ───
create table if not exists public.answers (
  id                 uuid primary key default gen_random_uuid(),
  response_id        uuid not null references public.responses (id) on delete cascade,
  question_id        uuid not null references public.questions (id) on delete cascade,
  value              jsonb,
  time_spent_seconds integer
);

create index if not exists answers_response_id_idx on public.answers (response_id);
create index if not exists answers_question_id_idx on public.answers (question_id);

-- ─── به‌روزرسانی خودکار updated_at فرم‌ها ───
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists forms_set_updated_at on public.forms;
create trigger forms_set_updated_at
  before update on public.forms
  for each row execute procedure public.set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS — امنیت سطح ردیف
--   ▸ عموم (anon): فقط فرم‌های منتشرشده را می‌بینند و می‌توانند
--     پاسخ ثبت کنند؛ هیچ‌چیز نمی‌توانند بخوانند یا تغییر دهند.
--   ▸ کاربران لاگین‌شده (authenticated): در v1 همه‌چیز ادمین است.
-- ════════════════════════════════════════════════════════════════

alter table public.profiles   enable row level security;
alter table public.forms      enable row level security;
alter table public.questions  enable row level security;
alter table public.responses  enable row level security;
alter table public.answers    enable row level security;

-- profiles
drop policy if exists "admin read profiles" on public.profiles;
create policy "admin read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- forms
drop policy if exists "public read published forms" on public.forms;
create policy "public read published forms"
  on public.forms for select
  using (published = true);

drop policy if exists "admin manage forms" on public.forms;
create policy "admin manage forms"
  on public.forms for all
  to authenticated
  using (true) with check (true);

-- questions
drop policy if exists "public read questions of published forms" on public.questions;
create policy "public read questions of published forms"
  on public.questions for select
  using (
    exists (
      select 1 from public.forms f
      where f.id = questions.form_id and f.published = true
    )
  );

drop policy if exists "admin manage questions" on public.questions;
create policy "admin manage questions"
  on public.questions for all
  to authenticated
  using (true) with check (true);

-- responses (عموم فقط insert ؛ خواندن مخصوص ادمین)
drop policy if exists "public insert responses for published forms" on public.responses;
create policy "public insert responses for published forms"
  on public.responses for insert
  with check (
    exists (
      select 1 from public.forms f
      where f.id = responses.form_id and f.published = true
    )
  );

drop policy if exists "admin read responses" on public.responses;
create policy "admin read responses"
  on public.responses for select
  to authenticated
  using (true);

drop policy if exists "admin delete responses" on public.responses;
create policy "admin delete responses"
  on public.responses for delete
  to authenticated
  using (true);

-- answers
drop policy if exists "public insert answers" on public.answers;
create policy "public insert answers"
  on public.answers for insert
  with check (
    exists (select 1 from public.responses r where r.id = answers.response_id)
  );

drop policy if exists "admin read answers" on public.answers;
create policy "admin read answers"
  on public.answers for select
  to authenticated
  using (true);

-- ════════════════════════════════════════════════════════════════
-- Realtime — دریافت زنده‌ی پاسخ‌های جدید در داشبورد ادمین
-- ════════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.responses;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
