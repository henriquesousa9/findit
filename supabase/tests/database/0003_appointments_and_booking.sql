-- create_appointment RPC + the per-staff anti-overlap exclusion constraint:
-- this is the exact behavior the multi-staff feature exists for — two
-- different staff can be booked at the same time, but the same staff can't
-- be double-booked.
begin;
select plan(6);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-booking-owner@test.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{}', '{}'),
  ('d2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-booking-client@test.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{}', '{}'),
  ('d3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-staff1@test.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{}', '{}'),
  ('d4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-staff2@test.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{}', '{}');

update public.profiles set role = 'owner' where id = 'd1111111-1111-1111-1111-111111111111';
update public.profiles set role = 'staff' where id in (
  'd3333333-3333-3333-3333-333333333333', 'd4444444-4444-4444-4444-444444444444'
);

set local role authenticated;
set local request.jwt.claim.sub = 'd1111111-1111-1111-1111-111111111111';

insert into public.salons (id, owner_id, name, city)
values ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Booking Salon', 'Porto');

insert into public.services (id, salon_id, name, duration_minutes, price_cents)
values ('e2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'Cut', 60, 2000);

insert into public.staff (id, salon_id, profile_id, full_name, status)
values
  ('e3333333-3333-3333-3333-333333333333', 'e1111111-1111-1111-1111-111111111111', 'd3333333-3333-3333-3333-333333333333', 'Staff One', 'accepted'),
  ('e4444444-4444-4444-4444-444444444444', 'e1111111-1111-1111-1111-111111111111', 'd4444444-4444-4444-4444-444444444444', 'Staff Two', 'accepted');

-- now act as the booking client
set local request.jwt.claim.sub = 'd2222222-2222-2222-2222-222222222222';

select lives_ok(
  $$ select public.create_appointment(
       'e1111111-1111-1111-1111-111111111111',
       'e2222222-2222-2222-2222-222222222222',
       'e3333333-3333-3333-3333-333333333333',
       now() + interval '1 day'
     ) $$,
  'booking staff one for tomorrow succeeds'
);

select throws_ok(
  $$ select public.create_appointment(
       'e1111111-1111-1111-1111-111111111111',
       'e2222222-2222-2222-2222-222222222222',
       'e3333333-3333-3333-3333-333333333333',
       now() - interval '1 day'
     ) $$,
  'booking in the past is rejected'
);

select throws_ok(
  $$ select public.create_appointment(
       'e1111111-1111-1111-1111-111111111111',
       'e2222222-2222-2222-2222-222222222222',
       'e3333333-3333-3333-3333-333333333333',
       now() + interval '1 day'
     ) $$,
  'double-booking the same staff at the same time is rejected'
);

select lives_ok(
  $$ select public.create_appointment(
       'e1111111-1111-1111-1111-111111111111',
       'e2222222-2222-2222-2222-222222222222',
       'e4444444-4444-4444-4444-444444444444',
       now() + interval '1 day'
     ) $$,
  'booking a *different* staff at the same time succeeds'
);

select is(
  (select count(*)::int from public.appointments where salon_id = 'e1111111-1111-1111-1111-111111111111'),
  2,
  'exactly two appointments exist (one per staff)'
);

-- staff from a different (nonexistent-for-this-salon) id must be rejected
select throws_ok(
  $$ select public.create_appointment(
       'e1111111-1111-1111-1111-111111111111',
       'e2222222-2222-2222-2222-222222222222',
       'd1111111-1111-1111-1111-111111111111',
       now() + interval '2 days'
     ) $$,
  'booking a staff id that does not belong to the salon is rejected'
);

select * from finish();
rollback;
