-- GDPR: export everything about me. Avatars bucket (only when Supabase Storage exists).
create function public.export_my_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from profiles p where p.id = auth.uid()),
    'circle_memberships', coalesce((select jsonb_agg(jsonb_build_object('circle', c.name, 'role', m.role, 'joined_at', m.joined_at))
                                      from circle_members m join circles c on c.id = m.circle_id where m.user_id = auth.uid()), '[]'),
    'join_requests', coalesce((select jsonb_agg(to_jsonb(r)) from join_requests r where r.user_id = auth.uid()), '[]'),
    'proposals', coalesce((select jsonb_agg(to_jsonb(x)) from circle_proposals x where x.proposer_id = auth.uid()), '[]'),
    'meetups_hosted', coalesce((select jsonb_agg(to_jsonb(mt)) from meetups mt where mt.host_id = auth.uid()), '[]'),
    'rsvps', coalesce((select jsonb_agg(to_jsonb(r)) from rsvps r where r.user_id = auth.uid()), '[]'),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('body', ms.body, 'created_at', ms.created_at, 'deleted_at', ms.deleted_at))
                            from messages ms where ms.author_id = auth.uid()), '[]'),
    'reactions', coalesce((select jsonb_agg(to_jsonb(x)) from reactions x where x.user_id = auth.uid()), '[]'),
    'poll_votes', coalesce((select jsonb_agg(to_jsonb(x)) from poll_votes x where x.user_id = auth.uid()), '[]'),
    'board_pins', coalesce((select jsonb_agg(to_jsonb(x)) from board_pins x where x.author_id = auth.uid()), '[]'),
    'invites_created', coalesce((select jsonb_agg(jsonb_build_object('created_at', i.created_at, 'used', i.used_by is not null))
                                   from invites i where i.inviter_id = auth.uid()), '[]'),
    'vouches_given', coalesce((select count(*) from vouches v where v.voucher_id = auth.uid()), 0),
    'blocks', coalesce((select jsonb_agg(b.blocked_id) from blocks b where b.blocker_id = auth.uid()), '[]'),
    'reports_made', coalesce((select jsonb_agg(jsonb_build_object('target_type', r.target_type, 'reason', r.reason, 'created_at', r.created_at))
                                from reports r where r.reporter_id = auth.uid()), '[]'))
$$;
revoke execute on function public.export_my_data() from anon;

do $$
begin
  if to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
    execute $p$create policy avatars_insert_own on storage.objects for insert to authenticated
               with check (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg')$p$;
    execute $p$create policy avatars_update_own on storage.objects for update to authenticated
               using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg')$p$;
    execute $p$create policy avatars_delete_own on storage.objects for delete to authenticated
               using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg')$p$;
  end if;
end $$;
