-- Calm notifications: rows are created by triggers; a database webhook on INSERT sends web push (Edge Function send-push).
-- Never for the actor, never for someone who blocked the actor, only for members.

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  kind        text not null check (kind in ('meetup_new', 'poll_new', 'mention', 'reply', 'message_new', 'member_approved',
                                            'join_request', 'join_decided', 'proposal_new', 'proposal_decided', 'recommended')),
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index notifications_user_time on public.notifications (user_id, created_at desc);

create table public.notification_prefs (
  user_id        uuid not null references public.profiles on delete cascade,
  circle_id      uuid not null references public.circles on delete cascade,
  meetups_polls  boolean not null default true,
  mentions       boolean not null default true,
  every_message  boolean not null default false,
  primary key (user_id, circle_id)
);

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.push_subscriptions enable row level security;
create policy notifications_own_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, delete on public.notifications from anon, authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy prefs_own on public.notification_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_circle_member(circle_id));
create policy push_own on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member());

-- ── helpers ─────────────────────────────────────────────────────────────
create function public.notify(p_user uuid, p_kind text, p_actor uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user is not distinct from p_actor then return; end if;
  if not exists (select 1 from profiles where id = p_user and status = 'member') then return; end if;
  if p_actor is not null and exists (select 1 from blocks where blocker_id = p_user and blocked_id = p_actor) then return; end if;
  insert into notifications(user_id, kind, data) values (p_user, p_kind, p_data);
end $$;

create function public.pref(p_user uuid, p_circle uuid, p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select case p_name when 'meetups_polls' then meetups_polls when 'mentions' then mentions else every_message end
                     from notification_prefs where user_id = p_user and circle_id = p_circle),
                  p_name <> 'every_message')
$$;

create function public.name_of(p_user uuid) returns text
language sql stable security definer set search_path = public as $$ select display_name from profiles where id = p_user $$;

create function public.circle_name(p_circle uuid) returns text
language sql stable security definer set search_path = public as $$ select name from circles where id = p_circle $$;

-- ── triggers ────────────────────────────────────────────────────────────
create function public.tg_meetup_new() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify(m.user_id, 'meetup_new', new.host_id, jsonb_build_object(
      'title', new.title, 'circle', circle_name(new.circle_id), 'circle_id', new.circle_id, 'meetup_id', new.id,
      'starts_at', new.starts_at, 'author', name_of(new.host_id)))
    from circle_members m where m.circle_id = new.circle_id and pref(m.user_id, new.circle_id, 'meetups_polls');
  return null;
end $$;
create trigger meetup_new after insert on public.meetups for each row execute function public.tg_meetup_new();

create function public.tg_poll_new() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify(m.user_id, 'poll_new', new.author_id, jsonb_build_object(
      'question', new.question, 'circle', circle_name(new.circle_id), 'circle_id', new.circle_id, 'poll_id', new.id,
      'author', name_of(new.author_id)))
    from circle_members m where m.circle_id = new.circle_id and pref(m.user_id, new.circle_id, 'meetups_polls');
  return null;
end $$;
create trigger poll_new after insert on public.polls for each row execute function public.tg_poll_new();

create function public.tg_message_new() returns trigger language plpgsql security definer set search_path = public as $$
declare v_circle uuid; v_data jsonb; v_done uuid[] := '{}'; v_parent uuid;
begin
  if new.kind <> 'text' then return null; end if;
  v_circle := message_circle(new.circle_id, new.meetup_id);
  v_data := jsonb_build_object('author', name_of(new.author_id), 'circle', circle_name(v_circle), 'circle_id', v_circle,
                               'meetup_id', new.meetup_id, 'message_id', new.id, 'body', left(new.body, 120));
  -- mentions
  select coalesce(array_agg(m.user_id), '{}') into v_done
    from circle_members m where m.circle_id = v_circle and m.user_id = any(new.mentions) and pref(m.user_id, v_circle, 'mentions');
  perform notify(u, 'mention', new.author_id, v_data) from unnest(v_done) u;
  -- reply
  if new.reply_to is not null then
    select author_id into v_parent from messages where id = new.reply_to;
    if v_parent is not null and not (v_parent = any(v_done))
       and exists (select 1 from circle_members where circle_id = v_circle and user_id = v_parent)
       and pref(v_parent, v_circle, 'mentions') then
      perform notify(v_parent, 'reply', new.author_id, v_data);
      v_done := v_done || v_parent;
    end if;
  end if;
  -- opted in to every message
  perform notify(m.user_id, 'message_new', new.author_id, v_data)
    from circle_members m
   where m.circle_id = v_circle and not (m.user_id = any(v_done)) and pref(m.user_id, v_circle, 'every_message');
  return null;
end $$;
create trigger message_new after insert on public.messages for each row execute function public.tg_message_new();

create function public.tg_member_approved() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'member' then
    perform notify(new.id, 'member_approved', null, '{}'::jsonb);
  end if;
  return null;
end $$;
create trigger member_approved after update of status on public.profiles for each row execute function public.tg_member_approved();

create function public.tg_join_request() returns trigger language plpgsql security definer set search_path = public as $$
declare v_data jsonb := jsonb_build_object('circle', circle_name(new.circle_id), 'circle_id', new.circle_id,
                                          'author', name_of(new.user_id), 'request_id', new.id);
begin
  if tg_op = 'INSERT' then
    perform notify(m.user_id, 'join_request', new.user_id, v_data)
      from circle_members m where m.circle_id = new.circle_id and m.role = 'host';
  elsif old.status = 'pending' and new.status <> 'pending' then
    perform notify(new.user_id, 'join_decided', new.decided_by, v_data || jsonb_build_object('approved', new.status = 'approved'));
  end if;
  return null;
end $$;
create trigger join_request after insert or update of status on public.join_requests for each row execute function public.tg_join_request();

create function public.tg_proposal() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify(p.id, 'proposal_new', new.proposer_id, jsonb_build_object('name', new.name, 'author', name_of(new.proposer_id)))
      from profiles p where p.role = 'admin' and p.status = 'member';
  elsif old.status is distinct from new.status then
    perform notify(new.proposer_id, 'proposal_decided', new.decided_by,
                   jsonb_build_object('name', new.name, 'status', new.status, 'note', new.admin_note, 'circle_id', new.circle_id));
  end if;
  return null;
end $$;
create trigger proposal after insert or update of status on public.circle_proposals for each row execute function public.tg_proposal();

create function public.tg_recommended() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify(new.candidate_id, 'recommended', new.recommender_id, jsonb_build_object(
    'circle', circle_name(new.circle_id), 'circle_id', new.circle_id, 'author', name_of(new.recommender_id)));
  return null;
end $$;
create trigger recommended after insert on public.circle_recommendations for each row execute function public.tg_recommended();

alter publication supabase_realtime add table public.notifications;

revoke execute on function public.notify(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on all functions in schema public from anon;
