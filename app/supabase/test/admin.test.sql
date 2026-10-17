do $$
declare a uuid; b uuid; adm uuid; bbb uuid; m uuid; msg uuid; rep uuid;
begin
  a := tests.make_user('a@test.de'); b := tests.make_user('b@test.de');
  adm := tests.make_user('admin@test.de', 'member', 'admin');
  select id into bbb from circles where name like 'BBB%';
  insert into circle_members(circle_id, user_id) values (bbb, a), (bbb, b);
  perform tests.login(a);
  insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng)
    values (bbb, a, 'Spam meetup', now() + interval '1 day', now() + interval '1 day 1 hour', 52.5, 13.4) returning id into m;
  insert into messages(circle_id, author_id, body) values (bbb, a, 'spam spam') returning id into msg;
  perform tests.logout();
  perform tests.login(b);
  insert into reports(reporter_id, target_type, target_id, reason) values (b, 'message', msg, 'spam');
  perform tests.assert_eq((select count(*) from reports)::int, 0, 'only admins read reports');
  perform tests.logout();

  perform tests.login(adm);
  perform tests.assert_eq((select count(*) from meetups where id = m)::int, 1, 'admin sees meetups of circles they are not in');
  perform tests.assert_eq((select count(*) from messages where id = msg)::int, 1, 'admin sees reported messages');
  perform delete_message(msg);
  delete from meetups where id = m;
  select id into rep from reports limit 1;
  update reports set status = 'resolved' where id = rep;
  perform tests.assert_eq((select count(*) from reports where status = 'resolved')::int, 1, 'admin resolves report');
  perform tests.assert_eq((select count(*) from profiles where status = 'member')::int, 3, 'admin sees all profiles');
  perform tests.logout();
  perform tests.assert_true((select deleted_at is not null from messages where id = msg), 'admin can remove a message of others');
  perform tests.assert_eq((select count(*) from meetups where id = m)::int, 0, 'admin can remove a meetup of others');
end $$;
