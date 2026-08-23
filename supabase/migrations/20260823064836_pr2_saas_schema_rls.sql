-- ============================================================
-- PR #2: ManishCafe SaaS schema + RLS (additive only)
-- Nothing in this script touches Station, Booking, SevaRequest,
-- CourseEnquiry, _prisma_migrations, or any Prisma-managed object.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type public.app_role as enum ('customer', 'retailer', 'admin');
create type public.account_status as enum ('active', 'inactive', 'suspended');
create type public.application_status as enum (
  'draft', 'submitted', 'under_review', 'documents_required',
  'processing', 'completed', 'rejected', 'cancelled'
);
create type public.document_status as enum ('uploaded', 'verified', 'rejected', 'deleted');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Step 2: profiles, retailers, customers (tables only)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text,
  phone text,
  email text unique,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create index profiles_status_idx on public.profiles(status);
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.retailers (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid unique references public.profiles(id) on delete restrict,
  business_name text not null,
  contact_phone text,
  contact_email text,
  address text,
  status public.account_status not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retailers_owner_profile_id_idx on public.retailers(owner_profile_id);
create index retailers_status_idx on public.retailers(status);
create trigger trg_retailers_updated_at
  before update on public.retailers
  for each row execute function public.set_updated_at();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  retailer_id uuid references public.retailers(id) on delete set null,
  full_name text not null,
  email text unique,
  phone text,
  date_of_birth date,
  address text,
  notes text,
  status public.account_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_profile_id_idx on public.customers(profile_id);
create index customers_retailer_id_idx on public.customers(retailer_id);
create index customers_email_idx on public.customers(email);
create index customers_status_idx on public.customers(status);
create index customers_created_at_idx on public.customers(created_at);
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ============================================================
-- Step 3: role/ownership helper functions (all three tables now exist)
-- ============================================================
create or replace function public.current_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_retailer_id()
returns uuid
language sql
stable
as $$
  select id from public.retailers where owner_profile_id = auth.uid();
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
as $$
  select id from public.customers where profile_id = auth.uid();
$$;

grant execute on function public.current_role() to authenticated, anon;
grant execute on function public.current_retailer_id() to authenticated;
grant execute on function public.current_customer_id() to authenticated;

-- ============================================================
-- Step 4: auth.users -> profiles (+ customers) provisioning
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, phone)
  values (new.id, 'customer', new.raw_user_meta_data ->> 'full_name', new.email, new.raw_user_meta_data ->> 'phone');

  insert into public.customers (profile_id, full_name, email, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email, new.raw_user_meta_data ->> 'phone');

  return new;
end;
$$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Step 5: profiles RLS
-- ============================================================
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if public.current_role() <> 'admin' then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'only admin may change role or status';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_prevent_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_role() = 'admin');

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.current_role() = 'admin')
  with check (id = auth.uid() or public.current_role() = 'admin');

grant select, update on public.profiles to authenticated;

-- ============================================================
-- Step 6: retailers RLS (active retailers visible to all)
-- ============================================================
create or replace function public.prevent_retailer_self_status_change()
returns trigger
language plpgsql
as $$
begin
  if public.current_role() <> 'admin' then
    if new.status is distinct from old.status or new.owner_profile_id is distinct from old.owner_profile_id then
      raise exception 'only admin may change retailer status or ownership';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_prevent_retailer_self_status_change
  before update on public.retailers
  for each row execute function public.prevent_retailer_self_status_change();

alter table public.retailers enable row level security;

create policy retailers_select on public.retailers
  for select to authenticated
  using (
    status = 'active'
    or owner_profile_id = auth.uid()
    or public.current_role() = 'admin'
  );

create policy retailers_self_update on public.retailers
  for update to authenticated
  using (owner_profile_id = auth.uid() or public.current_role() = 'admin')
  with check (owner_profile_id = auth.uid() or public.current_role() = 'admin');

create policy retailers_admin_insert on public.retailers
  for insert to authenticated
  with check (public.current_role() = 'admin');

grant select, insert, update on public.retailers to authenticated;

-- ============================================================
-- Step 7: customers RLS
-- ============================================================
create or replace function public.prevent_customer_restricted_update()
returns trigger
language plpgsql
as $$
begin
  if public.current_role() = 'customer' then
    if new.retailer_id is distinct from old.retailer_id
       or new.profile_id is distinct from old.profile_id
       or new.notes is distinct from old.notes
       or new.status is distinct from old.status then
      raise exception 'customers may only update their own contact details';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_prevent_customer_restricted_update
  before update on public.customers
  for each row execute function public.prevent_customer_restricted_update();

