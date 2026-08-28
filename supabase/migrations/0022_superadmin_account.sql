-- ══════════════════════════════════════════════════════════════
-- مایگریشن ۰۰۲۲: اکانت سوپرادمین
-- ══════════════════════════════════════════════════════════════

-- ⚠️ نکته مهم: ابتدا باید کاربر زیر را در Supabase Auth ایجاد کنید:
-- Email: superadmin@gmailc.com
-- Password: super1234
-- روش: Supabase Dashboard → Authentication → Users → Add User

-- بعد از ایجاد کاربر، ID آن را در متغیر زیر قرار دهید:
-- (از Auth > Users > کاربر > Copy User ID)

-- ─── مرحله ۱: ایجاد کاربر در auth (اگر وجود ندارد) ───
-- این خط را پس از ایجاد کاربر در Dashboard اجرا کنید:

-- INSERT INTO auth.users (
--   instance_id, id, aud, role, email, encrypted_password,
--   email_confirmed_at, created_at, updated_at, confirmation_token,
--   recovery_token, email_change_token_new, email_change
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'superadmin@gmailc.com',
--   crypt('super1234', gen_salt('bf')),
--   now(), now(), now(),
--   '', '', '', ''
-- ) ON CONFLICT (email) DO NOTHING;

-- ─── مرحله ۲: تنظیم نقش admin ───
-- پس از ایجاد کاربر، ID آن را جایگزین USER_ID_HERE کنید:

-- INSERT INTO public.user_roles (user_id, role_id, active)
-- VALUES ('USER_ID_HERE', 'admin', true)
-- ON CONFLICT (user_id) DO UPDATE SET role_id = 'admin', active = true;

-- ─── مرحله ۳: تنظیم is_owner ───
-- UPDATE public.profiles SET is_owner = true WHERE id = 'USER_ID_HERE';

-- ─── مرحله ۴: دادن تمام مجوزها ───
-- INSERT INTO public.user_permissions (user_id, permission_id)
-- VALUES
--   ('USER_ID_HERE', 'create_form'),
--   ('USER_ID_HERE', 'edit_form'),
--   ('USER_ID_HERE', 'delete_form'),
--   ('USER_ID_HERE', 'publish_form'),
--   ('USER_ID_HERE', 'view_responses'),
--   ('USER_ID_HERE', 'view_analytics'),
--   ('USER_ID_HERE', 'export_excel'),
--   ('USER_ID_HERE', 'manage_managers'),
--   ('USER_ID_HERE', 'manage_sms')
-- ON CONFLICT DO NOTHING;
