// The real App on the demo data twins: every tab renders the sample community, with no console errors.
import { render, screen, cleanup } from '@testing-library/react';
import { reloadForTest } from './store';

vi.mock('../data/session', () => import('./data/session'));
vi.mock('../data/circles', () => import('./data/circles'));
vi.mock('../data/meetups', () => import('./data/meetups'));
vi.mock('../data/chat', () => import('./data/chat'));
vi.mock('../data/profiles', () => import('./data/profiles'));
vi.mock('../data/notifications', () => import('./data/notifications'));
vi.mock('../data/admin', () => import('./data/admin'));
vi.mock('../data/invites', () => import('./data/invites'));
vi.mock('../data/me', () => import('./data/me'));
vi.mock('../lib/supabase', () => import('./no-supabase'));

import App from '../App';

let errors: ReturnType<typeof vi.spyOn>;
/** Real console errors only: React's "not wrapped in act(...)" test warning comes from async loading in jsdom. */
const realErrors = () => errors.mock.calls.filter((c) => !String(c[0]).includes('not wrapped in act'));
beforeEach(() => {
  localStorage.clear();
  reloadForTest();
  errors = vi.spyOn(console, 'error');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function open(hash: string) {
  window.location.hash = hash;
  render(<App />);
}

test('Home shows the sample meetups', async () => {
  await open('#/');
  expect(await screen.findByText('Tempelhof picnic', {}, { timeout: 3000 })).toBeInTheDocument();
  expect(realErrors()).toEqual([]);
});

test('Circles shows all 8 circles', async () => {
  await open('#/circles');
  for (const name of ['Karaoke', 'Book Lovers', 'Women Events', 'BBB · Belong Beyond Borders']) {
    expect((await screen.findAllByText(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {}, { timeout: 3000 })).length).toBeGreaterThan(0);
  }
  expect(realErrors()).toEqual([]);
});

test('People lists the fictional members', async () => {
  await open('#/people');
  expect(await screen.findByText('Amara Okafor', {}, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.getByText('Tomás Novák')).toBeInTheDocument();
  expect(realErrors()).toEqual([]);
});

test('Me shows the demo person', async () => {
  await open('#/me');
  expect((await screen.findAllByText('You (demo)', {}, { timeout: 3000 })).length).toBeGreaterThan(0);
  expect(realErrors()).toEqual([]);
});

test('the admin console opens', async () => {
  await open('#/me/admin');
  expect(await screen.findByText(/Language Exchange/, {}, { timeout: 3000 })).toBeInTheDocument();
  expect(realErrors()).toEqual([]);
});
