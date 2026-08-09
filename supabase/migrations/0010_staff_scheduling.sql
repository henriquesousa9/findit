-- Multiple staff members per salon: availability and appointments become
-- staff-scoped instead of salon-scoped, so different staff can take
-- simultaneous appointments while the same staff member still can't be
-- double-booked. Test data predates staff_id — clearing it rather than
-- trying to backfill (no real customers yet, per project owner).
truncate table public.availability;
truncate table public.appointments;

alter table public.availability
  add column staff_id uuid not null references public.staff (id) on delete cascade;

create index availability_staff_idx on public.availability (staff_id);

alter table public.appointments
  add column staff_id uuid not null references public.staff (id);

create index appointments_staff_idx on public.appointments (staff_id);

-- Swap the anti-overlap exclusion constraint from salon_id to staff_id.
-- Find it dynamically rather than hardcoding Postgres's auto-generated name.
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.appointments'::regclass and contype = 'x';

  if v_constraint_name is not null then
    execute format('alter table public.appointments drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.appointments
  add constraint appointments_staff_time_excl
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed'));

-- create_appointment gains a required staff selection.
drop function if exists public.create_appointment(uuid, uuid, timestamptz);

create function public.create_appointment(
  p_salon_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz
)
returns public.appointments
language plpgsql
security definer set search_path = public
as $$
declare
  v_duration integer;
  v_appointment public.appointments;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_starts_at <= now() then
    raise exception 'appointment must be in the future';
  end if;

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and salon_id = p_salon_id;

  if v_duration is null then
    raise exception 'service does not belong to salon';
  end if;

  if not exists (select 1 from public.staff where id = p_staff_id and salon_id = p_salon_id) then
    raise exception 'staff does not belong to salon';
  end if;

  insert into public.appointments (client_id, salon_id, service_id, staff_id, starts_at, ends_at, status)
  values (auth.uid(), p_salon_id, p_service_id, p_staff_id, p_starts_at, p_starts_at + make_interval(mins => v_duration), 'pending')
  returning * into v_appointment;

  return v_appointment;
end;
$$;

grant execute on function public.create_appointment(uuid, uuid, uuid, timestamptz) to authenticated;
