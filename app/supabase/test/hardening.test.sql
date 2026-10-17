do $$
declare a uuid; b uuid; c uuid; adm uuid; n uuid; n2 uuid; bbb uuid; women uuid; m uuid; msg uuid; code text; code2 text; cnt int;
begin
  a := tests.make_user('a@test.de'); b := tests.make_user('b@test.de'); c := tests.make_user('c@test.de');
  adm := tests.make_user('admin@test.de', 'member', 'admin');
  n := tests.make_auth_user('n@test.de'); n2 := tests.make_auth_user('n2@test.de');
  select id into bbb from circles where name like 'BBB%';
  select id into women from circles where name = 'Women Events';
  insert into circle_members(circle_id, user_id, role) values (bbb, a, 'host'), (bbb, b, 'member'), (women, a, 'member');

  -- 1. functions are not callable by anon; internal helpers not callable by members
  select count(*) into cnt from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute');
  perform tests.assert_eq(cnt, 0, 'anon can execute no public functions');
  perform tests.assert_true(not has_function_privilege('authenticated', 'public.name_of(uuid)', 'execute'), 'members cannot call name_of');
  perform tests.assert_true(not has_function_privilege('authenticated', 'public.notify(uuid,text,uuid,jsonb)', 'execute'), 'members cannot call notify');

  -- 2. block status of other people is not queryable
  insert into blocks(blocker_id, blocked_id) values (a, c);
  perform tests.login(b);
  perform tests.assert_raises(format('select is_blocked_between(%L, %L)', a, c), '42883', 'is_blocked_between is gone');
  perform tests.assert_eq(is_blocked_with(a), false, 'is_blocked_with only answers about me');
  perform tests.logout();
  perform tests.login(c);
  perform tests.assert_eq((select count(*) from profiles where id = a)::int, 0, 'blocked person still cannot see blocker');
  perform tests.logout();

  -- 3. deleted messages are wiped in the base table
  perform tests.login(b);
  insert into messages(circle_id, author_id, body, mentions) values (bbb, b, 'secret oops', array[a]) returning id into msg;
  perform delete_message(msg);
  perform tests.assert_eq((select body from messages where id = msg), '', 'deleted message body wiped in base table');
  perform tests.assert_eq((select cardinality(mentions) from messages where id = msg), 0, 'deleted message mentions wiped');
  perform tests.logout();

  -- 4. meetup identity columns are locked
  perform tests.login(a);
  insert into meetups(circle_id, host_id, title, starts_at, ends_at, lat, lng)
    values (bbb, a, 'Picnic', now() + interval '1 day', now() + interval '1 day 2 hours', 52.47, 13.40) returning id into m;
  perform tests.assert_raises(format('update meetups set circle_id = %L where id = %L', women, m), '42501', 'cannot move a meetup to another circle');
  perform tests.assert_raises(format('update meetups set host_id = %L where id = %L', b, m), '42501', 'cannot change the host');
  update meetups set title = 'Picnic + games' where id = m;
  perform tests.assert_eq((select title from meetups where id = m), 'Picnic + games', 'host can still edit the title');
  perform tests.logout();

  -- 5. consent before anything is shared
  perform tests.login(a);
  code := create_invite();
  perform tests.logout();
  perform tests.login(n);
  perform tests.assert_raises(format('select redeem_invite(%L, %L, false)', code, 'Nina'), 'consent_required', 'joining requires consent');
  perform tests.assert_eq(redeem_invite(code, 'Nina', true), 'pending', 'joining with consent works');
  perform tests.assert_true((select consent_at is not null from profiles where id = n), 'consent_at stored at join');
  perform tests.logout();

  -- 8. avatar must be hosted in our storage bucket
  perform tests.login(b);
  perform tests.assert_raises(format('update profiles set avatar_url = %L where id = %L', 'http://evil.example/track.gif', b), '23514', 'avatar_url must be a storage URL');
  update profiles set avatar_url = 'https://abcd.supabase.co/storage/v1/object/public/avatars/' || b || '.jpg?v=1' where id = b;
  perform tests.assert_true((select avatar_url is not null from profiles where id = b), 'storage avatar URL accepted');
  perform tests.logout();

  -- 9. removing a member expires their invites and drops their vouches
  perform tests.login(c);
  code2 := create_invite();
  perform tests.logout();
  perform tests.login(adm);
  perform remove_member(c);
  perform tests.logout();
  perform tests.login(n2);
  perform tests.assert_raises(format('select redeem_invite(%L, %L, true)', code2, 'Ned'), 'invite_invalid', 'removed member''s invite no longer works');
  perform tests.logout();
end $$;
