-- Allow signup to request 'owner' (salon manager) in addition to the default
-- 'client', for the web dashboard's self-serve signup flow. 'admin' can never
-- be requested at signup — it stays exclusively DB-provisioned.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_requested_role text;
  v_role public.user_role;
begin
  v_requested_role := new.raw_user_meta_data ->> 'requested_role';
  v_role := case when v_requested_role = 'owner' then 'owner' else 'client' end;

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;
