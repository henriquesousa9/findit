-- Deterministic test fixture: exactly three accounts plus enough demo data
-- to exercise the whole booking flow without configuring anything by hand.
-- Re-running this always returns the database to the same clean state.
--
-- WARNING: this deletes every existing user (and, by cascade, every salon,
-- service, schedule, appointment and favorite). It is a *test* fixture.
--
--   findit@teste1.com / 21442144  -> staff
--   findit@teste2.com / 21442144  -> owner
--   findit@teste3.com / 21442144  -> client
--
-- Auto-runs on `supabase db reset` (local + CI) via config.toml [db.seed].

create extension if not exists pgcrypto;

delete from auth.users;

-- profiles rows are created by the on_auth_user_created trigger, which reads
-- full_name / requested_role out of raw_user_meta_data.
--
-- The token columns must be '' rather than left NULL: GoTrue reads them into
-- plain Go strings, and a NULL makes every sign-in fail with the unhelpful
-- "Database error querying schema".
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values
  (
    '00000000-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'findit@teste1.com',
    crypt('21442144', gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Teste Staff"}',
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'findit@teste2.com',
    crypt('21442144', gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Teste Owner","requested_role":"owner"}',
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-4000-a000-000000000003', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'findit@teste3.com',
    crypt('21442144', gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Teste Cliente"}',
    '', '', '', '', '', '', '', ''
  );

-- GoTrue also expects an identity row per user for email/password sign-in.
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
from auth.users u;

-- ---------------------------------------------------------------------------
-- Demo salon owned by teste2
-- ---------------------------------------------------------------------------
insert into public.salons (id, owner_id, name, address, city, latitude, longitude, description)
values (
  '00000000-0000-4000-b000-000000000001',
  '00000000-0000-4000-a000-000000000002',
  'Salão Demo',
  'Rua de Exemplo 123',
  'Lisboa',
  38.7223, -9.1393,
  'Salão de demonstração criado pelo seed, para testes.'
);

insert into public.services (id, salon_id, name, duration_minutes, price_cents) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', 'Corte de cabelo', 30, 1500),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000001', 'Corte + barba', 60, 2500);

-- teste1 is staff at the demo salon, with the invite already accepted so the
-- account is immediately usable (invite_staff_member + accept_staff_invite
-- would need two authenticated sessions to reproduce here).
insert into public.staff (id, salon_id, profile_id, full_name, status)
values (
  '00000000-0000-4000-d000-000000000001',
  '00000000-0000-4000-b000-000000000001',
  '00000000-0000-4000-a000-000000000001',
  'Teste Staff',
  'accepted'
);

update public.profiles set role = 'staff' where id = '00000000-0000-4000-a000-000000000001';

-- Monday..Friday, 09:00-18:00 for that staff member.
insert into public.availability (salon_id, staff_id, weekday, start_time, end_time)
select
  '00000000-0000-4000-b000-000000000001',
  '00000000-0000-4000-d000-000000000001',
  weekday,
  '09:00:00'::time,
  '18:00:00'::time
from generate_series(1, 5) as weekday;
