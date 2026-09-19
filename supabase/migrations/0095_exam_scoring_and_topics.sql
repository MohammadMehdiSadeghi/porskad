-- ════════════════════════════════════════════════════════════════
-- Exam Scoring, Topics, and Answer Analysis Fields
-- ════════════════════════════════════════════════════════════════

-- 1. فرم: اضافه شدن نمره کل و درصد نمره منفی
alter table public.forms
  add column if not exists total_score numeric default null,
  add column if not exists negative_ratio numeric default 0; -- مثلا 0.33 برای یک‌سوم

-- 2. مباحث (Topics)
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  parent_id uuid references public.topics(id) on delete cascade,
  created_at timestamptz default now()
);

-- 3. سوالات: وزن، مباحث و سطح شناختی
alter table public.questions
  add column if not exists weight numeric default 0,
  add column if not exists bloom_level text default null,
  add column if not exists topic_ids uuid[] default null;

-- 4. پاسخ به سوال (Answers): درست/غلط، دفعات تغییر
alter table public.answers
  add column if not exists is_correct boolean default null,
  add column if not exists change_count integer default 0;

-- 5. جدول پاسخ‌های کاربر (Responses): ثبت نمره نهایی
alter table public.responses
  add column if not exists raw_score numeric default null,
  add column if not exists negative_score numeric default null,
  add column if not exists final_score numeric default null,
  add column if not exists final_percent numeric default null;
