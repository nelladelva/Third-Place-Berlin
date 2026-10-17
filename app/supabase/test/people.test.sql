do $$
declare a uuid; b uuid; n uuid; c text; row record;
begin
  a := tests.make_user('a@test.de');
  b := tests.make_user('b@test.de');
  n := tests.make_auth_user('n@test.de');
  perform tests.login(a);
  c := create_invite();
  perform tests.logout();
  perform tests.login(n);
  perform redeem_invite(c, 'Nina');
  perform tests.assert_raises('select * from pending_candidates()', 'not_member', 'pending user cannot list candidates');
  perform tests.logout();

  perform tests.login(b);
  select * into row from pending_candidates() where id = n;
  perform tests.assert_eq(row.display_name, 'Nina', 'member sees pending candidate name');
  perform tests.assert_eq(row.vouches::int, 1, 'candidate list shows vouch count');
  perform tests.assert_eq(row.required::int, 2, 'candidate list shows required vouches');
  perform tests.assert_eq(row.invited_by_name, 'a', 'candidate list shows inviter');
  perform tests.assert_eq(row.i_vouched, false, 'i_vouched false before vouching');
  perform tests.logout();
  perform tests.login(a);
  perform tests.assert_eq((select i_vouched from pending_candidates() where id = n), true, 'i_vouched true for inviter');
  perform tests.logout();
end $$;
