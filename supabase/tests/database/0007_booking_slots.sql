-- Booking availability and the "no preference" pick. The interesting cases
-- are the ones the client cannot verify for themselves: a booked hour has to
-- disappear from the offer, and the automatic pick has to land on a
-- professional who is genuinely free.
--
-- Dates are pinned to a known future Monday so the weekday maths is fixed
-- rather than dependent on the day the suite happens to run.
begin;
create extension if not exists pgtap;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('1a111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-slots-owner@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('1a222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-slots-client@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('1a333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-slots-staff-a@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('1a444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-slots-staff-b@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}');

update public.profiles set role = 'owner' where id = '1a111111-1111-1111-1111-111111111111';
update public.profiles set role = 'staff' where id in (
  '1a333333-3333-3333-3333-333333333333', '1a444444-4444-4444-4444-444444444444'
);

set local role authenticated;
set local request.jwt.claim.sub = '1a111111-1111-1111-1111-111111111111';

insert into public.salons (id, owner_id, name, city)
values ('1b111111-1111-1111-1111-111111111111', '1a111111-1111-1111-1111-111111111111', 'Slots Salon', 'Coimbra');

-- 60-minute service against 09:00-12:00 windows => slots at 09, 10, 11.
insert into public.services (id, salon_id, name, duration_minutes, price_cents)
values ('1c111111-1111-1111-1111-111111111111', '1b111111-1111-1111-1111-111111111111', 'Cut', 60, 1000);

insert into public.staff (id, salon_id, profile_id, full_name, status) values
  ('1d111111-1111-1111-1111-111111111111', '1b111111-1111-1111-1111-111111111111',
   '1a333333-3333-3333-3333-333333333333', 'Staff A', 'accepted'),
  ('1d222222-2222-2222-2222-222222222222', '1b111111-1111-1111-1111-111111111111',
   '1a444444-4444-4444-4444-444444444444', 'Staff B', 'accepted');

-- A Monday comfortably in the future, so "must be in the future" always holds.
create temporary table t_day on commit drop as
select (date_trunc('week', (now() at time zone 'Europe/Lisbon')::date) + interval '7 days')::date as d;

insert into public.availability (salon_id, staff_id, weekday, start_time, end_time)
select '1b111111-1111-1111-1111-111111111111', s, 1, '09:00:00', '12:00:00'
from unnest(array['1d111111-1111-1111-1111-111111111111'::uuid, '1d222222-2222-2222-2222-222222222222'::uuid]) s;

-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '1a222222-2222-2222-2222-222222222222';

select is(
  (select count(*)::int from public.get_available_slots(
    '1b111111-1111-1111-1111-111111111111', '1c111111-1111-1111-1111-111111111111', (select d from t_day))),
  3,
  'a 60-minute service in a 09:00-12:00 window offers three hours'
);

select is(
  (select free_staff from public.get_available_slots(
    '1b111111-1111-1111-1111-111111111111', '1c111111-1111-1111-1111-111111111111', (select d from t_day))
   order by slot limit 1),
  2,
  'both professionals are free at the first hour'
);

-- Book the 09:00 slot with staff A specifically.
select lives_ok(
  format(
    $$ select public.create_appointment(
         '1b111111-1111-1111-1111-111111111111',
         '1c111111-1111-1111-1111-111111111111',
         '1d111111-1111-1111-1111-111111111111',
         %L::timestamptz
       ) $$,
    ((select d from t_day) + time '09:00') at time zone 'Europe/Lisbon'
  ),
  'a client can book a specific professional inside working hours'
);

select is(
  (select free_staff from public.get_available_slots(
    '1b111111-1111-1111-1111-111111111111', '1c111111-1111-1111-1111-111111111111', (select d from t_day))
   order by slot limit 1),
  1,
  'that hour now shows only one professional free'
);

select is(
  (select count(*)::int from public.get_available_slots(
    '1b111111-1111-1111-1111-111111111111', '1c111111-1111-1111-1111-111111111111',
    (select d from t_day), '1d111111-1111-1111-1111-111111111111')),
  2,
  'asking for that professional alone, the booked hour disappears'
);

-- ---------------------------------------------------------------------------
-- "No preference" must avoid the professional who is already busy
-- ---------------------------------------------------------------------------
select is(
  (select staff_id from public.create_appointment_any_staff(
    '1b111111-1111-1111-1111-111111111111',
    '1c111111-1111-1111-1111-111111111111',
    ((select d from t_day) + time '09:00') at time zone 'Europe/Lisbon'
  )),
  '1d222222-2222-2222-2222-222222222222'::uuid,
  'with no preference, the busy professional is skipped for the free one'
);

-- Both are now taken at 09:00.
select throws_ok(
  format(
    $$ select public.create_appointment_any_staff(
         '1b111111-1111-1111-1111-111111111111',
         '1c111111-1111-1111-1111-111111111111',
         %L::timestamptz
       ) $$,
    ((select d from t_day) + time '09:00') at time zone 'Europe/Lisbon'
  ),
  'P0001',
  null,
  'when everyone is booked, no preference is refused with a clear message'
);

-- ---------------------------------------------------------------------------
-- Outside working hours
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$ select public.create_appointment(
         '1b111111-1111-1111-1111-111111111111',
         '1c111111-1111-1111-1111-111111111111',
         '1d111111-1111-1111-1111-111111111111',
         %L::timestamptz
       ) $$,
    ((select d from t_day) + time '03:00') at time zone 'Europe/Lisbon'
  ),
  'P0001',
  null,
  'booking at 03:00, outside the working window, is rejected'
);

select * from finish();
rollback;
