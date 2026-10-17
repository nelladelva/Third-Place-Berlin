do $$
declare a uuid; b uuid; c uuid; adm uuid; n1 uuid; n2 uuid; n3 uuid; n4 uuid; n5 uuid; x uuid;
        v_code text; v_code2 text; launch text; st text;
begin
  a   := tests.make_user('a@test.de');
  b   := tests.make_user('b@test.de');
  c   := tests.make_user('c@test.de');
  adm := tests.make_user('admin@test.de', 'member', 'admin');
  n1  := tests.make_auth_user('n1@test.de');
  n2  := tests.make_auth_user('n2@test.de');
  n3  := tests.make_auth_user('n3@test.de');
  n4  := tests.make_auth_user('n4@test.de');
  n5  := tests.make_auth_user('n5@test.de');
  x   := tests.make_auth_user('x@test.de');

  -- launch link
  perform tests.login(adm);
  launch := open_launch();
  perform tests.assert_true(length(launch) = 10, 'open_launch returns a 10-char v_code');
  perform tests.logout();
  perform tests.login(n1);
  perform tests.assert_eq(redeem_invite(launch, 'Newbie One'), 'member', 'launch v_code admits directly while open');
  perform tests.assert_eq((select display_name from profiles where id = n1), 'Newbie One', 'redeem stores display name');
  perform tests.logout();
  perform tests.login(adm);
  perform close_launch();
  perform tests.logout();
  perform tests.login(n2);
  perform tests.assert_raises(format('select redeem_invite(%L, %L)', launch, 'Late'), 'invite_invalid', 'launch v_code rejected after close_launch');
  perform tests.logout();

  -- personal invite → pending with the inviter's vouch
  perform tests.login(a);
  v_code := create_invite();
  perform tests.logout();
  perform tests.login(n2);
  perform tests.assert_eq(redeem_invite(v_code, 'Two'), 'pending', 'personal invite makes pending');
  perform tests.assert_eq((select count(*) from vouches where candidate_id = n2)::int, 1, 'inviter vouch recorded');
  perform tests.assert_eq((select invited_by from profiles where id = n2), a, 'invited_by set');
  perform tests.assert_raises(format('select vouch(%L)', n2), 'not_member', 'pending user cannot vouch');
  perform tests.logout();
  perform tests.login(n3);
  perform tests.assert_raises(format('select redeem_invite(%L, %L)', v_code, 'Three'), 'invite_invalid', 'invite cannot be reused');
  perform tests.logout();
  perform tests.login(a);
  perform tests.assert_eq(vouch(n2), 'pending', 'duplicate vouch by inviter is a no-op');
  perform tests.logout();
  perform tests.login(b);
  perform tests.assert_eq(vouch(n2), 'member', 'second vouch makes member when required = 2');
  perform tests.assert_raises(format('select vouch(%L)', b), 'invalid_candidate', 'cannot vouch for yourself');
  perform tests.logout();
  perform tests.assert_true((select approved_at is not null from profiles where id = n2), 'approved_at set on promotion');

  -- required = 3
  update app_settings set vouches_required = 3;
  perform tests.login(a);
  v_code2 := create_invite();
  perform tests.logout();
  perform tests.login(n3);
  perform redeem_invite(v_code2, 'Three');
  perform tests.logout();
  perform tests.login(b);
  perform tests.assert_eq(vouch(n3), 'pending', 'required = 3: two vouches still pending');
  perform tests.logout();
  perform tests.login(c);
  perform tests.assert_eq(vouch(n3), 'member', 'required = 3: third vouch makes member');
  perform tests.logout();

  -- expired invite
  perform tests.login(a);
  v_code := create_invite();
  perform tests.logout();
  update invites set expires_at = now() - interval '1 day' where invites.code = v_code;
  perform tests.login(n4);
  perform tests.assert_raises(format('select redeem_invite(%L, %L)', v_code, 'Four'), 'invite_invalid', 'expired invite rejected');
  perform tests.assert_raises(format('select redeem_invite(%L, %L)', 'nonsense00', 'Four'), 'invite_invalid', 'unknown v_code rejected');
  perform tests.logout();

  -- admin approval and permissions
  perform tests.login(a);
  v_code := create_invite();
  perform tests.logout();
  perform tests.login(n4);
  perform redeem_invite(v_code, 'Four');
  perform tests.logout();
  perform tests.login(b);
  perform tests.assert_raises(format('select approve_member(%L)', n4), 'not_admin', 'non-admin cannot approve_member');
  perform tests.assert_raises(format('select open_launch()'), 'not_admin', 'non-admin cannot open launch');
  perform tests.logout();
  perform tests.login(adm);
  perform approve_member(n4);
  perform tests.logout();
  perform tests.assert_eq((select status from profiles where id = n4), 'member', 'admin approve_member skips vouches');

  -- removal is sticky
  perform tests.login(adm);
  perform remove_member(n4);
  perform tests.logout();
  perform tests.login(a);
  v_code := create_invite();
  perform tests.logout();
  perform tests.login(n4);
  perform tests.assert_eq(redeem_invite(v_code, 'Four again'), 'removed', 'removed user cannot redeem to get back in');
  perform tests.logout();

  -- pending users cannot create invites; no-profile users cannot either
  perform tests.login(x);
  perform tests.assert_raises('select create_invite()', 'not_member', 'user without profile cannot create invite');
  perform tests.logout();

  -- admin role management
  perform tests.login(adm);
  perform set_admin(b, true);
  perform tests.logout();
  perform tests.assert_eq((select role from profiles where id = b), 'admin', 'admin can make another admin');

  -- bootstrap is not callable from the app
  perform tests.login(a);
  perform tests.assert_raises(format('select bootstrap_admin(%L)', 'a@test.de'), '42501', 'members cannot call bootstrap_admin');
  perform tests.logout();
  perform bootstrap_admin('n5@test.de');
  perform tests.assert_eq((select role || '/' || status from profiles where id = n5), 'admin/member', 'bootstrap_admin creates admin profile from setup');
end $$;
