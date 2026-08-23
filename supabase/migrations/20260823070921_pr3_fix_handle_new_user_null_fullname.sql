create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  -- Never let a missing/blank full_name crash signup (and roll back the
  -- whole auth.users insert with it). Falls back to the email's local part
  -- when no name was supplied -- e.g. the create-staff-account.ts CLI
  -- script run without a name argument, or any future OAuth provider that
  -- doesn't return one.
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));

  insert into public.profiles (id, role, full_name, email, phone)
  values (new.id, 'customer', v_full_name, new.email, new.raw_user_meta_data ->> 'phone');

  insert into public.customers (profile_id, full_name, email, phone)
  values (new.id, v_full_name, new.email, new.raw_user_meta_data ->> 'phone');

  return new;
end;
$$;
