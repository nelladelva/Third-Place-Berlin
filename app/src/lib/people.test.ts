import { canTeachMe, filterPeople, normalize, type PersonCard } from './people';
import type { Profile } from '../data/session';

const me = { id: 'me', learn: ['Python', 'Deutsch'], field: 'Design', teach: [] } as unknown as Profile;
const person = (over: Partial<PersonCard>): PersonCard => ({
  id: 'x', displayName: 'X', field: null, origin: null, languages: [], teach: [], learn: [], avatarUrl: null,
  approvedAt: '2026-01-01T00:00:00Z', bio: null, ...over,
});

test('normalize handles umlauts', () => {
  expect(normalize('Grüße')).toBe('grusse');
  expect(normalize('  Ärzte ')).toBe('arzte');
});

test('canTeachMe matches case-insensitively', () => {
  expect(canTeachMe(['Python'], ['python', 'Figma'])).toBe(true);
  expect(canTeachMe(['Python'], ['Figma'])).toBe(false);
  expect(canTeachMe(['deutsch'], ['Deutsch '])).toBe(true);
});

test('search matches field, skills and languages', () => {
  const people = [
    person({ id: 'k', displayName: 'Kwame', field: 'Data engineer', teach: ['Python'] }),
    person({ id: 'l', displayName: 'Lena', field: 'UX designer', languages: ['Deutsch'] }),
    person({ id: 'p', displayName: 'Priya', field: 'Marketing', teach: ['LinkedIn'] }),
  ];
  const now = new Date('2026-10-17T00:00:00Z');
  expect(filterPeople(people, 'python', 'all', me, now).map((p) => p.id)).toEqual(['k']);
  expect(filterPeople(people, 'designer', 'all', me, now).map((p) => p.id)).toEqual(['l']);
  expect(filterPeople(people, 'deutsch', 'all', me, now).map((p) => p.id)).toEqual(['l']);
  expect(filterPeople(people, '', 'canTeachMe', me, now).map((p) => p.id)).toEqual(['k']);
});

test('new filter uses approved_at within 30 days', () => {
  const now = new Date('2026-10-17T00:00:00Z');
  const people = [person({ id: 'new', approvedAt: '2026-10-01T00:00:00Z' }), person({ id: 'old', approvedAt: '2026-08-01T00:00:00Z' })];
  expect(filterPeople(people, '', 'new', me, now).map((p) => p.id)).toEqual(['new']);
});

test('same field filter', () => {
  const now = new Date('2026-10-17T00:00:00Z');
  const people = [person({ id: 'a', field: 'design' }), person({ id: 'b', field: 'Law' })];
  expect(filterPeople(people, '', 'sameField', me, now).map((p) => p.id)).toEqual(['a']);
});
