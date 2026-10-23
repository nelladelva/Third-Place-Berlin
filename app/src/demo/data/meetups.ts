// Demo twin of src/data/meetups.ts: meetups of my circles, with sample dates moved to the coming days.
import type { Attendee, CheckInResult, Meetup, MeetupCard, MeetupInput } from '../../data/meetups';
import * as rules from '../rules';
import { subscribe, update } from '../store';
import type { DemoMeetup } from '../types';
import { ME, isMemberOf, profileOf, state, when } from '../view';

export type { Attendee, CheckInResult, Meetup, MeetupCard, MeetupInput };

function toMeetup(m: DemoMeetup): Meetup {
  const s = state();
  const c = s.circles.find((x) => x.id === m.circleId);
  const rs = s.rsvps.filter((r) => r.meetupId === m.id);
  return {
    id: m.id, circleId: m.circleId, circleName: c?.name ?? '', circleEmoji: c?.emoji ?? null, circleColor: c?.color ?? null,
    title: m.title, startsAt: when(m.startsAt, m.sample), endsAt: when(m.endsAt, m.sample), locationName: m.locationName,
    lat: m.lat, lng: m.lng, goingCount: rs.length, iAmGoing: rs.some((r) => r.userId === ME), cancelled: !!m.cancelledAt,
    hostId: m.hostId, hostName: profileOf(m.hostId)?.displayName ?? '', description: m.description, sign: m.sign, bring: m.bring,
    capacity: m.capacity,
    attendees: rs.map((r) => ({ userId: r.userId, displayName: profileOf(r.userId)?.displayName ?? '?',
      avatarUrl: profileOf(r.userId)?.avatarUrl ?? null, checkedIn: !!r.checkedInAt })),
  };
}

/** Upcoming and ongoing meetups from my circles. */
export async function listUpcoming(circleId?: string): Promise<MeetupCard[]> {
  const now = Date.now();
  return state().meetups
    .filter((m) => !m.cancelledAt && isMemberOf(m.circleId) && (!circleId || m.circleId === circleId))
    .map(toMeetup)
    .filter((m) => Date.parse(m.endsAt) >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getMeetup(id: string): Promise<Meetup | null> {
  const m = state().meetups.find((x) => x.id === id);
  return m ? toMeetup(m) : null;
}

export async function createMeetup(input: MeetupInput): Promise<string> {
  let id = '';
  update((s) => { id = rules.createMeetup(s, input); });
  return id;
}
export async function updatePin(id: string, lat: number, lng: number, sign: string | null): Promise<void> {
  update((s) => rules.updatePin(s, id, lat, lng, sign));
}
export async function cancelMeetup(id: string): Promise<void> {
  update((s) => rules.cancelMeetup(s, id));
}
export async function rsvp(id: string): Promise<'going' | 'full'> {
  let result: 'going' | 'full' = 'going';
  update((s) => { result = rules.rsvp(s, id); });
  return result;
}
export async function cancelRsvp(id: string): Promise<void> {
  update((s) => rules.cancelRsvp(s, id));
}
export async function checkIn(id: string, _lat: number, _lng: number): Promise<CheckInResult> {
  let result: CheckInResult = 'not_going';
  update((s) => { result = rules.checkIn(s, id); });
  return result;
}

/** Changes to the demo store (e.g. RSVPs) re-load the meetup screen. */
export function watchMeetup(_id: string, onChange: () => void): () => void {
  return subscribe(onChange);
}
