do $$
declare a uuid; b uuid; out uuid; p uuid; adm uuid; bbb uuid; m uuid; later uuid; full_m uuid; r text;
begin
  a   := tests.make_user('a@test.de');
  b   := tests.make_user('b@test.de');
  out := tests.make_user('out@test.de');
  p   := tests.make_user('p@test.de', 'pending');
  adm := tests.make_user('admin@test.de', 'member', 'admin');
  select id into bbb from circles where name like 'BBB%';
  insert into circle_members(circle_id, user_id) values (bbb, a), (bbb, b);

  -- a picnic at Tempelhofer Feld that started 30 minutes ago
  perform tests.login(a);
  insert into meetups(circle_id, host_id, title, starts_at, ends_at, location_name, lat, lng, sign, capacity)
  values (bbb, a, 'Picnic + games', now() - interval '30 minutes', now() + interval '3 hours', 'Tempelhofer Feld',
          52.4731, 13.4039, 'Yellow blanket next to the big tree', 2)
  returning id into m;
  perform tests.assert_true(m is not null, 'circle member creates meetup');
  perform tests.assert_raises(format(
    'insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng) values (%L, %L, %L, now(), now() + interval ''1 hour'', 52.5, 13.4)',
    bbb, b, 'Not mine'), '42501', 'cannot create a meetup in someone else''s name');
  perform tests.logout();

  perform tests.login(out);
  perform tests.assert_eq((select count(*) from meetups)::int, 0, 'non-member of circle cannot see meetup');
  perform tests.assert_raises(format(
    'insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng) values (%L, %L, %L, now(), now() + interval ''1 hour'', 52.5, 13.4)',
    bbb, out, 'Sneaky'), '42501', 'non-member of circle cannot create meetup');
  perform tests.logout();
  perform tests.login(p);
  perform tests.assert_eq((select count(*) from meetups)::int, 0, 'pending app user cannot see meetup');
  perform tests.logout();

  -- RSVP and capacity
  perform tests.login(b);
  perform tests.assert_eq(check_in(m, 52.4732, 13.4040), 'not_going', 'check_in without rsvp returns not_going');
  perform tests.assert_eq(rsvp(m), 'going', 'rsvp returns going');
  update meetups set lat = 52.0, lng = 13.0 where id = m;
  perform tests.assert_eq((select lat from meetups where id = m), 52.4731::double precision, 'non-host cannot move pin');
  perform tests.assert_eq(check_in(m, 52.4821, 13.4039), 'too_far', 'check_in 1 km away returns too_far');
  perform tests.assert_eq(check_in(m, 52.4740, 13.4039), 'checked_in', 'check_in 100 m away during event returns checked_in');
  perform tests.logout();
  perform tests.login(a);
  perform tests.assert_eq(rsvp(m), 'going', 'host rsvps too');
  perform tests.logout();
  insert into circle_members(circle_id, user_id) values (bbb, adm);
  perform tests.login(adm);
  perform tests.assert_eq(rsvp(m), 'full', 'rsvp returns full at capacity');
  perform tests.logout();

  -- timing window
  perform tests.login(a);
  insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng)
  values (bbb, a, 'Later', now() + interval '2 hours', now() + interval '4 hours', 52.4731, 13.4039) returning id into later;
  perform rsvp(later);
  perform tests.assert_eq(check_in(later, 52.4731, 13.4039), 'too_early', 'check_in 2 hours before start returns too_early');
  update meetups set starts_at = now() - interval '5 hours', ends_at = now() - interval '1 hour' where id = later;
  perform tests.assert_eq(check_in(later, 52.4731, 13.4039), 'too_late', 'check_in an hour after the end returns too_late');
  -- host moves the pin
  update meetups set lat = 52.4745, lng = 13.4050, sign = 'Moved 20 m left' where id = m;
  perform tests.assert_eq((select sign from meetups where id = m), 'Moved 20 m left', 'host moves pin');
  -- host confirms attendance
  perform confirm_attendance(m, a);
  perform tests.assert_true((select checked_in_at is not null from rsvps where meetup_id = m and user_id = a), 'host confirms attendance');
  perform tests.logout();
  perform tests.login(b);
  perform tests.assert_raises(format('select confirm_attendance(%L, %L)', m, a), 'not_meetup_host', 'non-host cannot confirm attendance');
  perform cancel_rsvp(m);
  perform tests.assert_eq((select count(*) from rsvps where meetup_id = m and user_id = b)::int, 0, 'cancel_rsvp removes rsvp');
  perform tests.logout();

  perform tests.assert_true(abs(haversine_m(52.4731, 13.4039, 52.4821, 13.4039) - 1000.8) < 5, 'haversine about 1 km');
end $$;
