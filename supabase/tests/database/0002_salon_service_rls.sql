-- salons/services: public read, write restricted to the owning salon's
-- owner — another owner cannot touch someone else's salon.
begin;
create extension if not exists pgtap;
select plan(4);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-owner1@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}'),
  ('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-owner2@test.local', 'test_encrypted_password_not_real', now(), now(), now(), '{}', '{}');

update public.profiles set role = 'owner' where id in (
  'a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a1111111-1111-1111-1111-111111111111';

insert into public.salons (id, owner_id, name, city)
values ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Salon One', 'Lisboa');

insert into public.services (id, salon_id, name, duration_minutes, price_cents)
values ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Haircut', 30, 1500);

-- switch to owner2 to test cross-owner access
set local request.jwt.claim.sub = 'a2222222-2222-2222-2222-222222222222';

select is(
  (select count(*)::int from public.salons where id = 'b1111111-1111-1111-1111-111111111111'),
  1,
  'salons are publicly readable, even by a different owner'
);

-- An UPDATE blocked by a policy's USING clause doesn't raise — the row is
-- simply invisible to it, so it matches nothing. The security property to
-- assert is that the value is unchanged, not that an error was thrown.
update public.salons set name = 'Hijacked' where id = 'b1111111-1111-1111-1111-111111111111';

select is(
  (select name from public.salons where id = 'b1111111-1111-1111-1111-111111111111'),
  'Salon One',
  'an owner cannot update another owner''s salon (update affects no rows)'
);

-- An INSERT, by contrast, does raise: it fails the policy's WITH CHECK.
select throws_ok(
  $$ insert into public.services (salon_id, name, duration_minutes, price_cents)
     values ('b1111111-1111-1111-1111-111111111111', 'Sneaky service', 15, 500) $$,
  '42501',
  null,
  'an owner cannot add a service to another owner''s salon'
);

-- back to the real owner
set local request.jwt.claim.sub = 'a1111111-1111-1111-1111-111111111111';

update public.salons set name = 'Salon One Updated' where id = 'b1111111-1111-1111-1111-111111111111';

select is(
  (select name from public.salons where id = 'b1111111-1111-1111-1111-111111111111'),
  'Salon One Updated',
  'the actual owner can update their own salon'
);

select * from finish();
rollback;
