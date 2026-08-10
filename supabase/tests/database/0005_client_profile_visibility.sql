-- The salon-can-see-its-client policy is privacy-sensitive: it has to open
-- exactly one door and no more. Both directions are asserted here — what an
-- owner *can* see, and just as importantly what they still cannot.
begin;
create extension if not exists pgtap;
select plan(5);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('0a111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-vis-owner@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('0a222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-vis-otherowner@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('0a333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-vis-booking-client@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('0a444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-vis-stranger@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('0a555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-vis-staff@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}');

update public.profiles set role = 'owner' where id in (
  '0a111111-1111-1111-1111-111111111111', '0a222222-2222-2222-2222-222222222222'
);
update public.profiles set role = 'staff' where id = '0a555555-5555-5555-5555-555555555555';
update public.profiles set full_name = 'Booking Client' where id = '0a333333-3333-3333-3333-333333333333';
update public.profiles set full_name = 'Stranger' where id = '0a444444-4444-4444-4444-444444444444';

set local role authenticated;
set local request.jwt.claim.sub = '0a111111-1111-1111-1111-111111111111';

insert into public.salons (id, owner_id, name, city)
values ('0b111111-1111-1111-1111-111111111111', '0a111111-1111-1111-1111-111111111111', 'Visibility Salon', 'Faro');

insert into public.services (id, salon_id, name, duration_minutes, price_cents)
values ('0c111111-1111-1111-1111-111111111111', '0b111111-1111-1111-1111-111111111111', 'Cut', 30, 1000);

insert into public.staff (id, salon_id, profile_id, full_name, status)
values ('0d111111-1111-1111-1111-111111111111', '0b111111-1111-1111-1111-111111111111',
        '0a555555-5555-5555-5555-555555555555', 'Visibility Staff', 'accepted');

-- the client books at that salon
set local request.jwt.claim.sub = '0a333333-3333-3333-3333-333333333333';
select public.create_appointment(
  '0b111111-1111-1111-1111-111111111111',
  '0c111111-1111-1111-1111-111111111111',
  '0d111111-1111-1111-1111-111111111111',
  now() + interval '1 day'
);

-- ---------------------------------------------------------------------------
-- What the salon owner may see
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '0a111111-1111-1111-1111-111111111111';

select is(
  (select full_name from public.profiles where id = '0a333333-3333-3333-3333-333333333333'),
  'Booking Client',
  'the owner can see the profile of a client who booked at their salon'
);

select is(
  (select count(*)::int from public.profiles where id = '0a444444-4444-4444-4444-444444444444'),
  0,
  'the owner still cannot see a client who never booked with them'
);

-- ---------------------------------------------------------------------------
-- The assigned staff member may see the same client
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '0a555555-5555-5555-5555-555555555555';

select is(
  (select full_name from public.profiles where id = '0a333333-3333-3333-3333-333333333333'),
  'Booking Client',
  'the assigned staff member can see that client too'
);

select is(
  (select count(*)::int from public.profiles where id = '0a444444-4444-4444-4444-444444444444'),
  0,
  'the staff member cannot see an unrelated client'
);

-- ---------------------------------------------------------------------------
-- A different salon's owner gains nothing
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '0a222222-2222-2222-2222-222222222222';

select is(
  (select count(*)::int from public.profiles where id = '0a333333-3333-3333-3333-333333333333'),
  0,
  'an unrelated owner cannot see another salon''s client'
);

select * from finish();
rollback;
