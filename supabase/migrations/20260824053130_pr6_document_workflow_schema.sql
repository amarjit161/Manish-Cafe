-- Extend document_status with a richer review workflow. All existing
-- values (uploaded/verified/rejected/deleted) are preserved exactly --
-- this only adds new values, never removes or renames.
alter type public.document_status add value 'under_review';
alter type public.document_status add value 'approved';
alter type public.document_status add value 'reupload_required';

-- Reuses the existing verified_by/verified_at columns as the generic
-- "who reviewed this and when" fields for approve/reject/reupload-request
-- alike (no new document_reviews table -- this is the equivalent
-- structure already present).
alter table public.application_documents
  add column rejection_reason text,
  add column reupload_message text;

-- Stable per-service identifier independent of the display name, so
-- application code can key service-specific behavior (the Aadhaar
-- update question set) without depending on a name string that could
-- change. Nullable/unique -- existing rows unaffected until backfilled.
alter table public.services add column slug text unique;

-- Generic, reusable store for service-specific application answers (e.g.
-- which Aadhaar fields the customer wants updated). Not service-specific
-- schema -- any future service's question set can reuse this same column.
alter table public.applications add column answers jsonb not null default '{}'::jsonb;

-- Conditional document requirements: when set, is_mandatory only applies
-- if applications.answers contains a matching value for this key
-- (interpreted by application code). NULL preserves current behavior
-- (unconditionally required per is_mandatory) for every existing row.
alter table public.service_document_types add column condition_key text;

-- ============================================================
-- application_messages: customer <-> admin/retailer conversation
-- ============================================================
create table public.application_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id),
  sender_role public.app_role not null,
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index application_messages_application_id_idx on public.application_messages(application_id, created_at);

alter table public.application_messages enable row level security;

create policy application_messages_select on public.application_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_messages.application_id
        and (a.customer_id = public.current_customer_id() or a.retailer_id = public.current_retailer_id())
    )
    or public.current_role() = 'admin'
  );

create policy application_messages_insert on public.application_messages
  for insert to authenticated
  with check (
    sender_profile_id = auth.uid()
    and sender_role = public.current_role()
    and (
      exists (
        select 1 from public.applications a
        where a.id = application_messages.application_id
          and (a.customer_id = public.current_customer_id() or a.retailer_id = public.current_retailer_id())
      )
      or public.current_role() = 'admin'
    )
  );

grant select, insert on public.application_messages to authenticated;

-- ============================================================
-- application_internal_notes: admin/retailer only, never visible to
-- customers -- enforced by having NO policy granting customers any
-- access at all (RLS default-denies), not by application-layer hiding.
-- ============================================================
create table public.application_internal_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id),
  note text not null check (char_length(trim(note)) > 0),
  created_at timestamptz not null default now()
);

create index application_internal_notes_application_id_idx on public.application_internal_notes(application_id, created_at);

alter table public.application_internal_notes enable row level security;

create policy application_internal_notes_select on public.application_internal_notes
  for select to authenticated
  using (
    public.current_role() = 'admin'
    or exists (
      select 1 from public.applications a
      where a.id = application_internal_notes.application_id and a.retailer_id = public.current_retailer_id()
    )
  );

create policy application_internal_notes_insert on public.application_internal_notes
  for insert to authenticated
  with check (
    author_profile_id = auth.uid()
    and (
      public.current_role() = 'admin'
      or exists (
        select 1 from public.applications a
        where a.id = application_internal_notes.application_id and a.retailer_id = public.current_retailer_id()
      )
    )
  );

grant select, insert on public.application_internal_notes to authenticated;
