import { seed } from './seed';
import * as r from './rules';
import type { DemoState } from './types';

let s: DemoState;
beforeEach(() => { s = seed('2026-10-23'); });
const notesFor = (userId: string, kind: string) => s.notifications.filter((n) => n.userId === userId && n.kind === kind && !n.sample);
const members = (circleId: string) => s.circleMembers.filter((m) => m.circleId === circleId).map((m) => m.userId);

test('open circles join instantly; closed ones need a request that notifies the hosts', () => {
  r.joinCircle(s, 'c-art');
  expect(members('c-art')).toContain('demo-you');
  r.leaveCircle(s, 'c-women'); // I co-host it in the seed; leave to try the request side
  expect(() => r.joinCircle(s, 'c-women')).toThrow('closed');
  r.requestJoin(s, 'c-women');
  expect(s.joinRequests.some((j) => j.userId === 'demo-you' && j.circleId === 'c-women' && j.status === 'pending')).toBe(true);
  expect(notesFor('p-amara', 'join_request')).toHaveLength(1); // Amara hosts Women Events
});

test('approving a join request adds the member and tells them', () => {
  r.decideJoin(s, 'jr-1', true);
  expect(members('c-women')).toContain('p-chloe');
  expect(notesFor('p-chloe', 'join_decided')[0].data).toMatchObject({ approved: true, circle_id: 'c-women' });
});

test('RSVP is "full" at capacity, otherwise "going"', () => {
  r.joinCircle(s, 'c-books');
  expect(r.rsvp(s, 'm-books')).toBe('full'); // capacity 4, 4 going
  expect(r.rsvp(s, 'm-cowork')).toBe('going');
  expect(s.rsvps.some((x) => x.meetupId === 'm-cowork' && x.userId === 'demo-you')).toBe(true);
});

test('a new meetup makes me Going and notifies the circle', () => {
  const id = r.createMeetup(s, { circleId: 'c-karaoke', title: 'Duet practice', description: '', startsAt: '2026-10-30T18:00:00Z',
    endsAt: '2026-10-30T20:00:00Z', locationName: 'Somewhere', lat: 52.5, lng: 13.4, sign: '', bring: '', capacity: null });
  expect(s.rsvps.some((x) => x.meetupId === id && x.userId === 'demo-you')).toBe(true);
  expect(notesFor('p-tomas', 'meetup_new')).toHaveLength(1);
  expect(notesFor('demo-you', 'meetup_new')).toHaveLength(0); // never notify yourself
});

test('mentions and replies notify the right people', () => {
  r.postMessage(s, { circleId: 'c-bbb' }, 'Hi @Mei Lin', { mentions: ['p-mei'] });
  expect(notesFor('p-mei', 'mention')).toHaveLength(1);
  r.postMessage(s, { circleId: 'c-bbb' }, 'Count me in', { replyTo: 'msg-6' });
  expect(notesFor('p-kwame', 'reply')).toHaveLength(1);
});

test('one vote per person, changeable', () => {
  r.vote(s, 'poll-1', 'opt-1');
  r.vote(s, 'poll-1', 'opt-3');
  const mine = s.pollVotes.filter((v) => v.pollId === 'poll-1' && v.userId === 'demo-you');
  expect(mine).toHaveLength(1);
  expect(mine[0].optionId).toBe('opt-3');
});

test('vouches reaching the threshold approve the person', () => {
  expect(s.settings.vouchesRequired).toBe(2);
  r.vouch(s, 'p-ines'); // Mateo already vouched → 2
  expect(s.profiles.find((p) => p.id === 'p-ines')!.status).toBe('member');
  expect(notesFor('p-ines', 'member_approved')).toHaveLength(1);
});

test('an approved proposal becomes a circle and tells the proposer', () => {
  r.decideProposal(s, 'prop-1', 'approved', 'Great idea!');
  expect(s.circles).toHaveLength(9);
  expect(s.circles.some((c) => c.name === 'Language Exchange')).toBe(true);
  expect(notesFor('p-diego', 'proposal_decided')[0].data).toMatchObject({ status: 'approved', name: 'Language Exchange' });
});

test('admin-only actions are refused in member view', () => {
  s.me.viewAs = 'member';
  expect(() => r.decideProposal(s, 'prop-1', 'approved', '')).toThrow('not_admin');
  expect(() => r.openLaunch(s)).toThrow('not_admin');
  expect(() => r.approveMember(s, 'p-yusuf')).toThrow('not_admin');
});

test('only the author, a circle host or an admin can delete a message', () => {
  s.me.viewAs = 'member';
  expect(() => r.deleteMessage(s, 'msg-10')).toThrow(); // Tomás's message in Karaoke; I'm a plain member there
  s.me.viewAs = 'admin';
  r.deleteMessage(s, 'msg-10');
  expect(s.messages.find((m) => m.id === 'msg-10')!.deletedAt).not.toBeNull();
});

test('check-in works anywhere when going', () => {
  expect(r.checkIn(s, 'm-cowork')).toBe('not_going');
  r.rsvp(s, 'm-tempelhof');
  expect(r.checkIn(s, 'm-tempelhof')).toBe('checked_in');
});

test('launch link opens with a code and closes again', () => {
  const code = r.openLaunch(s);
  expect(code).toBeTruthy();
  expect(s.settings).toMatchObject({ launchOpen: true, launchCode: code });
  r.closeLaunch(s);
  expect(s.settings.launchOpen).toBe(false);
});
