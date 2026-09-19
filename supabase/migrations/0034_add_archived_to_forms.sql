-- ════════════════════════════════════════════════════════════════
-- 0032: Add archived column to forms
-- ════════════════════════════════════════════════════════════════

alter table public.forms
  add column if not exists archived boolean not null default false;

create index if not exists forms_archived_idx on public.forms (archived);
