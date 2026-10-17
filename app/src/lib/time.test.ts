import { berlinToUtc, formatMeetupTime, isThisWeekend, utcToBerlinParts } from './time';

beforeAll(() => {
  process.env.TZ = 'America/New_York';
});

test('shows Berlin time regardless of device zone', () => {
  const s = formatMeetupTime('2026-07-04T12:00:00Z', '2026-07-04T16:00:00Z', 'en');
  expect(s).toContain('14:00');
  expect(s).toContain('18:00');
  expect(s).toMatch(/Sat/);
});

test('German format uses German weekday', () => {
  expect(formatMeetupTime('2026-07-04T12:00:00Z', '2026-07-04T16:00:00Z', 'de')).toMatch(/Sa/);
});

test('isThisWeekend true for Saturday 14:00 Berlin, false for Monday', () => {
  const now = new Date('2026-07-01T10:00:00Z'); // Wednesday
  expect(isThisWeekend('2026-07-04T12:00:00Z', now)).toBe(true); // Sat 14:00 Berlin
  expect(isThisWeekend('2026-07-03T16:00:00Z', now)).toBe(true); // Fri 18:00 Berlin
  expect(isThisWeekend('2026-07-03T13:00:00Z', now)).toBe(false); // Fri 15:00 Berlin
  expect(isThisWeekend('2026-07-06T08:00:00Z', now)).toBe(false); // next Monday
  expect(isThisWeekend('2026-07-11T12:00:00Z', now)).toBe(false); // the weekend after
});

test('berlinToUtc handles summer and winter time', () => {
  expect(berlinToUtc('2026-07-04', '14:00')).toBe('2026-07-04T12:00:00.000Z');
  expect(berlinToUtc('2026-12-05', '14:00')).toBe('2026-12-05T13:00:00.000Z');
});

test('utcToBerlinParts round-trips', () => {
  expect(utcToBerlinParts('2026-07-04T12:00:00Z')).toEqual({ date: '2026-07-04', time: '14:00' });
});
