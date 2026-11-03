-- Closed circles: you ask to join, then EITHER a member's recommendation OR a host's approval lets you in.
-- Nobody is put into a circle without asking.
do $$
declare h uuid; m uuid; a uuid; b uuid; c uuid; karaoke uuid; req uuid;
begin
  h := tests.make_user('host@test.de');
  m := tests.make_user('member@test.de');
  a := tests.make_user('a@test.de');
  b := tests.make_user('b@test.de');
  c := tests.make_user('c@test.de');
  select id into karaoke from circles where name = 'Karaoke';
  insert into circle_members(circle_id, user_id, role) values (karaoke, h, 'host'), (karaoke, m, 'member');

  -- path 2: a host approves without any recommendation
  perform tests.login(a);
  req := request_join(karaoke);
  perform tests.logout();
  perform tests.login(h);
  perform decide_join(req, true);
  perform tests.logout();
  perform tests.assert_true(exists(select 1 from circle_members where circle_id = karaoke and user_id = a), 'host approves without a recommendation');

  -- path 1: asked first, then a member recommends -> in immediately
  perform tests.login(b);
  req := request_join(karaoke);
  perform tests.logout();
  perform tests.login(m);
  perform recommend(karaoke, b);
  perform tests.logout();
  perform tests.assert_true(exists(select 1 from circle_members where circle_id = karaoke and user_id = b), 'recommendation after request lets them in');
  perform tests.assert_eq((select status from join_requests where id = req), 'approved', 'their request is closed as approved');
  perform tests.assert_eq((select count(*) from notifications where user_id = b and kind = 'join_decided')::int, 1, 'they are told they are in');

  -- no request, no entry: a recommendation alone does not add anyone
  perform tests.login(m);
  perform recommend(karaoke, c);
  perform tests.logout();
  perform tests.assert_true(not exists(select 1 from circle_members where circle_id = karaoke and user_id = c), 'recommendation without a request does not add them');
  -- ... but once they ask, they are in right away
  perform tests.login(c);
  req := request_join(karaoke);
  perform tests.assert_true(req is null, 'recommended person asking to join gets no pending request');
  perform tests.assert_true(is_circle_member(karaoke), 'recommended person is in as soon as they ask');
  perform tests.logout();
  perform tests.assert_eq((select count(*) from join_requests where user_id = c and status = 'pending')::int, 0, 'no pending request left behind');
end $$;
