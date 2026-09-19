-- Migration 0062: Support all standard Porsline question types
-- حذف محدودیت تایپ قدیمی از جدول questions جهت پشتیبانی از انواع سوالات جدید

BEGIN;

-- حذف constraint قدیمی چک تایپ سوالات تا انواع جدید بدون مانع ذخیره شوند
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_type_check;

COMMIT;
