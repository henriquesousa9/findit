-- Every table so far has relied on RLS as the only access control, on the
-- assumption that anon/authenticated already have baseline table-level
-- privileges — true on Supabase's hosted platform, which grants these
-- automatically and invisibly when a project is created. A database built
-- from just our own migrations (local dev, CI) never gets that implicit
-- bootstrap, so queries fail at the GRANT check before RLS is even
-- evaluated. Make it explicit so the schema is portable on its own.
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
