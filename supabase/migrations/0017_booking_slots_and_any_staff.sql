-- Booking logic moves into the database, for two reasons:
--
-- 1. Clients cannot (and must not) read other clients' appointments, so they
--    have no way to work out which hours are actually free. Until now the app
--    offered every hour inside a professional's working window, booked or
--    not, and the client only found out by hitting the exclusion constraint.
--    A SECURITY DEFINER function can see every booking while returning only
--    "this hour is free", leaking nothing.
--
-- 2. "No preference" needs the server to pick a professional, which again
--    requires seeing everyone's bookings.
--
-- Wall-clock times in `availability` are interpreted as Europe/Lisbon.
-- Without an explicit zone the server would assume UTC and be an hour out in
-- summer. Revisit if salons ever span time zones (there's no per-salon
-- timezone column today).

-- Slot granularity. One hour matches what the app already offered; change
-- here to move the whole product to 30-minute slots.
create or replace function public.booking_slot_interval()
returns interval
language sql
immutable
as $$ select interval '1 hour' $$;

-- ---------------------------------------------------------------------------
-- get_available_slots — the hours a client can actually book.
-- p_staff_id null means "any professional".
-- ---------------------------------------------------------------------------
create function public.get_available_slots(
  p_salon_id uuid,
  p_service_id uuid,
  p_day date,
  p_staff_id uuid default null
)
returns table (slot timestamptz, free_staff integer)
language sql
stable
security definer set search_path = public
as $$
  with service as (
    select duration_minutes
    from public.services
    where id = p_service_id and salon_id = p_salon_id
  ),
  -- Only accepted staff take bookings; a pending invite is not yet working here.
  candidates as (
    select st.id
    from public.staff st
    where st.salon_id = p_salon_id
      and st.status = 'accepted'
      and (p_staff_id is null or st.id = p_staff_id)
  ),
  -- Every hour inside each professional's window for this weekday, provided
  -- the whole service still fits before the window closes.
  candidate_slots as (
    select
      c.id as staff_id,
      generate_series(
        (p_day + a.start_time) at time zone 'Europe/Lisbon',
        ((p_day + a.end_time) at time zone 'Europe/Lisbon')
          - make_interval(mins => (select duration_minutes from service)),
        public.booking_slot_interval()
      ) as starts_at
    from candidates c
    join public.availability a
      on a.staff_id = c.id
     and a.weekday = extract(dow from p_day)::smallint
  )
  select
    cs.starts_at as slot,
    count(*)::integer as free_staff
  from candidate_slots cs
  where cs.starts_at > now()
    and not exists (
      select 1
      from public.appointments ap
      where ap.staff_id = cs.staff_id
        and ap.status in ('pending', 'confirmed')
        and tstzrange(ap.starts_at, ap.ends_at)
            && tstzrange(cs.starts_at, cs.starts_at + make_interval(mins => (select duration_minutes from service)))
    )
  group by cs.starts_at
  order by cs.starts_at;
$$;

grant execute on function public.get_available_slots(uuid, uuid, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_appointment — now also refuses bookings outside working hours, and
-- reports a taken slot in words instead of raising the exclusion constraint.
-- ---------------------------------------------------------------------------
create or replace function public.create_appointment(
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
  v_ends_at timestamptz;
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

  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  if not exists (
    select 1 from public.staff
    where id = p_staff_id and salon_id = p_salon_id and status = 'accepted'
  ) then
    raise exception 'staff does not belong to salon';
  end if;

  if not exists (
    select 1
    from public.availability a
    where a.staff_id = p_staff_id
      and a.weekday = extract(dow from p_starts_at at time zone 'Europe/Lisbon')::smallint
      and (p_starts_at at time zone 'Europe/Lisbon')::time >= a.start_time
      and (v_ends_at at time zone 'Europe/Lisbon')::time <= a.end_time
  ) then
    raise exception 'that time is outside the professional''s working hours';
  end if;

  if exists (
    select 1 from public.appointments ap
    where ap.staff_id = p_staff_id
      and ap.status in ('pending', 'confirmed')
      and tstzrange(ap.starts_at, ap.ends_at) && tstzrange(p_starts_at, v_ends_at)
  ) then
    raise exception 'that time has just been taken — please pick another';
  end if;

  insert into public.appointments (client_id, salon_id, service_id, staff_id, starts_at, ends_at, status)
  values (auth.uid(), p_salon_id, p_service_id, p_staff_id, p_starts_at, v_ends_at, 'pending')
  returning * into v_appointment;

  return v_appointment;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_appointment_any_staff — "no preference". Picks the free professional
-- with the fewest bookings that day, so work spreads across the team instead
-- of always landing on the same person; ties broken at random.
-- ---------------------------------------------------------------------------
create function public.create_appointment_any_staff(
  p_salon_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz
)
returns public.appointments
language plpgsql
security definer set search_path = public
as $$
declare
  v_duration integer;
  v_ends_at timestamptz;
  v_staff_id uuid;
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

  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  select st.id into v_staff_id
  from public.staff st
  where st.salon_id = p_salon_id
    and st.status = 'accepted'
    and exists (
      select 1
      from public.availability a
      where a.staff_id = st.id
        and a.weekday = extract(dow from p_starts_at at time zone 'Europe/Lisbon')::smallint
        and (p_starts_at at time zone 'Europe/Lisbon')::time >= a.start_time
        and (v_ends_at at time zone 'Europe/Lisbon')::time <= a.end_time
    )
    and not exists (
      select 1
      from public.appointments ap
      where ap.staff_id = st.id
        and ap.status in ('pending', 'confirmed')
        and tstzrange(ap.starts_at, ap.ends_at) && tstzrange(p_starts_at, v_ends_at)
    )
  order by (
    select count(*)
    from public.appointments ap
    where ap.staff_id = st.id
      and ap.status in ('pending', 'confirmed')
      and (ap.starts_at at time zone 'Europe/Lisbon')::date
          = (p_starts_at at time zone 'Europe/Lisbon')::date
  ), random()
  limit 1;

  if v_staff_id is null then
    raise exception 'no professional is available at that time';
  end if;

  -- Reuse create_appointment so both paths share one set of rules.
  return public.create_appointment(p_salon_id, p_service_id, v_staff_id, p_starts_at);
end;
$$;

grant execute on function public.create_appointment_any_staff(uuid, uuid, timestamptz) to authenticated;
