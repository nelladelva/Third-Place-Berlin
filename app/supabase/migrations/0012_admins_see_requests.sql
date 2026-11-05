-- Admins act as host in every circle (is_circle_host already says so), so the app must show them
-- the join requests and the Approve button too. circle_cards.is_host used only the 'host' role.
create or replace view public.circle_cards with (security_invoker = true) as
  select c.id, c.name, c.description, c.emoji, c.color, c.visibility, c.status,
         circle_member_count(c.id) as member_count,
         exists (select 1 from circle_members m where m.circle_id = c.id and m.user_id = auth.uid()) as is_member,
         is_circle_host(c.id) as is_host,
         (select r.status from join_requests r where r.circle_id = c.id and r.user_id = auth.uid()
           order by r.created_at desc limit 1) as my_request_status
    from circles c;
