do $$
declare a uuid; b uuid; p uuid; r uuid; adm uuid; n int;
begin
  a   := tests.make_user('a@test.de');
  b   := tests.make_user('b@test.de');
  p   := tests.make_user('p@test.de', 'pending');
  r   := tests.make_user('r@test.de', 'removed');
  adm := tests.make_user('admin@test.de', 'member', 'admin');

  perform tests.login(p);
  perform tests.assert_eq((select count(*) from profiles)::int, 1, 'pending user sees only own profile');
  perform tests.assert_eq((select count(*) from app_settings)::int, 0, 'pending user cannot read app_settings');
  perform tests.logout();

  perform tests.login(a);
  perform tests.assert_eq((select count(*) from profiles where id in (a, b, adm))::int, 3, 'member sees other members');
  perform tests.assert_eq((select count(*) from profiles where id = p)::int, 0, 'member does not see pending profiles');
  perform tests.assert_eq((select count(*) from profiles where id = r)::int, 0, 'member does not see removed profiles');
  perform tests.assert_raises(format('update profiles set role = %L where id = %L', 'admin', a), '42501', 'member cannot set own role');
  perform tests.assert_raises(format('update profiles set status = %L where id = %L', 'member', a), '42501', 'member cannot set own status');
  update profiles set bio = 'Hello Berlin' where id = a;
  perform tests.assert_eq((select bio from profiles where id = a), 'Hello Berlin', 'member can edit own bio');
  update profiles set bio = 'hacked' where id = b;
  perform tests.logout();
  perform tests.assert_eq((select bio from profiles where id = b), null::text, 'member cannot edit someone else''s profile');

  perform tests.login(r);
  perform tests.assert_eq((select count(*) from profiles)::int, 1, 'removed user sees nothing but own row');
  perform tests.logout();

  -- blocks hide profiles both ways
  perform tests.login(a);
  insert into blocks(blocker_id, blocked_id) values (a, b);
  perform tests.assert_eq((select count(*) from profiles where id = b)::int, 0, 'blocked profile hidden for blocker');
  perform tests.logout();
  perform tests.login(b);
  perform tests.assert_eq((select count(*) from profiles where id = a)::int, 0, 'blocker hidden for blocked person');
  perform tests.assert_raises(format('insert into blocks(blocker_id, blocked_id) values (%L, %L)', a, adm), '42501', 'cannot create a block on behalf of someone else');
  perform tests.logout();

  -- settings
  perform tests.login(a);
  perform tests.assert_eq((select vouches_required from app_settings), 2, 'member reads vouches_required default 2');
  update app_settings set vouches_required = 1;
  perform tests.logout();
  perform tests.assert_eq((select vouches_required from app_settings), 2, 'non-admin cannot change vouches_required');
  perform tests.login(adm);
  update app_settings set vouches_required = 3;
  perform tests.logout();
  perform tests.assert_eq((select vouches_required from app_settings), 3, 'admin can change vouches_required');

  -- reports
  perform tests.login(a);
  insert into reports(reporter_id, target_type, target_id, reason) values (a, 'profile', b, 'spam');
  perform tests.assert_eq((select count(*) from reports)::int, 0, 'reporter cannot read reports back');
  perform tests.logout();
  perform tests.login(adm);
  perform tests.assert_eq((select count(*) from reports)::int, 1, 'admin reads reports');
  perform tests.logout();
  perform tests.login(a);
  perform tests.assert_true(is_member(), 'is_member true for member');
  perform tests.assert_true(not is_admin(), 'is_admin false for member');
  perform tests.logout();
end $$;
