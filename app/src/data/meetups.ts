import { supabase } from '../lib/supabase';

export type MeetupCard = {
  id: string; circleId: string; circleName: string; circleEmoji: string | null; circleColor: string | null; title: string;
  startsAt: string; endsAt: string; locationName: string | null; lat: number; lng: number;
  goingCount: number; iAmGoing: boolean; cancelled: boolean;
};
export type Attendee = { userId: string; displayName: string; avatarUrl: string | null; checkedIn: boolean };
export type Meetup = MeetupCard & {
  hostId: string; hostName: string; description: string | null; sign: string | null; bring: string | null;
  capacity: number | null; attendees: Attendee[];
};
export type MeetupInput = {
  circleId: string; title: string; description: string; startsAt: string; endsAt: string; locationName: string;
  lat: number; lng: number; sign: string; bring: string; capacity: number | null;
};
export type CheckInResult = 'checked_in' | 'not_going' | 'too_early' | 'too_late' | 'too_far';

const SELECT = '*, circles(name, emoji, color), rsvps(user_id, checked_in_at, profiles!rsvps_user_id_fkey(display_name, avatar_url)), host:profiles!meetups_host_id_fkey(display_name)';

async function me(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function toMeetup(r: Record<string, unknown>, uid: string | null): Meetup {
  const c = (r.circles ?? {}) as Record<string, unknown>;
  const rs = (r.rsvps ?? []) as Record<string, unknown>[];
  return {
    id: r.id as string, circleId: r.circle_id as string, circleName: (c.name as string) ?? '', circleEmoji: (c.emoji as string) ?? null,
    circleColor: (c.color as string) ?? null, title: r.title as string, startsAt: r.starts_at as string, endsAt: r.ends_at as string,
    locationName: (r.location_name as string) ?? null, lat: r.lat as number, lng: r.lng as number,
    goingCount: rs.length, iAmGoing: rs.some((x) => x.user_id === uid), cancelled: !!r.cancelled_at,
    hostId: r.host_id as string, hostName: ((r.host ?? {}) as Record<string, unknown>).display_name as string ?? '',
    description: (r.description as string) ?? null, sign: (r.sign as string) ?? null, bring: (r.bring as string) ?? null,
    capacity: (r.capacity as number) ?? null,
    attendees: rs.map((x) => {
      const p = (x.profiles ?? {}) as Record<string, unknown>;
      return { userId: x.user_id as string, displayName: (p.display_name as string) ?? '?', avatarUrl: (p.avatar_url as string) ?? null, checkedIn: !!x.checked_in_at };
    }),
  };
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

/** Upcoming and ongoing meetups from my circles (RLS limits rows to circles I belong to). */
export async function listUpcoming(circleId?: string): Promise<MeetupCard[]> {
  let q = supabase.from('meetups').select(SELECT).is('cancelled_at', null).gte('ends_at', new Date().toISOString()).order('starts_at');
  if (circleId) q = q.eq('circle_id', circleId);
  const uid = await me();
  return (check(await q) ?? []).map((r: Record<string, unknown>) => toMeetup(r, uid));
}

export async function getMeetup(id: string): Promise<Meetup | null> {
  const row = check(await supabase.from('meetups').select(SELECT).eq('id', id).maybeSingle());
  return row ? toMeetup(row, await me()) : null;
}

export async function createMeetup(input: MeetupInput): Promise<string> {
  const uid = await me();
  const row = check(await supabase.from('meetups').insert({
    circle_id: input.circleId, host_id: uid, title: input.title, description: input.description || null,
    starts_at: input.startsAt, ends_at: input.endsAt, location_name: input.locationName || null, lat: input.lat, lng: input.lng,
    sign: input.sign || null, bring: input.bring || null, capacity: input.capacity,
  }).select('id').single()) as { id: string } | null;
  if (!row) throw new Error('insert_failed');
  await rsvp(row.id);
  return row.id;
}

export async function updatePin(id: string, lat: number, lng: number, sign: string | null): Promise<void> {
  check(await supabase.from('meetups').update({ lat, lng, sign }).eq('id', id));
}
export async function cancelMeetup(id: string): Promise<void> {
  check(await supabase.from('meetups').update({ cancelled_at: new Date().toISOString() }).eq('id', id));
}
export async function rsvp(id: string): Promise<'going' | 'full'> {
  return check(await supabase.rpc('rsvp', { p_meetup: id })) as 'going' | 'full';
}
export async function cancelRsvp(id: string): Promise<void> {
  check(await supabase.rpc('cancel_rsvp', { p_meetup: id }));
}
export async function checkIn(id: string, lat: number, lng: number): Promise<CheckInResult> {
  return check(await supabase.rpc('check_in', { p_meetup: id, p_lat: lat, p_lng: lng })) as CheckInResult;
}

/** Live updates to one meetup row (e.g. the host moving the pin). Returns an unsubscribe function. */
export function watchMeetup(id: string, onChange: () => void): () => void {
  const ch = supabase.channel(`meetup-${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'meetups', filter: `id=eq.${id}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps', filter: `meetup_id=eq.${id}` }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(ch);
}
