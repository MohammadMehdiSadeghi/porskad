-- ════════════════════════════════════════════════════════════════
-- 0031: پاکسازی کامل SMS از دیتابیس
-- این فایل رو توی Supabase Dashboard → SQL Editor اجرا کن
-- ════════════════════════════════════════════════════════════════

-- ─── ۱. حذف جداول SMS ───
drop table if exists public.sms_outbox cascade;
drop table if exists public.sms_inbox cascade;
drop table if exists public.sms_delivery_reports cascade;
drop table if exists public.sms_otp_requests cascade;
drop table if exists public.sms_settings cascade;

-- ─── ۲. حذف توابع SMS ───
drop function if exists public.save_sms_settings(text, text, text);
drop function if exists public.save_sms_settings(text, text, text, text, text);
drop function if exists public.get_active_sms_settings();
drop function if exists public.log_sms_outbox(text, text, text, text, text);
drop function if exists public.get_sms_stats();

-- ─── ۳. حذف مجوز manage_sms از نقش ادمین ───
delete from public.role_permissions where permission_id = 'manage_sms';
delete from public.permissions where id = 'manage_sms';
