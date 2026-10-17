do $$
declare a uuid; b uuid; bbb uuid; m uuid; d jsonb;
begin
  a := tests.make_user('a@test.de');
  b := tests.make_user('b@test.de');
  select id into bbb from circles where name like 'BBB%';
  insert into circle_members(circle_id, user_id) values (bbb, a), (bbb, b);
  insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng)
    values (bbb, b, 'Picnic', now() + interval '1 day', now() + interval '1 day 3 hours', 52.47, 13.40) returning id into m;
  perform tests.login(a);
  perform rsvp(m);
  insert into messages(circle_id, author_id, body) values (bbb, a, 'mine');
  perform tests.logout();
  perform tests.login(b);
  insert into messages(circle_id, author_id, body) values (bbb, b, 'not mine');
  perform tests.logout();

  perform tests.login(a);
  d := export_my_data();
  perform tests.assert_eq(d->'profile'->>'display_name', 'a', 'export has my profile');
  perform tests.assert_eq(jsonb_array_length(d->'circle_memberships'), 1, 'export has my memberships');
  perform tests.assert_eq(jsonb_array_length(d->'rsvps'), 1, 'export has my rsvps');
  perform tests.assert_eq(jsonb_array_length(d->'messages'), 1, 'export has only my messages');
  perform tests.assert_eq(d->'messages'->0->>'body', 'mine', 'export message is mine');
  perform tests.assert_true(d::text not like '%not mine%', 'export contains nothing of others');
  perform tests.logout();
end $$;
