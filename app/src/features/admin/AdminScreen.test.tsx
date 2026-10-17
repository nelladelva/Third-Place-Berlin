import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import { vi } from 'vitest';
import { AdminScreen } from './AdminScreen';
import i18n, { setLanguage } from '../../lib/i18n';
import type { Profile } from '../../data/session';

const data = vi.hoisted(() => ({
  getSettings: vi.fn(), openLaunch: vi.fn(), closeLaunch: vi.fn(), setVouchesRequired: vi.fn(), listProposals: vi.fn(),
  decideProposal: vi.fn(), listReports: vi.fn(), resolveReport: vi.fn(), listAllCircles: vi.fn(), setVisibility: vi.fn(),
  setHost: vi.fn(), archiveCircle: vi.fn(), approveMember: vi.fn(), removeMember: vi.fn(), setAdmin: vi.fn(), listMembersAdmin: vi.fn(),
}));
vi.mock('../../data/admin', () => data);
vi.mock('../../data/profiles', () => ({ listPending: vi.fn().mockResolvedValue([]) }));

const profile = (role: 'member' | 'admin') => ({ id: 'u', displayName: 'Nella', role, status: 'member' }) as Profile;

beforeEach(async () => {
  Object.values(data).forEach((f) => f.mockReset());
  await act(async () => setLanguage('en'));
  data.getSettings.mockResolvedValue({ launchOpen: false, launchCode: null, vouchesRequired: 2 });
  data.openLaunch.mockResolvedValue('abcdefgh23');
  for (const f of ['listProposals', 'listReports', 'listAllCircles', 'listMembersAdmin'] as const) data[f].mockResolvedValue([]);
});

test('hidden for non-admin', () => {
  render(<MemoryRouter><AdminScreen profile={profile('member')} /></MemoryRouter>);
  expect(screen.queryByText(i18n.t('admin.launch'))).toBeNull();
  expect(screen.getByText(i18n.t('admin.notAllowed'))).toBeInTheDocument();
});

test('launch toggle shows code and share', async () => {
  render(<MemoryRouter><AdminScreen profile={profile('admin')} /></MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: i18n.t('admin.openLaunch') }));
  expect(data.openLaunch).toHaveBeenCalled();
  expect(await screen.findByText(/#\/join\/abcdefgh23/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: i18n.t('admin.shareLaunch') })).toBeInTheDocument();
});
