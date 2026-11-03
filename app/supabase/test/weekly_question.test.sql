-- Question of the week: Mondays 9:00 Berlin time, BBB only, a "Third Place" card (no author), push to BBB members.
do $$
declare a uuid; b uuid; c uuid; bbb uuid; m1 uuid; m2 uuid; m3 uuid; q1 text; q2 text; rep uuid;
begin
  a := tests.make_user('a@test.de');   -- BBB member, default notification settings
  b := tests.make_user('b@test.de');   -- BBB member who turned off "new meetups & polls"
  c := tests.make_user('c@test.de');   -- not in BBB
  select id into bbb from circles where name like 'BBB%';
  insert into circle_members(circle_id, user_id) values (bbb, a), (bbb, b);
  insert into notification_prefs(user_id, circle_id, meetups_polls) values (b, bbb, false);

  perform tests.assert_eq((select count(*) from weekly_questions)::int, 60, '60 approved questions are loaded');

  -- only Monday 9:00 Berlin time
  perform tests.assert_true(post_weekly_question('2026-11-10 08:00+00') is null, 'Tuesday: nothing is posted');
  perform tests.assert_true(post_weekly_question('2026-11-09 07:00+00') is null, 'Monday 8:00 Berlin: too early');
  m1 := post_weekly_question('2026-11-09 08:00+00');   -- 9:00 in Berlin (winter time, UTC+1)
  perform tests.assert_true(m1 is not null, 'Monday 9:00 Berlin (winter): question posted');
  perform tests.assert_true(post_weekly_question('2026-11-09 08:00+00') is null, 'never twice on the same Monday');

  -- the card: BBB, no author, kind question, one of the approved questions
  select body into q1 from messages where id = m1;
  perform tests.assert_true((select circle_id = bbb and author_id is null and kind = 'question' from messages where id = m1),
                            'card is a BBB message from "Third Place" (no author)');
  perform tests.assert_true(exists(select 1 from weekly_questions where body = q1), 'card shows an approved question');

  -- push: BBB members with default settings, not the one who opted out, not non-members
  perform tests.assert_eq((select count(*) from notifications where user_id = a and kind = 'weekly_question')::int, 1, 'BBB member is notified');
  perform tests.assert_eq((select count(*) from notifications where user_id = b and kind = 'weekly_question')::int, 0, 'opted-out member is not notified');
  perform tests.assert_eq((select count(*) from notifications where user_id = c and kind = 'weekly_question')::int, 0, 'non-member is not notified');
  perform tests.assert_eq((select data->>'body' from notifications where user_id = a and kind = 'weekly_question'), q1, 'notification carries the question');

  -- next Monday: a different question
  m2 := post_weekly_question('2026-11-16 08:00+00');
  select body into q2 from messages where id = m2;
  perform tests.assert_true(q2 is distinct from q1, 'next Monday brings a different question');

  -- summer time: 9:00 Berlin is 07:00 UTC
  perform tests.assert_true(post_weekly_question('2027-06-07 08:00+00') is null, 'summer: 10:00 Berlin is not 9:00');
  perform tests.assert_true(post_weekly_question('2027-06-07 07:00+00') is not null, 'Monday 9:00 Berlin (summer): question posted');

  -- after all 60, it starts over instead of stopping
  update weekly_questions set last_posted_at = now();
  m3 := post_weekly_question('2027-06-14 07:00+00');
  perform tests.assert_true(m3 is not null, 'after the whole list, it starts over');

  -- members: can answer the card, cannot fake one, cannot post one
  perform tests.login(a);
  insert into messages(circle_id, author_id, body, reply_to) values (bbb, a, 'Running my mum''s shop', m1) returning id into rep;
  perform tests.assert_true(rep is not null, 'member can answer the card');
  perform tests.assert_raises(format('insert into messages(circle_id, author_id, body, kind) values (%L, %L, %L, %L)', bbb, a, 'fake', 'question'),
                              '42501', 'member cannot post a question card');
  perform tests.assert_raises('select post_weekly_question()', '42501', 'member cannot trigger the weekly question');
  perform tests.assert_raises('select count(*) from weekly_questions', '42501', 'members cannot read the question list ahead');
  perform tests.logout();

  -- a normal message still needs an author
  perform tests.assert_raises(format('insert into messages(circle_id, body) values (%L, %L)', bbb, 'ghost'),
                              'messages_author_required', 'only question cards may have no author');
end $$;
