-- Client-side favorites: a client can bookmark salons for quick access.
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  salon_id uuid not null references public.salons (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, salon_id)
);

create index favorites_client_idx on public.favorites (client_id);

alter table public.favorites enable row level security;

create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = client_id);

create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = client_id);

create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = client_id);
