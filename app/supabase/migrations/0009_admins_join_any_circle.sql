-- Admins can join any circle directly, closed ones included (so they can see, post and help everywhere).
-- Everyone else: open circles join instantly; closed circles still need a request + recommendation + host approval.

create or replace function public.join_circle(p_circle uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_member();
  if not exists (select 1 from circles where id = p_circle and status = 'active') then
    raise exception 'circle_not_found' using errcode = 'P0001';
  end if;
  if (select visibility from circles where id = p_circle) <> 'open' and not is_admin() then
    raise exception 'circle_closed' using errcode = 'P0001';
  end if;
  insert into circle_members(circle_id, user_id) values (p_circle, auth.uid()) on conflict do nothing;
end $$;

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
  select id into v_id from join_requests where circle_id = p_circle and user_id = auth.uid() and status = 'pending';
  if v_id is null then
    insert into join_requests(circle_id, user_id) values (p_circle, auth.uid()) returning id into v_id;
  end if;
  return v_id;
end $$;
