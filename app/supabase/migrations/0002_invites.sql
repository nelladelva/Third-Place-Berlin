-- Invites, vouching, launch link, approvals.
-- A personal invite counts as the inviter's vouch; a candidate becomes a member at app_settings.vouches_required vouches.

create table public.invites (
  code        text primary key check (code ~ '^[a-z0-9]{10}$'),
  inviter_id  uuid references public.profiles on delete cascade,
  kind        text not null default 'personal' check (kind in ('personal', 'launch')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  used_by     uuid references public.profiles on delete set null,
  used_at     timestamptz
);

create table public.vouches (
  candidate_id  uuid not null references public.profiles on delete cascade,
  voucher_id    uuid not null references public.profiles on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (candidate_id, voucher_id)
);

alter table public.invites enable row level security;
alter table public.vouches enable row level security;
create policy invites_own on public.invites for select using (inviter_id = auth.uid() or is_admin());
create policy vouches_read on public.vouches for select using (is_member() or candidate_id = auth.uid());
revoke insert, update, delete on public.invites, public.vouches from anon, authenticated;

create function public.random_code() returns text language sql volatile as $$
  select string_agg(substr('abcdefghijkmnpqrstuvwxyz23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 10)
$$;

create function public.require_member() returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not is_member() then raise exception 'not_member' using errcode = 'P0001'; end if;
end $$;

create function public.require_admin() returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_admin' using errcode = 'P0001'; end if;
end $$;

-- internal: promote a pending candidate once enough vouches exist
create function public.evaluate_candidate(p_candidate uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_status text; v_needed int; v_count int;
begin
  select status into v_status from profiles where id = p_candidate for update;
  if v_status is distinct from 'pending' then return v_status; end if;
  select vouches_required into v_needed from app_settings where id = 1;
  select count(*) into v_count from vouches where candidate_id = p_candidate;
  if v_count >= v_needed then
    update profiles set status = 'member', approved_at = now() where id = p_candidate;
    return 'member';
  end if;
  return 'pending';
end $$;

create function public.create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  perform require_member();
  loop
    v_code := random_code();
    exit when not exists (select 1 from invites where code = v_code);
  end loop;
  insert into invites(code, inviter_id, kind) values (v_code, auth.uid(), 'personal');
  return v_code;
end $$;

create function public.redeem_invite(p_code text, p_display_name text) returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_existing text; v_settings app_settings; v_inv invites;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  select status into v_existing from profiles where id = v_uid;
  if v_existing is not null then return v_existing; end if;

  select * into v_settings from app_settings where id = 1;
  if v_settings.launch_open and v_settings.launch_code = lower(trim(p_code)) then
    insert into profiles(id, display_name, status, approved_at) values (v_uid, trim(p_display_name), 'member', now());
    return 'member';
  end if;

  select * into v_inv from invites
   where code = lower(trim(p_code)) and kind = 'personal' and used_by is null and expires_at > now()
   for update;
  if v_inv.code is null then raise exception 'invite_invalid' using errcode = 'P0001'; end if;

  insert into profiles(id, display_name, status, invited_by) values (v_uid, trim(p_display_name), 'pending', v_inv.inviter_id);
  update invites set used_by = v_uid, used_at = now() where code = v_inv.code;
  insert into vouches(candidate_id, voucher_id) values (v_uid, v_inv.inviter_id) on conflict do nothing;
  return evaluate_candidate(v_uid);
end $$;

create function public.vouch(p_candidate uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  perform require_member();
  if p_candidate = auth.uid() or not exists (select 1 from profiles where id = p_candidate and status = 'pending') then
    raise exception 'invalid_candidate' using errcode = 'P0001';
  end if;
  insert into vouches(candidate_id, voucher_id) values (p_candidate, auth.uid()) on conflict do nothing;
  return evaluate_candidate(p_candidate);
end $$;

create function public.approve_member(p_candidate uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  update profiles set status = 'member', approved_at = coalesce(approved_at, now())
   where id = p_candidate and status = 'pending';
end $$;

create function public.remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_user = auth.uid() then raise exception 'cannot_remove_self' using errcode = 'P0001'; end if;
  update profiles set status = 'removed', role = 'member' where id = p_user;
  if to_regclass('public.circle_members') is not null then
    execute 'delete from public.circle_members where user_id = $1' using p_user;
  end if;
end $$;

create function public.set_admin(p_user uuid, p_admin boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_user = auth.uid() and not p_admin then raise exception 'cannot_demote_self' using errcode = 'P0001'; end if;
  update profiles set role = case when p_admin then 'admin' else 'member' end where id = p_user and status = 'member';
end $$;

create function public.open_launch() returns text
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  perform require_admin();
  select launch_code into v_code from app_settings where id = 1;
  v_code := coalesce(v_code, random_code());
  update app_settings set launch_open = true, launch_code = v_code where id = 1;
  return v_code;
end $$;

create function public.close_launch() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  update app_settings set launch_open = false where id = 1;
end $$;

-- Run once from the Supabase SQL editor by the owner (not callable from the app).
create function public.bootstrap_admin(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then raise exception 'no auth user with email %: sign in to the app once first', p_email; end if;
  insert into profiles(id, display_name, status, role, approved_at)
  values (v_uid, split_part(p_email, '@', 1), 'member', 'admin', now())
  on conflict (id) do update set status = 'member', role = 'admin', approved_at = coalesce(profiles.approved_at, now());
end $$;

revoke execute on function public.bootstrap_admin(text), public.evaluate_candidate(uuid), public.random_code()
  from public, anon, authenticated;
revoke execute on all functions in schema public from anon;
