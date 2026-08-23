create table public.service_document_types (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id) on delete restrict,
  is_mandatory boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (service_id, document_type_id)
);

alter table public.service_document_types enable row level security;

create policy service_document_types_select_authenticated on public.service_document_types
  for select to authenticated
  using (exists (select 1 from public.services s where s.id = service_document_types.service_id and (s.is_active or public.current_role() = 'admin')));

create policy service_document_types_select_anon on public.service_document_types
  for select to anon
  using (exists (select 1 from public.services s where s.id = service_document_types.service_id and s.is_active));

create policy service_document_types_admin_insert on public.service_document_types
  for insert to authenticated with check (public.current_role() = 'admin');
create policy service_document_types_admin_update on public.service_document_types
  for update to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy service_document_types_admin_delete on public.service_document_types
  for delete to authenticated using (public.current_role() = 'admin');

create index service_document_types_service_id_idx on public.service_document_types(service_id);
create index service_document_types_document_type_id_idx on public.service_document_types(document_type_id);

grant select on public.service_document_types to authenticated, anon;
grant insert, update, delete on public.service_document_types to authenticated;
