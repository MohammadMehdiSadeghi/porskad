-- Migration 0060: Add default_theme column to forms table
ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS default_theme text NOT NULL DEFAULT 'light'
CHECK (default_theme IN ('light', 'dark', 'system'));

COMMENT ON COLUMN public.forms.default_theme IS 'Default visual theme mode for this form: light, dark, or system';
