-- ══════════════════════════════════════════════════════════════
-- 0030: Super Admin — Full User Management
-- ══════════════════════════════════════════════════════════════

-- ─── Reset any user's password (owner only) ───
DROP FUNCTION IF EXISTS public.reset_user_password(uuid, text);

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
  SELECT COALESCE(is_owner, false) INTO v_is_owner
  FROM public.profiles WHERE id = v_caller_id;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the site owner can reset passwords.';
  END IF;

  IF length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  INSERT INTO activity_log (user_id, action, target_type, target_id, details)
  VALUES (v_caller_id, 'reset_password', 'user', p_target_user_id::text,
          jsonb_build_object('reset_by', v_caller_id));

  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_user_password(uuid, text) TO authenticated;

-- ─── Update any user's email (owner only) ───
DROP FUNCTION IF EXISTS public.update_user_email(uuid, text);

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
    RAISE EXCEPTION 'Only the site owner can change emails.';
  END IF;

  UPDATE auth.users
  SET email = p_new_email,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', p_new_email),
      updated_at = now()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  UPDATE public.profiles
  SET email = p_new_email
  WHERE id = p_target_user_id;

  INSERT INTO activity_log (user_id, action, target_type, target_id, details)
  VALUES (v_caller_id, 'update_email', 'user', p_target_user_id::text,
          jsonb_build_object('new_email', p_new_email, 'updated_by', v_caller_id));

  RETURN jsonb_build_object('success', true, 'message', 'Email updated successfully.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_email(uuid, text) TO authenticated;

-- ─── Get all users full info (owner only) ───
DROP FUNCTION IF EXISTS public.get_all_users_full();

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
    RAISE EXCEPTION 'Only the site owner can view full user info.';
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

GRANT EXECUTE ON FUNCTION public.get_all_users_full() TO authenticated;
