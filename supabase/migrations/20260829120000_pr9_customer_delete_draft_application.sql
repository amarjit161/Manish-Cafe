-- ============================================================
-- Customers may delete their own DRAFT-ONLY applications. There was no
-- delete policy on applications at all before this (RLS defaults to deny),
-- and application_documents/application_financials both reference
-- applications with ON DELETE RESTRICT, so a customer-scoped RLS policy
-- alone would still fail on any draft that already has an uploaded
-- document. A SECURITY DEFINER function (mirroring change_application_status)
-- does the ownership/status check itself and clears the child rows the
-- parent's own RESTRICT constraints would otherwise block, then returns
-- the R2 object keys of any deleted documents so the caller can clean
-- those up too (Postgres has no way to reach the Cloudflare Worker itself).
-- ============================================================

create or replace function public.delete_draft_application(p_application_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_is_owner_customer boolean;
  v_object_keys text[];
begin
  select * into v_app from public.applications where id = p_application_id;
  if not found then
    raise exception 'application not found';
  end if;

  v_is_owner_customer := exists (
    select 1 from public.customers c where c.id = v_app.customer_id and c.profile_id = auth.uid()
  );
  if not v_is_owner_customer then
    raise exception 'not authorized to delete this application';
  end if;
  if v_app.status <> 'draft' then
    raise exception 'only a draft application can be deleted';
  end if;

  select coalesce(array_agg(r2_object_key), '{}') into v_object_keys
    from public.application_documents where application_id = p_application_id;

  delete from public.application_documents where application_id = p_application_id;
  delete from public.application_financials where application_id = p_application_id;
  -- application_messages, application_internal_notes, and
  -- application_status_history all reference applications with ON DELETE
  -- CASCADE already, so deleting the row itself is enough for those.
  delete from public.applications where id = p_application_id;

  return v_object_keys;
end;
$$;

revoke all on function public.delete_draft_application(uuid) from public;
grant execute on function public.delete_draft_application(uuid) to authenticated;
