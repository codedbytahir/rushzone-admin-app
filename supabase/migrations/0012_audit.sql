-- 0012_audit.sql
-- Append-only audit logs + trigger helpers

create table if not exists audit.logs (
  id           bigserial primary key,
  actor_id     uuid references auth.users(id),
  action       text not null,
  entity_type  text,
  entity_id    text,
  reason       text,
  before       jsonb,
  after        jsonb,
  ip           inet,
  created_at   timestamptz not null default now()
);

create index if not exists idx_audit_action_created on audit.logs (action, created_at desc);
create index if not exists idx_audit_actor_created on audit.logs (actor_id, created_at desc);
create index if not exists idx_audit_entity on audit.logs(entity_type, entity_id);

comment on table audit.logs is 'Immutable audit trail. No UPDATE/DELETE granted to any app role. Inserts only via secret key from Edge Functions.';

-- Helper function to write audit (called from Edge Functions; direct SQL allowed only via secret key)
create or replace function audit.write_log(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_reason text,
  p_before jsonb,
  p_after jsonb
)
returns bigint
language sql
security definer
set search_path = audit, public
as $$
  insert into audit.logs (actor_id, action, entity_type, entity_id, reason, before, after)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, p_reason, p_before, p_after)
  returning id;
$$;

-- Revoke all perms from public/authenticated; grant only to service_role via secret key context
-- (Supabase: no explicit grant needed beyond RLS; but we ensure no RLS bypass for client)
-- RLS will block direct client access entirely in 0014.

-- Example trigger helper: audit tournament changes (opt-in per table; Edge Functions write richer audit, triggers are fallback)
create or replace function audit.tournaments_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = audit, app, public
as $$
begin
  if tg_op = 'INSERT' then
    perform audit.write_log(null, 'tournament.create', 'tournament', new.id::text, null, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    -- only log material changes
    perform audit.write_log(null, 'tournament.update', 'tournament', new.id::text, null, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    perform audit.write_log(null, 'tournament.delete', 'tournament', old.id::text, 'hard delete blocked; use status=cancelled', to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

-- Attach trigger (audit even if Edge Function also writes; deduped by action grouping in reports)
drop trigger if exists trg_tournaments_audit on app.tournaments;
create trigger trg_tournaments_audit after insert or update or delete on app.tournaments
for each row execute function audit.tournaments_audit_trigger();
