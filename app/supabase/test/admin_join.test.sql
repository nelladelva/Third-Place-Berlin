-- Admins can join any circle directly, closed ones included. Everyone else keeps the closed-circle flow.
do $$
declare a uuid; adm uuid; women uuid; karaoke uuid; req uuid;
begin
  a   := tests.make_user('a@test.de');
  adm := tests.make_user('admin@test.de', 'member', 'admin');
  select id into women from circles where name = 'Women Events';
  select id into karaoke from circles where name = 'Karaoke';

  -- admin: join_circle works on a closed circle
  perform tests.login(adm);
  perform join_circle(women);
  perform tests.assert_true(is_circle_member(women), 'admin joins closed circle with join_circle');

  -- admin: "Request to join" on a closed circle joins at once, no pending request
  req := request_join(karaoke);
  perform tests.assert_true(req is null, 'admin request_join returns no request id');
  perform tests.assert_true(is_circle_member(karaoke), 'admin request_join on closed circle joins directly');
  perform tests.assert_eq((select count(*) from join_requests where user_id = adm)::int, 0, 'no join request left behind for admin');
  perform tests.logout();

  -- ordinary member: unchanged
  perform tests.login(a);
  perform tests.assert_raises(format('select join_circle(%L)', karaoke), 'circle_closed', 'member still cannot join a closed circle');
  req := request_join(karaoke);
  perform tests.assert_true(req is not null, 'member request_join creates a pending request');
  perform tests.assert_true(not is_circle_member(karaoke), 'member is not in the closed circle yet');
  perform tests.logout();
end $$;