alter table public.customers enable row level security;

create policy customers_select on public.customers
  for select to authenticated
  using (
    profile_id = auth.uid()
    or retailer_id = public.current_retailer_id()
    or public.current_role() = 'admin'
  );

create policy customers_insert on public.customers
  for insert to authenticated
  with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'retailer' and retailer_id = public.current_retailer_id())
  );

create policy customers_update on public.customers
  for update to authenticated
  using (
    profile_id = auth.uid()
    or retailer_id = public.current_retailer_id()
    or public.current_role() = 'admin'
  )
  with check (
    profile_id = auth.uid()
    or retailer_id = public.current_retailer_id()
    or public.current_role() = 'admin'
  );

grant select, insert, update on public.customers to authenticated;

-- ============================================================
-- Step 8: services + service_costs
-- ============================================================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid references public.retailers(id) on delete cascade,
  name text not null,
  description text,
  category text,
  customer_price integer not null check (customer_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_retailer_id_idx on public.services(retailer_id);
create index services_category_idx on public.services(category);
create index services_is_active_idx on public.services(is_active);
create trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;

create policy services_select_authenticated on public.services
  for select to authenticated
  using (is_active or public.current_role() = 'admin');

create policy services_select_anon on public.services
  for select to anon
  using (is_active);

create policy services_admin_write on public.services
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

grant select on public.services to authenticated, anon;
grant insert, update, delete on public.services to authenticated;

create table public.service_costs (
  service_id uuid primary key references public.services(id) on delete cascade,
  internal_cost integer not null default 0 check (internal_cost >= 0),
  updated_at timestamptz not null default now()
);
create trigger trg_service_costs_updated_at
  before update on public.service_costs
  for each row execute function public.set_updated_at();

alter table public.service_costs enable row level security;

create policy service_costs_admin_only on public.service_costs
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

grant select, insert, update, delete on public.service_costs to authenticated;

-- ============================================================
-- Step 9: document_types
-- ============================================================
create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  allowed_mime_types text[] not null default array['application/pdf','image/jpeg','image/png'],
  max_file_size_bytes bigint not null default 10485760,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index document_types_code_idx on public.document_types(code);
create index document_types_is_active_idx on public.document_types(is_active);
create trigger trg_document_types_updated_at
  before update on public.document_types
  for each row execute function public.set_updated_at();

alter table public.document_types enable row level security;

create policy document_types_select_authenticated on public.document_types
  for select to authenticated
  using (is_active or public.current_role() = 'admin');

create policy document_types_select_anon on public.document_types
  for select to anon
  using (is_active);

create policy document_types_admin_write on public.document_types
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

grant select on public.document_types to authenticated, anon;
grant insert, update, delete on public.document_types to authenticated;

-- ============================================================
-- Step 10: applications (table, numbering)
-- ============================================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  application_number text unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  retailer_id uuid references public.retailers(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  status public.application_status not null default 'draft',
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  customer_price_snapshot integer not null,
  notes text,
  created_by uuid references public.profiles(id),
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_customer_id_idx on public.applications(customer_id);
create index applications_retailer_id_idx on public.applications(retailer_id);
create index applications_service_id_idx on public.applications(service_id);
create index applications_status_idx on public.applications(status);
create index applications_created_at_idx on public.applications(created_at);

create sequence public.application_number_seq;

create or replace function public.generate_application_number()
returns trigger
language plpgsql
as $$
begin
  if new.application_number is null then
    new.application_number := 'MC-' || extract(year from now())::text || '-' ||
      lpad(nextval('public.application_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
create trigger trg_generate_application_number
  before insert on public.applications
  for each row execute function public.generate_application_number();

create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- ============================================================
-- Step 11: application_financials
-- ============================================================
create table public.application_financials (
  application_id uuid primary key references public.applications(id) on delete restrict,
  internal_cost_snapshot integer not null default 0 check (internal_cost_snapshot >= 0),
  created_at timestamptz not null default now()
);

alter table public.application_financials enable row level security;

create policy application_financials_admin_only on public.application_financials
  for select to authenticated
  using (public.current_role() = 'admin');

grant select on public.application_financials to authenticated;

create or replace function public.snapshot_application_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost integer;
begin
  select internal_cost into v_cost from public.service_costs where service_id = new.service_id;
  insert into public.application_financials (application_id, internal_cost_snapshot)
  values (new.id, coalesce(v_cost, 0));
  return new;
end;
$$;
create trigger trg_snapshot_application_cost
  after insert on public.applications
  for each row execute function public.snapshot_application_cost();

-- ============================================================
-- Step 12: applications integrity/lockdown triggers
-- ============================================================
create or replace function public.prevent_direct_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.allow_status_change', true), '') <> 'on' then
    raise exception 'application status can only be changed via change_application_status()';
  end if;
  return new;
end;
$$;
create trigger trg_prevent_direct_status_change
  before update on public.applications
  for each row execute function public.prevent_direct_status_change();

create or replace function public.prevent_customer_application_tamper()
returns trigger
language plpgsql
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
  end if;
  return new;
end;
$$;
create trigger trg_prevent_customer_application_tamper
  before update on public.applications
  for each row execute function public.prevent_customer_application_tamper();

create or replace function public.assign_and_validate_application_retailer()
returns trigger
language plpgsql
as $$
declare
  v_service_retailer_id uuid;
  v_retailer_status public.account_status;
begin
  if tg_op = 'UPDATE'
     and new.service_id is not distinct from old.service_id
     and new.retailer_id is not distinct from old.retailer_id then
    return new;
  end if;

  select retailer_id into v_service_retailer_id from public.services where id = new.service_id;

  if v_service_retailer_id is not null then
    new.retailer_id := v_service_retailer_id;
  elsif new.retailer_id is not null then
    select status into v_retailer_status from public.retailers where id = new.retailer_id;
    if v_retailer_status is null then
      raise exception 'selected retailer does not exist';
    elsif v_retailer_status <> 'active' then
      raise exception 'selected retailer is not currently active';
    end if;
  end if;

  return new;
end;
$$;
create trigger trg_assign_and_validate_application_retailer
  before insert or update on public.applications
  for each row execute function public.assign_and_validate_application_retailer();

-- ============================================================
-- Step 13: applications RLS
-- ============================================================
alter table public.applications enable row level security;

create policy applications_select on public.applications
  for select to authenticated
  using (
    customer_id = public.current_customer_id()
    or retailer_id = public.current_retailer_id()
    or public.current_role() = 'admin'
  );

create policy applications_insert on public.applications
  for insert to authenticated
  with check (
    (
      public.current_role() = 'customer'
      and customer_id = public.current_customer_id()
      and status = 'draft'
    )
    or public.current_role() in ('retailer', 'admin')
  );

create policy applications_update on public.applications
  for update to authenticated
  using (
    customer_id = public.current_customer_id()
    or retailer_id = public.current_retailer_id()
    or public.current_role() = 'admin'
  )
  with check (
    customer_id = public.current_customer_id()
    or retailer_id = public.current_retailer_id()
    or public.current_role() = 'admin'
  );

grant select, insert, update on public.applications to authenticated;

-- ============================================================
-- Step 14: application_status_history
-- ============================================================
create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  previous_status public.application_status,
  new_status public.application_status not null,
  changed_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);
create index application_status_history_application_id_idx on public.application_status_history(application_id);
create index application_status_history_created_at_idx on public.application_status_history(created_at);

alter table public.application_status_history enable row level security;

create policy application_status_history_select on public.application_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_status_history.application_id
        and (a.customer_id = public.current_customer_id() or a.retailer_id = public.current_retailer_id())
    )
    or public.current_role() = 'admin'
  );

grant select on public.application_status_history to authenticated;

-- ============================================================
-- Step 15: change_application_status()
-- ============================================================
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

  perform set_config('app.allow_status_change', 'on', true);

  update public.applications
     set status = p_new_status,
         submitted_at = case when p_new_status = 'submitted' then now() else submitted_at end,
         completed_at = case when p_new_status = 'completed' then now() else completed_at end
   where id = p_application_id;

  insert into public.application_status_history (application_id, previous_status, new_status, changed_by, note)
  values (p_application_id, v_app.status, p_new_status, auth.uid(), p_note);

  perform set_config('app.allow_status_change', 'off', true);
end;
$$;

revoke all on function public.change_application_status(uuid, public.application_status, text) from public;
grant execute on function public.change_application_status(uuid, public.application_status, text) to authenticated;

-- ============================================================
-- Step 16: application_documents
-- ============================================================
create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  document_type_id uuid not null references public.document_types(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  original_filename text not null,
  r2_object_key text unique not null check (
    r2_object_key ~ '^applications/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,200}$'
  ),
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  checksum_sha256 text,
  status public.document_status not null default 'uploaded',
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  retention_until timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index application_documents_application_id_idx on public.application_documents(application_id);
create index application_documents_customer_id_idx on public.application_documents(customer_id);
create index application_documents_status_idx on public.application_documents(status);
create index application_documents_retention_until_idx on public.application_documents(retention_until);
create trigger trg_application_documents_updated_at
  before update on public.application_documents
  for each row execute function public.set_updated_at();

create or replace function public.validate_document_upload()
returns trigger
language plpgsql
as $$
declare
  v_allowed_mime text[];
  v_max_size bigint;
begin
  select allowed_mime_types, max_file_size_bytes into v_allowed_mime, v_max_size
    from public.document_types where id = new.document_type_id;

  if v_allowed_mime is null then
    raise exception 'unknown document_type_id %', new.document_type_id;
  end if;
  if not (new.mime_type = any (v_allowed_mime)) then
    raise exception 'mime_type % is not allowed for this document type', new.mime_type;
  end if;
  if new.file_size > v_max_size then
    raise exception 'file_size % exceeds the % byte limit for this document type', new.file_size, v_max_size;
  end if;
  return new;
end;
$$;
create trigger trg_validate_document_upload
  before insert or update on public.application_documents
  for each row execute function public.validate_document_upload();

create or replace function public.prevent_manual_document_deletion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'deleted' and old.status <> 'deleted' and public.current_role() <> 'admin' then
    raise exception 'only admin (or the future retention job) may mark a document deleted';
  end if;
  return new;
end;
$$;
create trigger trg_prevent_manual_document_deletion
  before update on public.application_documents
  for each row execute function public.prevent_manual_document_deletion();

create or replace function public.enforce_document_customer_ownership()
returns trigger
language plpgsql
as $$
declare
  v_actual_customer_id uuid;
begin
  select customer_id into v_actual_customer_id from public.applications where id = new.application_id;
  if v_actual_customer_id is null then
    raise exception 'application % does not exist', new.application_id;
  end if;
  if new.customer_id is distinct from v_actual_customer_id then
    raise exception 'application_documents.customer_id must match applications.customer_id';
  end if;
  return new;
end;
$$;
create trigger trg_enforce_document_customer_ownership
  before insert on public.application_documents
  for each row execute function public.enforce_document_customer_ownership();

create or replace function public.prevent_document_reparenting()
returns trigger
language plpgsql
as $$
begin
  if new.application_id is distinct from old.application_id
     or new.customer_id is distinct from old.customer_id then
    raise exception 'application_documents cannot be reassigned to a different application or customer';
  end if;
  return new;
end;
$$;
create trigger trg_prevent_document_reparenting
  before update on public.application_documents
  for each row execute function public.prevent_document_reparenting();

alter table public.application_documents enable row level security;

create policy application_documents_select on public.application_documents
  for select to authenticated
  using (
    customer_id = public.current_customer_id()
    or exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id and a.retailer_id = public.current_retailer_id()
    )
    or public.current_role() = 'admin'
  );

create policy application_documents_insert on public.application_documents
  for insert to authenticated
  with check (
    (
      customer_id = public.current_customer_id()
      and exists (
        select 1 from public.applications a
        where a.id = application_documents.application_id
          and a.customer_id = application_documents.customer_id
          and a.status in ('draft', 'submitted', 'documents_required')
      )
    )
    or exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id and a.retailer_id = public.current_retailer_id()
    )
    or public.current_role() = 'admin'
  );

