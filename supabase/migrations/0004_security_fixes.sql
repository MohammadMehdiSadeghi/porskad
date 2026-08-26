-- ════════════════════════════════════════════════════════════════
-- پرسکاد (Porskad) v2.1 — Security Fixes
-- این فایل را در Supabase Dashboard → SQL Editor اجرا کنید.
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- ۱) حذف پالیسی‌های قدیمی v1 که هنوز فعال‌اند و RLS جدید را دور می‌زنند
-- ─────────────────────────────────────────────
drop policy if exists "admin read profiles" on public.profiles;
drop policy if exists "admin manage questions" on public.questions;
drop policy if exists "public read questions of published forms" on public.questions;
drop policy if exists "admin read responses" on public.responses;
drop policy if exists "admin delete responses" on public.responses;
drop policy if exists "public insert responses for published forms" on public.responses;
drop policy if exists "admin read answers" on public.answers;

-- پالیسی‌های v2 که جایگزین می‌شوند
drop policy if exists "admin manage forms" on public.forms;
drop policy if exists "manager manage own forms" on public.forms;
drop policy if exists "users manage questions" on public.questions;
drop policy if exists "users delete responses" on public.responses;
drop policy if exists "public insert answers" on public.answers;
drop policy if exists "admin manage profiles" on public.profiles;

-- ─────────────────────────────────────────────
-- ۲) جدول مجوزهای اختصاصی هر کاربر (override نقش)
-- ─────────────────────────────────────────────
create table if not exists public.user_permissions (
  user_id       uuid not null references auth.users (id) on delete cascade,
  permission_id text not null references public.permissions (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, permission_id)
);

alter table public.user_permissions enable row level security;

create policy "user_permissions select"
  on public.user_permissions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "user_permissions manage"
  on public.user_permissions for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ─────────────────────────────────────────────
-- ۳) توابع SECURITY DEFINER — امن‌سازی + قفل کردن p_user_id به auth.uid()
-- ─────────────────────────────────────────────

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
    where ur.user_id = coalesce(p_user_id, auth.uid())
      and r.id = 'admin'
      and ur.active
  );
$$;

-- has_permission: همیشه فقط کاربر جاری بررسی می‌شود؛ override های اختصاصی مقدم بر نقش
create or replace function public.has_permission(p_user_id uuid default null, p_permission_id text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_permission_id is null then
    return false;
  end if;

  -- اگر برای این کاربر مجوز اختصاصی ثبت شده باشد، دقیقاً همان لیست معتبر است
  if exists (select 1 from public.user_permissions up where up.user_id = v_uid) then
    return exists (
      select 1 from public.user_permissions up
      where up.user_id = v_uid and up.permission_id = p_permission_id
    );
  end if;

  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and ur.active = true
    join public.role_permissions rp on rp.role_id = r.id
    where ur.user_id = v_uid
      and rp.permission_id = p_permission_id
  );
end;
$$;

