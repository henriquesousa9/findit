-- Restore real ownership enforcement (0006's debug-open policy was
-- temporary, for isolating the auth-context issue fixed on the client side).
drop policy if exists "salon_photos_write_debug_open" on storage.objects;

create policy "salon_photos_write_salon_owner"
  on storage.objects for all
  using (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id = public.salon_id_from_storage_path(name)
        and (s.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id = public.salon_id_from_storage_path(name)
        and (s.owner_id = auth.uid() or public.is_admin())
    )
  );
