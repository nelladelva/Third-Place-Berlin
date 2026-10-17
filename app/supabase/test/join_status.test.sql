do $$
declare a uuid; n uuid; c text; s jsonb;
begin
  a := tests.make_user('a@test.de');
  n := tests.make_auth_user('n@test.de');
  perform tests.login(a);
  c := create_invite();
  perform tests.logout();
  perform tests.login(n);
  perform tests.assert_eq(my_join_status(), null::jsonb, 'no profile: join status is null');
  perform redeem_invite(c, 'Nina');
  s := my_join_status();
  perform tests.assert_eq(s->>'status', 'pending', 'join status shows pending');
  perform tests.assert_eq((s->>'vouches')::int, 1, 'join status counts inviter vouch');
  perform tests.assert_eq((s->>'required')::int, 2, 'join status shows required vouches');
  perform tests.assert_eq(s->>'invited_by_name', 'a', 'join status names the inviter');
  perform tests.logout();
end $$;
