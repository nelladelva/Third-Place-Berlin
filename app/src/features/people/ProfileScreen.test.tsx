import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react';
import { vi } from 'vitest';
import { ProfileScreen } from './ProfileScreen';
import i18n, { setLanguage } from '../../lib/i18n';

const data = vi.hoisted(() => ({
  getProfile: vi.fn(), block: vi.fn(), unblock: vi.fn(), myCircles: vi.fn(), recommend: vi.fn(), reportProfile: vi.fn(),
}));
vi.mock('../../data/profiles', () => ({
  getProfile: data.getProfile, block: data.block, unblock: data.unblock, myCircles: data.myCircles, reportProfile: data.reportProfile,
}));
vi.mock('../../data/circles', () => ({ recommend: data.recommend }));

beforeEach(async () => {
  Object.values(data).forEach((f) => f.mockReset());
  await act(async () => setLanguage('en'));
  data.getProfile.mockResolvedValue({
    id: 'lena', displayName: 'Lena', field: 'UX designer', origin: 'Vienna', languages: ['EN', 'DE'], berlinSince: '2026-09-01',
    bio: 'New to Berlin, love museums.', funFact: 'Bad karaoke', teach: ['Figma'], learn: ['Python'], avatarUrl: null,
    email: 'lena@private.example', phone: '+49 170 0000000', circles: [{ id: 'art', name: 'Art Lovers', emoji: '🎨' }],
  });
  data.myCircles.mockResolvedValue([
    { id: 'kar', name: 'Karaoke', emoji: '🎤', visibility: 'open' },
    { id: 'w', name: 'Women Events', emoji: '✊', visibility: 'closed' },
  ]);
});

function show() {
  render(<MemoryRouter initialEntries={['/people/lena']}><Routes><Route path="/people/:id" element={<ProfileScreen />} /></Routes></MemoryRouter>);
}

test('recommend sheet lists only my circles and calls recommend', async () => {
  show();
  await userEvent.click(await screen.findByRole('button', { name: i18n.t('people.recommend', { name: 'Lena' }) }));
  expect(screen.getByText(/Karaoke/)).toBeInTheDocument();
  expect(screen.getByText(/Women Events/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Art Lovers/ })).toBeNull();
  await userEvent.click(screen.getAllByRole('button', { name: i18n.t('people.recommendAction') })[0]);
  expect(data.recommend).toHaveBeenCalledWith('kar', 'lena');
});

test('never renders email or phone', async () => {
  show();
  expect(await screen.findByText(/New to Berlin, love museums/)).toBeInTheDocument();
  expect(document.body.textContent).not.toContain('lena@private.example');
  expect(document.body.textContent).not.toContain('+49 170');
});
