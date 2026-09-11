-- ══════════════════════════════════════════════════════════════
-- 0068 — امن‌سازی قبل از پابلیک (نتیجهٔ ممیزی سراسری RLS/RPC)
--  ۱) پالیسی‌های USING(true) روی دادهٔ کاربرها بسته می‌شوند
--  ۲) allow_select_answers_admin (join بدون فیلتر مالکیت) اصلاح می‌شود
--  ۳) get_system_settings → فقط کلیدهای عمومی (whitelist)
--  ۴) read مستقیم system_settings → فقط کلیدهای عمومی
-- مالکیت از طریق JOIN به forms (created_by / manager_id) سنجیده می‌شود.
-- ══════════════════════════════════════════════════════════════

-- ─── ۱. پاسخ‌ها (responses) ───
drop policy if exists "admin read responses" on public.responses;
drop policy if exists "admin delete responses" on public.responses;

create policy "admin read responses"
  on public.responses for select to authenticated
  using (
    public.is_owner(auth.uid())
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.forms f
      where f.id = responses.form_id
        and (f.manager_id = auth.uid() or f.created_by = auth.uid())
    )
  );

create policy "admin delete responses"
  on public.responses for delete to authenticated
  using (public.is_owner(auth.uid()) or public.is_admin(auth.uid()));

-- ─── ۲. جواب‌ها (answers) ───
drop policy if exists "admin read answers" on public.answers;
drop policy if exists "allow_select_answers_admin" on public.answers;

create policy "admin read answers"
  on public.answers for select to authenticated
  using (
    public.is_owner(auth.uid())
    or public.is_admin(auth.uid())
    or exists (
      select 1
      from public.responses r
      join public.forms f on f.id = r.form_id
      where r.id = answers.response_id
        and (f.manager_id = auth.uid() or f.created_by = auth.uid())
    )
  );

-- ─── ۳. رویدادهای ایمبد (embed_events) ───
-- (درج anon عمومی می‌ماند؛ خواندن فقط مدیر/مالک فرم)
drop policy if exists "allow select embed_events" on public.embed_events;

create policy "admin read embed_events"
  on public.embed_events for select to authenticated
  using (
    public.is_owner(auth.uid())
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.forms f
      where f.id = embed_events.form_id
        and (f.manager_id = auth.uid() or f.created_by = auth.uid())
    )
  );

-- ─── ۴. قوانین منطقی (logic_rules) ───
drop policy if exists "admin manage logic_rules" on public.logic_rules;

create policy "admin manage logic_rules"
  on public.logic_rules for all to authenticated
  using (public.is_owner(auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_owner(auth.uid()) or public.is_admin(auth.uid()));

create policy "users manage logic_rules own forms"
  on public.logic_rules for all to authenticated
  using (
    exists (
      select 1 from public.forms f
      where f.id = logic_rules.form_id
        and (f.created_by = auth.uid() or f.manager_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.forms f
      where f.id = logic_rules.form_id
        and (f.created_by = auth.uid() or f.manager_id = auth.uid())
    )
  );

-- ─── ۵. سوالات (questions) ───
drop policy if exists "admin manage questions" on public.questions;

create policy "admin manage questions"
  on public.questions for all to authenticated
  using (public.is_owner(auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_owner(auth.uid()) or public.is_admin(auth.uid()));

create policy "users manage questions own forms"
  on public.questions for all to authenticated
  using (
    exists (
      select 1 from public.forms f
      where f.id = questions.form_id
        and (f.created_by = auth.uid() or f.manager_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.forms f
      where f.id = questions.form_id
        and (f.created_by = auth.uid() or f.manager_id = auth.uid())
    )
  );

-- ─── ۶. فرم‌ها (forms) ───
drop policy if exists "admin manage forms" on public.forms;

create policy "admin manage forms"
  on public.forms for all to authenticated
  using (public.is_owner(auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_owner(auth.uid()) or public.is_admin(auth.uid()));

-- ─── ۷. تنظیمات سیستم: خواندن مستقیم فقط کلیدهای عمومی ───
drop policy if exists "allow read system_settings" on public.system_settings;

create policy "read public settings"
  on public.system_settings for select
  using (
    key = any (array[
      'registration_enabled', 'site_title', 'telegram_support_id',
      'default_max_active_forms', 'default_max_monthly_responses',
      'question_types_config', 'plans_config', 'user_tabs_config',
      'file_upload_policy'
    ])
  );

-- ─── ۸. get_system_settings → فقط کلیدهای عمومی ───
create or replace function public.get_system_settings()
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(s.key, s.value),
    '{}'::jsonb
  )
  from public.system_settings s
  where s.key = any (array[
    'registration_enabled', 'site_title', 'telegram_support_id',
    'default_max_active_forms', 'default_max_monthly_responses',
    'question_types_config', 'plans_config', 'user_tabs_config',
    'file_upload_policy'
  ]);
$$;
