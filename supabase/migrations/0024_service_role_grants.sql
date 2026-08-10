-- 0024_service_role_grants.sql
-- Edge Functions run with the service_role key (createAdminClient). Ensure the
-- service role can read/write every table it operates on. RLS is bypassed for
-- service_role; the anon/authenticated roles still only get their explicit policies.
grant all privileges on all tables in schema app to service_role;
grant all privileges on all tables in schema admin to service_role;
grant all privileges on all tables in schema audit to service_role;
grant usage on schema app to service_role;
grant usage on schema admin to service_role;
grant usage on schema audit to service_role;
