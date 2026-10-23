import { shiftedIso } from './time';

test('sample shifts by whole days, user rows never', () => {
  const now = new Date('2026-11-13T10:00:00Z'); // 21 days later
  expect(shiftedIso('2026-10-25T15:00:00Z', true, '2026-10-23', now)).toBe('2026-11-15T15:00:00.000Z');
  expect(shiftedIso('2026-10-25T15:00:00Z', false, '2026-10-23', now)).toBe('2026-10-25T15:00:00Z');
});

test('no shift on the first day', () => {
  expect(shiftedIso('2026-10-25T15:00:00Z', true, '2026-10-23', new Date('2026-10-23T22:00:00Z'))).toBe('2026-10-25T15:00:00.000Z');
});
