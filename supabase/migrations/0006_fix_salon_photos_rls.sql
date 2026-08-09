-- The write policy on storage.objects compared (storage.foldername(name))[1]
-- to the salon id exactly. If the object path ever has a leading slash (or
-- any other minor formatting difference from what the client constructed),
-- that comparison silently fails and every upload gets rejected by RLS.
-- Replace it with a regex-based extraction that finds the salon UUID
-- anywhere near the start of the path, tolerant of a leading slash.

create or replace function public.salon_id_from_storage_path(path text)
returns uuid
language sql
immutable
as $$
  select (regexp_match(path, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'))[1]::uuid;
$$;

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
