-- Closed circles: you ask to join, then EITHER a member's recommendation OR a host's approval lets you in.
-- A recommendation never adds someone who didn't ask: it waits until they request, then they're in at once.
-- Admins still join any circle directly (0009).

-- Hosts and admins approve without needing a recommendation.
create or replace function public.decide_join(p_request uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_req join_requests;
begin
  select * into v_req from join_requests where id = p_request for update;
  if v_req.id is null or v_req.status <> 'pending' then raise exception 'request_not_pending' using errcode = 'P0001'; end if;
  if not is_circle_host(v_req.circle_id) then raise exception 'not_circle_host' using errcode = 'P0001'; end if;
  update join_requests set status = case when p_approve then 'approved' else 'declined' end,
         decided_by = auth.uid(), decided_at = now() where id = p_request;
  if p_approve then
    insert into circle_members(circle_id, user_id) values (v_req.circle_id, v_req.user_id) on conflict do nothing;
  end if;
end $$;

-- A member's recommendation: if the person already asked, they're in now (request closed as approved).
create or replace function public.recommend(p_circle uuid, p_candidate uuid) returns void
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
  if exists (select 1 from join_requests where circle_id = p_circle and user_id = p_candidate and status = 'pending') then
    update join_requests set status = 'approved', decided_by = auth.uid(), decided_at = now()
     where circle_id = p_circle and user_id = p_candidate and status = 'pending';
    insert into circle_members(circle_id, user_id) values (p_circle, p_candidate) on conflict do nothing;
  end if;
end $$;

-- Asking to join: open circle, admin, or already recommended -> in at once. Otherwise a pending request.
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
  if exists (select 1 from circle_recommendations where circle_id = p_circle and candidate_id = auth.uid()) then
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
