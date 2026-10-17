-- Test helpers (loaded after migrations). Every assertion raises a notice 'ok: <label>' or an exception.
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.make_user(p_email text, p_status text default 'member', p_role text default 'member')
returns uuid language plpgsql security definer as $$
declare v uuid;
begin
  insert into auth.users(email) values (p_email) returning id into v;
  insert into public.profiles(id, display_name, status, role, approved_at, consent_at)
  values (v, split_part(p_email, '@', 1), p_status, p_role,
          case when p_status = 'member' then now() end, case when p_status = 'member' then now() end);
  return v;
end $$;

-- An auth user with no profile yet (someone who logged in but has not redeemed an invite).
create function tests.make_auth_user(p_email text) returns uuid language sql security definer as
  $$ insert into auth.users(email) values (p_email) returning id $$;

create function tests.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function tests.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

create function tests.assert_eq(actual anyelement, expected anyelement, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % (expected %, got %)', label, expected, actual;
  end if;
  raise notice 'ok: %', label;
end $$;

create function tests.assert_true(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', label; end if;
  raise notice 'ok: %', label;
end $$;

-- Runs p_sql in a subtransaction; passes if it raises with SQLSTATE = p_expected or a message containing it.
create function tests.assert_raises(p_sql text, p_expected text, label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_expected or sqlerrm ilike '%' || p_expected || '%' then
      raise notice 'ok: %', label;
      return;
    end if;
    raise exception 'FAIL: % (expected error %, got % %)', label, p_expected, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % (expected error %, but it succeeded)', label, p_expected;
end $$;

grant execute on all functions in schema tests to anon, authenticated, service_role;