create policy application_documents_update on public.application_documents
  for update to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id and a.retailer_id = public.current_retailer_id()
    )
    or public.current_role() = 'admin'
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id and a.retailer_id = public.current_retailer_id()
    )
    or public.current_role() = 'admin'
  );

grant select, insert, update on public.application_documents to authenticated;

-- ============================================================
-- Step 17: notifications
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_application_id uuid references public.applications(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_profile_id_is_read_created_at_idx on public.notifications(profile_id, is_read, created_at);

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (profile_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy notifications_insert_staff on public.notifications
  for insert to authenticated
  with check (
    public.current_role() = 'admin'
    or (
      public.current_role() = 'retailer'
      and exists (
        select 1 from public.customers c
        where c.profile_id = notifications.profile_id and c.retailer_id = public.current_retailer_id()
      )
    )
  );

grant select, insert, update on public.notifications to authenticated;

-- ============================================================
-- Step 18: audit_logs
-- ============================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index audit_logs_resource_idx on public.audit_logs(resource_type, resource_id);
create index audit_logs_action_idx on public.audit_logs(action);
create index audit_logs_created_at_idx on public.audit_logs(created_at);

alter table public.audit_logs enable row level security;

create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using (public.current_role() = 'admin');

grant select on public.audit_logs to authenticated;

create or replace function public.log_audit_event(
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata);
end;
$$;

revoke all on function public.log_audit_event(text, text, uuid, jsonb) from public;
grant execute on function public.log_audit_event(text, text, uuid, jsonb) to authenticated;
