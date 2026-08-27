-- ════════════════════════════════════════════════════════════════
-- جداول پیامک: outbox, delivery_reports, inbox, otp_requests
-- ════════════════════════════════════════════════════════════════

-- ─── جدول پیامک‌های ارسالی ───
create table if not exists public.sms_outbox (
  id            uuid primary key default gen_random_uuid(),
  message_id    text,                    -- شناسه آموت (از خروج SendSimple)
  mobile        text not null,           -- شماره موبایل
  line_number   text not null default 'public',
  text          text not null,           -- متن پیامک
  status        text default 'pending',  -- pending/sent/delivered/failed
  campaign_id   text,                    -- شناسه کمپین (برای ارسال گروهی)
  sent_at       timestamptz,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists sms_outbox_mobile_idx on public.sms_outbox (mobile);
create index if not exists sms_outbox_status_idx on public.sms_outbox (status);
create index if not exists sms_outbox_created_at_idx on public.sms_outbox (created_at desc);

-- ─── جدول گزارش تحویل ───
create table if not exists public.sms_delivery_reports (
  id            uuid primary key default gen_random_uuid(),
  message_id    text not null,           -- شناسه پیامک
  mobile        text not null,
  status        text not null,           -- وضعیت تحویل
  delivered_at  timestamptz,
  raw_payload   jsonb,                   -- داده خام وب‌هوک
  created_at    timestamptz not null default now()
);

create index if not exists sms_delivery_message_idx on public.sms_delivery_reports (message_id);

-- ─── جدول پیامک‌های دریافتی ───
create table if not exists public.sms_inbox (
  id                uuid primary key default gen_random_uuid(),
  amoot_message_id  text,
  mobile            text not null,
  line_number       text,
  text              text not null,
  received_at       timestamptz default now(),
  raw_payload       jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists sms_inbox_mobile_idx on public.sms_inbox (mobile);
create index if not exists sms_inbox_created_at_idx on public.sms_inbox (created_at desc);

-- ─── جدول درخواست‌های OTP ───
create table if not exists public.sms_otp_requests (
  id            uuid primary key default gen_random_uuid(),
  mobile        text not null,
  code_hash     text not null,           -- هش کد OTP (هرگز plain-text)
  expires_at    timestamptz not null,
  verified      boolean not null default false,
  message_id    text,
  attempts      int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists sms_otp_mobile_idx on public.sms_otp_requests (mobile);

-- ════════════════════════════════════════════════════════════════
-- RLS — فقط ادمین‌ها
-- ════════════════════════════════════════════════════════════════

alter table public.sms_outbox enable row level security;
alter table public.sms_delivery_reports enable row level security;
alter table public.sms_inbox enable row level security;
alter table public.sms_otp_requests enable row level security;

-- sms_outbox
drop policy if exists "admin manage sms_outbox" on public.sms_outbox;
create policy "admin manage sms_outbox"
  on public.sms_outbox for all
  to authenticated
  using (public.is_admin(auth.uid()));

-- sms_delivery_reports
drop policy if exists "admin read sms_delivery_reports" on public.sms_delivery_reports;
create policy "admin read sms_delivery_reports"
  on public.sms_delivery_reports for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- sms_inbox
drop policy if exists "admin read sms_inbox" on public.sms_inbox;
create policy "admin read sms_inbox"
  on public.sms_inbox for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- sms_otp_requests
drop policy if exists "admin manage sms_otp_requests" on public.sms_otp_requests;
create policy "admin manage sms_otp_requests"
  on public.sms_otp_requests for all
  to authenticated
  using (public.is_admin(auth.uid()));

-- ─── تابع: ثبت پیامک ارسالی در outbox ───
create or replace function public.log_sms_outbox(
  p_mobile      text,
  p_line_number text,
  p_text        text,
  p_message_id  text default null,
  p_status      text default 'sent'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
  declare v_id uuid;
  begin
    insert into public.sms_outbox (mobile, line_number, text, message_id, status, sent_at, created_by)
    values (p_mobile, p_line_number, p_text, p_message_id, p_status, now(), auth.uid())
    returning id into v_id;
    return v_id;
  end;
$$;

grant execute on function public.log_sms_outbox(text, text, text, text, text) to authenticated;

-- ─── تابع: آمار پیامک‌ها ───
create or replace function public.get_sms_stats()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
  declare v_result jsonb;
  begin
    select jsonb_build_object(
      'total_sent', (select count(*) from public.sms_outbox),
      'today_sent', (select count(*) from public.sms_outbox where created_at >= current_date),
      'month_sent', (select count(*) from public.sms_outbox where created_at >= date_trunc('month', now())),
      'delivered', (select count(*) from public.sms_outbox where status = 'delivered'),
      'failed', (select count(*) from public.sms_outbox where status = 'failed'),
      'inbox_count', (select count(*) from public.sms_inbox),
      'inbox_today', (select count(*) from public.sms_inbox where created_at >= current_date)
    ) into v_result;
    return v_result;
  end;
$$;

grant execute on function public.get_sms_stats() to authenticated;
