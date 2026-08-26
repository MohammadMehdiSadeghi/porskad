-- ════════════════════════════════════════════════════════════════
-- جدول user_permissions — مجوزهای اختصاصی هر کاربر (override نقش)
-- ════════════════════════════════════════════════════════════════

create table if not exists public.user_permissions (
  user_id       uuid not null references auth.users(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, permission_id)
);

-- ════════════════════════════════════════════════════════════════
-- RLS — user_permissions
-- ════════════════════════════════════════════════════════════════

alter table public.user_permissions enable row level security;

drop policy if exists "user_permissions select" on public.user_permissions;
create policy "user_permissions select"
  on public.user_permissions for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or user_id = auth.uid()
  );

drop policy if exists "user_permissions insert" on public.user_permissions;
create policy "user_permissions insert"
  on public.user_permissions for insert
  to authenticated
  with check (
    public.is_admin(auth.uid())
  );

drop policy if exists "user_permissions update" on public.user_permissions;
create policy "user_permissions update"
  on public.user_permissions for update
  to authenticated
  using (
    public.is_admin(auth.uid())
  );

drop policy if exists "user_permissions delete" on public.user_permissions;
create policy "user_permissions delete"
  on public.user_permissions for delete
  to authenticated
  using (
    public.is_admin(auth.uid())
  );

-- ════════════════════════════════════════════════════════════════
-- تابع: ثبت/بروزرسانی مجوزهای اختصاصی یک کاربر
-- ════════════════════════════════════════════════════════════════

-- حذف تابع قبلی (ممکنه نام پارامترها فرق داشته باشه)
drop function if exists public.set_user_permissions(uuid, text[]);

create or replace function public.set_user_permissions(
  p_user_id   uuid,
  p_permission_ids text[]
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- حذف مجوزهای قبلی کاربر
  delete from public.user_permissions where user_id = p_user_id;

  -- اضافه کردن مجوزهای جدید
  insert into public.user_permissions (user_id, permission_id)
  select p_user_id, unnest(p_permission_ids);
end;
$$;

grant execute on function public.set_user_permissions(uuid, text[]) to authenticated, anon;

-- ════════════════════════════════════════════════════════════════
-- رفع مشکل RLS روی جدول forms
-- ════════════════════════════════════════════════════════════════

-- پالیسی: کاربران بتونن فرم‌های منتشرشده رو بخوانند
drop policy if exists "users read accessible forms" on public.forms;
create policy "users read accessible forms"
  on public.forms for select
  to authenticated
  using (
    published = true
    or public.is_admin(auth.uid())
    or manager_id = auth.uid()
  );

-- پالیسی: هر کاربر لاگین‌شده بتونه فرم بسازه
drop policy if exists "authenticated create forms" on public.forms;
create policy "authenticated create forms"
  on public.forms for insert
  to authenticated
  with check (
    public.is_admin(auth.uid())
    or manager_id = auth.uid()
    or created_by = auth.uid()
  );

