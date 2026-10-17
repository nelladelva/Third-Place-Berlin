-- Circle chat and meetup chat, reactions, polls, board pins.
-- Meetup chat becomes read-only 2 days after the meetup ends.

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid references public.circles on delete cascade,
  meetup_id   uuid references public.meetups on delete cascade,
  author_id   uuid not null references public.profiles on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  kind        text not null default 'text' check (kind in ('text', 'poll')),
  poll_id     uuid,
  reply_to    uuid references public.messages on delete set null,
  mentions    uuid[] not null default '{}' check (cardinality(mentions) <= 20),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  check (num_nonnulls(circle_id, meetup_id) = 1)
);
create index messages_circle_time on public.messages (circle_id, created_at desc);
create index messages_meetup_time on public.messages (meetup_id, created_at desc);

create table public.reactions (
  message_id  uuid not null references public.messages on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  emoji       text not null check (emoji in ('❤️', '😂', '🙌', '👍', '🤔', '🔥')),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.polls (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid not null references public.circles on delete cascade,
  author_id   uuid not null references public.profiles on delete cascade,
  question    text not null check (char_length(question) between 1 and 200),
  created_at  timestamptz not null default now(),
  closes_at   timestamptz
);
alter table public.messages add constraint messages_poll_fk foreign key (poll_id) references public.polls on delete cascade;

create table public.poll_options (
  id        uuid primary key default gen_random_uuid(),
  poll_id   uuid not null references public.polls on delete cascade,
  label     text not null check (char_length(label) between 1 and 80),
  position  int not null,
  unique (poll_id, position)
);

create table public.poll_votes (
  poll_id    uuid not null references public.polls on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  option_id  uuid not null references public.poll_options on delete cascade,
  voted_at   timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create table public.board_pins (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid not null references public.circles on delete cascade,
  author_id   uuid not null references public.profiles on delete cascade,
  title       text not null check (char_length(title) between 1 and 100),
  body        text check (char_length(body) <= 1000),
  url         text check (url ~* '^https?://' and char_length(url) <= 500),
  created_at  timestamptz not null default now()
);

-- ── helpers ─────────────────────────────────────────────────────────────
create function public.message_circle(p_circle uuid, p_meetup uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(p_circle, (select circle_id from meetups where id = p_meetup))
$$;

create function public.meetup_chat_open(p_meetup uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from meetups where id = p_meetup and now() <= ends_at + interval '2 days')
$$;

create function public.can_read_message(p_message uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from messages m where m.id = p_message and (is_circle_member(message_circle(m.circle_id, m.meetup_id)) or is_admin()))
$$;

create function public.poll_circle(p_poll uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select circle_id from polls where id = p_poll
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.messages enable row level security;
alter table public.reactions enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.board_pins enable row level security;

create policy messages_read on public.messages for select using (is_circle_member(message_circle(circle_id, meetup_id)) or is_admin());
create policy messages_insert on public.messages for insert with check (
  author_id = auth.uid() and kind = 'text' and poll_id is null
  and is_circle_member(message_circle(circle_id, meetup_id))
  and (meetup_id is null or meetup_chat_open(meetup_id))
);
revoke update, delete on public.messages from anon, authenticated;

create policy reactions_read on public.reactions for select using (can_read_message(message_id));
create policy reactions_insert on public.reactions for insert with check (user_id = auth.uid() and can_read_message(message_id));
create policy reactions_delete on public.reactions for delete using (user_id = auth.uid());

create policy polls_read on public.polls for select using (is_circle_member(circle_id) or is_admin());
create policy poll_options_read on public.poll_options for select using (is_circle_member(poll_circle(poll_id)) or is_admin());
create policy poll_votes_read on public.poll_votes for select using (is_circle_member(poll_circle(poll_id)) or is_admin());
revoke insert, update, delete on public.polls, public.poll_options, public.poll_votes from anon, authenticated;

create policy pins_read on public.board_pins for select using (is_circle_member(circle_id) or is_admin());
create policy pins_insert on public.board_pins for insert with check (author_id = auth.uid() and is_circle_member(circle_id));
create policy pins_delete on public.board_pins for delete using (author_id = auth.uid() or is_circle_host(circle_id));
revoke update on public.board_pins from anon, authenticated;

-- what the app reads: deleted bodies blanked, people I blocked hidden
create view public.messages_visible with (security_invoker = true) as
  select m.id, m.circle_id, m.meetup_id, m.author_id,
         case when m.deleted_at is null then m.body else '' end as body,
         m.kind, m.poll_id, m.reply_to, m.mentions, m.created_at, m.deleted_at
    from messages m
   where not exists (select 1 from blocks b where b.blocker_id = auth.uid() and b.blocked_id = m.author_id);

-- ── functions ───────────────────────────────────────────────────────────
create function public.create_poll(p_circle uuid, p_question text, p_options text[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_poll uuid; v_opts text[];
begin
  if not is_circle_member(p_circle) then raise exception 'not_circle_member' using errcode = 'P0001'; end if;
  v_opts := array(select trim(o) from unnest(p_options) o where trim(o) <> '');
  if cardinality(v_opts) not between 2 and 6 then raise exception 'poll_options: need 2 to 6 options' using errcode = 'P0001'; end if;
  insert into polls(circle_id, author_id, question) values (p_circle, auth.uid(), trim(p_question)) returning id into v_poll;
  insert into poll_options(poll_id, label, position) select v_poll, o, i from unnest(v_opts) with ordinality as t(o, i);
  insert into messages(circle_id, author_id, body, kind, poll_id) values (p_circle, auth.uid(), trim(p_question), 'poll', v_poll);
  return v_poll;
end $$;

create function public.vote(p_poll uuid, p_option uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_poll polls;
begin
  select * into v_poll from polls where id = p_poll;
  if v_poll.id is null or not is_circle_member(v_poll.circle_id) then raise exception 'not_circle_member' using errcode = 'P0001'; end if;
  if v_poll.closes_at is not null and now() > v_poll.closes_at then raise exception 'poll_closed' using errcode = 'P0001'; end if;
  if not exists (select 1 from poll_options where id = p_option and poll_id = p_poll) then raise exception 'invalid_option' using errcode = 'P0001'; end if;
  insert into poll_votes(poll_id, user_id, option_id) values (p_poll, auth.uid(), p_option)
  on conflict (poll_id, user_id) do update set option_id = excluded.option_id, voted_at = now();
end $$;

create function public.delete_message(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_m messages;
begin
  select * into v_m from messages where id = p_id;
  if v_m.id is null or not (v_m.author_id = auth.uid() or is_circle_host(message_circle(v_m.circle_id, v_m.meetup_id))) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  update messages set deleted_at = now() where id = p_id;
end $$;

alter publication supabase_realtime add table public.messages, public.reactions, public.poll_votes, public.meetups, public.rsvps;

revoke execute on all functions in schema public from anon;
