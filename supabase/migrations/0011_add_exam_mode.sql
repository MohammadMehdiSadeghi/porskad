-- ════════════════════════════════════════════════════════════════
-- Add Exam Form Type 
-- ════════════════════════════════════════════════════════════════

alter table public.forms drop constraint if exists forms_form_type_check;
alter table public.forms add constraint forms_form_type_check check (form_type in ('step_by_step', 'registration', 'exam'));
