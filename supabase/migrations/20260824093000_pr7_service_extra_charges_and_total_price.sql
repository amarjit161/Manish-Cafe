-- Additive: lets a service configure extra charges that apply only when a
-- specific answer "flag" is present, instead of hardcoding surcharges (e.g.
-- Aadhaar's mobile-number question) into application code. Mirrors the
-- existing service_document_types.condition_key pattern exactly: a flag is
-- just a string that answers.flags either contains or doesn't -- same
-- simple array-membership check reused, not a new interpretation scheme.
create table public.service_extra_charges (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  condition_key text not null,
  label text not null,
  amount integer not null check (amount >= 0),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index service_extra_charges_service_id_idx on public.service_extra_charges(service_id);

alter table public.service_extra_charges enable row level security;

create policy service_extra_charges_select_anon on public.service_extra_charges
  for select to anon
  using (exists (select 1 from public.services s where s.id = service_extra_charges.service_id and s.is_active));

create policy service_extra_charges_select_authenticated on public.service_extra_charges
  for select to authenticated
  using (exists (select 1 from public.services s where s.id = service_extra_charges.service_id and (s.is_active or public.current_role() = 'admin')));

create policy service_extra_charges_admin_insert on public.service_extra_charges
  for insert to authenticated
  with check (public.current_role() = 'admin');

create policy service_extra_charges_admin_update on public.service_extra_charges
  for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy service_extra_charges_admin_delete on public.service_extra_charges
  for delete to authenticated
  using (public.current_role() = 'admin');

grant select on public.service_extra_charges to anon, authenticated;
grant insert, update, delete on public.service_extra_charges to authenticated;

-- Snapshot the FINAL price (base + applicable extra charges) at submission
-- time, same reasoning as customer_price_snapshot -- once a customer sees
-- and submits at a given total, that total must not silently change even
-- if admin later reconfigures extra-charge amounts. Null until submitted.
alter table public.applications add column total_price_snapshot integer;

-- Customers may never write total_price_snapshot directly (same rule as
-- customer_price_snapshot) -- it is only ever set inside
-- change_application_status(), computed server-side from the service's
-- configured extra charges and the answers already saved on the row.
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
       or new.total_price_snapshot is distinct from old.total_price_snapshot
       or new.retailer_id is distinct from old.retailer_id
       or new.assigned_profile_id is distinct from old.assigned_profile_id then
      raise exception 'customers cannot modify these application fields';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.change_application_status(
  p_application_id uuid,
  p_new_status public.application_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_role public.app_role := public.current_role();
  v_is_owner_customer boolean;
  v_is_scoped_retailer boolean;
  v_extra_charges integer;
begin
  select * into v_app from public.applications where id = p_application_id;
  if not found then
    raise exception 'application not found';
  end if;

  v_is_owner_customer := exists (
    select 1 from public.customers c where c.id = v_app.customer_id and c.profile_id = auth.uid()
  );
  v_is_scoped_retailer := v_app.retailer_id is not null and v_app.retailer_id = public.current_retailer_id();

  if v_role = 'admin' then
    null;
  elsif v_role = 'retailer' and v_is_scoped_retailer then
    if v_app.status = 'draft' then
      raise exception 'retailer cannot act on a draft application';
    end if;
  elsif v_role = 'customer' and v_is_owner_customer then
    if not (v_app.status = 'draft' and p_new_status = 'submitted') then
      raise exception 'customers may only submit their own draft applications';
    end if;
  else
    raise exception 'not authorized to change this application status';
  end if;

  if p_new_status = 'submitted' then
    select coalesce(sum(sec.amount), 0) into v_extra_charges
      from public.service_extra_charges sec
      where sec.service_id = v_app.service_id
        and (v_app.answers -> 'flags') ? sec.condition_key;
  end if;

  perform set_config('app.allow_status_change', 'on', true);

  update public.applications
     set status = p_new_status,
         submitted_at = case when p_new_status = 'submitted' then now() else submitted_at end,
         completed_at = case when p_new_status = 'completed' then now() else completed_at end,
         total_price_snapshot = case
           when p_new_status = 'submitted' then v_app.customer_price_snapshot + coalesce(v_extra_charges, 0)
           else total_price_snapshot
         end
   where id = p_application_id;

  insert into public.application_status_history (application_id, previous_status, new_status, changed_by, note)
  values (p_application_id, v_app.status, p_new_status, auth.uid(), p_note);

  perform set_config('app.allow_status_change', 'off', true);
end;
$$;

revoke all on function public.change_application_status(uuid, public.application_status, text) from public;
grant execute on function public.change_application_status(uuid, public.application_status, text) to authenticated;

-- Seed the Aadhaar mobile-number surcharge configuration so the amount is
-- data, not a hardcoded number in the UI.
insert into public.service_extra_charges (service_id, condition_key, label, amount, display_order)
select s.id, 'mobile_not_registered', 'Assistance for unregistered mobile number', 50, 1
from public.services s where s.slug = 'aadhaar-card-update'
union all
select s.id, 'mobile_registered_other', 'Assistance updating the mobile number linked to Aadhaar', 50, 2
from public.services s where s.slug = 'aadhaar-card-update';
