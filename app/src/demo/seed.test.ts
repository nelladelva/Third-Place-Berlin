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
