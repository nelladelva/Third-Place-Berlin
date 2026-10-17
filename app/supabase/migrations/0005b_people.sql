-- Members can see who is waiting to join (limited fields) so they can vouch.
create function public.pending_candidates()
returns table (id uuid, display_name text, field text, origin text, bio text, invited_by_name text,
               vouches int, required int, i_vouched boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_member();
  return query
    select p.id, p.display_name, p.field, p.origin, p.bio, i.display_name,
           (select count(*)::int from vouches v where v.candidate_id = p.id),
           (select s.vouches_required from app_settings s where s.id = 1),
           exists (select 1 from vouches v where v.candidate_id = p.id and v.voucher_id = auth.uid()),
           p.created_at
      from profiles p left join profiles i on i.id = p.invited_by
     where p.status = 'pending'
     order by p.created_at;
end $$;
revoke execute on function public.pending_candidates() from anon;
