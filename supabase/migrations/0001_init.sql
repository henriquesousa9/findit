-- FindIt initial schema + Row Level Security
-- All tables have RLS enabled from the start. No table is left with default-open access.

create extension if not exists "btree_gist";

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('client', 'owner', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own_no_role_change"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- No insert/delete policy for clients: profiles are created only via the
-- handle_new_user trigger below (SECURITY DEFINER), never directly by the client.

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- salons
-- ---------------------------------------------------------------------------
create table public.salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  address text,
  city text not null check (char_length(city) between 1 and 80),
  latitude double precision,
  longitude double precision,
  description text,
  created_at timestamptz not null default now()
);

create index salons_city_idx on public.salons (city);
create index salons_owner_idx on public.salons (owner_id);

alter table public.salons enable row level security;

create policy "salons_select_public"
  on public.salons for select
  using (true);

create policy "salons_insert_owner"
  on public.salons for insert
  with check (
    auth.uid() = owner_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner', 'admin'))
  );

create policy "salons_update_own"
  on public.salons for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "salons_delete_own"
  on public.salons for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 480),
  price_cents integer not null check (price_cents >= 0),
  created_at timestamptz not null default now()
);

create index services_salon_idx on public.services (salon_id);

alter table public.services enable row level security;

create policy "services_select_public"
  on public.services for select
  using (true);

create policy "services_write_salon_owner"
  on public.services for all
  using (exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- staff
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  created_at timestamptz not null default now()
);

create index staff_salon_idx on public.staff (salon_id);

alter table public.staff enable row level security;

create policy "staff_select_public"
  on public.staff for select
  using (true);

create policy "staff_write_salon_owner"
  on public.staff for all
  using (exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- availability (recurring weekly schedule per salon)
-- ---------------------------------------------------------------------------
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

create index availability_salon_idx on public.availability (salon_id);

alter table public.availability enable row level security;

create policy "availability_select_public"
  on public.availability for select
  using (true);

create policy "availability_write_salon_owner"
  on public.availability for all
  using (exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  salon_id uuid not null references public.salons (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  -- Prevent double-booking the same salon for overlapping time ranges at the DB level.
  exclude using gist (
    salon_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed'))
);

create index appointments_client_idx on public.appointments (client_id);
create index appointments_salon_idx on public.appointments (salon_id);

alter table public.appointments enable row level security;

create policy "appointments_select_client_or_owner"
  on public.appointments for select
  using (
    auth.uid() = client_id
    or exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

-- Direct inserts/updates/deletes are intentionally NOT allowed from the client.
-- All writes go through the SECURITY DEFINER RPC functions below, which
-- enforce business rules (future-dated bookings, ownership, status transitions)
-- server-side instead of trusting the client.

-- ---------------------------------------------------------------------------
-- RPC: create_appointment
-- ---------------------------------------------------------------------------
create function public.create_appointment(
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

  insert into public.appointments (client_id, salon_id, service_id, starts_at, ends_at, status)
  values (auth.uid(), p_salon_id, p_service_id, p_starts_at, p_starts_at + make_interval(mins => v_duration), 'pending')
  returning * into v_appointment;

  return v_appointment;
end;
$$;

grant execute on function public.create_appointment(uuid, uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: update_appointment_status (cancel by client, confirm/complete/cancel by owner)
-- ---------------------------------------------------------------------------
create function public.update_appointment_status(
  p_appointment_id uuid,
  p_status text
)
returns public.appointments
language plpgsql
security definer set search_path = public
as $$
declare
  v_appt public.appointments;
  v_is_owner boolean;
begin
  select * into v_appt from public.appointments where id = p_appointment_id;

  if v_appt is null then
    raise exception 'appointment not found';
  end if;

  select exists(select 1 from public.salons s where s.id = v_appt.salon_id and s.owner_id = auth.uid())
    into v_is_owner;

  if not (auth.uid() = v_appt.client_id or v_is_owner) then
    raise exception 'not authorized';
  end if;

  -- clients may only cancel; owners may confirm/cancel/complete.
  if not v_is_owner and p_status <> 'cancelled' then
    raise exception 'clients may only cancel appointments';
  end if;

  if p_status not in ('pending', 'confirmed', 'cancelled', 'completed') then
    raise exception 'invalid status';
  end if;

  update public.appointments
    set status = p_status
    where id = p_appointment_id
    returning * into v_appt;

  return v_appt;
end;
$$;

grant execute on function public.update_appointment_status(uuid, text) to authenticated;
