-- Admin role: cross-salon read/write access for platform administrators.
-- Kept as additive policies alongside the existing owner-scoped ones (RLS
-- policies are OR'd together), so normal client/owner behaviour is unchanged.

-- SECURITY DEFINER avoids each policy re-querying profiles under RLS and
-- keeps the admin check in one auditable place.
create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- profiles: admins can see every profile (needed to show salon owners in
-- the admin dashboard). Still no self-service role escalation.
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

-- salons: full read/write for admins, regardless of owner_id.
create policy "salons_admin_all"
  on public.salons for all
  using (public.is_admin())
  with check (public.is_admin());

-- services / staff / availability: same pattern.
create policy "services_admin_all"
  on public.services for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "staff_admin_all"
  on public.staff for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "availability_admin_all"
  on public.availability for all
  using (public.is_admin())
  with check (public.is_admin());

-- appointments: read-only via RLS for admins; status changes still go
-- through the SECURITY DEFINER RPC below (extended to recognize admins) to
-- keep business-rule validation in one place.
create policy "appointments_select_admin"
  on public.appointments for select
  using (public.is_admin());

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
begin
  select * into v_appt from public.appointments where id = p_appointment_id;

  if v_appt is null then
    raise exception 'appointment not found';
  end if;

  select exists(select 1 from public.salons s where s.id = v_appt.salon_id and s.owner_id = auth.uid())
    into v_is_owner;
  select public.is_admin() into v_is_admin;

  if not (auth.uid() = v_appt.client_id or v_is_owner or v_is_admin) then
    raise exception 'not authorized';
  end if;

  -- clients may only cancel; owners and admins may confirm/cancel/complete.
  if not (v_is_owner or v_is_admin) and p_status <> 'cancelled' then
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
