import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { NotificationKind } from '../../supabase/functions/_shared/payload';

export type Notification = { id: string; kind: NotificationKind; data: Record<string, unknown>; createdAt: string; read: boolean };
export type Prefs = { meetupsPolls: boolean; mentions: boolean; everyMessage: boolean };
export const DEFAULT_PREFS: Prefs = { meetupsPolls: true, mentions: true, everyMessage: false };

async function me(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function listNotifications(): Promise<Notification[]> {
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(40);
  return (data ?? []).map((r: Record<string, unknown>) => ({ id: r.id as string, kind: r.kind as NotificationKind,
    data: (r.data as Record<string, unknown>) ?? {}, createdAt: r.created_at as string, read: !!r.read_at }));
}

export async function markAllRead(): Promise<void> {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
}

export function useUnreadCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { count: c } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
      if (alive) setCount(c ?? 0);
    };
    void load();
    const ch = supabase.channel('my-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(ch);
    };
  }, []);
  return count;
}

export async function getAllPrefs(): Promise<Record<string, Prefs>> {
  const { data } = await supabase.from('notification_prefs').select('*');
  return Object.fromEntries((data ?? []).map((r: Record<string, unknown>) => [r.circle_id as string,
    { meetupsPolls: !!r.meetups_polls, mentions: !!r.mentions, everyMessage: !!r.every_message }]));
}

export async function setPrefs(circleId: string, p: Prefs): Promise<void> {
  await supabase.from('notification_prefs').upsert({ user_id: await me(), circle_id: circleId,
    meetups_polls: p.meetupsPolls, mentions: p.mentions, every_message: p.everyMessage });
}
