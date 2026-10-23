import { seed } from './seed';

const s = seed('2026-10-23');

test('the 8 circles match seed.sql', () => {
  expect(s.circles.map((c) => c.name)).toEqual(['Karaoke', 'Book Lovers', 'Co-working & Networking', 'Women Events',
    'Art Lovers', 'Berlin Events', 'Sports Events', 'BBB · Belong Beyond Borders']);
  expect(s.circles.find((c) => c.name === 'Women Events')!.visibility).toBe('closed');
  expect(s.circles.filter((c) => c.visibility === 'closed')).toHaveLength(1);
});

test('fictional members, no emails, no photos', () => {
  expect(s.profiles.length).toBeGreaterThanOrEqual(12);
  expect(JSON.stringify(s)).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i);
  expect(s.profiles.every((p) => p.avatarUrl === null)).toBe(true);
});

test('Tempelhof picnic with its sign, and 4–6 meetups', () => {
  const m = s.meetups.find((x) => x.title === 'Tempelhof picnic')!;
  expect(m.sign).toBe('yellow blanket by the big tree');
  expect(s.meetups.length).toBeGreaterThanOrEqual(4);
  expect(s.meetups.length).toBeLessThanOrEqual(6);
});

test('every admin screen has something', () => {
  expect(s.profiles.some((p) => p.status === 'pending')).toBe(true);
  expect(s.joinRequests.length).toBeGreaterThan(0);
  expect(s.proposals.some((p) => p.status === 'pending')).toBe(true);
  expect(s.reports.length).toBeGreaterThan(0);
});

test('I start as admin', () => {
  expect(s.me).toEqual({ id: 'demo-you', viewAs: 'admin' });
});

test('all seed rows are marked as sample', () => {
  for (const key of ['profiles', 'circles', 'meetups', 'messages', 'notifications'] as const) {
    expect(s[key].every((r) => r.sample)).toBe(true);
  }
});

test('I host the closed circle with the waiting join request, so approving can be tried', () => {
  const jr = s.joinRequests.find((j) => j.status === 'pending')!;
  expect(s.circleMembers.some((m) => m.circleId === jr.circleId && m.userId === 'demo-you' && m.role === 'host')).toBe(true);
});

test('meetups and chats name no weekdays (sample dates move with today)', () => {
  const words = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
  expect(s.meetups.filter((m) => words.test(`${m.title} ${m.description ?? ''}`)).map((m) => m.title)).toEqual([]);
  expect(s.messages.filter((m) => words.test(m.body)).map((m) => m.body)).toEqual([]);
});

test('the demo profile holds no personal details', () => {
  const me = s.profiles.find((p) => p.id === 'demo-you')!;
  expect(me.origin).toBeNull();
  expect(me.berlinSince).toBeNull();
  expect(JSON.stringify(me)).not.toMatch(/Haiti|founder/i);
});
