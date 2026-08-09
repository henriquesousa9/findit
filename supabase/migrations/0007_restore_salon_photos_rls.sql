-- Restore real ownership enforcement (0006's debug-open policy was
-- temporary, for isolating the auth-context issue fixed on the client side).
-- "if exists" on both drops: this migration only found a debug policy to
-- remove when applied live, mid-session — on a fresh sequential apply (CI),
-- 0006 already left "salon_photos_write_salon_owner" in place, so it must
-- be dropped here too before recreating it.
drop policy if exists "salon_photos_write_debug_open" on storage.objects;
drop policy if exists "salon_photos_write_salon_owner" on storage.objects;

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
