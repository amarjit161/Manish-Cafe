-- ============================================================
-- Appointment booking, additive only -- no existing table, enum, policy,
-- or function is touched. The unrelated legacy `bookings`/`Station`
-- system (Prisma-managed, its own cookie-session admin auth, no RLS,
-- built for hourly gaming-station rentals) is a different subsystem and
-- is not reused here: wrong auth model, wrong shape, no
-- application/customer linkage.
-- ============================================================

-- One boolean, configurable per service, rather than hardcoding a slug
-- check ("aadhaar-card-update") wherever "does this need an appointment"
-- matters.
alter table public.services add column if not exists requires_appointment boolean not null default false;
update public.services set requires_appointment = true where slug = 'aadhaar-card-update';

create type public.appointment_status as enum ('booked', 'completed', 'cancelled', 'no_show');

-- The business's configurable daily timetable per service -- e.g.
-- 10:00-10:30, 10:30-11:00, ... -- changeable later (capacity, active
-- flag, times) without any code change. Same set of times applies every
-- day; day-of-week rules were not requested with a concrete rule, so
-- deliberately left out rather than invented.
create table public.appointment_slot_templates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  capacity integer not null default 1 check (capacity > 0),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appointment_slot_templates_service_idx on public.appointment_slot_templates(service_id) where is_active;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  slot_template_id uuid not null references public.appointment_slot_templates(id) on delete restrict,
  appointment_date date not null,
  status public.appointment_status not null default 'booked',
  primary_mobile text not null,
  alternative_mobile text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appointments_date_slot_idx on public.appointments(appointment_date, slot_template_id) where status = 'booked';
create index appointments_customer_idx on public.appointments(customer_id);
-- Partial, not a plain unique column: an application can only ever have
-- ONE currently-active ("booked") appointment at a time, but a
-- cancelled/completed/no_show row must stay in history so the customer
-- can cancel and rebook the same application. A plain `unique` on
-- application_id was tried first and reproduced a real bug in testing --
-- cancelling then rebooking failed with a raw
-- "duplicate key value violates unique constraint" error, since the old
-- (cancelled) row still occupied the slot.
create unique index appointments_application_id_active_key on public.appointments(application_id) where status = 'booked';

create trigger trg_appointment_slot_templates_updated_at
  before update on public.appointment_slot_templates
  for each row execute function public.set_updated_at();
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.appointment_slot_templates enable row level security;
alter table public.appointments enable row level security;

-- Everyone authenticated can read active templates (needed to render
-- available times); nothing else is exposed. Only admin manages them --
-- no UI to create/edit templates ships this round, so this is currently
-- admin-via-SQL-only, matching "don't over-engineer".
create policy appointment_slot_templates_select on public.appointment_slot_templates
  for select to authenticated
  using (is_active or public.current_role() = 'admin');
create policy appointment_slot_templates_admin_write on public.appointment_slot_templates
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Customers only ever see their own appointment; admin sees all. There is
-- deliberately NO insert/update policy for customers -- every write goes
-- through a SECURITY DEFINER function below, so a customer can never
-- insert a row that skips the capacity check or edit another customer's
-- appointment by crafting their own UPDATE.
create policy appointments_select on public.appointments
  for select to authenticated
  using (customer_id = public.current_customer_id() or public.current_role() = 'admin');
create policy appointments_admin_update on public.appointments
  for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

revoke insert, update, delete on public.appointments from authenticated;
grant select on public.appointments to authenticated;
revoke insert, update, delete on public.appointment_slot_templates from authenticated;
grant select on public.appointment_slot_templates to authenticated;

