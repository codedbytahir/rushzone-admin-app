-- 0001_extensions_schemas.sql
-- Foundation: extensions, schemas, search_path
-- Immutable — do not edit after merge.

-- Extensions
create extension if not exists "pgcrypto" with schema public;
create extension if not exists "pgjwt" with schema public;

-- Schemas
create schema if not exists app;
create schema if not exists admin;
create schema if not exists audit;

-- Search path for app-owned functions (admin/audit functions will set search_path explicitly)
-- Keep public first for auth.* access
alter database postgres set search_path to public, app, admin, audit, extensions;

-- Comment
comment on schema app is 'Player + platform data: profiles, wallet, tournaments, rewards. RLS protected.';
comment on schema admin is 'Staff RBAC: roles, assignments, Super Key credentials. RLS blocked, Edge Functions only.';
comment on schema audit is 'Append-only immutable logs. Inserts via secret key only.';

-- Generic updated_at trigger (reused in later migrations)
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.handle_updated_at() is 'Generic trigger: sets updated_at = now() on UPDATE.';
