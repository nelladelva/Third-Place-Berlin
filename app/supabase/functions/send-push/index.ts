// Called by a Database Webhook on notifications INSERT. Sends web push to all of the user's subscriptions.
import { createClient } from 'npm:@supabase/supabase-js@2.47.10';
import webpush from 'npm:web-push@3.6.7';
import { buildPushPayload, type NotificationKind } from '../_shared/payload.ts';

webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.org',
  Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) return new Response('forbidden', { status: 403 });
  const { record } = await req.json();
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: profile } = await admin.from('profiles').select('locale').eq('id', record.user_id).single();
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', record.user_id);
  const payload = buildPushPayload(record.kind as NotificationKind, record.data ?? {}, profile?.locale === 'de' ? 'de' : 'en');
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 86400 });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
    }
  }));
  return new Response(JSON.stringify({ sent: subs?.length ?? 0 }), { headers: { 'Content-Type': 'application/json' } });
});
