-- Third Place Berlin · core schema: profiles, settings, blocks, reports, membership gate.
-- Rule: nothing is readable unless the caller's profile has status = 'member'.

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 60),
  field         text check (char_length(field) <= 80),
  origin        text check (char_length(origin) <= 80),
  languages     text[] not null default '{}',
  berlin_since  date,
  bio           text check (char_length(bio) <= 500),
  fun_fact      text check (char_length(fun_fact) <= 200),
  teach         text[] not null default '{}' check (cardinality(teach) <= 10),
  learn         text[] not null default '{}' check (cardinality(learn) <= 10),
  avatar_url    text,
  locale        text not null default 'en' check (locale in ('en', 'de')),
  status        text not null default 'pending' check (status in ('pending', 'member', 'removed')),
  role          text not null default 'member' check (role in ('member', 'admin')),
  invited_by    uuid references public.profiles on delete set null,
  consent_at    timestamptz,
  created_at    timestamptz not null default now(),
  approved_at   timestamptz
);

create table public.app_settings (
  id                int primary key default 1 check (id = 1),
  vouches_required  int not null default 2 check (vouches_required between 1 and 5),
  launch_open       boolean not null default false,
  launch_code       text
);
insert into public.app_settings default values;

create table public.blocks (
  blocker_id  uuid not null references public.profiles on delete cascade,
  blocked_id  uuid not null references public.profiles on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles on delete cascade,
  target_type  text not null check (target_type in ('message', 'profile', 'meetup')),
  target_id    uuid not null,
  reason       text check (char_length(reason) <= 500),
  status       text not null default 'open' check (status in ('open', 'resolved')),
  created_at   timestamptz not null default now()
);

-- ── membership gate ─────────────────────────────────────────────────────
create function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'member')
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'member' and role = 'admin')
$$;

-- true when either person has blocked the other
create function public.is_blocked_between(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks
                 where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a))
$$;

-- ── row level security ──────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or is_admin()
  or (is_member() and status = 'member' and not is_blocked_between(auth.uid(), id))
);
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- members may only edit their own descriptive fields; status/role/invited_by/approved_at go through functions
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, field, origin, languages, berlin_since, bio, fun_fact, teach, learn, avatar_url, locale, consent_at)
  on public.profiles to authenticated;

create policy settings_read on public.app_settings for select using (is_member());
create policy settings_admin_update on public.app_settings for update using (is_admin()) with check (is_admin());
revoke insert, delete on public.app_settings from anon, authenticated;

create policy blocks_own on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid() and is_member());

create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid() and is_member());
create policy reports_admin_read on public.reports for select using (is_admin());
create policy reports_admin_update on public.reports for update using (is_admin()) with check (is_admin());

revoke all on all tables in schema public from anon;
