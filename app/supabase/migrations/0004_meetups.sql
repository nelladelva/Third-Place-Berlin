-- Meetups belong to a circle and are visible only to its members. Check-in needs the right time and place.

create table public.meetups (
  id             uuid primary key default gen_random_uuid(),
  circle_id      uuid not null references public.circles on delete cascade,
  host_id        uuid not null references public.profiles on delete cascade,
  title          text not null check (char_length(title) between 1 and 100),
  description    text check (char_length(description) <= 1000),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  location_name  text check (char_length(location_name) <= 120),
  lat            double precision not null check (lat between -90 and 90),
  lng            double precision not null check (lng between -180 and 180),
  sign           text check (char_length(sign) <= 120),
  bring          text check (char_length(bring) <= 200),
  capacity       int check (capacity > 0),
  cancelled_at   timestamptz,
  created_at     timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index meetups_circle_start on public.meetups (circle_id, starts_at);

create table public.rsvps (
  meetup_id      uuid not null references public.meetups on delete cascade,
  user_id        uuid not null references public.profiles on delete cascade,
  created_at     timestamptz not null default now(),
  checked_in_at  timestamptz,
  confirmed_by   uuid references public.profiles on delete set null,
  primary key (meetup_id, user_id)
);

create function public.meetup_circle(p_meetup uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select circle_id from meetups where id = p_meetup
$$;

alter table public.meetups enable row level security;
alter table public.rsvps enable row level security;

create policy meetups_read on public.meetups for select using (is_circle_member(circle_id) or is_admin());
create policy meetups_insert on public.meetups for insert with check (host_id = auth.uid() and is_circle_member(circle_id));
create policy meetups_update on public.meetups for update
  using (host_id = auth.uid() or is_circle_host(circle_id)) with check (host_id = auth.uid() or is_circle_host(circle_id));
create policy meetups_delete on public.meetups for delete using (host_id = auth.uid() or is_circle_host(circle_id));
revoke update (id, circle_id, host_id, created_at) on public.meetups from authenticated;

create policy rsvps_read on public.rsvps for select using (is_circle_member(meetup_circle(meetup_id)) or is_admin());
revoke insert, update, delete on public.rsvps from anon, authenticated;

-- great-circle distance in metres
create function public.haversine_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

create function public.rsvp(p_meetup uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_m meetups; v_count int;
begin
  select * into v_m from meetups where id = p_meetup for update;
  if v_m.id is null or not is_circle_member(v_m.circle_id) then raise exception 'not_circle_member' using errcode = 'P0001'; end if;
  if v_m.cancelled_at is not null then raise exception 'meetup_cancelled' using errcode = 'P0001'; end if;
  if exists (select 1 from rsvps where meetup_id = p_meetup and user_id = auth.uid()) then return 'going'; end if;
  select count(*) into v_count from rsvps where meetup_id = p_meetup;
  if v_m.capacity is not null and v_count >= v_m.capacity then return 'full'; end if;
  insert into rsvps(meetup_id, user_id) values (p_meetup, auth.uid());
  return 'going';
end $$;

create function public.cancel_rsvp(p_meetup uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from rsvps where meetup_id = p_meetup and user_id = auth.uid();
end $$;

create function public.check_in(p_meetup uuid, p_lat double precision, p_lng double precision) returns text
language plpgsql security definer set search_path = public as $$
declare v_m meetups;
begin
  select * into v_m from meetups where id = p_meetup;
  if v_m.id is null or not is_circle_member(v_m.circle_id) then raise exception 'not_circle_member' using errcode = 'P0001'; end if;
  if not exists (select 1 from rsvps where meetup_id = p_meetup and user_id = auth.uid()) then return 'not_going'; end if;
  if now() < v_m.starts_at - interval '30 minutes' then return 'too_early'; end if;
  if now() > v_m.ends_at + interval '30 minutes' then return 'too_late'; end if;
  if haversine_m(v_m.lat, v_m.lng, p_lat, p_lng) > 300 then return 'too_far'; end if;
  update rsvps set checked_in_at = coalesce(checked_in_at, now()) where meetup_id = p_meetup and user_id = auth.uid();
  return 'checked_in';
end $$;

create function public.confirm_attendance(p_meetup uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_m meetups;
begin
  select * into v_m from meetups where id = p_meetup;
  if v_m.id is null or not (v_m.host_id = auth.uid() or is_circle_host(v_m.circle_id)) then
    raise exception 'not_meetup_host' using errcode = 'P0001';
  end if;
  insert into rsvps(meetup_id, user_id, checked_in_at, confirmed_by) values (p_meetup, p_user, now(), auth.uid())
  on conflict (meetup_id, user_id) do update set checked_in_at = coalesce(rsvps.checked_in_at, now()), confirmed_by = auth.uid();
end $$;

revoke execute on all functions in schema public from anon;
