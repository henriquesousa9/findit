-- Working hours are set by the salon, not by each professional. Staff keep
-- read access (availability_select_public), and the owner's write access
-- (availability_write_salon_owner, from the initial schema) already covers
-- every staff member of their salon — so this only has to take one thing
-- away.
--
-- Removing it at the database level rather than just hiding the form: an
-- authenticated staff account can call the API directly, so RLS is the only
-- boundary that actually holds.
drop policy if exists "availability_write_own_staff" on public.availability;
