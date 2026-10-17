import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import { vi } from 'vitest';
import { HomeScreen } from './HomeScreen';
import i18n, { setLanguage } from '../../lib/i18n';
import type { MeetupCard } from '../../data/meetups';

const data = vi.hoisted(() => ({ listUpcoming: vi.fn() }));
vi.mock('../../data/meetups', () => data);

const base: MeetupCard = {
  id: 'm', circleId: 'c', circleName: 'BBB', circleEmoji: '🌍', circleColor: '#3C4A7A', title: 'X',
  startsAt: '2026-07-04T12:00:00Z', endsAt: '2026-07-04T16:00:00Z', locationName: 'Tempelhofer Feld',
  lat: 52.4731, lng: 13.4039, goingCount: 3, iAmGoing: false, cancelled: false,
};

beforeEach(async () => {
  await act(async () => setLanguage('en'));
  data.listUpcoming.mockResolvedValue([
    { ...base, id: 'sat', title: 'Picnic at Tempelhof' },
    { ...base, id: 'tue', title: 'Book club Tuesday', startsAt: '2026-07-07T17:00:00Z', endsAt: '2026-07-07T19:00:00Z' },
    { ...base, id: 'far', title: 'Lake day Wannsee', startsAt: '2026-07-05T10:00:00Z', endsAt: '2026-07-05T15:00:00Z', lat: 52.4216, lng: 13.1792 },
  ]);
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number } }) => void) => ok({ coords: { latitude: 52.48, longitude: 13.41 } }) },
  });
});

test('filters This weekend and Near me', async () => {
  render(<MemoryRouter><HomeScreen now={new Date('2026-07-01T10:00:00Z')} /></MemoryRouter>);
  expect(await screen.findByText('Picnic at Tempelhof')).toBeInTheDocument();
  expect(screen.getByText('Book club Tuesday')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: i18n.t('home.weekend') }));
  expect(screen.getByText('Picnic at Tempelhof')).toBeInTheDocument();
  expect(screen.getByText('Lake day Wannsee')).toBeInTheDocument();
  expect(screen.queryByText('Book club Tuesday')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: i18n.t('home.nearMe') }));
  expect(await screen.findByText('Picnic at Tempelhof')).toBeInTheDocument();
  expect(screen.queryByText('Lake day Wannsee')).toBeNull();
});

test('empty state invites to join a circle', async () => {
  data.listUpcoming.mockResolvedValue([]);
  render(<MemoryRouter><HomeScreen now={new Date('2026-07-01T10:00:00Z')} /></MemoryRouter>);
  expect(await screen.findByText(i18n.t('home.empty'))).toBeInTheDocument();
});
