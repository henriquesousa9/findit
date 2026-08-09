-- Cover photo for salons, one photo per service. Stored in Supabase Storage
-- (public bucket), referenced by a plain URL column — no separate gallery
-- table for this first version.

alter table public.salons add column photo_url text;
alter table public.services add column photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('salon-photos', 'salon-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Path convention: {salon_id}/cover.<ext> and {salon_id}/services/{service_id}.<ext>
-- — the salon_id is always the first path segment, which is what the write
-- policy checks against ownership.

create policy "salon_photos_select_public"
  on storage.objects for select
  using (bucket_id = 'salon-photos');

create policy "salon_photos_write_salon_owner"
  on storage.objects for all
  using (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id::text = (storage.foldername(name))[1]
        and (s.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    bucket_id = 'salon-photos'
    and exists (
      select 1 from public.salons s
      where s.id::text = (storage.foldername(name))[1]
        and (s.owner_id = auth.uid() or public.is_admin())
    )
  );
