-- Harden search_path on every function not already pinned
alter function public.set_updated_at() set search_path = public;
alter function public.current_role() set search_path = public;
alter function public.current_retailer_id() set search_path = public;
alter function public.current_customer_id() set search_path = public;
alter function public.prevent_self_role_escalation() set search_path = public;
alter function public.prevent_retailer_self_status_change() set search_path = public;
alter function public.prevent_customer_restricted_update() set search_path = public;
alter function public.prevent_customer_application_tamper() set search_path = public;
alter function public.prevent_direct_status_change() set search_path = public;
alter function public.assign_and_validate_application_retailer() set search_path = public;
alter function public.generate_application_number() set search_path = public;
alter function public.validate_document_upload() set search_path = public;
alter function public.prevent_manual_document_deletion() set search_path = public;
alter function public.enforce_document_customer_ownership() set search_path = public;
alter function public.prevent_document_reparenting() set search_path = public;

-- Lock down RPC exposure of SECURITY DEFINER functions to exactly the intended callers
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.snapshot_application_cost() from public, anon, authenticated;
revoke execute on function public.change_application_status(uuid, public.application_status, text) from anon;
revoke execute on function public.log_audit_event(text, text, uuid, jsonb) from anon;

-- Remove redundant overlapping SELECT policy on services/document_types
drop policy services_admin_write on public.services;
create policy services_admin_insert on public.services
  for insert to authenticated
  with check (public.current_role() = 'admin');
create policy services_admin_update on public.services
  for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy services_admin_delete on public.services
  for delete to authenticated
  using (public.current_role() = 'admin');

drop policy document_types_admin_write on public.document_types;
create policy document_types_admin_insert on public.document_types
  for insert to authenticated
  with check (public.current_role() = 'admin');
create policy document_types_admin_update on public.document_types
  for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy document_types_admin_delete on public.document_types
  for delete to authenticated
  using (public.current_role() = 'admin');
