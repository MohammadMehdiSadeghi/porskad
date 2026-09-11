-- 0067: ticket categories + subscription purchase flow (card number / approve / reject)
--  * category column: question / feature_request / bug / other / subscription
--  * payment_status column for subscription tickets: null / card_sent / awaiting_payment / approved / rejected
--  * RLS: users may UPDATE their own tickets (needed for approve/reject + follow-up messages)
--  * RLS: superadmins may INSERT tickets for themselves (admin-initiated tickets)

alter table public.support_tickets
  add column if not exists category text not null default 'question',
  add column if not exists payment_status text;

alter table public.support_tickets drop constraint if exists support_tickets_category_check;
alter table public.support_tickets
  add constraint support_tickets_category_check
  check (category in ('question','feature_request','bug','other','subscription'));

alter table public.support_tickets drop constraint if exists support_tickets_payment_status_check;
alter table public.support_tickets
  add constraint support_tickets_payment_status_check
  check (payment_status is null or payment_status in ('card_sent','awaiting_payment','approved','rejected'));

create index if not exists support_tickets_category_idx on public.support_tickets (category);
create index if not exists support_tickets_payment_status_idx on public.support_tickets (payment_status);

-- ─── RLS ───────────────────────────────────────────────
-- کاربر باید بتواند تیکت خودش را آپدیت کند (ارسال فیش/متن تکمیلی + بازگشایی).
-- policy قبلی فقط superadmin را مجاز می‌کرد؛ جایگزین می‌شود:
drop policy if exists support_tickets_user_update on public.support_tickets;
create policy support_tickets_user_update
  on public.support_tickets for update
  to authenticated
  using ((user_id = auth.uid()) or is_superadmin());

-- مدیر می‌تواند تیکت برای خودش ثبت کند (ارسال پیام سمت مدیر):
create policy support_tickets_superadmin_insert
  on public.support_tickets for insert
  to authenticated
  with check ((user_id = auth.uid()) or is_superadmin());
