-- Party night: until open_doors_until, "Request to join" on a closed circle lets you in at once.
-- After that moment (or when it is null), the normal rule is back: a recommendation OR a host's approval.
alter table public.app_settings add column if not exists open_doors_until timestamptz;

create or replace function public.request_join(p_circle uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform require_member();
  if not exists (select 1 from circles where id = p_circle and status = 'active') then
    raise exception 'circle_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from circle_members where circle_id = p_circle and user_id = auth.uid()) then return null; end if;
  if (select visibility from circles where id = p_circle) = 'open' or is_admin() then
    perform join_circle(p_circle);
    return null;
  end if;
  if exists (select 1 from circle_recommendations where circle_id = p_circle and candidate_id = auth.uid())
     or now() < (select open_doors_until from app_settings where id = 1) then
    update join_requests set status = 'approved', decided_at = now()
     where circle_id = p_circle and user_id = auth.uid() and status = 'pending';
    insert into circle_members(circle_id, user_id) values (p_circle, auth.uid()) on conflict do nothing;
    return null;
  end if;
  select id into v_id from join_requests where circle_id = p_circle and user_id = auth.uid() and status = 'pending';
  if v_id is null then
    insert into join_requests(circle_id, user_id) values (p_circle, auth.uid()) returning id into v_id;
  end if;
  return v_id;
end $$;
