-- ════════════════════════════════════════════════════════════════
-- 0028: Fix Amoot auth — Token only (not user_id/password)
-- ════════════════════════════════════════════════════════════════

-- ─── 1. اضافه کردن ستون amoot_token ───
alter table public.sms_settings
  add column if not exists amoot_token text not null default '';

-- ─── 2. حذف توابع قدیمی ───
drop function if exists public.save_sms_settings(text, text, text, text, text);
drop function if exists public.save_sms_settings(text, text, text);
drop function if exists public.get_active_sms_settings();

-- ─── 3. save_sms_settings با Token ───
create or replace function public.save_sms_settings(
  p_amoot_token   text,
  p_line_number   text default 'public',
  p_sender_name   text default 'پرسکاد'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
  declare v_id uuid;
  begin
    update public.sms_settings set is_active = false where is_active = true;
    insert into public.sms_settings (
      amoot_token, line_number, sender_name, is_active, created_by, api_token
    )
    values (
      p_amoot_token, p_line_number, p_sender_name, true, auth.uid(), p_amoot_token
    )
    returning id into v_id;
    return v_id;
  end;
$$;

grant execute on function public.save_sms_settings(text, text, text) to authenticated;

-- ─── 4. get_active_sms_settings ───
create or replace function public.get_active_sms_settings()
returns table (
  id            uuid,
  amoot_token   text,
  line_number   text,
  sender_name   text,
  is_active     boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select s.id, s.amoot_token, s.line_number, s.sender_name, s.is_active
    from public.sms_settings s
    where s.is_active = true
    limit 1;
end;
$$;

grant execute on function public.get_active_sms_settings() to authenticated;
