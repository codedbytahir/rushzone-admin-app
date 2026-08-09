create or replace function admin.hash_super_key(p_plaintext text)
returns text
language plpgsql
security definer
set search_path = admin, public, extensions
as $$
declare
  v_hash text;
begin
  if p_plaintext is null or length(p_plaintext) < 8 then
    raise exception 'Super key too short';
  end if;
  v_hash := crypt(p_plaintext, gen_salt('bf', 10));
  return v_hash;
end;
$$;

create or replace function admin.verify_super_key(p_assignment_id uuid, p_plaintext text)
returns boolean
language plpgsql
security definer
set search_path = admin, public, extensions
as $$
declare
  v_hash text;
begin
  select key_hash into v_hash from admin.security_credentials where assignment_id = p_assignment_id;
  if v_hash is null then return false; end if;
  return v_hash = crypt(p_plaintext, v_hash);
end;
$$;

create or replace function admin.generate_one_time_key()
returns text
language plpgsql
as $$
declare
  v_key text;
begin
  v_key := 'RZ-' || upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text),1,4)) || '-' || upper(substr(md5(gen_random_uuid()::text),1,4)) || '-' || substr(md5(random()::text),1,4);
  return v_key;
end;
$$;
