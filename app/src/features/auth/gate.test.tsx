import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthGate } from './AuthGate';
import i18n from '../../lib/i18n';
import type { Profile } from '../../data/session';

const session = vi.hoisted(() => ({ value: { userId: null as string | null, profile: null as unknown, loading: false } }));
vi.mock('../../data/session', async (orig) => ({
  ...(await orig<typeof import('../../data/session')>()),
  useSession: () => ({ ...session.value, refresh: vi.fn() }),
}));
vi.mock('../../data/invites', async (orig) => ({
  ...(await orig<typeof import('../../data/invites')>()),
  redeemInvite: vi.fn(),
  myJoinStatus: vi.fn().mockResolvedValue({ status: 'pending', vouches: 1, required: 2, invited_by_name: 'Saskia' }),
}));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));

const base: Profile = {
  id: 'u1', displayName: 'Amara', field: null, origin: null, languages: [], berlinSince: null, bio: null, funFact: null,
  teach: [], learn: [], avatarUrl: null, locale: 'en', status: 'member', role: 'member', invitedBy: null,
  consentAt: '2026-10-01T00:00:00Z', welcomedAt: '2026-10-01T00:00:00Z', createdAt: '2026-10-01T00:00:00Z', approvedAt: '2026-10-01T00:00:00Z',
};

function show(userId: string | null, profile: Profile | null) {
  session.value = { userId, profile, loading: false };
  render(
    <MemoryRouter>
      <AuthGate>
        <p>APP CONTENT</p>
      </AuthGate>
    </MemoryRouter>,
  );
}

beforeEach(() => sessionStorage.clear());

test('no session shows login', () => {
  show(null, null);
  expect(screen.getByRole('button', { name: i18n.t('login.sendCode') })).toBeInTheDocument();
});

test('no profile shows need-invite screen', () => {
  show('u1', null);
  expect(screen.getByText(i18n.t('needInvite.title'))).toBeInTheDocument();
});

test('no profile with a remembered invite code asks for a name to join', () => {
  sessionStorage.setItem('tpb.invite', 'abcdefgh23');
  show('u1', null);
  expect(screen.getByLabelText(i18n.t('join.name'))).toBeInTheDocument();
});

test('pending profile shows WaitingScreen', () => {
  show('u1', { ...base, status: 'pending', welcomedAt: null, approvedAt: null });
  expect(screen.getByText(i18n.t('waiting.title'))).toBeInTheDocument();
});

test('removed profile shows goodbye screen', () => {
  show('u1', { ...base, status: 'removed' });
  expect(screen.getByText(i18n.t('removed.title'))).toBeInTheDocument();
});

test('member not yet welcomed shows WelcomeFlow', () => {
  show('u1', { ...base, welcomedAt: null });
  expect(screen.getByText(i18n.t('welcome.title'))).toBeInTheDocument();
});

test('member with consent sees the app', () => {
  show('u1', base);
  expect(screen.getByText('APP CONTENT')).toBeInTheDocument();
});

test('children get the profile on the first render', async () => {
  const { useProfile } = await import('./AuthGate');
  function Hello() {
    return <p>Hi {useProfile().profile.displayName}</p>;
  }
  session.value = { userId: 'u1', profile: base, loading: false };
  render(<MemoryRouter><AuthGate><Hello /></AuthGate></MemoryRouter>);
  expect(screen.getByText('Hi Amara')).toBeInTheDocument();
});
