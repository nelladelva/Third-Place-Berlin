-- Hardening after the Stage 1 review.

-- ── block status: only ever about me ────────────────────────────────────
create function public.is_blocked_with(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks
                 where (blocker_id = auth.uid() and blocked_id = p_other) or (blocker_id = p_other and blocked_id = auth.uid()))
$$;
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or is_admin() or (is_member() and status = 'member' and not is_blocked_with(id))
);
drop function public.is_blocked_between(uuid, uuid);

-- ── deleted messages are wiped, not just hidden ─────────────────────────
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 2000 and (deleted_at is not null or char_length(body) >= 1));

create or replace function public.delete_message(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_m messages;
begin
  select * into v_m from messages where id = p_id;
  if v_m.id is null or not (v_m.author_id = auth.uid() or is_circle_host(message_circle(v_m.circle_id, v_m.meetup_id))) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  update messages set deleted_at = now(), body = '', mentions = '{}' where id = p_id;
end $$;

-- ── meetups: identity columns cannot be edited ──────────────────────────
revoke update on public.meetups from authenticated;
grant update (title, description, starts_at, ends_at, location_name, lat, lng, sign, bring, capacity, cancelled_at)
  on public.meetups to authenticated;

-- ── consent at sign-up; onboarding tracked separately ───────────────────
alter table public.profiles add column welcomed_at timestamptz;
grant update (welcomed_at) on public.profiles to authenticated;
update public.profiles set welcomed_at = consent_at where consent_at is not null;

drop function public.redeem_invite(text, text);
create function public.redeem_invite(p_code text, p_display_name text, p_consent boolean) returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_existing text; v_settings app_settings; v_inv invites;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  select status into v_existing from profiles where id = v_uid;
  if v_existing is not null then return v_existing; end if;
  if p_consent is not true then raise exception 'consent_required' using errcode = 'P0001'; end if;

  select * into v_settings from app_settings where id = 1;
  if v_settings.launch_open and v_settings.launch_code = lower(trim(p_code)) then
    insert into profiles(id, display_name, status, approved_at, consent_at) values (v_uid, trim(p_display_name), 'member', now(), now());
    return 'member';
  end if;

  select * into v_inv from invites
   where code = lower(trim(p_code)) and kind = 'personal' and used_by is null and expires_at > now()
   for update;
  if v_inv.code is null then raise exception 'invite_invalid' using errcode = 'P0001'; end if;

  insert into profiles(id, display_name, status, invited_by, consent_at) values (v_uid, trim(p_display_name), 'pending', v_inv.inviter_id, now());
  update invites set used_by = v_uid, used_at = now() where code = v_inv.code;
  insert into vouches(candidate_id, voucher_id) values (v_uid, v_inv.inviter_id) on conflict do nothing;
  return evaluate_candidate(v_uid);
end $$;

-- ── profile photos must live in our storage bucket (no tracking pixels) ─
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^https://[^/]+/storage/v1/object/public/avatars/[0-9a-f-]+\.jpg(\?v=[0-9]+)?$');

-- ── removed members: their invites expire, their vouches stop counting ──
create or replace function public.evaluate_candidate(p_candidate uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_status text; v_needed int; v_count int;
begin
  select status into v_status from profiles where id = p_candidate for update;
  if v_status is distinct from 'pending' then return v_status; end if;
  select vouches_required into v_needed from app_settings where id = 1;
  select count(*) into v_count from vouches v join profiles p on p.id = v.voucher_id and p.status = 'member'
   where v.candidate_id = p_candidate;
  if v_count >= v_needed then
    update profiles set status = 'member', approved_at = now() where id = p_candidate;
    return 'member';
  end if;
  return 'pending';
end $$;

create or replace function public.remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_user = auth.uid() then raise exception 'cannot_remove_self' using errcode = 'P0001'; end if;
  update profiles set status = 'removed', role = 'member' where id = p_user;
  update invites set expires_at = now() where inviter_id = p_user and used_by is null and expires_at > now();
  delete from circle_members where user_id = p_user;
end $$;

-- ── storage: upserts need a SELECT policy; limit size and type ──────────
do $$
begin
  if to_regclass('storage.objects') is not null then
    update storage.buckets set file_size_limit = 1048576, allowed_mime_types = '{image/jpeg}' where id = 'avatars';
    execute $p$create policy avatars_select_own on storage.objects for select to authenticated
               using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg')$p$;
  end if;
end $$;

-- ── function privileges: nothing for anon; internal helpers not for members ──
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.name_of(uuid), public.circle_name(uuid), public.pref(uuid, uuid, text),
  public.notify(uuid, text, uuid, jsonb), public.evaluate_candidate(uuid), public.random_code(), public.bootstrap_admin(text)
  from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
