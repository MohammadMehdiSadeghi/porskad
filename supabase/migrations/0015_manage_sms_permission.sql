-- ════════════════════════════════════════════════════════════════
-- اضافه کردن مجوز manage_sms + جدول sms_settings
-- ════════════════════════════════════════════════════════════════

-- اضافه کردن مجوز جدید
insert into public.permissions (id, name, description)
values
  ('manage_sms', 'مدیریت پنل پیامک', 'دسترسی به تنظیمات و ارسال پیامک از طریق آموت')
on conflict (id) do nothing;

-- اضافه کردن مجوز به نقش ادمین
insert into public.role_permissions (role_id, permission_id)
values
  ('admin', 'manage_sms')
on conflict (role_id, permission_id) do nothing;

-- ════════════════════════════════════════════════════════════════
-- جدول sms_settings — تنظیمات وب‌سرویس پیامکی آموت
-- ════════════════════════════════════════════════════════════════

drop table if exists public.sms_settings cascade;

create table if not exists public.sms_settings (
  id          uuid primary key default gen_random_uuid(),
  api_token   text not null default '',
  line_number text not null default 'public',
  sender_name text not null default 'پرسکاد',
  is_active   boolean not null default false,
  created_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- فقط یک ردیف تنظیمات فعال وجود داشته باشد
-- (از unique index استفاده نمی‌کنیم چون ممکنه چند ردیف باشه ولی فقط is_active=true مهمه)

-- RLS
alter table public.sms_settings enable row level security;

-- فقط ادمین‌ها بتونن بخوانند
drop policy if exists "admin read sms_settings" on public.sms_settings;
create policy "admin read sms_settings"
  on public.sms_settings for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- فقط ادمین‌ها بتونن تغییر بدهند
drop policy if exists "admin manage sms_settings" on public.sms_settings;
create policy "admin manage sms_settings"
  on public.sms_settings for all
  to authenticated
  using (public.is_admin(auth.uid()));

-- تابع: ذخیره تنظیمات SMS
drop function if exists public.save_sms_settings(text, text, text);

create or replace function public.save_sms_settings(
  p_api_token   text,
  p_line_number text default 'public',
  p_sender_name text default 'پرسکاد'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
  declare
    v_id uuid;
  begin
    -- غیرفعال کردن تنظیمات قبلی
    update public.sms_settings set is_active = false where is_active = true;

    -- ذخیره تنظیمات جدید
    insert into public.sms_settings (api_token, line_number, sender_name, is_active, created_by)
    values (p_api_token, p_line_number, p_sender_name, true, auth.uid())
    returning id into v_id;

    return v_id;
  end;
$$;

grant execute on function public.save_sms_settings(text, text, text) to authenticated;

-- تابع: دریافت تنظیمات فعال SMS
drop function if exists public.get_active_sms_settings();

create or replace function public.get_active_sms_settings()
returns table (
  id          uuid,
  api_token   text,
  line_number text,
  sender_name text,
  is_active   boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select s.id, s.api_token, s.line_number, s.sender_name, s.is_active
    from public.sms_settings s
    where s.is_active = true
    limit 1;
end;
$$;

grant execute on function public.get_active_sms_settings() to authenticated;