-- get_user_permissions: فقط خود کاربر یا ادمین؛ با پشتیبانی از override
create or replace function public.get_user_permissions(p_user_id uuid default null)
returns table (permission_id text, permission_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- غیر از خود کاربر، فقط ادمین حق پرسیدن مجوزهای دیگران را دارد
  if p_user_id is not null and p_user_id is distinct from auth.uid()
     and not public.is_admin(auth.uid()) then
    p_user_id := auth.uid();
  end if;
  v_uid := coalesce(p_user_id, auth.uid());

  if exists (select 1 from public.user_permissions up where up.user_id = v_uid) then
    return query
      select up.permission_id, pr.name
      from public.user_permissions up
      join public.permissions pr on pr.id = up.permission_id
      where up.user_id = v_uid;
    return;
  end if;

  return query
    select distinct rp.permission_id, pr.name
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and ur.active = true
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions pr on pr.id = rp.permission_id
    where ur.user_id = v_uid;
end;
$$;

-- get_accessible_forms: فقط برای خود کاربر جاری
create or replace function public.get_accessible_forms(p_user_id uuid default null)
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
stable
security definer
set search_path = public
as $$
begin
  p_user_id := auth.uid();
  if p_user_id is null then
    return;
  end if;

  if public.is_admin(p_user_id) then
    return query
      select f.id, f.slug, f.title, f.published, f.created_by, f.manager_id, f.created_at
      from public.forms f;
  else
    return query
      select f.id, f.slug, f.title, f.published, f.created_by, f.manager_id, f.created_at
      from public.forms f
      where f.manager_id = p_user_id;
  end if;
end;
$$;

-- RPC: تنظیم مجوزهای اختصاصی یک مدیر (فقط ادمینِ دارای manage_managers)
create or replace function public.set_user_permissions(p_user_id uuid, p_permissions text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(auth.uid(), 'manage_managers') then
    raise exception 'FORBIDDEN: مجوز مدیریت مدیران ندارید';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'FORBIDDEN: نمی‌توانید مجوزهای خودتان را تغییر دهید';
  end if;

  delete from public.user_permissions where user_permissions.user_id = p_user_id;

  if array_length(p_permissions, 1) > 0 then
    insert into public.user_permissions (user_id, permission_id)
    select p_user_id, x
    from unnest(p_permissions) as x
    where exists (select 1 from public.permissions p where p.id = x)
    on conflict do nothing;
  end if;
end;
$$;

-- ─────────────────────────────────────────────
-- ۴) RPC ساخت مدیر — جایگزین supabase.auth.admin.createUser سمت کلاینت
--    (کلاینت با anon key هیچ‌وقت به Admin API دسترسی ندارد؛ این کار باید سمت DB شود)
-- ─────────────────────────────────────────────
create or replace function public.create_manager(p_email text, p_password text, p_full_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
  v_has_instance_id boolean;
begin
  if not public.is_admin(auth.uid())
     or not public.has_permission(auth.uid(), 'manage_managers') then
    raise exception 'FORBIDDEN: اجازه‌ی ایجاد مدیر ندارید';
  end if;

  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL: ایمیل معتبر نیست';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'WEAK_PASSWORD: رمز عبور باید حداقل ۸ کاراکتر باشد';
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'DUPLICATE_EMAIL: این ایمیل قبلاً ثبت شده است';
  end if;

  v_id := gen_random_uuid();

  select count(*) > 0 into v_has_instance_id
  from information_schema.columns
  where table_schema = 'auth' and table_name = 'users' and column_name = 'instance_id';

  if v_has_instance_id then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new,
      phone_change, phone_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(),
      '', '',
      '', '',
      '', ''
    );
  else
    insert into auth.users (
      id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new,
      phone_change, phone_change_token_new
    ) values (
      v_id, 'authenticated', 'authenticated', v_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(),
      '', '',
      '', '',
      '', ''
    );
  end if;

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, email
  ) values (
    v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now(), v_email
  );

  insert into public.profiles (id, email, full_name, is_active, created_by)
  values (
    v_id, v_email,
    coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1)),
    true, auth.uid()
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        created_by = excluded.created_by;

  insert into public.user_roles (user_id, role_id, active)
  values (v_id, 'manager', true)
  on conflict (user_id, role_id) do update set active = true;

  return v_id;
end;
$$;

-- RPC حذف کامل مدیر (auth user + cascade)
create or replace function public.delete_manager(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid())
     or not public.has_permission(auth.uid(), 'manage_managers') then
    raise exception 'FORBIDDEN: اجازه‌ی حذف مدیر ندارید';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'FORBIDDEN: نمی‌توانید حساب خودتان را حذف کنید';
  end if;

  -- پروفایل و user_roles با FK روی delete cascade حذف می‌شوند
  delete from auth.users where id = p_user_id;

  -- پاک‌سازی orphan احتمالی
  delete from public.profiles where id = p_user_id;
end;
$$;