-- Read-only: how many of a template's capacity remain booked on a given
-- date. SECURITY DEFINER because counting appointments across ALL
-- customers for that date+slot is required for an accurate capacity
-- figure -- a customer's own RLS-scoped view would only ever see their
-- own row, undercounting every other customer's booking.
create or replace function public.get_appointment_availability(p_service_id uuid, p_date date)
returns table (slot_template_id uuid, start_time time, end_time time, capacity integer, booked_count integer, remaining integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    t.id,
    t.start_time,
    t.end_time,
    t.capacity,
    coalesce(count(a.id), 0)::integer as booked_count,
    (t.capacity - coalesce(count(a.id), 0))::integer as remaining
  from public.appointment_slot_templates t
  left join public.appointments a
    on a.slot_template_id = t.id and a.appointment_date = p_date and a.status = 'booked'
  where t.service_id = p_service_id and t.is_active
  group by t.id, t.start_time, t.end_time, t.capacity
  order by t.display_order, t.start_time;
$$;
revoke all on function public.get_appointment_availability(uuid, date) from public;
grant execute on function public.get_appointment_availability(uuid, date) to authenticated;

-- The only path that can ever create an appointment. Re-verifies
-- everything server-side regardless of what the client claims: ownership
-- of the application, that the application's service actually requires
-- an appointment, that the slot belongs to that same service and is
-- active, that the date isn't in the past, and -- the critical part --
-- locks the slot template row (`for update`) before counting existing
-- bookings, so two concurrent calls for the same slot+date serialize
-- against each other instead of both reading a stale "1 remaining" and
-- both inserting.
create or replace function public.book_appointment(
  p_application_id uuid,
  p_slot_template_id uuid,
  p_date date,
  p_primary_mobile text,
  p_alternative_mobile text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_slot record;
  v_booked_count integer;
  v_existing uuid;
  v_result public.appointments;
begin
  select a.*, s.requires_appointment into v_app
    from public.applications a join public.services s on s.id = a.service_id
    where a.id = p_application_id;
  if not found then
    raise exception 'application not found';
  end if;
  if not exists (select 1 from public.customers c where c.id = v_app.customer_id and c.profile_id = auth.uid()) then
    raise exception 'not authorized for this application';
  end if;
  if not v_app.requires_appointment then
    raise exception 'this service does not require an appointment';
  end if;

  select id into v_existing from public.appointments where application_id = p_application_id and status = 'booked';
  if v_existing is not null then
    raise exception 'this application already has a booked appointment';
  end if;

  if p_date < current_date then
    raise exception 'cannot book a date in the past';
  end if;

  -- Locks this template row for the duration of the transaction --
  -- a second concurrent booking for the same template blocks here until
  -- the first commits, then re-reads the now-updated booked count.
  select * into v_slot from public.appointment_slot_templates
    where id = p_slot_template_id and service_id = v_app.service_id and is_active
    for update;
  if not found then
    raise exception 'selected time slot is not available for this service';
  end if;

  select count(*) into v_booked_count from public.appointments
    where slot_template_id = p_slot_template_id and appointment_date = p_date and status = 'booked';
  if v_booked_count >= v_slot.capacity then
    raise exception 'this time slot is fully booked';
  end if;

  insert into public.appointments (application_id, customer_id, service_id, slot_template_id, appointment_date, primary_mobile, alternative_mobile)
  values (p_application_id, v_app.customer_id, v_app.service_id, p_slot_template_id, p_date, p_primary_mobile, nullif(p_alternative_mobile, ''))
  returning * into v_result;

  return v_result;
end;
$$;
revoke all on function public.book_appointment(uuid, uuid, date, text, text) from public;
grant execute on function public.book_appointment(uuid, uuid, date, text, text) to authenticated;

-- Same ownership + capacity protections as book_appointment, just
-- cancelling the existing row and creating the replacement inside one
-- transaction so a failed re-book never leaves the customer with no
-- appointment at all.
create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_slot_template_id uuid,
  p_new_date date
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt record;
  v_slot record;
  v_booked_count integer;
  v_result public.appointments;
begin
  select * into v_appt from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'appointment not found';
  end if;
  if not exists (select 1 from public.customers c where c.id = v_appt.customer_id and c.profile_id = auth.uid()) then
    raise exception 'not authorized for this appointment';
  end if;
  if v_appt.status <> 'booked' then
    raise exception 'only a booked appointment can be changed';
  end if;
  if p_new_date < current_date then
    raise exception 'cannot book a date in the past';
  end if;

  select * into v_slot from public.appointment_slot_templates
    where id = p_new_slot_template_id and service_id = v_appt.service_id and is_active
    for update;
  if not found then
    raise exception 'selected time slot is not available for this service';
  end if;

  select count(*) into v_booked_count from public.appointments
    where slot_template_id = p_new_slot_template_id and appointment_date = p_new_date
      and status = 'booked' and id <> p_appointment_id;
  if v_booked_count >= v_slot.capacity then
    raise exception 'this time slot is fully booked';
  end if;

  update public.appointments
    set slot_template_id = p_new_slot_template_id, appointment_date = p_new_date
    where id = p_appointment_id
    returning * into v_result;

  return v_result;
end;
$$;
revoke all on function public.reschedule_appointment(uuid, uuid, date) from public;
grant execute on function public.reschedule_appointment(uuid, uuid, date) to authenticated;

create or replace function public.cancel_own_appointment(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt record;
begin
  select * into v_appt from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'appointment not found';
  end if;
  if not exists (select 1 from public.customers c where c.id = v_appt.customer_id and c.profile_id = auth.uid()) then
    raise exception 'not authorized for this appointment';
  end if;
  if v_appt.status <> 'booked' then
    raise exception 'only a booked appointment can be cancelled';
  end if;

  update public.appointments set status = 'cancelled' where id = p_appointment_id;
end;
$$;
revoke all on function public.cancel_own_appointment(uuid) from public;
grant execute on function public.cancel_own_appointment(uuid) to authenticated;

-- A starter timetable for Aadhaar so there's something to book against
-- immediately; capacity/times/active flag can be adjusted later without
-- any code change.
insert into public.appointment_slot_templates (service_id, start_time, end_time, capacity, display_order)
select s.id, t.start_time, t.end_time, 2, t.rn
from public.services s
cross join lateral (
  values
    ('10:00'::time, '10:30'::time, 1),
    ('10:30'::time, '11:00'::time, 2),
    ('11:00'::time, '11:30'::time, 3),
    ('11:30'::time, '12:00'::time, 4),
    ('14:00'::time, '14:30'::time, 5),
    ('14:30'::time, '15:00'::time, 6),
    ('15:00'::time, '15:30'::time, 7),
    ('15:30'::time, '16:00'::time, 8)
) as t(start_time, end_time, rn)
where s.slug = 'aadhaar-card-update';
