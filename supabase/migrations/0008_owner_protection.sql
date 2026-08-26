-- ════════════════════════════════════════════════════════════════
-- پرسکاد (Porskad) v8 — محافظت صاحب اصلی (Owner)
-- ════════════════════════════════════════════════════════════════

-- ─── اضافه کردن فیلد is_owner به جدول profiles ───
alter table public.profiles
  add column if not exists is_owner boolean not null default false;

-- ─── تابع: بررسی آیا کاربر owner است ───
create or replace function public.is_owner(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_owner from public.profiles where id = p_user_id),
    false
  );
$$;

grant execute on function public.is_owner(uuid) to authenticated, anon;

-- ─── تابع: حذف مدیر (محافظت از owner) ───
-- اگر کاربر مورد نظر owner باشد، خطا برمی‌گرداند
drop function if exists public.delete_manager(uuid);
create or replace function public.delete_manager(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- بررسی اینکه آیا کاربر owner است
  if public.is_owner(p_user_id) then
    raise exception 'امکان حذف صاحب اصلی سایت وجود ندارد.';
  end if;

  -- حذف کاربر از auth.users (profile و user_roles با cascade حذف می‌شوند)
  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.delete_manager(uuid) to authenticated, anon;

-- ─── تابع: غیرفعال/فعال کردن مدیر (محافظت از owner) ───
-- اگر کاربر مورد نظر owner باشد، خطا برمی‌گرداند
drop function if exists public.set_manager_active(uuid, boolean);
create or replace function public.set_manager_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- بررسی اینکه آیا کاربر owner است
  if public.is_owner(p_user_id) then
    raise exception 'امکان غیرفعال کردن صاحب اصلی سایت وجود ندارد.';
  end if;

  -- تغییر وضعیت نقش
  update public.user_roles set active = p_active where user_id = p_user_id;
  -- تغییر وضعیت پروفایل
  update public.profiles set is_active = p_active where id = p_user_id;
end;
$$;

grant execute on function public.set_manager_active(uuid, boolean) to authenticated, anon;

-- ─── تابع: به‌روزرسانی مجوزها (محافظت از owner) ───
-- owner همیشه همه مجوزها را دارد
drop function if exists public.set_user_permissions(uuid, text[]);
create or replace function public.set_user_permissions(
  p_user_id   uuid,
  p_permission_ids text[]
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- اگر کاربر owner است، اجازه تغییر مجوز نده
  if public.is_owner(p_user_id) then
    raise exception 'امکان تغییر مجوزهای صاحب اصلی سایت وجود ندارد.';
  end if;

  -- حذف مجوزهای قبلی کاربر
  delete from public.user_permissions where user_id = p_user_id;

  -- اضافه کردن مجوزهای جدید
  insert into public.user_permissions (user_id, permission_id)
  select p_user_id, unnest(p_permission_ids);
end;
$$;

grant execute on function public.set_user_permissions(uuid, text[]) to authenticated, anon;

-- ─── تابع: به‌روزرسانی پروفایل (محافظت از is_owner و is_active owner) ───
-- owner نمی‌تواند is_active یا is_owner خود را تغییر دهد
create or replace function public.update_profile_safe(
  p_user_id uuid,
  p_full_name text default null,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- اگر کاربر owner است، فقط full_name قابل تغییر است
  if public.is_owner(p_user_id) then
    update public.profiles set
      full_name = coalesce(p_full_name, full_name)
      -- is_active و is_owner owner قابل تغییر نیستند
    where id = p_user_id;
  else
    update public.profiles set
      full_name = coalesce(p_full_name, full_name),
      is_active = coalesce(p_is_active, is_active)
    where id = p_user_id;
  end if;
end;
$$;

grant execute on function public.update_profile_safe(uuid, text, boolean) to authenticated, anon;

-- ─── به‌روزرسانی get_user_permissions: owner همیشه همه مجوزها ───
create or replace function public.get_user_permissions(p_user_id uuid)
returns table (permission_id text, permission_name text)
language plpgsql
security definer set search_path = public
as $$
begin
  -- اگر کاربر owner است، همه مجوزها را برگردان
  if public.is_owner(p_user_id) then
    return query
      select p.id, p.name
      from public.permissions p;
    return;
  end if;

  return query
    select distinct rp.permission_id, pr.name
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and ur.active = true
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions pr on pr.id = rp.permission_id
    where ur.user_id = p_user_id;
end;
$$;

-- ─── نشان‌گذاری اولین کاربر به عنوان owner ───
-- این کاربر اولی که سیستم رو راه انداخته owner می‌شود
do $$
DECLARE
  first_user_id uuid;
BEGIN
  -- پیدا کردن اولین کاربر بر اساس تاریخ ایجاد
  SELECT id INTO first_user_id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_user_id IS NOT NULL THEN
    UPDATE public.profiles SET is_owner = true WHERE id = first_user_id;
    RAISE NOTICE 'کاربر owner شناسایی شد: %', first_user_id;
  ELSE
    RAISE NOTICE 'هنوز کاربری وجود ندارد.';
  END IF;
END $$;