-- ─────────────────────────────────────────────
-- ۵) RPC ذخیره‌ی اتمیک فرم و سوالات (جایگزین آپدیت‌های ترتیبی کلاینت)
-- ─────────────────────────────────────────────
create or replace function public.save_form(
  p_form_id   uuid,
  p_form      jsonb,
  p_questions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.forms%rowtype;
  qrow jsonb;
  keep_ids uuid[];
begin
  select * into v_old from public.forms where id = p_form_id;
  if not found then
    raise exception 'NOT_FOUND: فرم پیدا نشد';
  end if;

  if not public.is_admin(auth.uid()) then
    if v_old.manager_id is distinct from auth.uid()
       or not public.has_permission(auth.uid(), 'edit_form') then
      raise exception 'FORBIDDEN: مجوز ویرایش این فرم را ندارید';
    end if;
  end if;

  if (p_form->>'published')::boolean is distinct from v_old.published
     and not public.is_admin(auth.uid())
     and not public.has_permission(auth.uid(), 'publish_form') then
    raise exception 'FORBIDDEN: مجوز انتشار فرم ندارید';
  end if;

  update public.forms set
    title           = coalesce(nullif(trim(p_form->>'title'), ''), v_old.title),
    description     = coalesce(p_form->>'description', v_old.description),
    slug            = coalesce(nullif(trim(p_form->>'slug'), ''), v_old.slug),
    welcome_title   = coalesce(p_form->>'welcome_title', v_old.welcome_title),
    welcome_message = coalesce(p_form->>'welcome_message', v_old.welcome_message),
    exit_title      = coalesce(p_form->>'exit_title', v_old.exit_title),
    exit_message    = coalesce(p_form->>'exit_message', v_old.exit_message),
    published       = coalesce((p_form->>'published')::boolean, v_old.published)
  where id = p_form_id;

  if p_questions is not null and jsonb_typeof(p_questions) = 'array' then
    select coalesce(array_agg((q->>'id')::uuid), '{}')
      into keep_ids
    from jsonb_array_elements(p_questions) q
    where q->>'id' is not null;

    -- حذف سوالاتی که در لیست جدید نیستند
    delete from public.questions
    where form_id = p_form_id
      and id <> all(keep_ids);

    for qrow in select * from jsonb_array_elements(p_questions) loop
      if qrow->>'id' is not null then
        update public.questions set
          title       = trim(qrow->>'title'),
          description = coalesce(qrow->>'description', ''),
          required    = coalesce((qrow->>'required')::boolean, true),
          options     = coalesce(qrow->'options', '[]'::jsonb),
          position    = coalesce((qrow->>'position')::int, 0)
        where id = (qrow->>'id')::uuid
          and form_id = p_form_id;
      else
        insert into public.questions
          (form_id, type, title, description, required, options, position)
        values (
          p_form_id,
          qrow->>'type',
          trim(qrow->>'title'),
          coalesce(qrow->>'description', ''),
          coalesce((qrow->>'required')::boolean, true),
          coalesce(qrow->'options', '[]'::jsonb),
          coalesce((qrow->>'position')::int, 0)
        );
      end if;
    end loop;
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.position)
    from public.questions t
    where t.form_id = p_form_id
  ), '[]'::jsonb);
end;
$$;

-- ─────────────────────────────────────────────
-- ۶) RLS — بازنویسی پالیسی‌ها با اعمال مجوزها سمت سرور
-- ─────────────────────────────────────────────

-- profiles
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- هر کاربر بتواند پروفایل خودش را ویرایش کند (صفحه‌ی پروفایل)
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- forms
drop policy if exists "forms insert" on public.forms;
create policy "forms insert"
  on public.forms for insert
  to authenticated
  with check (
    public.has_permission(auth.uid(), 'create_form')
    and (manager_id = auth.uid() or public.is_admin(auth.uid()))
  );

