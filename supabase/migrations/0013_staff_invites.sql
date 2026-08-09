-- Staff invites: the owner naming an email no longer immediately makes that
-- account staff. It creates a pending invite; the invited person must accept
-- it themselves before their role changes and they gain staff access.

alter table public.staff
  add column status text not null default 'pending' check (status in ('pending', 'accepted'));

-- ---------------------------------------------------------------------------
-- invite_staff_member: create a pending invite only. No role change here
-- anymore — that only happens in accept_staff_invite.
-- ---------------------------------------------------------------------------
create or replace function public.invite_staff_member(p_salon_id uuid, p_email text)
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

  insert into public.staff (salon_id, profile_id, full_name, status)
  values (p_salon_id, v_user_id, coalesce(v_full_name, split_part(p_email, '@', 1)), 'pending')
  on conflict (salon_id, profile_id) do nothing
  returning * into v_staff;

  if v_staff.id is null then
    raise exception 'this person has already been invited (or is already staff) at this salon';
  end if;

  return v_staff;
end;
$$;

-- ---------------------------------------------------------------------------
-- accept_staff_invite / decline_staff_invite — only the invited person can
-- act on their own pending invite.
-- ---------------------------------------------------------------------------
create function public.accept_staff_invite(p_staff_id uuid)
returns public.staff
language plpgsql
security definer set search_path = public
as $$
declare
  v_staff public.staff;
  v_role public.user_role;
begin
  select * into v_staff from public.staff where id = p_staff_id;

  if v_staff.id is null or v_staff.profile_id <> auth.uid() then
    raise exception 'invite not found';
  end if;

  if v_staff.status = 'accepted' then
    raise exception 'already accepted';
  end if;

  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'client' then
    raise exception 'account is no longer eligible to accept this invite';
  end if;

  update public.profiles set role = 'staff' where id = auth.uid();
  update public.staff set status = 'accepted' where id = p_staff_id returning * into v_staff;

  return v_staff;
end;
$$;

create function public.decline_staff_invite(p_staff_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.staff where id = p_staff_id and profile_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'invite not found';
  end if;
end;
$$;

grant execute on function public.accept_staff_invite(uuid) to authenticated;
grant execute on function public.decline_staff_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- remove_staff_member: only revert the profile's role to 'client' if the
-- membership being removed had actually been accepted (a declined/removed
-- pending invite never promoted them in the first place).
-- ---------------------------------------------------------------------------
create or replace function public.remove_staff_member(p_staff_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid;
  v_salon_id uuid;
  v_status text;
begin
  select profile_id, salon_id, status into v_profile_id, v_salon_id, v_status
  from public.staff where id = p_staff_id;

  if v_profile_id is null then
    raise exception 'staff member not found';
  end if;

  if not exists (
    select 1 from public.salons s where s.id = v_salon_id and (s.owner_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorized';
  end if;

  delete from public.staff where id = p_staff_id;

  if v_status = 'accepted' and not exists (
    select 1 from public.staff where profile_id = v_profile_id and status = 'accepted'
  ) then
    update public.profiles set role = 'client' where id = v_profile_id and role = 'staff';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff self-service RLS/RPC now require an accepted invite, not just a link.
-- ---------------------------------------------------------------------------
drop policy if exists "availability_write_own_staff" on public.availability;
create policy "availability_write_own_staff"
  on public.availability for all
  using (
    exists (
      select 1 from public.staff s
      where s.id = availability.staff_id and s.profile_id = auth.uid() and s.status = 'accepted'
    )
  )
  with check (
    exists (
      select 1 from public.staff s
      where s.id = availability.staff_id and s.profile_id = auth.uid() and s.status = 'accepted'
    )
  );

drop policy if exists "appointments_select_staff" on public.appointments;
create policy "appointments_select_staff"
  on public.appointments for select
  using (
    exists (
      select 1 from public.staff s
      where s.id = appointments.staff_id and s.profile_id = auth.uid() and s.status = 'accepted'
    )
  );

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
  select exists(
    select 1 from public.staff st where st.id = v_appt.staff_id and st.profile_id = auth.uid() and st.status = 'accepted'
  ) into v_is_staff;

  if not (auth.uid() = v_appt.client_id or v_is_owner or v_is_admin or v_is_staff) then
    raise exception 'not authorized';
  end if;

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
