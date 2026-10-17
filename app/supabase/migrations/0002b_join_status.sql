-- What a pending person may know about their own admission (they cannot read app_settings or other profiles).
create function public.my_join_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'status', p.status,
    'vouches', (select count(*) from vouches v where v.candidate_id = p.id),
    'required', (select vouches_required from app_settings where id = 1),
    'invited_by_name', (select i.display_name from profiles i where i.id = p.invited_by))
  from profiles p where p.id = auth.uid()
$$;
revoke execute on function public.my_join_status() from anon;
