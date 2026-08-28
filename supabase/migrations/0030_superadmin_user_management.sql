-- ══════════════════════════════════════════════════════════════
-- 0030: Super Admin — Full User Management
--   • reset_user_password: change any user's password
--   • update_user_email: change any user's email
--   • get_all_users_full: full user info for super admin
-- ══════════════════════════════════════════════════════════════

-- ─── تغییر رمز عبور هر کاربر (فقط سوپرادمین) ───
CREATE OR REPLACE FUNCTION public.reset_user_password(
  p_target_user_id uuid,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_owner boolean;
BEGIN
  -- بررسی اینکه فراخوانی‌کننده owner است
  SELECT COALESCE(is_owner, false) INTO v_is_owner
  FROM public.profiles WHERE id = v_caller_id;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'فقط صاحب اصلی سایت اجازه تغییر رمز عبور را دارد.';
  END IF;

  -- اعتبارسنجی رمز عبور
  IF length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
  END IF;

  -- تغییر رمز عبور از طریق auth.users (نیاز به service_role دارد)
  -- این تابع با SECURITY DEFINER اجرا می‌شود
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'کاربر یافت نشد.';
  END IF;

  -- ثبت لاگ
  INSERT INTO activity_log (action, target_type, target_id, details, created_by)
  VALUES ('reset_password', 'user', p_target_user_id,
          jsonb_build_object('reset_by', v_caller_id),
          v_caller_id);

  RETURN jsonb_build_object('success', true, 'message', 'رمز عبور با موفقیت تغییر کرد.');
END;
$$;

-- ─── تغییر ایمیل هر کاربر (فقط سوپرادمین) ───
CREATE OR REPLACE FUNCTION public.update_user_email(
  p_target_user_id uuid,
  p_new_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_owner boolean;
BEGIN
  SELECT COALESCE(is_owner, false) INTO v_is_owner
  FROM public.profiles WHERE id = v_caller_id;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'فقط صاحب اصلی سایت اجازه تغییر ایمیل را دارد.';
  END IF;

  -- تغییر ایمیل در auth.users
  UPDATE auth.users
  SET email = p_new_email,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', p_new_email),
      updated_at = now()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'کاربر یافت نشد.';
  END IF;

  -- تغییر در profiles
  UPDATE public.profiles
  SET email = p_new_email
  WHERE id = p_target_user_id;

  -- ثبت لاگ
  INSERT INTO activity_log (action, target_type, target_id, details, created_by)
  VALUES ('update_email', 'user', p_target_user_id,
          jsonb_build_object('new_email', p_new_email, 'updated_by', v_caller_id),
          v_caller_id);

  RETURN jsonb_build_object('success', true, 'message', 'ایمیل با موفقیت تغییر کرد.');
END;
$$;

-- ─── دریافت اطلاعات کامل همه کاربران (فقط سوپرادمین) ───
CREATE OR REPLACE FUNCTION public.get_all_users_full()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_owner boolean;
BEGIN
  SELECT COALESCE(is_owner, false) INTO v_is_owner
  FROM public.profiles WHERE id = v_caller_id;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'فقط صاحب اصلی سایت اجازه مشاهده اطلاعات کامل را دارد.';
  END IF;

  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'is_active', p.is_active,
        'is_owner', COALESCE(p.is_owner, false),
        'created_at', p.created_at,
        'role', ur.role_id,
        'role_active', ur.active,
        'permissions', (
          SELECT COALESCE(jsonb_agg(up.permission_id), '[]'::jsonb)
          FROM user_permissions up WHERE up.user_id = p.id
        ),
        'hidden_from', p.hidden_from
      )
    )
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    ORDER BY p.created_at ASC
  );
END;
$$;
