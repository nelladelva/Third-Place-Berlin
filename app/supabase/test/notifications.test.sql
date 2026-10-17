do $$
declare a uuid; b uuid; c uuid; d uuid; h uuid; adm uuid; n uuid; bbb uuid; women uuid; m uuid; msg uuid; code text; req uuid;
begin
  a := tests.make_user('a@test.de'); b := tests.make_user('b@test.de'); c := tests.make_user('c@test.de');
  d := tests.make_user('d@test.de'); h := tests.make_user('h@test.de');
  adm := tests.make_user('admin@test.de', 'member', 'admin');
  n := tests.make_auth_user('n@test.de');
  select id into bbb from circles where name like 'BBB%';
  select id into women from circles where name = 'Women Events';
  insert into circle_members(circle_id, user_id) values (bbb, a), (bbb, b), (bbb, c);
  insert into circle_members(circle_id, user_id, role) values (women, h, 'host');
  insert into notification_prefs(user_id, circle_id, meetups_polls) values (c, bbb, false);

  -- new meetup
  perform tests.login(a);
  insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng)
    values (bbb, a, 'Picnic', now() + interval '1 day', now() + interval '1 day 2 hours', 52.47, 13.40) returning id into m;
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where kind = 'meetup_new' and user_id = b)::int, 1, 'new meetup notifies circle members');
  perform tests.assert_eq((select count(*) from notifications where kind = 'meetup_new' and user_id = a)::int, 0, 'host not notified of own meetup');
  perform tests.assert_eq((select count(*) from notifications where kind = 'meetup_new' and user_id = c)::int, 0, 'member with meetups_polls=false gets nothing');
  perform tests.assert_eq((select count(*) from notifications where kind = 'meetup_new' and user_id = d)::int, 0, 'non-member of circle gets nothing');
  perform tests.assert_eq((select data->>'title' from notifications where kind = 'meetup_new' and user_id = b), 'Picnic', 'notification carries the title');

  -- polls
  perform tests.login(b);
  perform create_poll(bbb, 'Where next?', array['Mauerpark', 'Tempelhof']);
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where kind = 'poll_new')::int, 1, 'poll notifies members except author and opted-out');

  -- plain message: nothing by default
  delete from notifications;
  perform tests.login(a);
  insert into messages(circle_id, author_id, body) values (bbb, a, 'Hello') returning id into msg;
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications)::int, 0, 'every_message off by default: plain message creates no notification');

  -- mention + reply
  perform tests.login(b);
  insert into messages(circle_id, author_id, body, mentions, reply_to) values (bbb, b, '@a @d yes!', array[a, d], msg);
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where user_id = a and kind = 'mention')::int, 1, 'mention notifies circle member');
  perform tests.assert_eq((select count(*) from notifications where user_id = a and kind = 'reply')::int, 0, 'no duplicate reply when already mentioned');
  perform tests.assert_eq((select count(*) from notifications where user_id = d)::int, 0, 'mention notifies only circle members');

  -- every_message on
  delete from notifications;
  insert into notification_prefs(user_id, circle_id, every_message) values (b, bbb, true);
  perform tests.login(c);
  insert into messages(circle_id, author_id, body, mentions) values (bbb, c, '@b hi', array[b]);
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where user_id = b)::int, 1, 'every_message on: one notification, not duplicated with mention');
  perform tests.assert_eq((select count(*) from notifications where user_id = a and kind = 'message_new')::int, 0, 'others with every_message off get nothing');

  -- blocking
  delete from notifications;
  insert into blocks(blocker_id, blocked_id) values (b, a);
  perform tests.login(a);
  insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng)
    values (bbb, a, 'Second', now() + interval '2 days', now() + interval '2 days 2 hours', 52.47, 13.40);
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where user_id = b)::int, 0, 'blocked actor does not notify blocker');

  -- join requests & decisions
  perform tests.login(d);
  req := request_join(women);
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where user_id = h and kind = 'join_request')::int, 1, 'join request notifies hosts');
  perform tests.login(adm);
  perform decide_join(req, true);
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where user_id = d and kind = 'join_decided')::int, 1, 'join decision notifies requester');

  -- proposals
  perform tests.login(a);
  perform propose_circle('Supper Club', '', '', 'open', '{}');
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where user_id = adm and kind = 'proposal_new')::int, 1, 'proposal notifies admins');

  -- recommendation
  perform tests.login(h);
  perform recommend(women, b);
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where user_id = b and kind = 'recommended')::int, 1, 'recommendation notifies candidate');

  -- approval as member
  perform tests.login(a);
  code := create_invite();
  perform tests.logout();
  perform tests.login(n);
  perform redeem_invite(code, 'Nina', true);
  perform tests.logout();
  perform tests.login(adm);
  perform approve_member(n);
  perform tests.logout();
  perform tests.assert_eq((select count(*) from notifications where user_id = n and kind = 'member_approved')::int, 1, 'approval notifies new member');

  -- RLS: own rows only
  perform tests.login(a);
  perform tests.assert_eq((select count(*) from notifications where user_id <> a)::int, 0, 'notifications are private');
  perform tests.logout();
end $$;
