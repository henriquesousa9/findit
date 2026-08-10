-- Until now a salon could see that a booking existed but not who made it:
-- profiles only ever exposed your own row. This opens exactly one door —
-- a salon may read the profile of someone who booked with them, and nothing
-- more. Not "owners can read profiles"; only clients they actually serve.
--
-- SECURITY DEFINER (same pattern as is_admin()) so the check runs once with
-- a clear rule, instead of nesting appointments/staff RLS inside a profiles
-- policy.
create function public.can_view_client_profile(p_client_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    -- the owner of a salon this person has booked at
    exists (
      select 1
      from public.appointments a
      join public.salons s on s.id = a.salon_id
      where a.client_id = p_client_id
        and s.owner_id = auth.uid()
    )
    -- or the staff member the booking is actually assigned to
    or exists (
      select 1
      from public.appointments a
      join public.staff st on st.id = a.staff_id
      where a.client_id = p_client_id
        and st.profile_id = auth.uid()
        and st.status = 'accepted'
    );
$$;

grant execute on function public.can_view_client_profile(uuid) to authenticated;

create policy "profiles_select_salon_client"
  on public.profiles for select
  using (public.can_view_client_profile(profiles.id));
