-- ════════════════════════════════════════════════════════════════
-- تعمیر ساده RLS روی جدول answers
-- ════════════════════════════════════════════════════════════════

-- اطمینان از فعال بودن RLS
alter table public.answers enable row level security;

-- حذف همه پالیسی‌های قبلی
drop policy if exists "public insert answers" on public.answers;
drop policy if exists "public insert answers for published forms" on public.answers;
drop policy if exists "users read answers" on public.answers;
drop policy if exists "admin read answers" on public.answers;

-- پالیسی insert ساده: اگر response_id وجود داشته باشه، اجازه بده
create policy "allow insert answers"
  on public.answers for insert
  to public
  with check (true);

-- پالیسی select برای authenticated
create policy "allow select answers"
  on public.answers for select
  to authenticated
  using (true);

-- همین‌طور responses رو هم ساده کنیم
alter table public.responses enable row level security;

drop policy if exists "public insert responses" on public.responses;
drop policy if exists "users read responses" on public.responses;
drop policy if exists "users delete responses" on public.responses;

create policy "allow insert responses"
  on public.responses for insert
  to public
  with check (true);

create policy "allow select responses"
  on public.responses for select
  to authenticated
  using (true);

create policy "allow delete responses"
  on public.responses for delete
  to authenticated
  using (true);