drop policy if exists "forms update" on public.forms;
create policy "forms update"
  on public.forms for update
  to authenticated
  using (
    public.is_admin(auth.uid())
    or (manager_id = auth.uid() and public.has_permission(auth.uid(), 'edit_form'))
  )
  with check (
    public.is_admin(auth.uid())
    or (manager_id = auth.uid() and public.has_permission(auth.uid(), 'edit_form'))
  );

drop policy if exists "forms delete" on public.forms;
create policy "forms delete"
  on public.forms for delete
  to authenticated
  using (
    public.is_admin(auth.uid())
    or (manager_id = auth.uid() and public.has_permission(auth.uid(), 'delete_form'))
  );

-- تریگر: انتشار/لغو انتشار بدون مجوز publish_form ممکن نیست
create or replace function public.enforce_publish_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.published is distinct from old.published
       and not public.is_admin(auth.uid())
       and not public.has_permission(auth.uid(), 'publish_form') then
      raise exception 'FORBIDDEN: مجوز انتشار فرم ندارید';
    end if;
  elsif tg_op = 'INSERT' and new.published then
    if not public.is_admin(auth.uid())
       and not public.has_permission(auth.uid(), 'publish_form') then
      raise exception 'FORBIDDEN: مجوز انتشار فرم ندارید';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists forms_enforce_publish on public.forms;
create trigger forms_enforce_publish
  before insert or update on public.forms
  for each row execute procedure public.enforce_publish_permission();

-- questions
drop policy if exists "questions manage" on public.questions;
create policy "questions manage"
  on public.questions for all
  to authenticated
  using (
    exists (
      select 1 from public.forms f
      where f.id = questions.form_id
        and (public.is_admin(auth.uid())
             or (f.manager_id = auth.uid() and public.has_permission(auth.uid(), 'edit_form')))
    )
  )
  with check (
    exists (
      select 1 from public.forms f
      where f.id = questions.form_id
        and (public.is_admin(auth.uid())
             or (f.manager_id = auth.uid() and public.has_permission(auth.uid(), 'edit_form')))
    )
  );

-- responses
drop policy if exists "responses delete" on public.responses;
create policy "responses delete"
  on public.responses for delete
  to authenticated
  using (
    exists (
      select 1 from public.forms f
      where f.id = responses.form_id
        and (public.is_admin(auth.uid())
             or (f.manager_id = auth.uid() and public.has_permission(auth.uid(), 'view_responses')))
    )
  );

-- answers: insert عمومی فقط برای فرمِ منتشرشده و پاسخِ ناتمام
create policy "public insert answers"
  on public.answers for insert
  to public
  with check (
    exists (
      select 1
      from public.responses r
      join public.forms f on f.id = r.form_id
      where r.id = answers.response_id
        and f.published = true
        and r.is_complete = false
    )
  );

-- ─────────────────────────────────────────────
-- ۷) دسترسی توابع — برداشتن EXECUTE پیش‌فرض از PUBLIC/anon
-- ─────────────────────────────────────────────
revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

revoke execute on function public.get_user_permissions(uuid) from public, anon;
grant execute on function public.get_user_permissions(uuid) to authenticated;

revoke execute on function public.has_permission(uuid, text) from public, anon;
grant execute on function public.has_permission(uuid, text) to authenticated;

revoke execute on function public.get_accessible_forms(uuid) from public, anon;
grant execute on function public.get_accessible_forms(uuid) to authenticated;

revoke execute on function public.set_user_permissions(uuid, text[]) from public, anon;
grant execute on function public.set_user_permissions(uuid, text[]) to authenticated;

revoke execute on function public.create_manager(text, text, text) from public, anon;
grant execute on function public.create_manager(text, text, text) to authenticated;

revoke execute on function public.delete_manager(uuid) from public, anon;
grant execute on function public.delete_manager(uuid) to authenticated;

revoke execute on function public.save_form(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_form(uuid, jsonb, jsonb) to authenticated;

-- ─────────────────────────────────────────────
-- ۸) پیش‌فرض امن برای role در profiles (به‌جای admin!)
-- ─────────────────────────────────────────────
alter table public.profiles alter column role set default 'viewer';
