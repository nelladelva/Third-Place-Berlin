// Ribbon, Admin/Member switch and Reset, on the real App with the demo twins.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getState, reloadForTest } from './store';

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
vi.mock('./slot', () => import('./slot.demo'));

import App from '../App';

beforeEach(() => { localStorage.clear(); reloadForTest(); });
afterEach(() => cleanup());

async function open(hash: string) {
  window.location.hash = hash;
  render(<App />);
}

test('the ribbon is on Home and inside a circle', async () => {
  await open('#/');
  expect(await screen.findByText(/Demo · sample data/)).toBeInTheDocument();
  cleanup();
  await open('#/circles/c-bbb');
  expect(await screen.findByText(/Demo · sample data/)).toBeInTheDocument();
});

test('switching to Member hides the admin entry; switching back shows it', async () => {
  await open('#/me');
  const adminEntry = await screen.findByRole('link', { name: /admin/i });
  expect(adminEntry).toBeInTheDocument();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Member' })));
  expect(getState().me.viewAs).toBe('member');
  expect(screen.queryByRole('link', { name: /admin/i })).toBeNull();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Admin' })));
  expect(await screen.findByRole('link', { name: /admin/i })).toBeInTheDocument();
});

test('the admin console in member view does not crash', async () => {
  await act(async () => { (await import('./store')).update((s) => { s.me.viewAs = 'member'; }); });
  await open('#/me/admin');
  expect(await screen.findByText(/Demo · sample data/)).toBeInTheDocument();
  expect(screen.queryByText(/Language Exchange/)).toBeNull();
});

test('Reset demo restores the starting data after confirming', async () => {
  (await import('./store')).update((s) => { s.circleMembers = s.circleMembers.filter((m) => !(m.circleId === 'c-karaoke' && m.userId === 'demo-you')); });
  await open('#/me');
  await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'Reset demo' })));
  await act(async () => fireEvent.click(await screen.findByRole('button', { name: /yes, reset/i })));
  expect(getState().circleMembers.some((m) => m.circleId === 'c-karaoke' && m.userId === 'demo-you')).toBe(true);
});
