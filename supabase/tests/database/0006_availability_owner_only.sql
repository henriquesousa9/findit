-- Working hours belong to the salon: the owner sets them, staff only read.
-- The negative half is the point — hiding the form in the UI proves nothing,
-- so this asserts the database itself refuses a staff write.
begin;
create extension if not exists pgtap;
select plan(5);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('0e111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-av-owner@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('0e222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-av-staff@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}');

update public.profiles set role = 'owner' where id = '0e111111-1111-1111-1111-111111111111';
update public.profiles set role = 'staff' where id = '0e222222-2222-2222-2222-222222222222';

set local role authenticated;
set local request.jwt.claim.sub = '0e111111-1111-1111-1111-111111111111';

insert into public.salons (id, owner_id, name, city)
values ('0f111111-1111-1111-1111-111111111111', '0e111111-1111-1111-1111-111111111111', 'Availability Salon', 'Aveiro');

insert into public.staff (id, salon_id, profile_id, full_name, status)
values ('0f222222-2222-2222-2222-222222222222', '0f111111-1111-1111-1111-111111111111',
        '0e222222-2222-2222-2222-222222222222', 'Availability Staff', 'accepted');

-- ---------------------------------------------------------------------------
-- The owner sets the schedule
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.availability (id, salon_id, staff_id, weekday, start_time, end_time)
     values ('0f333333-3333-3333-3333-333333333333', '0f111111-1111-1111-1111-111111111111',
             '0f222222-2222-2222-2222-222222222222', 1, '09:00:00', '18:00:00') $$,
  'the salon owner can set working hours for their staff'
);

-- ---------------------------------------------------------------------------
-- The staff member may look, but not touch
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '0e222222-2222-2222-2222-222222222222';

select is(
  (select count(*)::int from public.availability where staff_id = '0f222222-2222-2222-2222-222222222222'),
  1,
  'the staff member can still see the hours assigned to them'
);

-- 42501 = insufficient_privilege, i.e. refused by RLS rather than by some
-- unrelated constraint.
select throws_ok(
  $$ insert into public.availability (salon_id, staff_id, weekday, start_time, end_time)
     values ('0f111111-1111-1111-1111-111111111111', '0f222222-2222-2222-2222-222222222222', 2, '10:00:00', '16:00:00') $$,
  '42501',
  null,
  'the staff member cannot add hours for themselves'
);

-- A blocked DELETE matches no rows rather than raising, so assert the row survives.
delete from public.availability where id = '0f333333-3333-3333-3333-333333333333';

select is(
  (select count(*)::int from public.availability where id = '0f333333-3333-3333-3333-333333333333'),
  1,
  'the staff member cannot delete hours the owner set'
);

update public.availability set end_time = '23:00:00' where id = '0f333333-3333-3333-3333-333333333333';

select is(
  (select end_time::text from public.availability where id = '0f333333-3333-3333-3333-333333333333'),
  '18:00:00',
  'the staff member cannot extend their own hours'
);

select * from finish();
rollback;
