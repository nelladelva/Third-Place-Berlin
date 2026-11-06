-- Party night: until app_settings.open_doors_until, "Request to join" on a closed circle lets you in at once.
-- After that moment, the normal rule (recommendation OR host approval) is back, for everyone.
do $$
declare a uuid; b uuid; c uuid; karaoke uuid; books uuid; req uuid;
begin
  a := tests.make_user('a@test.de');
  b := tests.make_user('b@test.de');
  c := tests.make_user('c@test.de');
  select id into karaoke from circles where name = 'Karaoke';
  select id into books from circles where name = 'Book Lovers';

  -- no window set: normal rule
  perform tests.login(a);
  req := request_join(karaoke);
  perform tests.assert_true(req is not null and not is_circle_member(karaoke), 'without a window, closed circles need approval');
  perform tests.logout();

  -- window open: direct entry, no request left behind
  update app_settings set open_doors_until = now() + interval '1 hour' where id = 1;
  perform tests.login(b);
  req := request_join(karaoke);
  perform tests.assert_true(req is null, 'during the window request_join returns no request');
  perform tests.assert_true(is_circle_member(karaoke), 'during the window you join a closed circle at once');
  perform tests.assert_eq((select count(*) from join_requests where user_id = b)::int, 0, 'no pending request during the window');
  perform tests.assert_raises(format('select join_circle(%L)', books), 'circle_closed', 'the plain Join button still refuses closed circles');
  perform tests.logout();

  -- a request made before the window gets in when asked again during it
  perform tests.login(a);
  perform request_join(karaoke);
  perform tests.assert_true(is_circle_member(karaoke), 'an earlier pending request is let in during the window');
  perform tests.assert_eq((select count(*) from join_requests where user_id = a and status = 'pending')::int, 0, 'that old request is closed');
  perform tests.logout();

  -- window over: approval needed again, also for people who joined the app during the party
  update app_settings set open_doors_until = now() - interval '1 minute' where id = 1;
  perform tests.login(b);
  req := request_join(books);
  perform tests.assert_true(req is not null and not is_circle_member(books), 'after the window, approval is needed again');
  perform tests.logout();

  -- members cannot change the window
  perform tests.login(c);
  update app_settings set open_doors_until = now() + interval '1 year' where id = 1;
  perform tests.logout();
  perform tests.assert_true((select open_doors_until < now() from app_settings where id = 1), 'members cannot open the doors');
end $$;
