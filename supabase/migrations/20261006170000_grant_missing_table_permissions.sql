-- Grant permissions on tables to authenticated, service_role, and anon.
-- RLS policies control access row-by-row.

grant all on all tables in schema public to authenticated, service_role, anon;
grant all on all sequences in schema public to authenticated, service_role, anon;
grant all on all routines in schema public to authenticated, service_role, anon;

alter default privileges in schema public grant all on tables to authenticated, service_role, anon;
alter default privileges in schema public grant all on sequences to authenticated, service_role, anon;
alter default privileges in schema public grant all on routines to authenticated, service_role, anon;
