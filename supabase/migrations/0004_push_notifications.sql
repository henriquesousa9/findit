-- Push notifications for appointment status changes (confirmed/cancelled),
-- sent to the client. Implemented entirely in Postgres via pg_net calling
-- the Expo push API — no Edge Function to deploy, no secret key needed
-- (Expo's push service doesn't require server-side auth to send).

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- push_tokens
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_profile_idx on public.push_tokens (profile_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens_select_own"
  on public.push_tokens for select
  using (auth.uid() = profile_id);

create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  with check (auth.uid() = profile_id);

create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- Trigger: notify the client when their appointment is confirmed/cancelled
-- ---------------------------------------------------------------------------
create function public.notify_appointment_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_title text;
  v_body text;
  v_service_name text;
  v_token record;
begin
  if new.status = old.status or new.status not in ('confirmed', 'cancelled') then
    return new;
  end if;

  select name into v_service_name from public.services where id = new.service_id;

  v_title := case when new.status = 'confirmed' then 'Marcação confirmada' else 'Marcação cancelada' end;
  v_body := coalesce(v_service_name, 'O teu serviço') || ' · ' || to_char(new.starts_at, 'DD/MM HH24:MI');

  for v_token in select token from public.push_tokens where profile_id = new.client_id loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'to', v_token.token,
        'title', v_title,
        'body', v_body,
        'data', jsonb_build_object('appointmentId', new.id, 'status', new.status)
      )
    );
  end loop;

  return new;
end;
$$;

create trigger appointments_notify_status_change
  after update on public.appointments
  for each row execute function public.notify_appointment_status_change();
