-- Staff invite flow: inviting only creates a pending row (no role change);
-- only the invited person can accept; accepting is what promotes the role.
begin;
create extension if not exists pgtap;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('f1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-invite-owner1@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('f2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-invite-owner2@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('f3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-invite-candidate@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('f4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-invite-bystander@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}');

update public.profiles set role = 'owner' where id in (
  'f1111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222'
);

set local role authenticated;
set local request.jwt.claim.sub = 'f1111111-1111-1111-1111-111111111111';

insert into public.salons (id, owner_id, name, city)
values ('a9111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'Invite Salon', 'Braga');

-- an unrelated owner cannot invite staff into someone else's salon
set local request.jwt.claim.sub = 'f2222222-2222-2222-2222-222222222222';

-- P0001 = raise_exception, i.e. one of the RPC's own business-rule checks
-- rather than an incidental failure.
select throws_ok(
  $$ select public.invite_staff_member('a9111111-1111-1111-1111-111111111111', 'pgtap-invite-candidate@test.local') $$,
  'P0001',
  null,
  'a non-owner cannot invite staff into another owner''s salon'
);

-- the real owner invites the candidate
set local request.jwt.claim.sub = 'f1111111-1111-1111-1111-111111111111';

select throws_ok(
  $$ select public.invite_staff_member('a9111111-1111-1111-1111-111111111111', 'pgtap-invite-owner2@test.local') $$,
  'P0001',
  null,
  'inviting an account that is already an owner is rejected'
);

select lives_ok(
  $$ select public.invite_staff_member('a9111111-1111-1111-1111-111111111111', 'pgtap-invite-candidate@test.local') $$,
  'inviting an existing client account succeeds'
);

select is(
  (select status from public.staff where salon_id = 'a9111111-1111-1111-1111-111111111111' and profile_id = 'f3333333-3333-3333-3333-333333333333'),
  'pending',
  'the new staff row starts as pending'
);

-- Read the candidate's role *as the candidate*: profiles RLS only exposes
-- your own row, so checking this while acting as the owner would always
-- come back NULL regardless of the real value.
set local request.jwt.claim.sub = 'f3333333-3333-3333-3333-333333333333';

select is(
  (select role::text from public.profiles where id = 'f3333333-3333-3333-3333-333333333333'),
  'client',
  'the invited account is NOT promoted to staff yet — only the invite exists'
);

-- someone other than the invited candidate cannot accept it
set local request.jwt.claim.sub = 'f4444444-4444-4444-4444-444444444444';

select throws_ok(
  $$ select public.accept_staff_invite(
       (select id from public.staff where salon_id = 'a9111111-1111-1111-1111-111111111111' and profile_id = 'f3333333-3333-3333-3333-333333333333')
     ) $$,
  'P0001',
  null,
  'a bystander cannot accept someone else''s invite'
);

-- the candidate accepts their own invite
set local request.jwt.claim.sub = 'f3333333-3333-3333-3333-333333333333';

select lives_ok(
  $$ select public.accept_staff_invite(
       (select id from public.staff where salon_id = 'a9111111-1111-1111-1111-111111111111' and profile_id = 'f3333333-3333-3333-3333-333333333333')
     ) $$,
  'the invited candidate can accept their own invite'
);

select is(
  (select role::text from public.profiles where id = 'f3333333-3333-3333-3333-333333333333'),
  'staff',
  'accepting the invite promotes the account to staff'
);

select * from finish();
rollback;
