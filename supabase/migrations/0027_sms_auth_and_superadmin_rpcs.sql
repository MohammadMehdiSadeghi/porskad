-- ════════════════════════════════════════════════════════════════
-- 0027: SMS Authentication + SuperAdmin RPCs
-- ════════════════════════════════════════════════════════════════

-- ─── 1. اضافه کردن فیلدهای احراز هویت آموت به sms_settings ───
alter table public.sms_settings
  add column if not exists amoot_user_id  text not null default '',
  add column if not exists amoot_password text not null default '';

-- ─── 2. آپدیت save_sms_settings ───
drop function if exists public.save_sms_settings(text, text, text);

create or replace function public.save_sms_settings(
  p_api_token      text,
  p_line_number    text default 'public',
  p_sender_name    text default 'پرسکاد',
  p_amoot_user_id  text default '',
  p_amoot_password text default ''
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
  declare v_id uuid;
  begin
    -- غیرفعال کردن تنظیمات قبلی
    update public.sms_settings set is_active = false where is_active = true;

    -- ذخیره تنظیمات جدید
    insert into public.sms_settings (
      api_token, line_number, sender_name, is_active, created_by,
      amoot_user_id, amoot_password
    )
    values (
      p_api_token, p_line_number, p_sender_name, true, auth.uid(),
      p_amoot_user_id, p_amoot_password
    )
    returning id into v_id;

    return v_id;
  end;
$$;

grant execute on function public.save_sms_settings(text, text, text, text, text) to authenticated;

-- ─── 3. آپدیت get_active_sms_settings ───
drop function if exists public.get_active_sms_settings();

create or replace function public.get_active_sms_settings()
returns table (
  id              uuid,
  api_token       text,
  line_number     text,
  sender_name     text,
  is_active       boolean,
  amoot_user_id   text,
  amoot_password  text
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select s.id, s.api_token, s.line_number, s.sender_name, s.is_active,
           s.amoot_user_id, s.amoot_password
    from public.sms_settings s
    where s.is_active = true
    limit 1;
end;
$$;

grant execute on function public.get_active_sms_settings() to authenticated;

-- ════════════════════════════════════════════════════════════════
-- SuperAdmin RPCs — فقط owner
-- ════════════════════════════════════════════════════════════════

-- ─── 4. get_db_stats ───
create or replace function public.get_db_stats()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_result jsonb;
  v_tables text[] := array[
    'forms', 'questions', 'responses', 'answers',
    'profiles', 'user_roles', 'user_permissions',
    'logic_rules', 'activity_log', 'error_log',
    'sms_outbox', 'sms_inbox', 'sms_delivery_reports', 'sms_settings'
  ];
  v_t text;
  v_count bigint;
begin
  -- فقط owner یا admin
  if not public.is_owner(auth.uid()) and not public.is_admin(auth.uid()) then
    raise exception 'Access denied';
  end if;

  v_result := '{}'::jsonb;
  foreach v_t in array v_tables loop
    execute format('select count(*) from public.%I', v_t) into v_count;
    v_result := v_result || jsonb_build_object(v_t, v_count);
  end loop;

  return v_result;
end;
$$;

grant execute on function public.get_db_stats() to authenticated;

-- ─── 5. exec_sql (read-only, owner only) ───
create or replace function public.exec_sql(query text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- فقط owner
  if not public.is_owner(auth.uid()) then
    raise exception 'فقط صاحب اصلی سایت می‌تواند SQL اجرا کند.';
  end if;

  -- جلوگیری از نوشتن
  if query ~* '^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)' then
    raise exception 'فقط دستورات SELECT مجاز هستند.';
  end if;

  execute 'select to_jsonb(t) from (' || query || ' limit 200) t'
  into v_result;

  return coalesce(v_result, '[]'::jsonb);
exception
  when others then
    return jsonb_build_object('error', SQLERRM);
end;
$$;

grant execute on function public.exec_sql(text) to authenticated;

-- ─── 6. export_table_data (owner only) ───
create or replace function public.export_table_data(p_table_name text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_result jsonb;
  v_allowed text[] := array[
    'forms', 'questions', 'responses', 'answers',
    'profiles', 'user_roles', 'user_permissions',
    'logic_rules', 'activity_log', 'error_log',
    'sms_outbox', 'sms_inbox', 'sms_delivery_reports', 'sms_settings'
  ];
begin
  if not public.is_owner(auth.uid()) and not public.is_admin(auth.uid()) then
    raise exception 'Access denied';
  end if;

  if not (p_table_name = any(v_allowed)) then
    raise exception 'Table not allowed: %', p_table_name;
  end if;

  execute format('select coalesce(to_jsonb(array_agg(t)), ''[]''::jsonb) from (select * from public.%I limit 1000) t', p_table_name)
  into v_result;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function public.export_table_data(text) to authenticated;

-- ─── 7. purge_responses (owner only) ───
drop function if exists public.purge_responses(uuid);
create or replace function public.purge_responses(p_form_id uuid default null)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_owner(auth.uid()) then
    raise exception 'فقط صاحب اصلی سایت می‌تواند پاسخ‌ها را حذف کند.';
  end if;

  if p_form_id is not null then
    delete from public.answers where response_id in (
      select id from public.responses where form_id = p_form_id
    );
    delete from public.responses where form_id = p_form_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  else
    delete from public.answers;
    delete from public.responses;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  end if;

  return v_count;
end;
$$;

grant execute on function public.purge_responses(uuid) to authenticated;

-- ─── 8. log_activity ───
create or replace function public.log_activity(
  p_action      text,
  p_target_type text default null,
  p_target_id   text default null,
  p_details     jsonb default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.activity_log (user_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_details)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.log_activity(text, text, text, jsonb) to authenticated;

-- ─── 9. impersonate_user (owner only — returns info, no session switch) ───
create or replace function public.impersonate_user(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_owner(auth.uid()) then
    raise exception 'فقط صاحب اصلی سایت می‌تواند این کار را انجام دهد.';
  end if;

  select to_jsonb(jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'is_active', p.is_active
  )) into v_result
  from public.profiles p where p.id = p_target_user_id;

  if v_result is null then
    raise exception 'User not found';
  end if;

  return v_result;
end;
$$;

grant execute on function public.impersonate_user(uuid) to authenticated;

-- ─── 10. activity_log و error_log — disable RLS برای admin ───
-- اگه جداول activity_log/error_log وجود نداشت، بساز
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.error_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  source      text,
  message     text not null,
  url         text,
  stack       text,
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.activity_log enable row level security;
alter table public.error_log enable row level security;

drop policy if exists "admin manage activity_log" on public.activity_log;
create policy "admin manage activity_log"
  on public.activity_log for all
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "admin manage error_log" on public.error_log;
create policy "admin manage error_log"
  on public.error_log for all
  to authenticated
  using (public.is_admin(auth.uid()));
