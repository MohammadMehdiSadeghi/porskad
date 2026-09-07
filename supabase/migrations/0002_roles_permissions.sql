-- ════════════════════════════════════════════════════════════════
-- پرس‌کاد (Porskad) v2 — Schema Role/Permission + بهبودها
-- ════════════════════════════════════════════════════════════════

-- ─── جداول Role/Permission ───

-- نقش‌های سیستم (فقط ادمین و منیجر)
create table if not exists public.roles (
  id          text primary key,  -- 'admin' | 'manager'
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

insert into public.roles (id, name, description)
values
  ('admin',    'مدیر ارشد',    'دسترسی کامل به همه‌ی فرم‌ها و مدیریت مدیران'),
  ('manager',  'مدیر',         'دسترسی به فرم‌ها و پاسخ‌ها بر اساس مجوزها')
on conflict (id) do nothing;

-- مجوزهای سیستم
create table if not exists public.permissions (
  id          text primary key,
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

insert into public.permissions (id, name, description)
values
  ('create_form',    'ایجاد فرم',         'ساخت فرم جدید'),
  ('edit_form',      'ویرایش فرم',         'تغییر تنظیمات و سوال‌های فرم'),
  ('delete_form',    'حذف فرم',            'حذف فرم و پاسخ‌های آن'),
  ('publish_form',   'انتشار فرم',         'فعال/غیرفعال کردن انتشار عمومی فرم'),
  ('view_responses', 'مشاهده پاسخ‌ها',     'دیدن پاسخ‌های فرم‌ها'),
  ('view_analytics', 'مشاهده تحلیل‌ها',   'دیدن نمودارها و تحلیل پیشرفته'),
  ('export_excel',   'خروجی اکسل',         'دانلود پاسخ‌ها به‌صورت Excel'),
  ('manage_managers','مدیریت مدیران',       'ایجاد/ویرایش/حذف مدیران')
on conflict (id) do nothing;

-- نقش‌ها مجوزهای خود را دارند (static mapping)
create table if not exists public.role_permissions (
  role_id     text not null references public.roles(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

insert into public.role_permissions (role_id, permission_id)
values
  ('admin', 'create_form'),
  ('admin', 'edit_form'),
  ('admin', 'delete_form'),
  ('admin', 'publish_form'),
  ('admin', 'view_responses'),
  ('admin', 'view_analytics'),
  ('admin', 'export_excel'),
  ('admin', 'manage_managers'),
  ('manager', 'create_form'),
  ('manager', 'edit_form'),
  ('manager', 'publish_form'),
  ('manager', 'view_responses'),
  ('manager', 'view_analytics'),
  ('manager', 'export_excel');

-- رابطه users → roles
create table if not exists public.user_roles (
  user_id   uuid not null references auth.users(id) on delete cascade,
  role_id   text not null references public.roles(id) on delete cascade,
  active    boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- ─── بهبود جدول profiles ───

-- اضافه کردن full_name و avatar_url
alter table public.profiles
  add column if not exists full_name text not null default '',
  add column if not exists avatar_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- ─── بهبود جدول forms ───

-- حذف created_by فعلی و اضافه کردن جدید
alter table public.forms
  add column if not exists manager_id uuid references public.profiles(id) on delete set null;

-- ─── بهبود جدول responses ───

-- افزودن ستون IP address
alter table public.responses
  add column if not exists ip_address text;

-- ─── بهبود جدول answers ───

-- افزودن index برای جستجوی سریع‌تر
create index if not exists answers_response_question_idx on public.answers (response_id, question_id);

-- ─── تابع: بررسی permission ───

create or replace function public.has_permission(p_user_id uuid, p_permission_id text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and ur.active = true
    join public.role_permissions rp on rp.role_id = r.id
    where ur.user_id = p_user_id
      and rp.permission_id = p_permission_id
      and r.active = true
  );
end;
$$;

-- ─── تابع: گرفتن لیست permissions کاربر ───

create or replace function public.get_user_permissions(p_user_id uuid)
returns table (permission_id text, permission_name text)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select distinct rp.permission_id, pr.name
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and ur.active = true
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions pr on pr.id = rp.permission_id
    where ur.user_id = p_user_id;
end;
$$;

-- ─── تابع: دریافت forms قابل مشاهده توسط کاربر ───

create or replace function public.get_accessible_forms(p_user_id uuid)
returns table (
  id uuid,
  slug text,
  title text,
  published boolean,
  created_by uuid,
  manager_id uuid,
  created_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  -- ادمین همه‌ی فرم‌ها را می‌بیند
  if exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.user_id = p_user_id and r.id = 'admin' and ur.active) then
    return query
      select f.id, f.slug, f.title, f.published, f.created_by, f.manager_id, f.created_at
      from public.forms f;
  else
    -- منیجر فقط فرم‌های خودش را می‌بیند
    return query
      select f.id, f.slug, f.title, f.published, f.created_by, f.manager_id, f.created_at
      from public.forms f
      where f.manager_id = p_user_id;
  end if;
end;
$$;


-- ─── تابع: چک ادمین بودن (SECURITY DEFINER تا RLS خودِ user_roles را دور بزند) ───
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user_id and r.id = 'admin' and ur.active
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

-- ════════════════════════════════════════════════════════════════
-- RLS — امنیت سطح ردیف (به‌روز شده)
-- ════════════════════════════════════════════════════════════════

-- profiles
drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles"
  on public.profiles for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or id = auth.uid()
  );

drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles"
  on public.profiles for all
  to authenticated
  using (
    public.is_admin(auth.uid())
  );

-- user_roles: فقط ادمین می‌تواند بخواند/تغییر دهد
drop policy if exists "admin read user_roles" on public.user_roles;
create policy "admin read user_roles"
  on public.user_roles for select
  to authenticated
  using (
    public.is_admin(auth.uid())
  );

drop policy if exists "admin manage user_roles" on public.user_roles;
create policy "admin manage user_roles"
  on public.user_roles for all
  to authenticated
  using (
    public.is_admin(auth.uid())
  );

-- forms
drop policy if exists "public read published forms" on public.forms;
create policy "public read published forms"
  on public.forms for select
  to public
  using (published = true);

drop policy if exists "users read accessible forms" on public.forms;
create policy "users read accessible forms"
  on public.forms for select
  to authenticated
  using (
    published = true
    or exists (select 1 from public.get_accessible_forms(auth.uid()) af where af.id = id)
  );

drop policy if exists "admin manage forms" on public.forms;
create policy "admin manage forms"
  on public.forms for all
  to authenticated
  using (
    public.is_admin(auth.uid())
  );

drop policy if exists "manager manage own forms" on public.forms;
create policy "manager manage own forms"
  on public.forms for all
  to authenticated
  using (
    manager_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- questions: عموم فقط SELECT برای فرم‌های منتشرشده
drop policy if exists "public read questions" on public.questions;
create policy "public read questions"
  on public.questions for select
  to public
  using (
    exists (select 1 from public.forms f where f.id = questions.form_id and f.published = true)
  );

drop policy if exists "users manage questions" on public.questions;
create policy "users manage questions"
  on public.questions for all
  to authenticated
  using (
    exists (select 1 from public.get_accessible_forms(auth.uid()) af where af.id = questions.form_id)
  );

-- responses: عموم فقط INSERT
drop policy if exists "public insert responses" on public.responses;
create policy "public insert responses"
  on public.responses for insert
  to public
  with check (
    exists (select 1 from public.forms f where f.id = responses.form_id and f.published = true)
  );

drop policy if exists "users read responses" on public.responses;
create policy "users read responses"
  on public.responses for select
  to authenticated
  using (
    exists (select 1 from public.get_accessible_forms(auth.uid()) af where af.id = form_id)
  );

drop policy if exists "users delete responses" on public.responses;
create policy "users delete responses"
  on public.responses for delete
  to authenticated
  using (
    exists (select 1 from public.get_accessible_forms(auth.uid()) af where af.id = form_id)
  );

-- answers: عموم فقط INSERT
drop policy if exists "public insert answers" on public.answers;
create policy "public insert answers"
  on public.answers for insert
  to public
  with check (
    exists (select 1 from public.responses r where r.id = answers.response_id)
  );

drop policy if exists "users read answers" on public.answers;
create policy "users read answers"
  on public.answers for select
  to authenticated
  using (
    exists (select 1 from public.responses r
      join public.get_accessible_forms(auth.uid()) af on af.id = r.form_id
      where r.id = answers.response_id)
  );

-- ════════════════════════════════════════════════════════════════
-- Realtime
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
