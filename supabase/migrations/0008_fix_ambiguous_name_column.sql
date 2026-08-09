-- Root cause of every "new row violates row-level security policy" failure
-- so far: the policy's correlated subquery does `from public.salons s`, and
-- `salons` also has a `name` column (the salon's name). The unqualified
-- `name` inside `salon_id_from_storage_path(name)` was resolving to
-- `s.name` (e.g. "Salao Debug") instead of the outer storage.objects.name
-- (the file path) — so the regex never found a UUID and the check always
-- failed. Fix: qualify it explicitly as objects.name.

drop policy if exists "salon_photos_write_salon_owner" on storage.objects;

create policy "salon_photos_write_salon_owner"
  on storage.objects for all
  using (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id = public.salon_id_from_storage_path(objects.name)
        and (s.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id = public.salon_id_from_storage_path(objects.name)
        and (s.owner_id = auth.uid() or public.is_admin())
    )
  );
