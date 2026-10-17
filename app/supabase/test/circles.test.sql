do $$
declare a uuid; b uuid; h uuid; adm uuid; p uuid; out uuid;
        bbb uuid; women uuid; karaoke uuid; req uuid; req2 uuid; prop uuid; newc uuid;
begin
  a   := tests.make_user('a@test.de');
  b   := tests.make_user('b@test.de');
  h   := tests.make_user('host@test.de');
  out := tests.make_user('out@test.de');
  adm := tests.make_user('admin@test.de', 'member', 'admin');
  p   := tests.make_user('p@test.de', 'pending');

  select id into bbb from circles where name like 'BBB%';
  select id into women from circles where name = 'Women Events';
  select id into karaoke from circles where name = 'Karaoke';

  perform tests.assert_eq((select count(*) from circles)::int, 8, 'seed has 8 circles');
  perform tests.assert_eq((select visibility from circles where id = bbb), 'open', 'BBB is open');
  perform tests.assert_eq((select visibility from circles where id = women), 'closed', 'Women Events seeded closed');

  -- open circle
  perform tests.login(a);
  perform join_circle(bbb);
  perform tests.assert_true(is_circle_member(bbb), 'member joins open circle');
  perform tests.assert_eq((select member_count from circle_cards where id = bbb)::int, 1, 'circle_cards counts members');
  perform tests.assert_true((select is_member from circle_cards where id = bbb), 'circle_cards marks my membership');
  perform tests.assert_raises(format('select join_circle(%L)', women), 'circle_closed', 'join_circle on closed raises circle_closed');
  perform leave_circle(bbb);
  perform tests.assert_true(not is_circle_member(bbb), 'member leaves circle');
  perform tests.logout();

  -- pending app user sees no circles
  perform tests.login(p);
  perform tests.assert_eq((select count(*) from circles)::int, 0, 'pending app user cannot see circles');
  perform tests.assert_raises(format('select join_circle(%L)', bbb), 'not_member', 'pending app user cannot join');
  perform tests.logout();

  -- closed circle: host h, existing member b
  insert into circle_members(circle_id, user_id, role) values (women, h, 'host'), (women, b, 'member');
  perform tests.login(a);
  req := request_join(women);
  perform tests.assert_eq((select my_request_status from circle_cards where id = women), 'pending', 'circle_cards shows my pending request');
  perform tests.assert_eq((select count(*) from circle_members where circle_id = women)::int, 0, 'non-member cannot list closed circle members');
  perform tests.logout();
  perform tests.login(out);
  perform tests.assert_raises(format('select recommend(%L, %L)', women, a), 'not_circle_member', 'non-member of circle cannot recommend');
  perform tests.logout();
  perform tests.login(h);
  perform tests.assert_eq((select count(*) from join_requests where circle_id = women)::int, 1, 'host sees join requests');
  perform tests.assert_raises(format('select decide_join(%L, true)', req), 'needs_recommendation', 'host cannot approve without recommendation');
  perform tests.logout();
  perform tests.login(b);
  perform recommend(women, a);
  perform tests.assert_raises(format('select decide_join(%L, true)', req), 'not_circle_host', 'plain member cannot decide join');
  perform tests.logout();
  perform tests.login(h);
  perform decide_join(req, true);
  perform tests.logout();
  perform tests.login(a);
  perform tests.assert_true(is_circle_member(women), 'host approves after recommendation');
  perform tests.assert_eq((select count(*) from circle_members where circle_id = women)::int, 3, 'new member sees closed circle members');
  perform tests.logout();

  -- admin approves without recommendation
  perform tests.login(out);
  req2 := request_join(women);
  perform tests.logout();
  perform tests.login(adm);
  perform decide_join(req2, true);
  perform tests.logout();
  perform tests.assert_true(exists(select 1 from circle_members where circle_id = women and user_id = out), 'admin approves without recommendation');

  -- proposals
  perform tests.login(a);
  prop := propose_circle('Supper Club', 'Monthly dinners', '🍳', 'open', array[b]);
  perform tests.assert_eq((select count(*) from circle_proposals)::int, 1, 'proposer sees own proposal');
  perform tests.assert_raises(format('select decide_proposal(%L, %L, null)', prop, 'approved'), 'not_admin', 'non-admin cannot decide_proposal');
  perform tests.logout();
  perform tests.login(b);
  perform tests.assert_eq((select count(*) from circle_proposals)::int, 0, 'others cannot see proposals');
  perform tests.logout();
  perform tests.login(adm);
  newc := decide_proposal(prop, 'approved', 'Welcome!');
  perform tests.logout();
  perform tests.assert_eq((select role from circle_members where circle_id = newc and user_id = a), 'host', 'proposal approved: proposer is host');
  perform tests.assert_eq((select role from circle_members where circle_id = newc and user_id = b), 'host', 'proposal approved: cohost is host');
  perform tests.assert_eq((select status from circle_proposals where id = prop), 'approved', 'proposal marked approved');

  -- admin tools
  perform tests.login(adm);
  perform set_visibility(karaoke, 'closed');
  perform set_host(karaoke, a, true);
  perform tests.logout();
  perform tests.assert_eq((select visibility from circles where id = karaoke), 'closed', 'admin sets visibility');
  perform tests.assert_eq((select role from circle_members where circle_id = karaoke and user_id = a), 'host', 'admin assigns host');
  perform tests.login(b);
  perform tests.assert_raises(format('select set_visibility(%L, %L)', bbb, 'closed'), 'not_admin', 'non-admin cannot set visibility');
  perform tests.logout();

  -- removing a member from the app drops circle memberships
  perform tests.login(adm);
  perform remove_member(out);
  perform tests.logout();
  perform tests.assert_eq((select count(*) from circle_members where user_id = out)::int, 0, 'remove_member clears circle memberships');
end $$;
