-- Staff members must now be linked to a real account (invited by email),
-- not a free-text name. Clears existing staff test rows (profile_id was
-- always null so far — nothing meaningful to preserve).
truncate table public.staff cascade;

do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.staff'::regclass
    and contype = 'f'
    and confrelid = 'public.profiles'::regclass;

  if v_conname is not null then
    execute format('alter table public.staff drop constraint %I', v_conname);
  end if;
end $$;

alter table public.staff alter column profile_id set not null;

alter table public.staff
  add constraint staff_profile_id_fkey foreign key (profile_id) references public.profiles (id) on delete cascade;

alter table public.staff
  add constraint staff_salon_profile_unique unique (salon_id, profile_id);

-- ---------------------------------------------------------------------------
-- RPC: invite_staff_member — the only way a profile's role becomes 'staff'.
-- Looks up the account by email (must already exist), promotes 'client' ->
-- 'staff', links them to the salon. Refuses to touch owner/admin accounts.
-- ---------------------------------------------------------------------------
create function public.invite_staff_member(p_salon_id uuid, p_email text)
returns public.staff
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_role public.user_role;
  v_full_name text;
  v_staff public.staff;
begin
  if not exists (
    select 1 from public.salons s where s.id = p_salon_id and (s.owner_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorized';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then
    raise exception 'no account found with that email — they need to sign up first';
  end if;

  select role, full_name into v_role, v_full_name from public.profiles where id = v_user_id;

  if v_role in ('owner', 'admin') then
    raise exception 'this account already has an owner/admin role and cannot become staff';
  end if;

  if v_role = 'client' then
    update public.profiles set role = 'staff' where id = v_user_id;
  end if;

  insert into public.staff (salon_id, profile_id, full_name)
  values (p_salon_id, v_user_id, coalesce(v_full_name, split_part(p_email, '@', 1)))
  on conflict (salon_id, profile_id) do nothing
  returning * into v_staff;

  if v_staff.id is null then
    raise exception 'this person is already staff at this salon';
  end if;

  return v_staff;
end;
$$;

grant execute on function public.invite_staff_member(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: remove_staff_member — undoes invite_staff_member. Reverts the
-- profile's role back to 'client' if this was their last staff membership,
-- so nobody is left stranded with role='staff' and no salon.
-- ---------------------------------------------------------------------------
create function public.remove_staff_member(p_staff_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid;
  v_salon_id uuid;
begin
  select profile_id, salon_id into v_profile_id, v_salon_id from public.staff where id = p_staff_id;

  if v_profile_id is null then
    raise exception 'staff member not found';
  end if;

  if not exists (
    select 1 from public.salons s where s.id = v_salon_id and (s.owner_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorized';
  end if;

  delete from public.staff where id = p_staff_id;

  if not exists (select 1 from public.staff where profile_id = v_profile_id) then
    update public.profiles set role = 'client' where id = v_profile_id and role = 'staff';
  end if;
end;
$$;

grant execute on function public.remove_staff_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: staff can manage their own availability and see their own appointments
-- ---------------------------------------------------------------------------
create policy "availability_write_own_staff"
  on public.availability for all
  using (exists (select 1 from public.staff s where s.id = availability.staff_id and s.profile_id = auth.uid()))
  with check (exists (select 1 from public.staff s where s.id = availability.staff_id and s.profile_id = auth.uid()));

create policy "appointments_select_staff"
  on public.appointments for select
  using (exists (select 1 from public.staff s where s.id = appointments.staff_id and s.profile_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- update_appointment_status: recognize the assigned staff member too, with
-- the same confirm/cancel/complete permissions the salon owner already has.
-- ---------------------------------------------------------------------------
create or replace function public.update_appointment_status(
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
  v_is_admin boolean;
  v_is_staff boolean;
begin
  select * into v_appt from public.appointments where id = p_appointment_id;

  if v_appt is null then
    raise exception 'appointment not found';
  end if;

  select exists(select 1 from public.salons s where s.id = v_appt.salon_id and s.owner_id = auth.uid())
    into v_is_owner;
  select public.is_admin() into v_is_admin;
  select exists(select 1 from public.staff st where st.id = v_appt.staff_id and st.profile_id = auth.uid())
    into v_is_staff;

  if not (auth.uid() = v_appt.client_id or v_is_owner or v_is_admin or v_is_staff) then
    raise exception 'not authorized';
  end if;

  -- clients may only cancel; owners, admins and the assigned staff may confirm/cancel/complete.
  if not (v_is_owner or v_is_admin or v_is_staff) and p_status <> 'cancelled' then
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
