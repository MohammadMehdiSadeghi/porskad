-- ════════════════════════════════════════════════════════════════
-- رفع باگ: infinite recursion detected in policy for relation "user_roles"
-- علت: پالیسی‌های روی خود user_roles (و چند پالیسی دیگر) مستقیماً از
-- داخل خودشان از public.user_roles کوئری می‌گرفتند. برای چک "آیا ادمین است؟"،
-- پستگرس باید RLS جدول user_roles را ارزیابی کند؛ آن پالیسی هم دوباره از
-- user_roles می‌خواند؛ و این چرخه تا بی‌نهایت تکرار می‌شود.
--
-- راه‌حل: یک تابع SECURITY DEFINER می‌سازیم که چون با اختیار مالک
-- تابع (نه کاربر لاگین‌شده) اجرا می‌شود، RLS جدول user_roles را دور می‌زند
-- و دیگر چرخه‌ی بازگشتی رخ نمی‌دهد.
-- ════════════════════════════════════════════════════════════════

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user_id
      and r.id = 'admin'
      and ur.active
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

-- ─── profiles ───
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
  using (public.is_admin(auth.uid()));

-- ─── user_roles — همان دو پالیسی که چرخه‌ی بازگشتی را ایجاد می‌کردند ───
drop policy if exists "admin read user_roles" on public.user_roles;
create policy "admin read user_roles"
  on public.user_roles for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "admin manage user_roles" on public.user_roles;
create policy "admin manage user_roles"
  on public.user_roles for all
  to authenticated
  using (public.is_admin(auth.uid()));

-- ─── forms ───
drop policy if exists "admin manage forms" on public.forms;
create policy "admin manage forms"
  on public.forms for all
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "manager manage own forms" on public.forms;
create policy "manager manage own forms"
  on public.forms for all
  to authenticated
  using (
    manager_id = auth.uid()
    or public.is_admin(auth.uid())
  );
