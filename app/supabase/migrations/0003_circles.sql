-- Circles: open/closed sub-communities, join requests with member recommendations, proposals approved by admins.

create table public.circles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 300),
  emoji       text check (char_length(emoji) <= 8),
  color       text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  visibility  text not null default 'open' check (visibility in ('open', 'closed')),
  status      text not null default 'active' check (status in ('active', 'archived')),
  created_by  uuid references public.profiles on delete set null,
  created_at  timestamptz not null default now()
);

create table public.circle_members (
  circle_id  uuid not null references public.circles on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  role       text not null default 'member' check (role in ('member', 'host')),
  joined_at  timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table public.join_requests (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid not null references public.circles on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at  timestamptz not null default now(),
  decided_by  uuid references public.profiles on delete set null,
  decided_at  timestamptz
);
create unique index join_requests_one_pending on public.join_requests (circle_id, user_id) where status = 'pending';

create table public.circle_recommendations (
  circle_id       uuid not null references public.circles on delete cascade,
  candidate_id    uuid not null references public.profiles on delete cascade,
  recommender_id  uuid not null references public.profiles on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (circle_id, candidate_id, recommender_id)
);

create table public.circle_proposals (
  id           uuid primary key default gen_random_uuid(),
  proposer_id  uuid not null references public.profiles on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  description  text check (char_length(description) <= 300),
  emoji        text check (char_length(emoji) <= 8),
  visibility   text not null default 'open' check (visibility in ('open', 'closed')),
  cohosts      uuid[] not null default '{}' check (cardinality(cohosts) <= 5),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'question')),
  admin_note   text check (char_length(admin_note) <= 500),
  decided_by   uuid references public.profiles on delete set null,
  circle_id    uuid references public.circles on delete set null,
  created_at   timestamptz not null default now()
);

