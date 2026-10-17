do $$
declare a uuid; b uuid; h uuid; out uuid; r uuid; bbb uuid; m_recent uuid; m_old uuid; msg uuid; msg_b uuid;
        poll uuid; o1 uuid; o2 uuid; cnt int;
begin
  a   := tests.make_user('a@test.de');
  b   := tests.make_user('b@test.de');
  h   := tests.make_user('host@test.de');
  out := tests.make_user('out@test.de');
  r   := tests.make_user('r@test.de');
  select id into bbb from circles where name like 'BBB%';
  insert into circle_members(circle_id, user_id, role) values (bbb, a, 'member'), (bbb, b, 'member'), (bbb, h, 'host'), (bbb, r, 'member');
  insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng)
    values (bbb, a, 'Yesterday', now() - interval '28 hours', now() - interval '1 day', 52.5, 13.4) returning id into m_recent;
  insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng)
    values (bbb, a, 'Last week', now() - interval '4 days', now() - interval '3 days', 52.5, 13.4) returning id into m_old;

  perform tests.login(a);
  insert into messages(circle_id, author_id, body) values (bbb, a, 'Hallo zusammen!') returning id into msg;
  perform tests.assert_eq((select count(*) from messages where circle_id = bbb)::int, 1, 'circle member posts and reads');
  insert into messages(meetup_id, author_id, body) values (m_recent, a, 'Thanks for coming!');
  perform tests.assert_eq((select count(*) from messages where meetup_id = m_recent)::int, 1, 'meetup chat open 1 day after end');
  perform tests.assert_raises(format('insert into messages(meetup_id, author_id, body) values (%L, %L, %L)', m_old, a, 'late'),
    '42501', 'meetup chat refuses insert 3 days after end');
  perform tests.assert_raises(format('insert into messages(circle_id, author_id, body) values (%L, %L, %L)', bbb, b, 'fake'),
    '42501', 'cannot post as someone else');
  perform tests.assert_raises(format('insert into messages(circle_id, author_id, body) values (%L, %L, %L)', bbb, a, ''),
    '23514', 'empty message rejected');
  insert into reactions(message_id, user_id, emoji) values (msg, a, '🔥');
  perform tests.assert_raises(format('insert into reactions(message_id, user_id, emoji) values (%L, %L, %L)', msg, a, '💩'),
    '23514', 'only allowed reaction emoji');
  insert into board_pins(circle_id, author_id, title, body) values (bbb, a, 'Anmeldung tips', 'Book at 8am');
  perform tests.assert_eq((select count(*) from board_pins where circle_id = bbb)::int, 1, 'member pins to board');
  perform tests.logout();

  perform tests.login(out);
  perform tests.assert_eq((select count(*) from messages)::int, 0, 'non-member cannot read circle chat');
  perform tests.assert_eq((select count(*) from board_pins)::int, 0, 'non-member cannot read board');
  perform tests.assert_raises(format('insert into messages(circle_id, author_id, body) values (%L, %L, %L)', bbb, out, 'hi'),
    '42501', 'non-member cannot post');
  perform tests.logout();

  -- polls
  perform tests.login(b);
  perform tests.assert_raises(format('select create_poll(%L, %L, %L::text[])', bbb, 'One option?', '{only}'), 'poll_options', 'create_poll needs 2..6 options');
  perform tests.assert_raises(format('select create_poll(%L, %L, %L::text[])', bbb, 'Seven?', '{1,2,3,4,5,6,7}'), 'poll_options', 'create_poll rejects 7 options');
  poll := create_poll(bbb, 'Which book for November?', array['Pachinko', 'Paons / Pfauen', 'Klara and the Sun']);
  select id into o1 from poll_options where poll_id = poll and position = 1;
  select id into o2 from poll_options where poll_id = poll and position = 2;
  perform tests.assert_eq((select count(*) from messages where poll_id = poll and kind = 'poll')::int, 1, 'create_poll posts a poll message');
  perform vote(poll, o1);
  perform vote(poll, o2);
  perform tests.assert_eq((select count(*) from poll_votes where poll_id = poll)::int, 1, 'vote twice keeps one vote');
  perform tests.assert_eq((select option_id from poll_votes where poll_id = poll), o2, 'second vote replaces the first');
  perform tests.logout();
  update polls set closes_at = now() - interval '1 minute' where id = poll;
  perform tests.login(a);
  perform tests.assert_raises(format('select vote(%L, %L)', poll, o1), 'poll_closed', 'vote after closes_at raises poll_closed');
  perform tests.logout();

  -- blocking hides messages in messages_visible
  perform tests.login(b);
  insert into messages(circle_id, author_id, body) values (bbb, b, 'From b') returning id into msg_b;
  perform tests.logout();
  perform tests.login(a);
  insert into blocks(blocker_id, blocked_id) values (a, b);
  perform tests.assert_eq((select count(*) from messages_visible where author_id = b)::int, 0, 'blocked author''s messages hidden in messages_visible');
  perform tests.assert_eq((select count(*) from messages_visible where author_id = a and circle_id = bbb)::int, 1, 'own messages still visible');
  -- deleting
  perform tests.assert_raises(format('select delete_message(%L)', msg_b), 'not_allowed', 'other member cannot delete');
  perform delete_message(msg);
  perform tests.assert_eq((select body from messages_visible where id = msg), '', 'author can delete (body hidden)');
  perform tests.logout();
  perform tests.login(h);
  perform delete_message(msg_b);
  perform tests.assert_true((select deleted_at is not null from messages where id = msg_b), 'circle host can delete any message');
  perform tests.logout();

  -- removed user
  perform tests.make_user('dummy@test.de');
  update profiles set status = 'removed' where id = r;
  perform tests.login(r);
  perform tests.assert_eq((select count(*) from messages)::int, 0, 'removed user cannot read');
  perform tests.logout();
end $$;
