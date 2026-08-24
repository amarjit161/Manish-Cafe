-- prevent_customer_application_tamper fires on EVERY update to this row,
-- including the trusted internal UPDATE inside change_application_status()
-- (SECURITY DEFINER changes execution privilege, not what current_role()
-- reports -- it still reflects the real logged-in customer). That trusted
-- path already flags itself via app.allow_status_change (see
-- prevent_direct_status_change), so reuse the same flag here instead of
-- unconditionally blocking every total_price_snapshot change a customer's
-- own session causes, even indirectly through the RPC they're allowed to
-- call. Without this fix, a customer's own submitApplication() call fails
-- with "customers cannot modify these application fields" the moment any
-- extra charge applies (discovered via real end-to-end testing, not
-- theoretically).
create or replace function public.prevent_customer_application_tamper()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if public.current_role() = 'customer' then
    if new.customer_id is distinct from old.customer_id
       or new.service_id is distinct from old.service_id
       or new.customer_price_snapshot is distinct from old.customer_price_snapshot
       or new.retailer_id is distinct from old.retailer_id
       or new.assigned_profile_id is distinct from old.assigned_profile_id then
      raise exception 'customers cannot modify these application fields';
    end if;

    if new.total_price_snapshot is distinct from old.total_price_snapshot
       and coalesce(current_setting('app.allow_status_change', true), '') <> 'on' then
      raise exception 'customers cannot modify these application fields';
    end if;
  end if;
  return new;
end;
$$;