-- ── helpers ─────────────────────────────────────────────────────────────
create function public.is_circle_member(p_circle uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_member() and exists (select 1 from circle_members where circle_id = p_circle and user_id = auth.uid())
$$;

create function public.is_circle_host(p_circle uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or (is_member() and exists (
    select 1 from circle_members where circle_id = p_circle and user_id = auth.uid() and role = 'host'))
$$;

create function public.circle_member_count(p_circle uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from circle_members where circle_id = p_circle
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.circle_recommendations enable row level security;
alter table public.circle_proposals enable row level security;

create policy circles_read on public.circles for select using (is_admin() or (is_member() and status = 'active'));
create policy circle_members_read on public.circle_members for select using (
  is_circle_member(circle_id)
  or is_admin()
  or (is_member() and exists (select 1 from circles c where c.id = circle_id and c.visibility = 'open'))
);
create policy join_requests_read on public.join_requests for select using (user_id = auth.uid() or is_circle_host(circle_id));
create policy recommendations_read on public.circle_recommendations for select using (
  candidate_id = auth.uid() or recommender_id = auth.uid() or is_circle_host(circle_id));
create policy proposals_read on public.circle_proposals for select using (proposer_id = auth.uid() or is_admin());

revoke insert, update, delete on public.circles, public.circle_members, public.join_requests,
  public.circle_recommendations, public.circle_proposals from anon, authenticated;

create view public.circle_cards with (security_invoker = true) as
  select c.id, c.name, c.description, c.emoji, c.color, c.visibility, c.status,
         circle_member_count(c.id) as member_count,
         exists (select 1 from circle_members m where m.circle_id = c.id and m.user_id = auth.uid()) as is_member,
         exists (select 1 from circle_members m where m.circle_id = c.id and m.user_id = auth.uid() and m.role = 'host') as is_host,
         (select r.status from join_requests r where r.circle_id = c.id and r.user_id = auth.uid()
           order by r.created_at desc limit 1) as my_request_status
    from circles c;

-- ── functions ───────────────────────────────────────────────────────────
create function public.join_circle(p_circle uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_member();
  if not exists (select 1 from circles where id = p_circle and status = 'active') then
    raise exception 'circle_not_found' using errcode = 'P0001';
  end if;
  if (select visibility from circles where id = p_circle) <> 'open' then
    raise exception 'circle_closed' using errcode = 'P0001';
  end if;
  insert into circle_members(circle_id, user_id) values (p_circle, auth.uid()) on conflict do nothing;
end $$;

create function public.leave_circle(p_circle uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from circle_members where circle_id = p_circle and user_id = auth.uid();
end $$;

create function public.request_join(p_circle uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform require_member();
  if not exists (select 1 from circles where id = p_circle and status = 'active') then
    raise exception 'circle_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from circle_members where circle_id = p_circle and user_id = auth.uid()) then return null; end if;
  if (select visibility from circles where id = p_circle) = 'open' then
    perform join_circle(p_circle);
    return null;
  end if;
  select id into v_id from join_requests where circle_id = p_circle and user_id = auth.uid() and status = 'pending';
  if v_id is null then
    insert into join_requests(circle_id, user_id) values (p_circle, auth.uid()) returning id into v_id;
  end if;
  return v_id;
end $$;

create function public.recommend(p_circle uuid, p_candidate uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_member();
  if not exists (select 1 from circle_members where circle_id = p_circle and user_id = auth.uid()) then
    raise exception 'not_circle_member' using errcode = 'P0001';
  end if;
  if p_candidate = auth.uid() or not exists (select 1 from profiles where id = p_candidate and status = 'member') then
    raise exception 'invalid_candidate' using errcode = 'P0001';
  end if;
  insert into circle_recommendations(circle_id, candidate_id, recommender_id)
  values (p_circle, p_candidate, auth.uid()) on conflict do nothing;
end $$;

create function public.decide_join(p_request uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_req join_requests;
begin
  select * into v_req from join_requests where id = p_request for update;
  if v_req.id is null or v_req.status <> 'pending' then raise exception 'request_not_pending' using errcode = 'P0001'; end if;
  if not is_circle_host(v_req.circle_id) then raise exception 'not_circle_host' using errcode = 'P0001'; end if;
  if p_approve and not is_admin() and not exists (
      select 1 from circle_recommendations where circle_id = v_req.circle_id and candidate_id = v_req.user_id) then
    raise exception 'needs_recommendation' using errcode = 'P0001';
  end if;
  update join_requests set status = case when p_approve then 'approved' else 'declined' end,
         decided_by = auth.uid(), decided_at = now() where id = p_request;
  if p_approve then
    insert into circle_members(circle_id, user_id) values (v_req.circle_id, v_req.user_id) on conflict do nothing;
  end if;
end $$;

create function public.propose_circle(p_name text, p_description text, p_emoji text, p_visibility text, p_cohosts uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform require_member();
  insert into circle_proposals(proposer_id, name, description, emoji, visibility, cohosts)
  values (auth.uid(), trim(p_name), nullif(trim(p_description), ''), nullif(trim(p_emoji), ''), p_visibility,
          coalesce(array(select distinct x from unnest(p_cohosts) x where x <> auth.uid()), '{}'))
  returning id into v_id;
  return v_id;
end $$;

create function public.decide_proposal(p_id uuid, p_decision text, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_p circle_proposals; v_circle uuid; v_colors text[] := array['#C1592A','#2F5D58','#D9A441','#3C4A7A','#8E3B8A','#2E6E8E','#A0522D','#B9647D'];
begin
  perform require_admin();
  if p_decision not in ('approved', 'declined', 'question') then raise exception 'invalid_decision' using errcode = 'P0001'; end if;
  select * into v_p from circle_proposals where id = p_id for update;
  if v_p.id is null or v_p.status not in ('pending', 'question') then raise exception 'proposal_not_open' using errcode = 'P0001'; end if;
  if p_decision = 'approved' then
    insert into circles(name, description, emoji, color, visibility, created_by)
    values (v_p.name, v_p.description, coalesce(v_p.emoji, '✨'), v_colors[1 + floor(random() * 8)::int], v_p.visibility, v_p.proposer_id)
    returning id into v_circle;
    insert into circle_members(circle_id, user_id, role)
      select v_circle, u, 'host' from unnest(array_prepend(v_p.proposer_id, v_p.cohosts)) u
      where exists (select 1 from profiles where id = u and status = 'member')
      on conflict do nothing;
  end if;
  update circle_proposals set status = p_decision, admin_note = p_note, decided_by = auth.uid(), circle_id = v_circle where id = p_id;
  return v_circle;
end $$;

create function public.set_visibility(p_circle uuid, p_visibility text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  update circles set visibility = p_visibility where id = p_circle;
end $$;

create function public.set_host(p_circle uuid, p_user uuid, p_is_host boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  insert into circle_members(circle_id, user_id, role) values (p_circle, p_user, case when p_is_host then 'host' else 'member' end)
  on conflict (circle_id, user_id) do update set role = excluded.role;
end $$;

create function public.archive_circle(p_circle uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  update circles set status = case when p_archived then 'archived' else 'active' end where id = p_circle;
end $$;

revoke execute on function public.circle_member_count(uuid) from anon;
revoke execute on all functions in schema public from anon;
